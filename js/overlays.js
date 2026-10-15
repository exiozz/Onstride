/* On Stride — surcouches : panneau de tâche, palette de commandes, ajout rapide, feuilles mobiles, menu contextuel. */
'use strict';

/* ---------- panneau de tâche ---------- */
/* catégories des demandes du client (éléments de checklist marqués k) */
var CKREQ={
  add:{n:'À rajouter',ic:'plus',ph:'Ce que le client veut ajouter, puis Entrée',done:'Tout est rajouté'},
  mod:{n:'À modifier',ic:'repeat',ph:'Ce que le client veut changer, puis Entrée',done:'Tout est modifié'},
  del:{n:'À supprimer',ic:'trash',ph:'Ce que le client veut retirer, puis Entrée',done:'Tout est supprimé'}
};
var CKREQ_ORDER=['add','mod','del'];
function ckListH(items,ed){
  return '<ul class="ck">'+items.map(function(i){
    var iid=esc(i.id);
    if(!ed)return '<li class="cki"><span class="chk sm'+(i.d?' on':'')+'">'+CHECK+'</span><span class="'+(i.d?'struck':'')+'">'+esc(i.t)+'</span></li>';
    return '<li class="cki"><button class="chk sm'+(i.d?' on':'')+'" data-act="ck-toggle" data-item="'+iid+'" aria-pressed="'+(i.d?'true':'false')+'" aria-label="'+(i.d?'Décocher':'Cocher')+'">'+CHECK+'</button>'
      +'<textarea class="ckt auto'+(i.d?' struck':'')+'" id="ck-'+iid+'" rows="1" data-draft data-change="ckt" data-item="'+iid+'" aria-label="Élément de checklist">'+esc(i.t)+'</textarea>'
      +'<button class="ib xs dng" data-act="ck-del" data-item="'+iid+'" aria-label="Supprimer l’élément">'+ic('x')+'</button></li>';
  }).join('')+'</ul>';
}

