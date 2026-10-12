/* On Stride — boucle de rendu, événements, raccourcis, glisser-déposer, démarrage. */
'use strict';

var root=document.body, appEl=document.getElementById('app'), mainEl=document.getElementById('main');

/* ---------- rendu ---------- */
var RQ=0;
function queueRender(){
  if(RQ)return;
  var raf=window.requestAnimationFrame||function(f){return setTimeout(f,16);};
  RQ=raf(function(){RQ=0;render();});
}
function autosize(){
  document.querySelectorAll('textarea.mtitle,textarea.desc').forEach(function(el){el.style.height='auto';if(el.scrollHeight)el.style.height=el.scrollHeight+'px';});
}
/* pendant un rafraîchissement, les champs remplacés envoient un « change » qui n'est pas une vraie validation :
   S.painting permet de les reconnaître (voir js/extras.js et js/people.js) */
function render(){
  if(S.auth!=='in'){renderGate();return;}
  S.painting=true;
  try{paint();}finally{S.painting=false;}
}
function paint(){
  var drafts={};
  document.querySelectorAll('[data-draft]').forEach(function(el){drafts[el.id]=el.value;});
  var a=document.activeElement, fid=a&&a.id, ss=null, se=null;
  try{ss=a.selectionStart;se=a.selectionEnd;}catch(_){}
  var bw=document.querySelector('.boardwrap'), bl=bw?bw.scrollLeft:0;
  var tb=document.querySelector('.tp-b'), tt=tb?tb.scrollTop:0;
  var by=index();
  var ready=Object.keys(S.loaded).every(function(k){return S.loaded[k];});
  tourAuto(ready);
  var ok=validView(by);
  if(S.pending&&ok&&S.view===S.pending)S.pending=null;
  var keep=!ok&&S.hold&&S.view===S.hold;
  if(ready&&!ok&&S.view!==S.pending&&!keep){S.view=(S.view.indexOf('c:')===0&&S.canEdit)?'clients':'home';ok=true;}
  if(S.task&&ready&&!S.hold&&!taskById(S.task))S.task=null;
  if(ready&&ok&&!S.pending){
    var want=by[S.view]?'#p='+S.view:'';
    if((location.hash||'')!==want){try{history.replaceState(null,'',want||location.pathname+location.search);}catch(_){}}
  }
  appEl.dataset.sb=S.sb||(isMid()?'rail':'open');
  if(S.tour!=null&&appEl.dataset.sb==='hidden')appEl.dataset.sb='open';
  appEl.dataset.edit=S.canEdit?'1':'0';
  renderSide(by,ready&&!!S.db); renderTop(by); renderTabbar(by);
  var h='', v=S.view;
  if(!ready)h=skeleton();
  else if(!S.db)h=empty('lock','Connecte-toi à Claude','Il faut être connecté pour voir l’avancée de ces projets.');
  else{
    if(S.error)h+='<div class="note bad"><p>'+(S.error==='no_schema'?'La base de données n’est pas encore initialisée : exécute le fichier supabase/schema.sql dans Supabase (SQL Editor), puis recharge la page.':'Les données ne se chargent pas correctement ('+esc(S.error)+'). Recharge la page.')+'</p></div>';
    if(!ok||v==='home')h+=vHome(by);
    else if(v==='inbox')h+=vInbox(by);
    else if(v==='mail')h+=vMail();
    else if(v==='tasks')h+=vTasks(by);
    else if(v==='calendar')h+=vCalendar(by);
    else if(v==='projects')h+=vProjects(by);
    else if(v==='clients')h+=vClients(by);
    else if(v==='settings')h+=vSettings(by);
    else if(v==='plans')h+=vPlans();
    else if(v==='admin')h+=vAdmin();
    else if(v.indexOf('c:')===0)h+=vClient(S.clients.find(function(c){return 'c:'+c.id===v;}),by);
    else h+=vProject(by[v],by);
  }
  if(!keep)mainEl.innerHTML=tr(h);
  still(mainEl,[S.view,S.det,S.menu,S.iconPick,modeOf(by[S.view]?by[S.view].p:{})].join('|'));
  if(S.lastView!==S.view){
    S.lastView=S.view;
    mainEl.classList.remove('enter');void mainEl.offsetWidth;mainEl.classList.add('enter');
    try{window.scrollTo(0,0);}catch(_){}
  }
  if(S.db&&ready){renderPanel(by);renderOverlay(by);}
  Object.keys(S.dirty).forEach(function(k){var el=document.getElementById(k);if(el&&(k in drafts))el.value=drafts[k];});
  var nbw=document.querySelector('.boardwrap'); if(nbw)nbw.scrollLeft=bl;
  var ntb=document.querySelector('.tp-b'); if(ntb&&!S.taskFresh)ntb.scrollTop=tt;
  if(fid){
    var el=document.getElementById(fid);
    if(el){el.focus({preventScroll:true});try{if(ss!=null)el.setSelectionRange(ss,se);}catch(_){}}
  }
  if(S.focus){var fe=document.getElementById(S.focus);if(fe){fe.focus();}S.focus=null;}
  else if(S.taskFresh){var dg=document.getElementById('dlg');if(dg)dg.focus({preventScroll:true});}
  S.taskFresh=false;
  autosize();
  extraAfter();
  renderTour();
}

