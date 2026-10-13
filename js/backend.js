/* On Stride — serveur : connexion (Supabase Auth) et données (tables Supabase).
   Expose à l'appli une petite API « documents » : db.collection(nom).onSnapshot / .doc(id).set / update / delete.
   Les écritures sont appliquées tout de suite à l'écran, puis envoyées ; si le serveur refuse, on recharge. */
'use strict';
var Cloud=(function(){
  /* arrivée depuis l'e-mail « mot de passe oublié » : à repérer avant que la bibliothèque ne nettoie l'adresse */
  var RECOVERY=/[?&]reset=1/.test(location.search)||/type=recovery/.test(location.hash);
  var cfg=window.AVANCEE_CONFIG||{}, sb=null, me=null, cache={}, subs={}, timers={}, authCb=null, lastLoad=0, mailCb=null;
  /* table -> forme. key : colonne servant d'identifiant ; single : une ligne par personne ; plain : colonnes simples */
  var T={spaces:{},projects:{},clients:{},tasks:{},meta:{key:'project_id'},settings:{key:'owner',single:true},members:{plain:true},quotes:{opt:true}};
  var NAMES=Object.keys(T);
  /* opt : table ajoutée après coup (devis). Tant que supabase/schema.sql n'a pas été relancé, elle manque :
     l'appli démarre quand même, et la page concernée affiche comment l'activer. */
  var missing={};

  function configured(){return !!(cfg.supabaseUrl&&cfg.supabaseKey&&window.supabase&&window.supabase.createClient);}
  function uuid(){
    try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();}catch(_){}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);});
  }
  function strip(d){var o={};Object.keys(d||{}).forEach(function(k){if(k!=='id'&&k.charAt(0)!=='_')o[k]=d[k];});return JSON.parse(JSON.stringify(o).split('\u2063').join(''));}
  function keyCol(t){return T[t].key||'id';}
  function rowId(t,id){return T[t].single?me.id:id;}
  function toDoc(t,row){
    if(T[t].plain)return {id:row.id,data:{projectId:row.project_id,email:row.email,role:row.role}};
    return {id:T[t].single?'main':row[keyCol(t)],data:Object.assign({},row.data||{},{_owner:row.owner})};
  }
  function fail(err){
    var c=err&&err.code, denied=c==='42501'||c==='PGRST301'||c==='23503'||c==='23505'||c==='23514';
    var missing=c==='42P01'||c==='PGRST205'||c==='PGRST204';
    return {code:denied?'invalid_argument':missing?'no_schema':'unavailable',message:(err&&err.message)||'erreur'};
  }
  function emit(t){
    var m=cache[t]||{}, docs=Object.keys(m).map(function(id){var d=m[id];return {id:id,data:function(){return JSON.parse(JSON.stringify(d));}};});
    (subs[t]||[]).forEach(function(s){s.next({docs:docs});});
  }
  function fetchTable(t){
    return sb.from(t).select('*').then(function(r){
      if(r.error)throw fail(r.error);
      var m={};(r.data||[]).forEach(function(row){var d=toDoc(t,row);m[d.id]=d.data;});
      cache[t]=m;emit(t);
    });
  }
  function later(t){clearTimeout(timers[t]);timers[t]=setTimeout(function(){fetchTable(t).catch(function(){});},350);}
  function load(){
    lastLoad=Date.now();
    return Promise.all(NAMES.map(function(t){
      return fetchTable(t).then(function(){delete missing[t];},function(e){
        if(T[t].opt){missing[t]=e&&e.code==='no_schema'?'no_schema':'err';cache[t]=cache[t]||{};emit(t);return;}
        (subs[t]||[]).forEach(function(s){if(s.error)s.error(e);});throw e;
      });
    }));
  }
  function live(){
    try{
      var ch=sb.channel('avancee');
      NAMES.forEach(function(t){
        /* une table facultative a son propre canal : si elle manque, les mises à jour en direct des autres continuent */
        if(T[t].opt){try{sb.channel('avancee-'+t).on('postgres_changes',{event:'*',schema:'public',table:t},function(){later(t);}).subscribe();}catch(_){}return;}
        ch.on('postgres_changes',{event:'*',schema:'public',table:t},function(){
          later(t);
          if(t==='members'){later('projects');later('tasks');}   /* un partage change ce qu'on a le droit de voir */
          if(t==='projects')later('tasks');
        });
      });
      /* messagerie : une table à part, rechargée par js/mail.js */
      ch.on('postgres_changes',{event:'*',schema:'public',table:'messages'},function(){if(mailCb)mailCb();});
      ch.subscribe();
    }catch(_){}
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible'&&me&&Date.now()-lastLoad>15000)load().catch(function(){});
    });
  }

  /* ---------- écritures ---------- */
  function insQ(t,id,d){
    var row;
    if(T[t].plain)row={id:id,project_id:d.projectId,email:String(d.email||'').trim().toLowerCase(),role:d.role};
    else{row={data:d};row[keyCol(t)]=rowId(t,id);if(t==='tasks')row.project_id=d.projectId||null;}
    return sb.from(t).insert(row).select(keyCol(t));
  }
  function updQ(t,id,d){
    var row=T[t].plain?{role:d.role}:{data:d};
    if(t==='tasks')row.project_id=d.projectId||null;
    return sb.from(t).update(row).eq(keyCol(t),rowId(t,id)).select(keyCol(t));
  }
  function send(t,q){
    return q.then(function(r){
      if(r.error)return fetchTable(t).catch(function(){}).then(function(){throw fail(r.error);});
      /* une modification refusée par les règles d'accès ne renvoie aucune ligne */
      if(!r.data||!r.data.length)return fetchTable(t).catch(function(){}).then(function(){throw {code:'invalid_argument',message:'refusé'};});
    });
  }
  function ref(t,id){
    return {id:id,path:t+'/'+id,
      set:function(data){
        var d=strip(data), old=cache[t]&&cache[t][id];
        cache[t]=cache[t]||{};
        cache[t][id]=T[t].plain?d:Object.assign({},d,{_owner:old?old._owner:me.id});
        emit(t);
        return send(t,old?updQ(t,id,d):insQ(t,id,d));
      },
      update:function(patch){
        var old=cache[t]&&cache[t][id];
        if(!old)return Promise.reject({code:'invalid_argument',message:'introuvable'});
        var d=Object.assign(strip(old),strip(patch));
        cache[t][id]=T[t].plain?d:Object.assign({},d,{_owner:old._owner});
        emit(t);
        return send(t,updQ(t,id,d));
      },
      delete:function(){
        if(cache[t])delete cache[t][id];
        emit(t);
        return sb.from(t).delete().eq(keyCol(t),rowId(t,id)).select(keyCol(t)).then(function(r){
          if(r.error)return fetchTable(t).catch(function(){}).then(function(){throw fail(r.error);});
          if(r.data&&r.data.length)return;
          /* rien supprimé : déjà parti (suppression en cascade) ou refusé. On recharge pour trancher. */
          return fetchTable(t).then(function(){if(cache[t]&&cache[t][id])throw {code:'invalid_argument',message:'refusé'};});
        });
      }
    };
  }
  var db={
    doc:function(path){var i=path.indexOf('/');return ref(path.slice(0,i),path.slice(i+1));},
    collection:function(t){
      if(!T[t])throw new TypeError('collection inconnue : '+t);
      return {
        doc:function(id){return ref(t,id||uuid());},
        onSnapshot:function(next,error){
          var s={next:next,error:error};(subs[t]=subs[t]||[]).push(s);
          if(cache[t])setTimeout(function(){emit(t);},0);
          return function(){subs[t]=(subs[t]||[]).filter(function(x){return x!==s;});};
        }
      };
    }
  };

  /* ---------- connexion ---------- */
  function setUser(session){
    var u=session&&session.user;
    if(!u){me=null;return;}
    var m=u.user_metadata||{}, amr=[];
    /* comment la personne s'est connectée (mot de passe, lien, Google…) : écrit dans son jeton de connexion */
    try{var part=String(session.access_token||'').split('.')[1];if(part){var j=JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g,'+').replace(/_/g,'/')))));amr=(j.amr||[]).map(function(x){return x&&x.method||x;});}}catch(_){}
    me={id:u.id,email:String(u.email||'').toLowerCase(),name:m.full_name||m.name||m.user_name||'',avatar:m.avatar_url||m.picture||'',provider:(u.app_metadata&&u.app_metadata.provider)||'',amr:amr};
  }
  function here(){return location.origin+location.pathname;}
  function init(){
    if(!configured())return Promise.resolve({state:'setup'});
    sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
    return sb.auth.getSession().then(function(r){
      setUser(r&&r.data&&r.data.session);
      sb.auth.onAuthStateChange(function(_ev,session){
        var was=me&&me.id; setUser(session); var now=me&&me.id;
        if(was!==now&&authCb)authCb(me);
      });
      if(me)live();
      return {state:me?'in':'out',recovery:!!(me&&RECOVERY)};
    },function(){return {state:'out'};});
  }
  return {
    init:init, db:db, load:load,
    missing:function(t){return missing[t]||'';},
    me:function(){return me;},
    providers:function(){return (cfg.providers||[]).slice();},
    emailLogin:function(){return cfg.email!==false;},
    onAuth:function(f){authCb=f;},
    signIn:function(provider){return sb.auth.signInWithOAuth({provider:provider,options:{redirectTo:here()}});},
    signInEmail:function(email){return sb.auth.signInWithOtp({email:email,options:{emailRedirectTo:here()}});},
    signInPassword:function(email,pw){return sb.auth.signInWithPassword({email:email,password:pw});},
    signUp:function(email,pw){return sb.auth.signUp({email:email,password:pw,options:{emailRedirectTo:here()}});},
    setPassword:function(pw){return sb.auth.updateUser({password:pw});},
    resetPassword:function(email){return sb.auth.resetPasswordForEmail(email,{redirectTo:here()+'?reset=1'});},
    signOut:function(){cache={};return sb.auth.signOut();},
    /* photos : rangées dans le dossier de leur tâche (stockage Supabase, espace « photos ») */
    photoUpload:function(taskId,blob){
      var path=taskId+'/'+uuid()+'.jpg';
      return sb.storage.from('photos').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false}).then(function(r){
        if(r.error)throw {code:/bucket/i.test(r.error.message||'')?'no_bucket':'unavailable',message:r.error.message};
        return path;
      });
    },
    photoUrls:function(paths){
      return sb.storage.from('photos').createSignedUrls(paths,3600).then(function(r){
        if(r.error)throw r.error;
        var m={};(r.data||[]).forEach(function(x,i){m[paths[i]]=x&&!x.error?x.signedUrl:'';});return m;
      });
    },
    /* fichiers joints : même rangement que les photos, dans l'espace « fichiers » */
    fileUpload:function(taskId,file){
      var safe=String(file.name||'fichier').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w.\-]+/g,'_').replace(/_+/g,'_').slice(-80)||'fichier';
      var path=taskId+'/'+uuid()+'-'+safe;
      return sb.storage.from('fichiers').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false}).then(function(r){
        if(r.error){var m=r.error.message||'';throw {code:/bucket/i.test(m)?'no_bucket':/size|large/i.test(m)?'too_big':'unavailable',message:m};}
        return path;
      });
    },
    fileUrl:function(path,name){
      return sb.storage.from('fichiers').createSignedUrl(path,120,{download:name||true}).then(function(r){if(r.error||!r.data)throw r.error||{};return r.data.signedUrl;});
    },
    fileRemove:function(paths){
      if(!paths||!paths.length)return Promise.resolve();
      return sb.storage.from('fichiers').remove(paths).then(function(){},function(){});
    },
    /* messagerie interne (table « messages ») */
    onMail:function(f){mailCb=f;},
    mailLoad:function(){
      return sb.from('messages').select('id,thread,from_id,from_email,from_name,to_email,subject,body,created_at,read_at,del_from,del_to').order('created_at',{ascending:false}).limit(600).then(function(r){
        if(r.error)throw fail(r.error);
        return r.data||[];
      });
    },
    mailSend:function(m){
      var id=uuid(), row={id:id,thread:m.thread||id,from_email:me.email,from_name:String(m.from_name||'').slice(0,80),to_email:m.to_email,subject:m.subject||'',body:m.body};
      return sb.from('messages').insert(row).select('id,thread,from_id,from_email,from_name,to_email,subject,body,created_at,read_at,del_from,del_to').then(function(r){
        if(r.error)throw fail(r.error);
        if(!r.data||!r.data.length)throw {code:'invalid_argument',message:'refusé'};
        return r.data[0];
      });
    },
    mailPatch:function(ids,patch){
      return sb.from('messages').update(patch).in('id',ids).then(function(r){if(r.error)throw fail(r.error);});
    },
    /* formules : la ligne de la personne connectée (l'admin voit tout) */
    premiumMine:function(email){return sb.from('premium').select('*').eq('email',email).then(function(r){if(r.error)throw fail(r.error);return (r.data||[])[0]||null;});},
    premiumAll:function(){return sb.from('premium').select('*').then(function(r){if(r.error)throw fail(r.error);return r.data||[];});},
    premiumSave:function(row){return sb.from('premium').upsert(row,{onConflict:'email'}).select('email');},
    premiumRemove:function(email){return sb.from('premium').delete().eq('email',email).select('email');},
    isAdmin:function(){return sb.rpc('is_admin').then(function(r){if(r.error)throw r.error;return r.data===true;});},
    photoRemove:function(paths){
      if(!paths||!paths.length)return Promise.resolve();
      return sb.storage.from('photos').remove(paths).then(function(){},function(){});
    }
  };
})();