function renderPanel(by){
  var el=document.getElementById('panel');
  var t=S.task?taskById(S.task):null;
  if(!t){el.innerHTML='';el._k=null;document.body.classList.remove('has-panel');return;}
  document.body.classList.add('has-panel');if(typeof pwApply==='function')pwApply();
  var e=by[t.projectId]||null, ed=canW(e), id=esc(t.id), p=e?e.p:null, sel=t.labels||[], ls=p?(p.labels||[]):[], pr=prioOf(t), done=isDone(t,e);
  var h='<div class="scrim" data-act="bg"></div><aside class="tpanel" id="dlg" role="dialog" aria-labelledby="mt-'+id+'" tabindex="-1"'+(p?' style="--c:'+hue(p)+'"':'')+'><div class="tp-resize" role="separator" aria-orientation="vertical" aria-label="Redimensionner le panneau" title="Tirer pour élargir · double-clic pour revenir"></div>';
  h+='<header class="tp-h"><span class="crumb2">'+(p?'<span class="picon">'+picon(p)+'</span><span class="nm">'+esc(p.name)+'</span><span class="cnt">/ '+esc(colName(e,t._col))+'</span>':ic('box')+'<span class="nm">Bazar</span>')+'</span><span class="grow"></span>';
  if(ed)h+='<button class="ib" data-act="dup" data-id="'+id+'" aria-label="Dupliquer" title="Dupliquer">'+ic('copy')+'</button><button class="ib dng" data-act="del-task" data-id="'+id+'" aria-label="Supprimer" title="Supprimer">'+ic('trash')+'</button>';
  h+='<button class="ib hide-s" data-act="pw-wide" aria-pressed="'+(PW.wide?'true':'false')+'" aria-label="'+(PW.wide?'Réduire le panneau':'Agrandir le panneau')+'" title="'+(PW.wide?'Réduire':'Agrandir')+'">'+ic(PW.wide?'shrink':'expand')+'</button>';
  h+='<button class="ib" data-act="close" aria-label="Fermer" title="Fermer (Échap)">'+ic('x')+'</button></header><div class="tp-b">';
  h+='<div class="tp-title">'+chkBtn(t,e)+(ed?'<label class="sr" for="mt-'+id+'">Titre</label><textarea class="mtitle'+(done?' struck':'')+'" id="mt-'+id+'" rows="1" data-draft data-change="ttitle" data-id="'+id+'">'+esc(t.title)+'</textarea>':'<h2 class="mtitle" id="mt-'+id+'">'+esc(t.title)+'</h2>')+'</div>';
  /* propriétés */
  h+='<div class="tp-props">';
  if(ed){
    if(e){var copt={}; e.cols.forEach(function(c){copt[c.id]=c.name;});h+=prop(ic('board')+'Colonne',selH('mc-'+id,'mcol',id,copt,t._col),'mc-'+id);}
    else{var popts={'':T('Bazar (pas encore rangée)')}; rwProjects(by).forEach(function(x){popts[x.id]=x.name;});h+=prop(ic('folder')+'Projet',selH('mf-'+id,'file',id,popts,''),'mf-'+id);h+=folderProp(t);h+=clientProp(t);}
    h+=prop(ic('flag')+'Priorité',selH('mp-'+id,'tprio',id,L(PRIO),pr),'mp-'+id);
    h+=stxProp(t,true);
    h+=prop(ic('user')+'Assigné à',whoEditor('t',id,whoList(t),t.projectId,'Une ou plusieurs personnes'),'mw-'+id);
    h+=prop(ic('clock')+'Échéance','<input class="pv" type="date" id="md-'+id+'" value="'+esc(t.due||'')+'" data-change="tdue" data-id="'+id+'">','md-'+id);
    h+=repProp(t,true);
  }else{
    if(e)h+=prop(ic('board')+'Colonne','<span class="val"><span class="pill'+(done?' ok':'')+'">'+esc(colName(e,t._col))+'</span></span>');
    if(pr)h+=prop(ic('flag')+'Priorité','<span class="val"><span class="bd p'+pr+'">'+PRIO[pr]+'</span></span>');
    h+=stxProp(t,false);
    if(whoList(t).length)h+=prop(ic('user')+'Assigné à','<span class="val lrow">'+whoChips(whoList(t),WHO_MAX)+'</span>');
    if(t.due)h+=prop(ic('clock')+'Échéance','<span class="val">'+fmtDate(t.due)+'</span>');
    h+=repProp(t,false);
  }
  if(p){
    var lab='<div class="lrow">';
    if(ed){
      ls.forEach(function(l){lab+=lchip(l,{act:'label-toggle',on:sel.indexOf(l.id)>=0})+(S.lblMgr?'<button class="ib xs dng" data-act="label-del" data-id="'+esc(l.id)+'" aria-label="Supprimer le label">'+ic('x')+'</button>':'');});
      lab+='<button class="linkbtn" data-act="label-mgr">'+(S.lblMgr?'Terminer':(ls.length?'Gérer':'+ Créer un label'))+'</button>';
    }else{
      var shown=sel.map(function(x){return findLabel(p,x);}).filter(Boolean);
      lab+=shown.length?shown.map(function(l){return lchip(l);}).join(''):'<span class="mut">Aucun</span>';
    }
    lab+='</div>';
    if(ed&&S.lblMgr){
      lab+='<div class="lmgr"><label class="sr" for="nl">Nom du label</label><input class="in sm" id="nl" data-draft placeholder="Nom du label" autocomplete="off"><span class="swatches" role="group" aria-label="Couleur du label">';
      for(var i=0;i<6;i++)lab+='<button class="sw" style="--sc:var(--h'+i+')" data-act="nlc" data-id="'+i+'" aria-pressed="'+(S.nlc===i?'true':'false')+'" aria-label="'+COLORS[i]+'"></button>';
      lab+='</span><button class="btn sm" data-act="label-add">Créer</button></div>';
    }
    if(ed||sel.length)h+=prop(ic('star')+'Labels',lab);
  }
  h+='</div>';
  h+=timerHtml(t,e);
  /* description */
  h+='<section class="tp-s"><h4>Description</h4>'+(ed?'<label class="sr" for="mn-'+id+'">Description</label><textarea class="area auto big" id="mn-'+id+'" data-draft data-change="tdesc" data-id="'+id+'" placeholder="Détails, liens, idées…">'+esc(t.notes||'')+'</textarea>':(t.notes?'<p class="rd">'+esc(t.notes)+'</p>':'<span class="mut">Pas de description.</span>'))+'</section>';
  /* demandes du client : à rajouter / à modifier / à supprimer */
  var allck=t.check||[], rq=allck.filter(function(i){return CKREQ[i.k];});
  if(ed||rq.length){
    var rd=rq.filter(function(i){return i.d;}).length;
    h+='<section class="tp-s rq"><h4>Demandes du client'+(rq.length?'<span class="cnt">'+rd+'/'+rq.length+'</span>':'')+'</h4>';
    if(rq.length)h+=bar(rq.length?Math.round(rd/rq.length*100):0,'var(--done)');
    CKREQ_ORDER.forEach(function(k){
      var g=allck.filter(function(i){return i.k===k;}), gd=g.filter(function(i){return i.d;}).length, c=CKREQ[k];
      if(!ed&&!g.length)return;
      h+='<div class="rq-g rq-'+k+'"><h5>'+ic(c.ic)+c.n+(g.length?'<span class="cnt">'+gd+'/'+g.length+'</span>':'')+'</h5>'+ckListH(g,ed);
      if(ed)h+='<label class="sr" for="cka-'+k+'">'+c.n+'</label><input class="in sm" id="cka-'+k+'" data-draft data-add="check" data-k="'+k+'" placeholder="'+c.ph+'" autocomplete="off">';
      h+='</div>';
    });
    h+='</section>';
  }
  /* fichiers */
  var fls=t.files||[], fup=S.fupl[t.id]||[];
  if(ed||fls.length){
    h+='<section class="tp-s"><h4>Fichiers'+(fls.length?'<span class="cnt">'+fls.length+'/'+plan().files+'</span>':'')+'</h4>';
    if(fls.length||fup.length){
      h+='<ul class="flist">';
      fls.forEach(function(f){
        var ext=fileExt(f.name);
        h+='<li class="frow"><span class="f-ic" aria-hidden="true">'+ic('file')+(ext?'<b>'+nt(esc(ext).slice(0,4))+'</b>':'')+'</span>'
          +'<button class="f-name" data-act="file-dl" data-item="'+esc(f.id)+'" title="'+tf('Télécharger « {0} »',esc(f.name))+'"><span class="nm">'+esc(f.name)+'</span><span class="cnt">'+nt(fmtSize(f.size))+'</span></button>'
          +'<button class="ib sm" data-act="file-dl" data-item="'+esc(f.id)+'" aria-label="'+tf('Télécharger « {0} »',esc(f.name))+'">'+ic('download')+'</button>'
          +(ed?'<button class="ib sm dng" data-act="file-del" data-item="'+esc(f.id)+'" aria-label="'+tf('Supprimer « {0} »',esc(f.name))+'">'+ic('x')+'</button>':'')+'</li>';
      });
      fup.forEach(function(n){h+='<li class="frow up" role="status"><span class="f-ic"><i class="spin"></i></span><span class="f-name"><span class="nm">'+esc(n)+'</span><span class="cnt">Envoi en cours…</span></span></li>';});
      h+='</ul>';
    }
    if(ed&&fls.length+fup.length<plan().files)h+='<button class="addfile" data-act="file-add" data-id="'+id+'">'+ic('clip')+'Joindre un fichier</button><p class="hint">'+tf('PDF, devis, documents, archives… jusqu’à {0} chacun.',fmtSize(plan().size))+'</p>';
    else if(ed&&myPlan()!=='pro')h+='<button class="addfile up" data-act="upsell" data-id="files">'+ic('star')+tf('Plus de fichiers avec {0}',PLANS[nextPlan()].n)+'</button>';
    h+='</section>';
  }
  /* photos */
  var phs=t.photos||[], upl=S.upl[t.id]||0;
  if(ed||phs.length){
    h+='<section class="tp-s"><h4>Photos'+(phs.length?'<span class="cnt">'+phs.length+'/'+plan().photos+'</span>':'')+'</h4><div class="phgrid">';
    phs.forEach(function(ph,i){
      h+='<div class="ph"><button class="ph-b" data-act="photo-open" data-item="'+i+'" aria-label="Agrandir la photo '+(i+1)+'">'+photoImg(ph,'Photo '+(i+1))+'</button>'+(ed?'<button class="ph-x" data-act="photo-del" data-item="'+esc(ph.id)+'" aria-label="Supprimer la photo '+(i+1)+'">'+ic('x')+'</button>':'')+'</div>';
    });
    for(var u=0;u<upl;u++)h+='<div class="ph up" role="status" aria-label="Envoi de la photo…"><i class="spin"></i></div>';
    if(ed&&phs.length+upl<plan().photos)h+='<button class="ph add" data-act="photo-add" data-id="'+id+'">'+ic('image')+'<span>Ajouter des photos</span></button>';
    else if(ed&&myPlan()!=='pro')h+='<button class="ph add up" data-act="upsell" data-id="photos">'+ic('star')+'<span>'+tf('Plus de photos avec {0}',PLANS[nextPlan()].n)+'</span></button>';
    h+='</div></section>';
  }
  /* checklist */
  var ck=(t.check||[]).filter(function(i){return !CKREQ[i.k];}), nd=ck.filter(function(i){return i.d;}).length, pc=ck.length?Math.round(nd/ck.length*100):0;
  if(ed||ck.length){
    h+='<section class="tp-s"><h4>Checklist'+(ck.length?'<span class="cnt">'+nd+'/'+ck.length+'</span>':'')+'</h4>';
    if(ck.length)h+=bar(pc,'var(--done)');
    h+=ckListH(ck,ed);
    if(ed)h+='<label class="sr" for="cka">Nouvel élément</label><input class="in sm" id="cka" data-draft data-add="check" placeholder="Ajouter un élément, puis Entrée" autocomplete="off">';
    h+='</section>';
  }
  /* commentaires */
  var log=t.log||[];
  if(ed||log.length){
    h+='<section class="tp-s"><h4>Commentaires'+(log.length?'<span class="cnt">'+log.length+'</span>':'')+'</h4>';
    if(log.length)h+='<ul class="cms">'+log.map(function(c){return '<li class="cm"><p>'+esc(c.t)+'</p><span class="cnt">'+ago(c.at)+'</span>'+(ed?'<button class="ib xs dng" data-act="cmt-del" data-item="'+esc(c.id)+'" aria-label="Supprimer le commentaire">'+ic('x')+'</button>':'')+'</li>';}).join('')+'</ul>';
    if(ed)h+='<label class="sr" for="cma">Nouveau commentaire</label><input class="in sm" id="cma" data-draft data-add="cmt" placeholder="Écrire un commentaire, puis Entrée" autocomplete="off">';
    h+='</section>';
  }
  /* activité */
  var act=(t.act||[]).slice().reverse();
  if(!act.length&&t.createdAt)act=[{t:'Carte créée',at:t.createdAt}];
  if(act.length)h+='<section class="tp-s"><h4>Activité</h4><ul class="tl">'+act.slice(0,12).map(function(a){return '<li><span class="a-dot"></span><span class="grow">'+esc(trText(a.t))+(a.uid&&S.me&&a.uid!==S.me.id&&a.by?' <span class="mut">· '+esc(a.by)+'</span>':'')+'</span><span class="cnt">'+ago(a.at)+'</span></li>';}).join('')+'</ul></section>';
  el.innerHTML=tr(h+'</div></aside>');
  still(el,t.id);
}