/* ---------- clics ---------- */
function cycleSb(mode){
  var cur=appEl.dataset.sb||'open', nx;
  if(mode==='cycle')nx=cur==='open'?'rail':cur==='rail'?'hidden':'open';
  else if(mode==='toggle')nx=cur==='hidden'?'open':'hidden';
  else nx=mode;
  S.sb=nx;LS.set('sb',nx);
}
function moveWidget(k,dir,before){
  var o=dashOrder(), i=o.indexOf(k); if(i<0)return;
  o.splice(i,1);
  var j=before?o.indexOf(before):i+dir;
  if(before&&j<0)j=o.length;
  j=Math.max(0,Math.min(o.length,j));
  o.splice(j,0,k);
  saveCfg({dash:{order:o,hidden:dashHidden()}});
}
root.addEventListener('click',function(ev){
  var b=ev.target.closest('[data-act]');
  if(!b){
    if(S.menu||S.smenu||S.iconPick){S.menu=null;S.smenu=null;S.iconPick=false;render();}
    return;
  }
  var act=b.dataset.act, id=b.dataset.id;
  if(act==='toast-undo'){var fn=TOAST.undo[id];if(fn){delete TOAST.undo[id];fn();}var te=b.closest('.toast');if(te&&te.parentNode)te.parentNode.removeChild(te);return;}
  if(act==='login'){
    S.gate.err='';
    Cloud.signIn(id).then(function(r){if(r&&r.error){S.gate.err=gateErr(r.error);render();}},function(){S.gate.err='Connexion impossible pour le moment.';render();});
    return;
  }
  if(act==='login-email'){
    var em=String((document.getElementById('lg-email')||{}).value||'').trim().toLowerCase();
    if(!validEmail(em)){S.gate.err='Entre une adresse e-mail valide.';render();return;}
    LS.set('lgemail',em);S.gate.sending=true;S.gate.err='';render();
    Cloud.signInEmail(em).then(function(r){S.gate.sending=false;if(r&&r.error)S.gate.err=gateErr(r.error);else{S.gate.sent=em;S.gate.kind='link';}render();},function(){S.gate.sending=false;S.gate.err='Envoi impossible pour le moment.';render();});
    return;
  }
  if(act==='lang'){I18N.set(id);if(S.auth==='in')closeOverlays();render();return;}
  if(act==='pw-eye'){var pf=document.querySelector('.pwbox input');var pos=pf?pf.selectionStart:null;S.gate.show=!S.gate.show;render();var nf=document.querySelector('.pwbox input');if(nf){nf.focus();try{if(pos!=null)nf.setSelectionRange(pos,pos);}catch(_){}}return;}
  if(act==='login-forgot'){S.gate.forgot=id==='1';S.gate.signup=false;S.gate.err='';render();var fe=document.getElementById('lg-email');if(fe&&S.gate.forgot)fe.focus();return;}
  if(act==='login-forgot-send'){
    var fm=String((document.getElementById('lg-email')||{}).value||'').trim().toLowerCase();
    if(!validEmail(fm)){S.gate.err='Entre une adresse e-mail valide.';render();return;}
    LS.set('lgemail',fm);S.gate.sending=true;S.gate.err='';render();
    Cloud.resetPassword(fm).then(function(r){S.gate.sending=false;if(r&&r.error)S.gate.err=gateErr(r.error);else{S.gate.sent=fm;S.gate.kind='reset';S.gate.forgot=false;}render();},function(){S.gate.sending=false;S.gate.err='Envoi impossible pour le moment.';render();});
    return;
  }
  if(act==='reset-save'){
    var rv=String((document.getElementById('rs-pw')||{}).value||'');
    if(rv.length<8){S.gate.err='Mot de passe trop court : 8 caractères au minimum.';render();return;}
    S.gate.sending=true;S.gate.err='';render();
    Cloud.setPassword(rv).then(function(r){
      S.gate.sending=false;
      if(r&&r.error){S.gate.err=gateErr(r.error);render();return;}
      LS.set('haspw',S.me.email);LS.set('lgmode','pw');S.pwJustSet=true;cleanUrl();startApp();
      toast('Mot de passe enregistré. La prochaine fois, connecte-toi avec « Mot de passe ».');
    },function(){S.gate.sending=false;S.gate.err='Enregistrement impossible. Réessaie dans un instant.';render();});
    return;
  }
  if(act==='reset-skip'){cleanUrl();S.gate.err='';startApp();return;}
  if(act==='login-mode'){S.gate.mode=id==='pw'?'pw':'link';S.gate.err='';S.gate.signup=false;S.gate.forgot=false;LS.set('lgmode',S.gate.mode);render();return;}
  if(act==='login-signup'){S.gate.signup=id==='1';S.gate.err='';render();return;}
  if(act==='login-pw'){
    var pe=String((document.getElementById('lg-email')||{}).value||'').trim().toLowerCase(), pw=String((document.getElementById('lg-pw')||{}).value||'');
    if(!validEmail(pe)){S.gate.err='Entre une adresse e-mail valide.';render();return;}
    if(S.gate.signup&&pw.length<8){S.gate.err='Mot de passe trop court : 8 caractères au minimum.';render();return;}
    if(!pw){S.gate.err='Écris ton mot de passe.';render();return;}
    LS.set('lgemail',pe);S.gate.sending=true;S.gate.err='';render();
    var fin=function(r){
      S.gate.sending=false;
      if(r&&r.error){S.gate.err=gateErr(r.error);render();return;}
      var d=(r&&r.data)||{};
      if(S.gate.signup&&!d.session){
        /* le serveur ne dit pas qu'un compte existe déjà : il renvoie une personne sans identité */
        if(d.user&&d.user.identities&&!d.user.identities.length){S.gate.err='Un compte existe déjà avec cette adresse. Connecte-toi par « Lien par e-mail », puis choisis un mot de passe dans Réglages.';render();return;}
        S.gate.sent=pe;S.gate.kind='confirm';render();return;
      }
      LS.set('lgmode','pw');LS.set('haspw',pe);
      setTimeout(function(){if(S.auth!=='in')location.reload();},600);   /* normalement la page se recharge toute seule dès la connexion */
    };
    LS.set('lgmode','pw');
    (S.gate.signup?Cloud.signUp(pe,pw):Cloud.signInPassword(pe,pw)).then(fin,function(){S.gate.sending=false;S.gate.err='Connexion impossible pour le moment.';render();});
    return;
  }
  if(act==='login-back'){S.gate.sent='';S.gate.err='';S.gate.signup=false;S.gate.forgot=false;render();return;}
  if(act==='logout'){var bye=function(){location.reload();};Cloud.signOut().then(bye,bye);return;}
  if(S.auth!=='in')return;
  if(tourClick(act))return;
  if(notifClick(act,id))return;
  if(planClick(act,id,b))return;
  if(extraClick(act,id,b))return;
  if(act==='ov-bg'){if(ev.target===b){closeOverlays();render();}return;}
  if(act==='bg'){closeTask();render();return;}
  var inOverlay=!!b.closest('#overlay');
  if(inOverlay&&act!=='qa-ok'&&act!=='ctx-prio'&&act!=='photo-nav')closeOverlays();
  if(['del-project','coldel','spdel','del-client','demo-del'].indexOf(act)<0)S.confirm=null;
  if(['colmenu','colmove','coldone','coldel'].indexOf(act)<0)S.menu=null;
  if(['spmenu','spdel','spren'].indexOf(act)<0)S.smenu=null;
  if(act!=='iconpick')S.iconPick=false;
  var t=id?taskById(id):null;

  if(act==='ov-close'){render();return;}
  if(act==='pal'){openPal();render();return;}
  if(act==='sheet'){closeOverlays();S.sheet=id;render();return;}
  if(act==='sb'){cycleSb(id);render();return;}
  if(act==='pref'){setPref(b.dataset.k,id);render();return;}
  if(act==='preview'){if(!S.owner)return;S.preview=!S.preview;S.task=null;S.dashEdit=false;rebuild();render();return;}
  if(act==='view'){go(id);render();return;}
  if(act==='open-doc'){go(id);S.pmode[id]='doc';persist();render();return;}
  if(act==='sec'){S.coll._sec=!S.coll._sec;persist();render();return;}
  if(act==='spc'){S.coll[id]=!S.coll[id];persist();render();return;}
  if(act==='mode'){var cp=projById(S.view);if(cp){S.pmode[cp.id]=id;S.comp=null;persist();}render();return;}
  if(act==='sort'){S.sort=S.sort.k===id?{k:id,d:-S.sort.d}:{k:id,d:1};render();return;}
  if(act==='calnav'){
    var now=new Date(), c=S.cal||{y:now.getFullYear(),m:now.getMonth()}, n=parseInt(id,10);
    S.cal=n===0?{y:now.getFullYear(),m:now.getMonth()}:(function(){var d=new Date(c.y,c.m+n,1);return {y:d.getFullYear(),m:d.getMonth()};})();
    render();return;
  }
  if(act==='calmode'){S.calMode=id;render();return;}
  if(act==='pf'){S.pf=id;render();return;}
  if(act==='fl'){S.fl=S.fl===id?null:id;render();return;}
  if(act==='cancel'){render();return;}
  if(act==='open'&&t){openTask(t.id);render();return;}
  if(act==='close'){closeTask();render();return;}
  if(act==='photo-open'&&S.task){closeOverlays();S.photo={id:S.task,i:parseInt(b.dataset.item,10)||0};render();return;}
  if(act==='photo-nav'&&S.photo){var pn=(taskById(S.photo.id)||{}).photos||[];if(pn.length)S.photo.i=(S.photo.i+parseInt(id,10)+pn.length)%pn.length;render();return;}
  if(act==='nlc'){S.nlc=parseInt(id,10)||0;render();return;}
  if(act==='label-mgr'){S.lblMgr=!S.lblMgr;render();return;}
  if(act==='det'){S.det=!S.det;LS.set('det',S.det);render();return;}
  if(!S.canEdit||!S.db){render();return;}

  /* --- actions d'édition --- */
  if(act==='tf'){S.tf=id;if(S.view!=='tasks')go('tasks');render();return;}
  if(act==='tv'){S.tv=id;persist();render();return;}
  if(act==='qa'){openQa();render();return;}
  if(act==='qa-date'){openQa({due:id,pid:b.dataset.pid||(projById(S.view)?S.view:'')});render();return;}
  if(act==='qa-ok'){
    var q=qaParsed();
    if(!q.title){var qi=document.getElementById('qat');if(qi)qi.focus();return;}
    closeOverlays();quickCreate(q);render();return;
  }
  if(act==='qa-create'){var qq=parseQuick(id||S.pq,S.projects);S.pq='';if(qq.title)quickCreate(qq);render();return;}
  if(act==='new-project'){go('projects');S.pf='active';S.focus='npp';render();return;}
  if(act==='new-client'){go('clients');S.focus='ncl';render();return;}
  if(act==='dash-edit'){S.dashEdit=!S.dashEdit;render();return;}
  if(act==='w-move'){moveWidget(id,parseInt(b.dataset.dir,10));render();return;}
  if(act==='w-toggle'){
    var hd=dashHidden().slice(), wi=hd.indexOf(id);
    if(wi>=0)hd.splice(wi,1); else hd.push(id);
    saveCfg({dash:{order:dashOrder(),hidden:hd}});render();return;
  }
  if(act==='onb-done'){saveCfg({onboarded:true});render();return;}
  if(act==='export'){exportData();return;}
  if(act==='pw-go'){go('settings');S.focus='st-pw';render();return;}
  if(act==='pw-later'){LS.set('pwtip',1);render();return;}
  if(act==='pw-save'){
    var pi=document.getElementById('st-pw'), nv=pi?pi.value:'';
    if(nv.length<8){toast('Mot de passe trop court : 8 caractères au minimum.',{bad:true});if(pi)pi.focus();return;}
    Cloud.setPassword(nv).then(function(r){
      if(r&&r.error){toast(gateErr(r.error),{bad:true});return;}
      var el=document.getElementById('st-pw');if(el){el.value='';}delete S.dirty['st-pw'];
      LS.set('haspw',S.me.email);LS.set('lgmode','pw');saveCfg({pwSet:true});
      toast('Mot de passe enregistré. La prochaine fois, connecte-toi avec « Mot de passe ».');render();
    },function(){toast('Enregistrement impossible. Réessaie dans un instant.',{bad:true});});
    return;
  }
  if(act==='inbox-clear'){
    var dn=inboxTasks().filter(function(x){return x.done;});
    run(function(){var ch=Promise.resolve();dn.forEach(function(x){ch=ch.then(function(){return S.db.doc(PRIV+'tasks/'+x.id).delete();});});return ch;});
    return;
  }
  if(act==='addspace'){S.addSpace=!S.addSpace;S.focus=S.addSpace?'ns':null;render();return;}
  if(act==='addproj'){S.addIn=S.addIn===id?null:id;S.coll[id]=false;S.focus=S.addIn?('np-'+id):null;render();return;}
  if(act==='spmenu'){S.smenu=S.smenu===id?null:id;render();return;}
  if(act==='spren'){S.ren=id;S.smenu=null;S.focus='sn-'+id;render();return;}
  if(act==='spdel'){if(S.confirm==='s:'+id)deleteSpace(id); else{S.confirm='s:'+id;}render();return;}
  if(act==='demo-del'){if(S.confirm==='demo')delDemo(); else{S.confirm='demo';}render();return;}
  if(act==='del-client'){if(S.confirm==='k:'+id)delClient(id); else{S.confirm='k:'+id;}render();return;}

  /* --- tâches --- */
  if(act==='toggle'&&t){toggleTask(t,index()[t.projectId]||null);return;}
  if(act==='next'&&t){
    var ne=index()[t.projectId], ni=ne.cols.findIndex(function(c){return c.id===t._col;}), nc=ne.cols[ni+1];
    if(nc){moveTask(ne,t.id,nc.id,Date.now());toast('Déplacée dans « '+nc.name+' ».');}
    return;
  }
  if(act==='del-task'&&t){if(S.task===t.id)closeTask();deleteTask(t);render();return;}
  if(act==='dup'&&t){
    var d=clean(t);d.title=(d.title||'')+T(' (copie)');d.pos=Date.now();d.createdAt=Date.now();d.log=[];delete d.photos;delete d.files;d.act=[{t:'Carte dupliquée',at:Date.now()}];
    run(function(){return S.db.collection(realm(t.projectId)+'tasks').doc().set(d);});toast('Carte dupliquée.');render();return;
  }
  if(act==='ctx-prio'&&t){
    var pv=parseInt(b.dataset.v,10)||0;
    run(function(){return tdoc(t.id).update({prio:pv,urgent:pv===3,act:actOf(t,'Priorité : '+PRIO[pv].toLowerCase())});});
    closeOverlays();render();return;
  }
  if(act==='ctx-col'&&t){var ce=index()[t.projectId];if(ce)moveTask(ce,t.id,b.dataset.col,Date.now());render();return;}

  /* --- projet courant --- */
  var e=curE();
  if(e){
    if(act==='share'&&(e.own||e.mgr)){
      S.det=true;LS.set('det',true);S.focus='m-email';render();
      var shEl=document.getElementById('share');if(shEl&&shEl.scrollIntoView)shEl.scrollIntoView({block:'center'});
      return;
    }
    if(act==='m-add'){
      var mi=document.getElementById('m-email'), mr=document.getElementById('m-role');
      if(mi&&addMember(e.p.id,mi.value,mr?mr.value:'viewer')){mi.value='';delete S.dirty['m-email'];}
      render();return;
    }
    if(act==='m-client'){var mc=clientOf(e.p);if(mc)addMember(e.p.id,mc.email,id);render();return;}
    if(act==='m-del'){removeMember(id);render();return;}
    if(act==='copy-link'){
      var link=location.origin+location.pathname+'#p='+e.p.id;
      try{navigator.clipboard.writeText(link).then(function(){toast('Lien copié.');},function(){toast(link);});}catch(_){toast(link);}
      return;
    }
    if(act==='fav'){toggleFav(e.p);render();return;}
    if(act==='tpl'&&TPL[id]){saveCols(e.p.id,tplCols(id));return;}
    if(act==='comp-open'){S.comp=id;S.focus='cmp-'+id;render();return;}
    if(act==='comp-close'){S.comp=null;render();return;}
    if(act==='comp-add'){
      var ta=document.getElementById('cmp-'+id), v=ta?ta.value.trim():'';
      if(!v){if(ta)ta.focus();return;}
      ta.value='';delete S.dirty[ta.id];S.focus=ta.id;addTask(e.p.id,v,id);return;
    }
    if(act==='iconpick'){S.iconPick=!S.iconPick;render();return;}
    if(act==='seticon'){run(function(){return pdoc(e.p.id).update({icon:id||''});});render();return;}
    if(act==='colmenu'){S.menu=S.menu===id?null:id;render();return;}
    if(act==='colmove'){S.menu=null;moveColumn(e,id,parseInt(b.dataset.dir,10));return;}
    if(act==='coldone'){S.menu=null;saveCols(e.p.id,e.cols.map(function(c){return c.id===id?{id:c.id,name:c.name,done:!c.done}:c;}));return;}
    if(act==='coldel'){if(S.confirm==='c:'+id)deleteColumn(e,id); else{S.confirm='c:'+id;}render();return;}
    if(act==='color'){run(function(){return pdoc(e.p.id).update({hue:parseInt(id,10)||0});});return;}
    if(act==='del-project'){if(S.confirm==='p:'+id)delProject(id); else{S.confirm='p:'+id;}render();return;}
  }

  /* --- tâche ouverte --- */
  var mt=S.task?taskById(S.task):null, me=mt?index()[mt.projectId]:null;
  if(!mt){render();return;}
  var item=b.dataset.item;
  if(act==='file-add'){if(!canW(me))return;var fin2=document.getElementById('file-in');if(fin2){fin2.dataset.task=mt.id;fin2.value='';fin2.click();}return;}
  if(act==='file-dl'){downloadFile(mt,item);return;}
  if(act==='file-del'){if(canW(me))removeFile(mt,item);return;}
  if(act==='photo-add'){if(!canW(me))return;var pin=document.getElementById('photo-in');if(pin){pin.dataset.task=mt.id;pin.value='';pin.click();}return;}
  if(act==='photo-del'){if(canW(me))removePhoto(mt,item);return;}
  if(act==='ck-toggle'){
    var arr=(mt.check||[]).map(function(i){return i.id===item?{id:i.id,t:i.t,d:!i.d}:i;}), patch={check:arr};
    if(arr.length&&arr.every(function(i){return i.d;}))patch.act=actOf(mt,'Checklist terminée');
    run(function(){return tdoc(mt.id).update(patch);});return;
  }
  if(act==='ck-del'){run(function(){return tdoc(mt.id).update({check:(mt.check||[]).filter(function(i){return i.id!==item;})});});return;}
  if(act==='cmt-del'){run(function(){return tdoc(mt.id).update({log:(mt.log||[]).filter(function(i){return i.id!==item;})});});return;}
  if(!me){render();return;}
  var p=me.p;
  if(act==='label-toggle'){
    var cur=mt.labels||[], nxt=cur.indexOf(id)>=0?cur.filter(function(x){return x!==id;}):cur.concat([id]);
    run(function(){return tdoc(mt.id).update({labels:nxt});});return;
  }
  if(act==='label-del'){
    var rest=(p.labels||[]).filter(function(l){return l.id!==id;});
    run(function(){
      var chain=pdoc(p.id).update({labels:rest});
      S.tasks.forEach(function(x){if(x.projectId===p.id&&(x.labels||[]).indexOf(id)>=0){chain=chain.then(function(){return tdoc(x.id).update({labels:x.labels.filter(function(y){return y!==id;})});});}});
      return chain;
    });return;
  }
  if(act==='label-add'){
    var inp=document.getElementById('nl'), name=inp?inp.value.trim():'';
    var lab={id:'l'+rnd(),name:name,c:S.nlc};
    if(inp){inp.value='';delete S.dirty.nl;}
    run(function(){return pdoc(p.id).update({labels:(p.labels||[]).concat([lab])});});return;
  }
  render();
});