/* ---------- palette de commandes ---------- */
function palItems(by){
  var q=norm(S.pq.trim()), out=[], ed=S.canEdit;
  function add(g,icon,label,act,id,o){
    o=o||{};
    var lab=T(label);
    if(q&&norm(lab+' '+label+' '+(o.kw||'')).indexOf(q)<0)return;
    out.push({g:g,icon:icon,label:lab,act:act,id:id,sub:o.sub,k:o.k,attrs:o.attrs,html:o.html});
  }
  if(q){
    S.projects.filter(function(p){return norm(p.name+' '+(p.desc||'')).indexOf(q)>=0;}).slice(0,6).forEach(function(p){
      out.push({g:'Projets',html:'<span class="picon">'+picon(p)+'</span>',label:p.name,act:'view',id:p.id,sub:spaceName(p)});
    });
    S.tasks.filter(function(t){
      if(t.projectId&&!by[t.projectId])return false;
      return norm((t.title||'')+' '+(t.notes||'')+' '+(t.who||'')+' '+(t.log||[]).map(function(c){return c.t;}).join(' ')).indexOf(q)>=0;
    }).slice(0,8).forEach(function(t){
      var e=by[t.projectId];
      out.push({g:'Tâches',icon:'tasks',label:t.title,act:'open',id:t.id,sub:e?e.p.name:'Bazar'});
    });
    if(ed)S.clients.filter(function(c){return norm(c.name+' '+(c.company||'')+' '+(c.email||'')).indexOf(q)>=0;}).slice(0,5).forEach(function(c){
      out.push({g:'Clients',icon:'user',label:c.name,act:'view',id:'c:'+c.id,sub:c.company||''});
    });
    if(ed)S.quotes.filter(function(x){return norm((x.num||'')+' '+(x.title||'')+' '+qClientName(x)).indexOf(q)>=0;}).slice(0,5).forEach(function(x){
      out.push({g:'Devis et factures',icon:qKind(x)==='invoice'?'receipt':'file',label:(x.num||T('Brouillon'))+(x.title?' · '+x.title:''),act:'view',id:'q:'+x.id,sub:qClientName(x)});
    });
    S.projects.filter(function(p){return p.doc&&norm(p.doc).indexOf(q)>=0;}).slice(0,3).forEach(function(p){
      out.push({g:'Notes',icon:'note',label:T('Notes de « '+p.name+' »'),act:'open-doc',id:p.id});
    });
  }else{
    LS.get('recent',[]).map(projById).filter(Boolean).slice(0,4).forEach(function(p){
      out.push({g:'Récents',html:'<span class="picon">'+picon(p)+'</span>',label:p.name,act:'view',id:p.id,sub:spaceName(p)});
    });
  }
  if(ed){
    add('Actions','plus','Nouvelle tâche','qa','',{k:keyHint('qa'),kw:'creer ajouter tache carte'});
    add('Actions','folder','Nouveau projet','new-project','',{k:keyHint('newproj'),kw:'creer'});
    add('Actions','users','Nouveau client','new-client','',{kw:'creer'});
    add('Actions','file','Nouveau devis','q-new','quote',{k:keyHint('newquote'),kw:'creer devis quote estimation proposition'});
    add('Actions','receipt','Nouvelle facture','q-new','invoice',{kw:'creer facture invoice'});
  }
  var keys={home:'G H',inbox:'G I',tasks:'G T',calendar:'G C',projects:'G P'};
  navDefs().forEach(function(n){add('Aller à',n[1],n[2],'view',n[0],{k:keys[n[0]],kw:'ouvrir aller'});});
  add('Aller à','settings','Réglages','view','settings',{kw:'parametres preferences'});
  if(by[S.view])MODES.forEach(function(m){add('Vue du projet',m[2],'Vue '+m[1],'mode',m[0],{kw:'changer vue view'});});
  add('Apparence','sun','Thème clair','pref','light',{attrs:' data-k="theme"',kw:'theme mode'});
  add('Apparence','moon','Thème sombre','pref','dark',{attrs:' data-k="theme"',kw:'theme mode nuit'});
  add('Apparence','monitor','Thème du système','pref','system',{attrs:' data-k="theme"',kw:'theme automatique'});
  add('Apparence','sidebar','Afficher ou masquer le menu','sb','toggle',{k:keyHint('sb'),kw:'sidebar barre laterale'});
  add('Langue','settings','Français','lang','fr',{kw:'langue language french'});
  add('Langue','settings','English','lang','en',{kw:'langue language anglais'});
  add('Aide','bolt','Revoir le tutoriel','tour-start','',{kw:'aide tuto tutorial help guide visite'});
  add('Aller à','star','Formules','view','plans',{kw:'premium pro abonnement prix offre'});
  if(S.admin)add('Aller à','bolt','Admin','view','admin',{kw:'admin premium formules'});
  if(S.me)add('Compte','user','Se déconnecter','logout','',{kw:'deconnexion quitter compte'});
  if(q&&ed)out.push({g:'Créer',icon:'plus',label:T('Créer la tâche « '+S.pq.trim()+' »'),act:'qa-create',id:''});
  return out;
}
function palList(by){
  var items=palItems(by), h='', g=null;
  if(S.pi>=items.length)S.pi=Math.max(0,items.length-1);
  items.forEach(function(it,i){
    if(it.g!==g){g=it.g;h+='<div class="pgrp">'+g+'</div>';}
    h+='<button class="pi'+(i===S.pi?' on':'')+'" role="option" aria-selected="'+(i===S.pi)+'" data-act="'+it.act+'" data-id="'+esc(it.id)+'"'+(it.attrs||'')+' data-pi="'+i+'">'+(it.html||ic(it.icon))+'<span class="nm">'+esc(it.label)+'</span>'+(it.sub?'<span class="sub">'+esc(it.sub)+'</span>':'')+(it.k?'<span class="pk">'+it.k.split(' ').map(kbd).join('')+'</span>':'')+'</button>';
  });
  if(!items.length)h=empty('search','Aucun résultat','Essaie un autre mot.');
  return h;
}
function paintPal(){
  var el=document.getElementById('pal-res'); if(!el)return;
  el.innerHTML=tr(palList(index()));
  var on=el.querySelector('.pi.on'); if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest'});
}