/* ---------- saisie ---------- */
root.addEventListener('input',function(ev){
  var el=ev.target; if(!el||!el.id)return;
  if(el.id==='q'){S.q=el.value;render();return;}
  if(el.id==='adm-q'){S.admQ=el.value;render();return;}
  if(el.id==='pq'){S.pq=el.value;S.pi=0;paintPal();return;}
  if(el.id==='qat'&&S.qa){S.qa.text=el.value;var qc=document.getElementById('qa-chips');if(qc)qc.innerHTML=tr(qaChips());return;}
  if(el.hasAttribute&&el.hasAttribute('data-draft'))S.dirty[el.id]=true;
  if(el.tagName==='TEXTAREA'&&(el.classList.contains('mtitle')||el.classList.contains('desc')))autosize();
});
root.addEventListener('change',function(ev){
  var el=ev.target, k=el.dataset&&el.dataset.change; if(!k)return;
  if(el.id)delete S.dirty[el.id];
  var id=el.dataset.id, v=el.value;
  if(k==='calproj'){S.calProj=v;render();return;}
  if(k==='qapid'){if(S.qa){S.qa.pid=v;var qc=document.getElementById('qa-chips');if(qc)qc.innerHTML=tr(qaChips());}return;}
  if(!S.canEdit||!S.db)return;
  if(extraChange(k,id,v,el))return;
  var e=curE(), t=id?taskById(id):null;
  function num(x){var n=parseFloat(String(x).replace(',','.'));return isNaN(n)||n<0?0:n;}
  if(k==='mrole'){setMemberRole(id,v);}
  else if(k==='ttitle'){v=v.replace(/\s+/g,' ').trim();if(!v){render();return;}run(function(){return tdoc(id).update({title:v});});}
  else if(k==='tdue'&&t){run(function(){return tdoc(id).update({due:v||'',act:actOf(t,v?'Échéance : '+fmtDate(v):'Échéance retirée')});});}
  else if(k==='tdesc'){run(function(){return tdoc(id).update({notes:v});});}
  else if(k==='tprio'&&t){var pn=parseInt(v,10)||0;run(function(){return tdoc(id).update({prio:pn,urgent:pn===3,act:actOf(t,'Priorité : '+PRIO[pn].toLowerCase())});});}
  else if(k==='twho'&&t){v=v.trim();run(function(){return tdoc(id).update({who:v,act:actOf(t,v?'Assignée à '+v:'Plus assignée')});});}
  else if(k==='file'){if(v){if(S.task===id)closeTask();fileTask(id,v);render();}}
  else if(k==='pname'){v=v.trim();if(!v){render();return;}run(function(){return pdoc(id).update({name:v});});}
  else if(k==='pdesc'){run(function(){return pdoc(id).update({desc:v.trim()});});}
  else if(k==='pdoc'){run(function(){return pdoc(id).update({doc:v});});}
  else if(k==='pstatus'){var ps0=projById(id);if(ps0&&pstat(ps0)==='archived'&&v!=='archived'&&!canAddProject()){upsell('projects');return;}run(function(){return pdoc(id).update({status:v});});}
  else if(k==='pstart'){run(function(){return pdoc(id).update({start:v||''});});}
  else if(k==='pdead'){run(function(){return pdoc(id).update({deadline:v||''});});}
  else if(k==='pdefview'){S.pmode[id]=v;persist();run(function(){return pdoc(id).update({defView:v});});}
  else if(k==='pclient'){setMeta(id,{clientId:v||''});}
  else if(k==='pamount'){setMeta(id,{amount:v===''?'':num(v)});}
  else if(k==='ppaid'){setMeta(id,{paid:v===''?'':num(v)});}
  else if(k==='pnotes'){setMeta(id,{pnotes:v});}
  else if(k==='cfgname'){saveCfg({name:v.trim()});render();}
  else if(k==='cfgnotes'){saveCfg({notes:v});}
  else if(k==='cf'){
    var f=el.dataset.f, patch={}; v=(f==='notes')?v:v.trim();
    if(f==='name'&&!v){render();return;}
    patch[f]=v;run(function(){return cdoc(id).update(patch);});
  }
  else if(k==='sname'){S.ren=null;v=v.trim();if(!v){render();return;}run(function(){return sdoc(id).update({name:v});});render();}
  else if(k==='cname'&&e){
    v=v.trim();if(!v){render();return;}
    saveCols(e.p.id,e.cols.map(function(c){return c.id===id?{id:c.id,name:v,done:c.done}:c;}));
  }
  else if(k==='mcol'&&t){var te=index()[t.projectId]; if(te)moveTask(te,id,v,Date.now());}
  else if(k==='ckt'){
    var mt=S.task?taskById(S.task):null; if(!mt)return; v=v.trim();
    var item=el.dataset.item;
    var arr=v?(mt.check||[]).map(function(i){return i.id===item?{id:i.id,t:v,d:i.d}:i;}):(mt.check||[]).filter(function(i){return i.id!==item;});
    run(function(){return tdoc(mt.id).update({check:arr});});
  }
});