/* ---------- ajout rapide ---------- */
function qaParsed(){
  var q=parseQuick(S.qa.text,rwProjects());
  if(!q.projectId)q.projectId=S.qa.pid||'';
  if(!q.due)q.due=S.qa.due||'';
  return q;
}
function qaChips(){
  var q=qaParsed(), p=q.projectId?projById(q.projectId):null, h='';
  h+='<span class="qchip">'+(p?'<span class="picon">'+picon(p)+'</span>'+esc(p.name):ic('box')+'Bazar')+'</span>';
  if(q.due)h+='<span class="qchip on">'+ic('clock')+fmtDate(q.due)+'</span>';
  if(q.prio)h+='<span class="qchip on p'+q.prio+'">'+ic('flag')+'Priorité '+PRIO[q.prio].toLowerCase()+'</span>';
  return h;
}

function renderOverlay(by){
  var el=document.getElementById('overlay'), h='';
  var pt=S.photo?taskById(S.photo.id):null, pl=pt?(pt.photos||[]):[];
  if(S.photo&&!pl.length)S.photo=null;
  if(S.upsell){h=upsellHtml();}
  else if(S.paste){h=pasteHtml(by);}
  else if(S.report){h=reportHtml(by);}
  else if(S.zen){h=zenHtml(by);}
  else if(S.photo){
    var pi=Math.max(0,Math.min(pl.length-1,S.photo.i));S.photo.i=pi;
    h='<div class="ov lb" data-act="ov-bg"><div class="lbx" role="dialog" aria-label="Photo">'+photoImg(pl[pi],'Photo '+(pi+1))+'</div>'
      +'<button class="lb-btn lb-x" data-act="ov-close" aria-label="Fermer">'+ic('x')+'</button>'
      +(pl.length>1?'<button class="lb-btn lb-p" data-act="photo-nav" data-id="-1" aria-label="Photo précédente">'+ic('left')+'</button><button class="lb-btn lb-n" data-act="photo-nav" data-id="1" aria-label="Photo suivante">'+ic('chev')+'</button><span class="lb-c">'+(pi+1)+' / '+pl.length+'</span>':'')+'</div>';
  }else if(S.pal){
    h='<div class="ov top" data-act="ov-bg"><div class="pal" role="dialog" aria-label="Palette de commandes"><div class="pal-in">'+ic('search')+'<label class="sr" for="pq">Rechercher ou lancer une commande</label><input id="pq" value="'+esc(S.pq)+'" placeholder="Rechercher un projet, une tâche, une commande…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="pal-res"><button class="ib sm only-s" data-act="ov-close" aria-label="Fermer">'+ic('x')+'</button></div>'
      +'<div class="pal-res" id="pal-res" role="listbox">'+palList(by)+'</div><footer class="pal-f hide-s"><span>'+kbd('↑')+kbd('↓')+' naviguer</span><span>'+kbd('↵')+' ouvrir</span><span>'+kbd('Échap')+' fermer</span></footer></div></div>';
  }else if(S.qa){
    var popts={'':'Bazar'}; rwProjects(by).forEach(function(p){popts[p.id]=p.name;});
    h='<div class="ov top" data-act="ov-bg"><div class="qa" role="dialog" aria-label="Nouvelle tâche"><label class="sr" for="qat">Titre de la tâche</label><input id="qat" value="'+esc(S.qa.text)+'" placeholder="Corriger le responsive demain priorité haute" autocomplete="off">'
      +'<div class="qa-chips" id="qa-chips">'+qaChips()+'</div><p class="hint">Écris naturellement : « demain », « vendredi », « 12/11 », « dans 3 jours », « priorité haute », « #nomduprojet ».</p>'
      +'<footer><label class="sr" for="qap">Projet</label>'+selH('qap','qapid','',popts,S.qa.pid||'','in sm')+'<span class="grow"></span><button class="btn" data-act="ov-close">Annuler</button><button class="btn primary" data-act="qa-ok">Créer '+kbd('↵')+'</button></footer></div></div>';
  }else if(S.sheet){
    var items=[];
    if(S.sheet==='plus')items=[['zen','','bolt','Focus : quoi faire maintenant'],['qa','','tasks','Nouvelle tâche'],['paste-open','','checklist','Tâche depuis un message client'],['new-project','','folder','Nouveau projet'],['new-client','','users','Nouveau client'],['q-new','quote','file','Nouveau devis']];
    else{
      items=[['pal','','search','Rechercher']];
      if(S.canEdit)items.push(['view','tasks','tasks','Mes tâches'],['view','calendar','calendar','Calendrier'],['view','clients','users','Clients'],['view','quotes','receipt','Devis et factures']);
      items.push(['view','plans','star','Formules']);
      if(S.admin)items.push(['view','admin','bolt','Admin']);
      items.push(['view','settings','settings','Réglages']);
    }
    h='<div class="ov bottom" data-act="ov-bg"><div class="sheet" role="dialog" aria-label="'+(S.sheet==='plus'?'Créer':'Menu')+'"><span class="sheet-grab" aria-hidden="true"></span>'+items.map(function(i){return '<button class="sheet-i" data-act="'+i[0]+'" data-id="'+i[1]+'">'+ic(i[2])+'<span>'+i[3]+'</span></button>';}).join('')+'</div></div>';
  }else if(S.ctx){
    var t=taskById(S.ctx.id), e=t?by[t.projectId]:null;
    if(t){
      var id=esc(t.id);
      h='<div class="ov clear" data-act="ov-bg"><div class="ctx" id="ctx" role="menu" style="left:'+S.ctx.x+'px;top:'+S.ctx.y+'px"><button data-act="open" data-id="'+id+'">'+ic('arrow')+'Ouvrir</button><button data-act="dup" data-id="'+id+'">'+ic('copy')+'Dupliquer</button>'
        +'<div class="ctx-g"><span>Priorité</span><span class="seg sm">'+[0,1,2,3].map(function(n){return '<button data-act="ctx-prio" data-id="'+id+'" data-v="'+n+'" aria-pressed="'+(prioOf(t)===n)+'">'+(n?PRIO[n]:'—')+'</button>';}).join('')+'</span></div>';
      if(e)h+='<div class="ctx-g"><span>Déplacer vers</span></div>'+e.cols.filter(function(c){return c.id!==t._col;}).map(function(c){return '<button data-act="ctx-col" data-id="'+id+'" data-col="'+esc(c.id)+'">'+ic('chev')+esc(c.name)+'</button>';}).join('');
      h+='<button class="dng" data-act="del-task" data-id="'+id+'">'+ic('trash')+'Supprimer</button></div></div>';
    }
  }
  el.innerHTML=tr(h);
  still(el,!h?'':S.paste?'paste'+S.paste.step:S.report?'report':S.zen?'zen':S.photo?'photo':S.pal?'pal':S.qa?'qa':S.sheet?'sheet'+S.sheet:'ctx'+(S.ctx?S.ctx.id+S.ctx.x:''));
  if(!h)el._k=null;
  if(S.ctx){
    var c=document.getElementById('ctx');
    if(c&&c.getBoundingClientRect){
      var r=c.getBoundingClientRect(), W=window.innerWidth||1200, H=window.innerHeight||800;
      if(r.right>W-8)c.style.left=Math.max(8,W-r.width-8)+'px';
      if(r.bottom>H-8)c.style.top=Math.max(8,H-r.height-8)+'px';
    }
  }
}
function closeOverlays(){S.paste=null;S.report=null;S.repKind='';S.zen=null;S.upsell=null;S.photo=null;S.pal=false;S.pq='';S.pi=0;S.qa=null;S.sheet=null;S.ctx=null;}
function openPal(){closeOverlays();S.pal=true;S.focus='pq';}
function openQa(o){closeOverlays();var cur=index()[S.view];S.qa=Object.assign({text:'',due:'',pid:(cur&&cur.rw?S.view:'')},o||{});S.focus='qat';}