/* ---------- clavier ---------- */
function typing(el){return el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable);}
root.addEventListener('keydown',function(ev){
  var el=ev.target, key=ev.key, mod=ev.ctrlKey||ev.metaKey;
  if(S.auth!=='in'){
    if(key==='Enter'&&el.id==='lg-email'){ev.preventDefault();var lp=document.getElementById('lg-pw'), lb=document.querySelector('[data-act="login-email"],[data-act="login-forgot-send"]');if(lp)lp.focus();else if(lb)lb.click();}
    if(key==='Enter'&&el.id==='rs-pw'){ev.preventDefault();var lr=document.querySelector('[data-act="reset-save"]');if(lr)lr.click();}
    if(key==='Enter'&&el.id==='lg-pw'){ev.preventDefault();var lq=document.querySelector('[data-act="login-pw"]');if(lq)lq.click();}
    return;
  }
  if(KEYS.rec){keysRecord(ev);return;}   /* on attend la nouvelle combinaison d'un raccourci */
  if(tourKey(ev))return;
  if(extraKey(ev))return;
  if(keysHandle(ev))return;   /* raccourcis modifiables : js/keys.js */
  if(key==='Escape'){
    if(S.upsell||S.photo||S.pal||S.qa||S.sheet||S.ctx){closeOverlays();render();return;}
    if(S.comp||S.addSpace||S.addIn||S.ren||S.smenu||S.menu||S.iconPick){S.comp=null;S.addSpace=false;S.addIn=null;S.ren=null;S.smenu=null;S.menu=null;S.iconPick=false;render();return;}
    if(S.task){closeTask();render();return;}
    if(S.dashEdit){S.dashEdit=false;render();return;}
    return;
  }
  if(S.photo){
    if(key==='ArrowLeft'||key==='ArrowRight'){ev.preventDefault();var ps=(taskById(S.photo.id)||{}).photos||[];if(ps.length){S.photo.i=(S.photo.i+(key==='ArrowRight'?1:-1)+ps.length)%ps.length;render();}}
    return;
  }
  if(S.pal){
    if(key==='ArrowDown'||key==='ArrowUp'){
      ev.preventDefault();
      var n=document.querySelectorAll('#pal-res .pi').length; if(!n)return;
      S.pi=(S.pi+(key==='ArrowDown'?1:-1)+n)%n;paintPal();return;
    }
    if(key==='Enter'){ev.preventDefault();var on=document.querySelector('#pal-res .pi.on');if(on)on.click();return;}
    return;
  }
  if(S.qa&&key==='Enter'&&el.id==='qat'){ev.preventDefault();var okb=document.querySelector('[data-act="qa-ok"]');if(okb)okb.click();return;}
  if(!typing(el)&&!mod&&!ev.altKey&&S.db){
    if((key==='Enter'||key===' ')&&el.dataset&&(el.dataset.act==='open'||el.dataset.act==='view')&&el.tagName!=='BUTTON'){ev.preventDefault();el.click();return;}
  }
  if(key!=='Enter'||ev.isComposing)return;
  if(el.tagName==='TEXTAREA'&&el.classList.contains('mtitle')){ev.preventDefault();el.blur();return;}
  if(el.dataset&&el.dataset.add&&S.canEdit&&S.db){
    if(el.tagName==='TEXTAREA'&&ev.shiftKey)return;
    ev.preventDefault();
    var v=el.value.trim(); if(!v)return;
    el.value='';delete S.dirty[el.id];
    var kind=el.dataset.add;
    if(folderEnter(kind,el,v))return;
    if(kind==='project')addProject(v,el.dataset.space||'_');
    else if(kind==='cproject')addProject(v,'_',{priv:true,clientId:el.dataset.client,tpl:'client'});
    else if(kind==='client')addClient(v);
    else if(kind==='space')addSpace(v);
    else if(kind==='task')addTask(el.dataset.pid,v,el.dataset.col);
    else if(kind==='inbox'){var q=parseQuick(v,S.projects);if(q.title)quickCreate(q);}
    else if(kind==='column'){var e=curE();if(e)addColumn(e,v);}
    else if(kind==='member'){var se=curE(), sr=document.getElementById('m-role');if(se)addMember(se.p.id,v,sr?sr.value:'viewer');render();}
    else if(kind==='who'){whoAdd(el.dataset.k==='p'?'p':'t',el.dataset.id,v);S.focus=el.id;}
    else if(kind==='check'||kind==='cmt'){
      var mt=S.task?taskById(S.task):null;
      if(mt&&kind==='check')run(function(){return tdoc(mt.id).update({check:(mt.check||[]).concat([{id:rnd(),t:v,d:false}])});});
      if(mt&&kind==='cmt')run(function(){return tdoc(mt.id).update({log:(mt.log||[]).concat([{id:rnd(),t:v,at:Date.now(),uid:S.me&&S.me.id}]),act:actOf(mt,'Commentaire ajouté')});});
    }
    return;
  }
  if(el.tagName==='INPUT'&&el.dataset&&el.dataset.change&&el.type!=='date'){el.blur();}
});
root.addEventListener('contextmenu',function(ev){
  var c=ev.target.closest&&ev.target.closest('[data-card]'); if(!c||!S.canEdit||typing(ev.target))return;
  var ct=taskById(c.dataset.id); if(!ct||!canW(index()[ct.projectId]||null))return;
  ev.preventDefault();
  closeOverlays();S.ctx={id:c.dataset.id,x:ev.clientX,y:ev.clientY};renderOverlay(index());
});

/* ---------- glisser-déposer : cartes, calendrier, blocs du tableau de bord ---------- */
var drag={kind:null,id:null,col:null,idx:0,ph:null};
function clearDrag(){
  if(drag.ph&&drag.ph.parentNode)drag.ph.parentNode.removeChild(drag.ph);
  drag.ph=null;
  document.querySelectorAll('.over').forEach(function(c){c.classList.remove('over');});
  document.querySelectorAll('.dragging').forEach(function(c){c.classList.remove('dragging');});
}
root.addEventListener('dragstart',function(ev){
  var c=ev.target.closest&&ev.target.closest('[data-drag]'); if(!c||!S.canEdit)return;
  drag.kind=c.dataset.drag; drag.id=c.dataset.id||c.dataset.w;
  try{ev.dataTransfer.setData('text/plain',drag.id);ev.dataTransfer.effectAllowed='move';}catch(_){}
  setTimeout(function(){c.classList.add('dragging');},0);
});
root.addEventListener('dragover',function(ev){
  if(!drag.id||!S.canEdit)return;
  var tg=ev.target.closest&&ev.target.closest(drag.kind==='task'?'[data-drop]':drag.kind==='cal'?'[data-date]':'[data-w]'); if(!tg)return;
  ev.preventDefault();
  document.querySelectorAll('.over').forEach(function(c){if(c!==tg)c.classList.remove('over');});
  tg.classList.add('over');
  if(drag.kind!=='task')return;
  var box=tg.querySelector('[data-cards]'); if(!box)return;
  var cards=[].slice.call(box.querySelectorAll('[data-drag]')).filter(function(c){return c.dataset.id!==drag.id;});
  var idx=0;
  cards.forEach(function(c,i){var r=c.getBoundingClientRect();if(ev.clientY>r.top+r.height/2)idx=i+1;});
  drag.col=tg.dataset.drop;drag.idx=idx;
  if(!drag.ph){drag.ph=document.createElement('div');drag.ph.className='dropline';}
  box.insertBefore(drag.ph,cards[idx]||null);
});
root.addEventListener('drop',function(ev){
  if(!drag.id||!S.canEdit)return;
  var kind=drag.kind, id=drag.id;
  var tg=ev.target.closest&&ev.target.closest(kind==='task'?'[data-drop]':kind==='cal'?'[data-date]':'[data-w]');
  if(!tg){clearDrag();drag.id=null;return;}
  ev.preventDefault();
  var cid=drag.col||tg.dataset.drop, idx=drag.idx;
  clearDrag();drag.id=null;
  if(kind==='w'){if(tg.dataset.w!==id)moveWidget(id,0,tg.dataset.w);render();return;}
  var t=taskById(id); if(!t)return;
  if(kind==='cal'){
    var date=tg.dataset.date;
    if(date&&date!==t.due)run(function(){return tdoc(id).update({due:date,act:actOf(t,'Échéance : '+fmtDate(date))});});
    return;
  }
  var e=index()[t.projectId]; if(!e||!e.by[cid])return;
  var list=e.by[cid].filter(function(x){return x.id!==id;}).sort(cmpPos);
  var prev=list[idx-1], next=list[idx], pos;
  if(prev&&next)pos=(posOf(prev)+posOf(next))/2;
  else if(prev)pos=posOf(prev)+1000;
  else if(next)pos=posOf(next)-1000;
  else pos=Date.now();
  moveTask(e,id,cid,pos);
});
root.addEventListener('dragend',function(){clearDrag();drag.id=null;});

/* le sélecteur de photos vit hors des zones redessinées : il survit à un rafraîchissement pendant que la galerie du téléphone est ouverte */
(function(){
  var pin=document.getElementById('photo-in'); if(!pin)return;
  pin.addEventListener('change',function(){
    var id=pin.dataset.task, files=[].slice.call(pin.files||[]);
    pin.value='';
    if(id&&files.length&&S.canEdit&&S.db)addPhotos(id,files);
  });
  var fin=document.getElementById('file-in'); if(!fin)return;
  fin.addEventListener('change',function(){
    var id=fin.dataset.task, files=[].slice.call(fin.files||[]);
    fin.value='';
    if(id&&files.length&&S.canEdit&&S.db)addFiles(id,files);
  });
})();

/* ---------- démarrage ---------- */
function snapList(snap,priv){
  return snap.docs.map(function(d){
    var o=JSON.parse(JSON.stringify(d.data()||{}));
    o.id=d.id; if(priv)o._priv=true; return o;
  });
}
function sub(path,key,priv){
  S.db.collection(path).onSnapshot(function(snap){
    var list=snapList(snap,priv);
    try{notifDiff(key,list);}catch(_){}
    S.raw[key]=list;S.loaded[key]=true;rebuild();queueRender();
  },function(e){
    S.error=(e&&e.code)||'erreur';
    S.loaded[key]=true;rebuild();queueRender();
  });
}
function allLoaded(){Object.keys(S.loaded).forEach(function(k){S.loaded[k]=true;});}
function cleanUrl(){try{history.replaceState(null,'',location.pathname+(location.hash&&!/access_token|type=recovery/.test(location.hash)?location.hash:''));}catch(_){}}
function deepLink(){var x=(location.hash||'').match(/^#p=([\w-]+)/);return x?x[1]:null;}
function startApp(){
  S.me=Cloud.me();S.db=Cloud.db;S.auth='in';
  document.getElementById('gate').innerHTML='';document.getElementById('gate')._h=null;document.body.classList.remove('gated');
  rebuild();
  var next=deepLink();
  try{if(!next)next=sessionStorage.getItem('av.next');sessionStorage.removeItem('av.next');}catch(_){}
  if(next){S.view=next;S.pending=next;}
  sub('spaces','s');sub('projects','p');sub('tasks','t');sub('clients','c');sub('meta','m');sub('settings','cfg');sub('members','mb');
  render();
  NOTIF.seen=null;NOTIF.members=null;notifStart();mailStart();
  Cloud.load().then(function(){
    loadPlan();
    setTimeout(notifDaily,2500);
    if(S.pwJustSet||(hasPw()&&!S.cfg.pwSet)){S.pwJustSet=false;saveCfg({pwSet:true});}
    if(next&&S.pending===next&&!validView(index())){
      S.pending=null;S.view='home';
      toast(tf('Ce projet n’existe pas, ou il n’est pas partagé avec ton adresse ({0}).',S.me.email),{bad:true});
      render();
    }
  },function(e){S.error=(e&&e.code==='no_schema')?'no_schema':((e&&e.message)||'erreur');allLoaded();render();});
}
async function init(){
  applyPrefs();
  notifInitSW();
  S.online=navigator.onLine!==false;
  /* lien de projet collé dans un onglet où l'appli est déjà ouverte */
  window.addEventListener('hashchange',function(){var x=deepLink();if(x&&S.auth==='in'&&x!==S.view&&projById(x)){go(x);render();}});
  window.addEventListener('online',function(){S.online=true;paintSave();});
  window.addEventListener('offline',function(){S.online=false;paintSave();});
  /* sur téléphone, faire défiler la page ou ouvrir le clavier change la hauteur : on ne redessine que si la largeur change */
  var lastW=window.innerWidth;
  window.addEventListener('resize',function(){if(window.innerWidth===lastW)return;lastW=window.innerWidth;queueRender();});
  try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){applyPrefs();queueRender();});}catch(_){}
  render();
  var st=await Cloud.init();
  Cloud.onAuth(function(){location.reload();});
  if(st.state==='in'){if(st.recovery){S.me=Cloud.me();S.auth='reset';render();return;}startApp();return;}
  var next=deepLink();
  if(next){try{sessionStorage.setItem('av.next',next);}catch(_){}}
  var er=(location.hash+location.search).match(/error_description=([^&]+)/);
  if(er){try{S.gate.err=gateErr(decodeURIComponent(er[1].replace(/\+/g,' ')));}catch(_){}}
  S.auth=st.state;render();
}
init();
