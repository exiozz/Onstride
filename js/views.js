/* On Stride — écrans : menu latéral, barre du haut, barre du bas, pages. */
'use strict';

/* ---------- navigation ---------- */
function navDefs(){
  if(S.canEdit)return [['home','home','Accueil'],['mail','inbox','Mail'],['inbox','box','Bazar'],['tasks','tasks','Mes tâches'],['calendar','calendar','Calendrier'],['clients','users','Clients'],['quotes','receipt','Devis'],['projects','grid','Projets']];
  return [['home','home','Accueil'],['calendar','calendar','Calendrier'],['projects','grid','Projets']];
}
function navCount(v,by){
  if(v==='mail')return mailUnread();
  if(v==='quotes')return S.quotes.filter(function(q){return qStatus(q)==='late';}).length;
  if(v==='inbox')return inboxTasks().filter(function(t){return !t.done;}).length;
  if(v==='tasks'){var td=todayStr();return liveTasks(by).filter(function(t){return mine(t)&&t.due&&t.due<=td&&!isDone(t,by[t.projectId]);}).length;}
  return 0;
}
function navOn(v){return S.view===v||(v==='clients'&&S.view.indexOf('c:')===0)||(v==='quotes'&&S.view.indexOf('q:')===0);}
function groups(){
  var gs=S.spaces.slice().sort(function(a,b){return (a.createdAt||0)-(b.createdAt||0);}).map(function(s){return {id:s.id,name:s.name,real:true,ps:[]};});
  var def={id:'_',name:T('Mes projets'),real:false,ps:[]};
  var sh={id:'_shared',name:T('Partagés avec moi'),real:false,ro:true,ps:[]};
  S.projects.forEach(function(p){if(pstat(p)==='archived')return;if(S.me&&p._owner&&p._owner!==S.me.id){sh.ps.push(p);return;}var g=gs.find(function(x){return x.id===p.spaceId;})||def;g.ps.push(p);});
  var out=(def.ps.length||!gs.length)?[def].concat(gs):gs;
  return sh.ps.length?out.concat([sh]):out;
}
function projRow(p,by){
  var e=by[p.id];
  return '<button class="nav ch'+(S.view===p.id?' on':'')+'" data-act="view" data-id="'+esc(p.id)+'" title="'+esc(p.name)+'"><span class="picon">'+picon(p)+'</span><span class="lbl nm grow">'+esc(p.name)+'</span>'+(isShared(p)?ic('users','mut lbl'):'')+'<span class="cnt lbl">'+e.done+'/'+e.total+'</span></button>';
}
function renderSide(by,ready){
  var ed=S.canEdit, h='<div class="side-in"><div class="ws">'+LOGO+'<span class="ws-name lbl grow">On Stride</span><button class="ib lbl" data-act="sb" data-id="rail" aria-label="Réduire le menu" title="Réduire le menu (Ctrl B)">'+ic('sidebar')+'</button></div>';
  h+='<button class="nav srch" data-act="pal" title="Rechercher">'+ic('search')+'<span class="lbl grow">Rechercher</span>'+(keyHint('pal')?'<span class="lbl"><kbd>'+nt(escRaw(keyHint('pal')))+'</kbd></span>':'')+'</button>';
  if(!ready){document.getElementById('side').innerHTML=tr(h+'<div class="sk sk-l w80"></div><div class="sk sk-l w60"></div><div class="sk sk-l w80"></div></div>');return;}
  h+='<nav class="navs" aria-label="Navigation">';
  navDefs().forEach(function(n){
    var c=navCount(n[0],by);
    h+='<button class="nav'+(navOn(n[0])?' on':'')+'" data-act="view" data-id="'+n[0]+'" title="'+n[2]+'">'+ic(n[1])+'<span class="lbl grow">'+n[2]+'</span>'+(c?'<span class="pillc">'+c+'</span>':'')+'</button>';
  });
  h+='</nav>';
  var favs=S.projects.filter(function(p){return isFav(p)&&pstat(p)!=='archived';});
  if(favs.length){
    h+='<div class="sech"><span class="sech-t lbl">Favoris</span></div><div class="tree">'+favs.map(function(p){return projRow(p,by);}).join('')+'</div>';
  }
  var secOpen=!S.coll._sec;
  h+='<div class="sech lbl"><button class="sech-b" data-act="sec" aria-expanded="'+(secOpen?'true':'false')+'">Espaces<span class="chv'+(secOpen?' open':'')+'">'+ic('chev')+'</span></button>'+(ed?'<button class="ib sm" data-act="addspace" aria-label="Nouvel espace" title="Nouvel espace">'+ic('plus')+'</button>':'')+'</div>';
  if(secOpen){
    h+='<div class="tree lbl">';
    if(ed&&S.addSpace)h+='<div class="indent"><label class="sr" for="ns">Nom de l’espace</label><input class="in sm" id="ns" data-draft data-add="space" placeholder="Nom de l’espace, puis Entrée" autocomplete="off"></div>';
    groups().forEach(function(g){
      var open=!S.coll[g.id], gid=esc(g.id);
      h+='<div class="space"><div class="sp">';
      h+='<button class="chev'+(open?' open':'')+'" data-act="spc" data-id="'+gid+'" aria-expanded="'+(open?'true':'false')+'" aria-label="Déplier ou replier '+esc(g.name)+'">'+ic('chev')+'</button>';
      if(ed&&g.real&&S.ren===g.id)h+='<label class="sr" for="sn-'+gid+'">Nom de l’espace</label><input class="in sm grow" id="sn-'+gid+'" value="'+esc(g.name)+'" data-draft data-change="sname" data-id="'+gid+'" autocomplete="off">';
      else h+='<button class="sp-name grow" data-act="spc" data-id="'+gid+'"><span class="nm">'+esc(g.name)+'</span></button>';
      if(ed&&!g.ro)h+='<span class="acts"><button class="ib sm" data-act="addproj" data-id="'+gid+'" aria-label="Nouveau projet dans '+esc(g.name)+'" title="Nouveau projet">'+ic('plus')+'</button>'+(g.real?'<button class="ib sm" data-act="spmenu" data-id="'+gid+'" aria-label="Options de l’espace">'+ic('more')+'</button>':'')+'</span>';
      h+='</div>';
      if(ed&&g.real&&S.smenu===g.id){
        h+='<div class="pop" role="menu"><button data-act="spren" data-id="'+gid+'">Renommer</button><button class="dng" data-act="spdel" data-id="'+gid+'">'+(S.confirm==='s:'+g.id?'Confirmer la suppression':'Supprimer l’espace')+'</button></div>';
      }
      if(open){
        g.ps.forEach(function(p){h+=projRow(p,by);});
        if(ed&&S.addIn===g.id)h+='<div class="indent"><label class="sr" for="np-'+gid+'">Nom du projet</label><input class="in sm" id="np-'+gid+'" data-draft data-add="project" data-space="'+gid+'" placeholder="Nom du projet, puis Entrée" autocomplete="off"></div>';
        else if(!g.ps.length)h+='<div class="nav ch none">'+(ed?'Aucun projet. Ajoute-en avec le +':'Aucun projet')+'</div>';
      }
      h+='</div>';
    });
    h+='</div>';
  }
  h+='<div class="sfoot">';
  if(S.admin)h+='<button class="nav'+(S.view==='admin'?' on':'')+'" data-act="view" data-id="admin" title="Admin">'+ic('bolt')+'<span class="lbl grow">Admin</span></button>';
  else if(S.planReady&&!isPaid())h+='<button class="nav up'+(S.view==='plans'?' on':'')+'" data-act="view" data-id="plans" title="Passer à Premium">'+ic('star')+'<span class="lbl grow">Passer à Premium</span></button>';
  h+='<button class="nav'+(S.view==='settings'?' on':'')+'" data-act="view" data-id="settings" title="Réglages">'+ic('settings')+'<span class="lbl grow">Réglages</span></button>';
  if(S.me)h+='<button class="nav me" data-act="view" data-id="settings" title="'+esc(S.me.email)+'">'+avatar(S.me)+'<span class="lbl grow nm">'+esc(S.me.name||S.me.email)+'</span>'+(isPaid()?'<span class="pbadge lbl">'+PLANS[myPlan()].n+'</span>':'')+'</button>';
  h+='<button class="nav railonly" data-act="sb" data-id="open" title="Agrandir le menu">'+ic('sidebar')+'</button></div>';
  document.getElementById('side').innerHTML=tr(h+'</div>');
  still(document.getElementById('side'),S.smenu);
}
function renderTop(by){
  var v=S.view, sub=false, crumb='';
  var names={home:'Accueil',mail:'Mail',inbox:'Bazar',tasks:'Mes tâches',calendar:'Calendrier',clients:'Clients',quotes:'Devis et factures',projects:'Projets',settings:'Réglages',plans:'Formules',admin:'Admin'};
  if(names[v])crumb='<span class="crumb-i">'+names[v]+'</span>';
  else if(v.indexOf('c:')===0){
    var c=S.clients.find(function(x){return 'c:'+x.id===v;}); sub='clients';
    crumb='<button class="crumb-i mut hide-s" data-act="view" data-id="clients">Clients</button><span class="sep hide-s">/</span><span class="crumb-i">'+esc(c?c.name:'')+'</span>';
  }else if(v.indexOf('q:')===0){
    var qq=qById(v.slice(2)); sub='quotes';
    crumb='<button class="crumb-i mut hide-s" data-act="view" data-id="quotes">Devis et factures</button><span class="sep hide-s">/</span><span class="crumb-i">'+(qq&&qq.num?esc(qq.num):T('Brouillon'))+'</span>';
  }else if(by[v]){
    var p=by[v].p; sub='projects';
    crumb='<button class="crumb-i mut hide-s" data-act="view" data-id="projects">'+esc(spaceName(p))+'</button><span class="sep hide-s">/</span><span class="crumb-i"><span class="picon">'+picon(p)+'</span><span class="nm">'+esc(p.name)+'</span>'+(isShared(p)?ic('users','mut'):'')+'</span>';
  }
  var h='<button class="ib sbt" data-act="sb" data-id="cycle" aria-label="Afficher ou masquer le menu" title="'+keyTip('Menu','sb')+'">'+ic('sidebar')+'</button>';
  if(sub)h+='<button class="ib back" data-act="view" data-id="'+sub+'" aria-label="Retour">'+ic('left')+'</button>';
  h+='<nav class="crumb" aria-label="Fil d’Ariane">'+crumb+'</nav><span class="grow"></span>'+saveHtml();
  if(by[v]&&!by[v].own)h+='<span class="badge'+(by[v].rw?' ed':'')+'">'+(by[v].rw?'Éditeur':'Lecture seule')+'</span>';
  h+='<button class="ib" data-act="pal" aria-label="Rechercher" title="'+keyTip('Rechercher','pal')+'">'+ic('search')+'</button>';
  if(S.canEdit)h+='<button class="btn primary sm hide-s" data-act="qa" title="'+keyTip('Nouvelle tâche','qa')+'">'+ic('plus')+'Tâche</button>';
  h+='<button class="ib only-s" data-act="sheet" data-id="menu" aria-label="Menu">'+ic('menu')+'</button>';
  document.getElementById('top').innerHTML=tr(h);
}
function renderTabbar(by){
  var defs=S.canEdit?[['home','home','Accueil'],['mail','inbox','Mail'],null,['inbox','box','Bazar'],['projects','grid','Projets']]   /* deux onglets de chaque côté : le bouton + reste au centre */
                    :[['home','home','Accueil'],['projects','grid','Projets'],['calendar','calendar','Calendrier'],['settings','settings','Réglages']];
  var h='';
  defs.forEach(function(n){
    if(!n){h+='<button class="tab-plus" data-act="sheet" data-id="plus" aria-label="Créer">'+ic('plus')+'</button>';return;}
    var on=navOn(n[0])||(n[0]==='projects'&&!!by[S.view]), c=navCount(n[0],by);
    h+='<button class="tab'+(on?' on':'')+'" data-act="view" data-id="'+n[0]+'"'+(on?' aria-current="page"':'')+'>'+ic(n[1])+(c?'<i class="tdot"></i>':'')+'<span>'+n[2]+'</span></button>';
  });
  document.getElementById('tabbar').innerHTML=tr(h);
}

/* ---------- accueil : tableau de bord ---------- */
function dashOrder(){
  var o=((S.cfg.dash&&S.cfg.dash.order)||[]).filter(function(k){return WIDGETS[k];});
  WORDER.forEach(function(k){if(o.indexOf(k)<0)o.push(k);});
  return o.filter(function(k){return S.canEdit||!WIDGETS[k].owner;});
}
function dashHidden(){return (S.cfg.dash&&S.cfg.dash.hidden)||[];}
function dashData(by){
  var today=todayStr(), wk=addDays(7);
  var live=S.projects.filter(function(p){return pstat(p)!=='archived';});
  var all=liveTasks(by), open=all.filter(function(t){return !isDone(t,by[t.projectId]);});
  var ib=inboxTasks().filter(function(t){return !t.done;});
  var pool=open.concat(ib);
  return {today:today,wk:wk,live:live,all:all,open:open,
    late:pool.filter(function(t){return t.due&&t.due<today;}).sort(byDue),
    tod:pool.filter(function(t){return t.due===today;}),
    week:pool.filter(function(t){return t.due&&t.due>today&&t.due<=wk;}).sort(byDue),
    active:live.filter(function(p){var s=pstat(p);return s==='active'||s==='wait';}),
    done:all.length-open.length,pct:all.length?Math.round((all.length-open.length)/all.length*100):0};
}
function widgetBody(k,d,by){
  if(k==='today'){
    var l=d.late.concat(d.tod);
    return l.length?l.slice(0,8).map(function(t){return mini(t,by);}).join(''):empty('check','Rien pour aujourd’hui','Aucune échéance aujourd’hui ni en retard.');
  }
  if(k==='week')return d.week.length?d.week.slice(0,8).map(function(t){return mini(t,by);}).join(''):empty('calendar','Semaine dégagée','Aucune échéance dans les 7 prochains jours.');
  if(k==='projects'){
    var rec=LS.get('recent',[]).map(projById).filter(function(p){return p&&pstat(p)!=='archived';});
    d.active.forEach(function(p){if(rec.indexOf(p)<0)rec.push(p);});
    if(!rec.length)return empty('folder','Aucun projet pour le moment','Crée ton premier projet pour commencer à organiser ton travail.',S.canEdit?'<button class="btn primary" data-act="new-project">'+ic('plus')+'Créer un projet</button>':'');
    return rec.slice(0,5).map(function(p){var e=by[p.id];return '<button class="mini" data-act="view" data-id="'+esc(p.id)+'"><span class="picon">'+picon(p)+'</span><span class="mini-t">'+esc(p.name)+'</span>'+(isShared(p)?ic('users','mut'):'')+'<span class="mini-bar">'+bar(e.pct,hue(p))+'</span><span class="cnt">'+e.pct+' %</span></button>';}).join('');
  }
  if(k==='progress'){
    var h='<div class="wprog"><div class="wring">'+ring(d.pct,104)+'<b>'+d.pct+'<small>%</small></b></div><div class="wprog-l"><p><b>'+d.done+'</b> '+(d.done>1?'cartes terminées':'carte terminée')+' sur '+d.all.length+'</p>';
    d.active.slice(0,4).forEach(function(p){var e=by[p.id];h+='<div class="wprog-r"><span class="nm">'+esc(p.name)+'</span>'+bar(e.pct,hue(p))+'<span class="cnt">'+e.pct+' %</span></div>';});
    return h+'</div></div>';
  }
  if(k==='activity'){
    var a=recentActivity(by,7);
    return a.length?'<ul class="acts-l">'+a.map(function(x){return '<li><button data-act="open" data-id="'+esc(x.task.id)+'"><span class="a-dot"></span><span class="a-t"><b>'+esc(x.task.title)+'</b> · '+esc(trText(x.t))+(x.uid&&S.me&&x.uid!==S.me.id&&x.by?' · '+esc(x.by):'')+'</span><span class="cnt">'+ago(x.at)+'</span></button></li>';}).join('')+'</ul>':empty('activity','Pas encore d’activité','Les déplacements et changements de tes cartes apparaîtront ici.');
  }
  if(k==='clients'){
    var cs=S.clients.filter(function(c){return (c.status||'active')==='active'||c.status==='lead';});
    if(!cs.length)return empty('users','Aucun client actif','Ajoute un client pour suivre ses projets et ce qu’il te doit.','<button class="btn" data-act="view" data-id="clients">Ouvrir les clients</button>');
    var rest=0, rows=cs.slice(0,5).map(function(c){var s=clientStats(c,by);rest+=Math.max(0,s.rest);return '<button class="mini" data-act="view" data-id="c:'+esc(c.id)+'"><span class="picon">'+ic('user')+'</span><span class="mini-t">'+esc(c.name)+'</span><span class="cnt">'+(s.rest>0?'reste '+eur(s.rest):pl(s.ps.length,'projet','projets'))+'</span></button>';}).join('');
    return rows+(rest>0?'<p class="wfoot">Reste à encaisser : <b>'+eur(rest)+'</b></p>':'');
  }
  if(k==='pay')return payWidget(by);
  if(k==='quotes')return quotesWidget();
  if(k==='pace')return paceWidget(by);
  if(k==='notes')return '<label class="sr" for="qn">Notes rapides</label><textarea class="wnotes" id="qn" data-draft data-change="cfgnotes" placeholder="Une idée, un numéro, un pense-bête… Visible par toi seul.">'+esc(S.cfg.notes||'')+'</textarea>';
  return '';
}
function widgetCount(k,d){
  if(k==='today')return d.late.length+d.tod.length;
  if(k==='week')return d.week.length;
  return 0;
}
function vHome(by){
  var ed=S.canEdit, d=dashData(by), now=new Date(), hr=now.getHours();
  var greet=(hr>=5&&hr<18)?'Bonjour':'Bonsoir', name=myName();
  var parts=[];
  if(d.tod.length)parts.push(unmark(tf(d.tod.length>1?'{0} tâches pour aujourd’hui':'{0} tâche pour aujourd’hui',d.tod.length)));
  if(d.late.length)parts.push(unmark(tf('{0} en retard',d.late.length)));
  if(d.week.length)parts.push(unmark(tf('{0} cette semaine',d.week.length)));
  var lead=parts.length?nt(parts.join(', ')+'.'):(d.all.length?'Rien d’urgent : aucune échéance proche.':'Ton espace est prêt.');
  var h='<header class="hero"><div><p class="eyebrow">'+esc(now.toLocaleDateString(LOCALE(),{weekday:'long',day:'numeric',month:'long'}))+'</p><h1>'+greet+(name?', '+esc(name):'')+'</h1><p class="lead">'+lead+'</p></div>';
  if(ed)h+='<div class="hero-acts"><button class="btn primary" data-act="qa">'+ic('plus')+'Nouvelle tâche</button><button class="btn" data-act="zen" title="Une seule tâche à l’écran : la plus utile à faire maintenant">'+ic('bolt')+'Focus</button><button class="btn" data-act="dash-edit" aria-pressed="'+(S.dashEdit?'true':'false')+'">'+ic('settings')+(S.dashEdit?'Terminer':'Personnaliser')+'</button></div>';
  h+='</header>';
  var demo=ed&&(S.projects.some(function(p){return p.demo;})||S.clients.some(function(c){return c.demo;}));
  if(demo){
    h+='<div class="note warn"><p><strong>Ce sont des exemples.</strong> Ils montrent ce que l’appli sait faire. Supprime-les quand tu veux.</p>'
      +(S.confirm==='demo'?'<button class="btn danger" data-act="demo-del">Confirmer</button><button class="btn" data-act="cancel">Annuler</button>':'<button class="btn" data-act="demo-del">Supprimer les exemples</button>')+'</div>';
  }
  if(S.me&&S.me.provider==='email'&&!S.cfg.pwSet&&!hasPw()&&LS.get('haspw','')!==S.me.email&&!LS.get('pwtip',0)&&S.tour==null){
    h+='<div class="note"><p><strong>Astuce : choisis un mot de passe.</strong> Tu pourras te connecter tout de suite, sans attendre d’e-mail.</p><button class="btn sm" data-act="pw-go">Choisir un mot de passe</button><button class="btn quiet sm" data-act="pw-later">Plus tard</button></div>';
  }
  if(ed&&!S.cfg.onboarded){
    var hasP=S.projects.some(function(p){return !p.demo;}), hasT=S.tasks.some(function(t){var p=projById(t.projectId);return !p||!p.demo;});
    function step(ok,label,cta){return '<li class="ob-s'+(ok?' ok':'')+'"><span class="chk sm'+(ok?' on':'')+'">'+CHECK+'</span><span class="grow">'+label+'</span>'+(ok?'':cta)+'</li>';}
    h+='<section class="onb"><div><h2>Bienvenue dans On Stride</h2><p>Trois étapes pour être chez toi.</p></div><ul>'
      +step(!!name,'Dis-moi ton prénom','<span class="ob-in"><label class="sr" for="ob-name">Ton prénom</label><input class="in sm" id="ob-name" data-draft data-change="cfgname" placeholder="Ton prénom" autocomplete="off"></span>')
      +step(hasP,'Crée ton premier projet','<button class="btn sm" data-act="new-project">Créer</button>')
      +step(hasT,'Ajoute une première tâche','<button class="btn sm" data-act="qa">Ajouter</button>')
      +'</ul><button class="btn quiet sm" data-act="onb-done">Masquer</button></section>';
  }
  h+='<div class="stats">'
    +'<button class="stat" data-act="view" data-id="projects"><span>'+ic('grid')+'Projets actifs</span><b>'+d.active.length+'</b></button>'
    +'<'+(ed?'button data-act="tf" data-id="all"':'div')+' class="stat"><span>'+ic('tasks')+'À faire</span><b>'+d.open.length+'</b></'+(ed?'button':'div')+'>'
    +'<'+(ed?'button data-act="tf" data-id="late"':'div')+' class="stat'+(d.late.length?' bad':'')+'"><span>'+ic('clock')+'En retard</span><b>'+d.late.length+'</b></'+(ed?'button':'div')+'>'
    +'<'+(ed?'button data-act="tf" data-id="done"':'div')+' class="stat"><span>'+ic('check')+'Terminées</span><b>'+d.done+'</b></'+(ed?'button':'div')+'>'
    +(ed?'<button class="stat" data-act="view" data-id="clients"><span>'+ic('users')+'Clients actifs</span><b>'+S.clients.filter(function(c){return (c.status||'active')==='active';}).length+'</b></button>':'')
    +'</div>';
  if(!S.projects.length&&!ed)return h+empty('folder','Rien à afficher pour l’instant','Les projets partagés apparaîtront ici.');
  var hidden=dashHidden(), order=dashOrder();
  h+='<div class="wgrid'+(S.dashEdit?' editing':'')+'">';
  order.forEach(function(k,i){
    if(hidden.indexOf(k)>=0)return;
    var n=widgetCount(k,d);
    h+='<section class="w w-'+k+'" data-w="'+k+'"'+(S.dashEdit?' draggable="true" data-drag="w"':'')+'><header class="w-h">'+(S.dashEdit?'<span class="grip" aria-hidden="true">'+ic('grip')+'</span>':'')+'<h2>'+WIDGETS[k].t+'</h2>'+(n?'<span class="pillc">'+n+'</span>':'')+'<span class="grow"></span>';
    if(S.dashEdit)h+='<button class="ib sm" data-act="w-move" data-id="'+k+'" data-dir="-1" aria-label="Monter"'+(i===0?' disabled':'')+'>'+ic('up')+'</button><button class="ib sm" data-act="w-move" data-id="'+k+'" data-dir="1" aria-label="Descendre"'+(i===order.length-1?' disabled':'')+'>'+ic('down')+'</button><button class="ib sm" data-act="w-toggle" data-id="'+k+'" aria-label="Masquer ce bloc">'+ic('eyeoff')+'</button>';
    h+='</header><div class="w-b">'+widgetBody(k,d,by)+'</div></section>';
  });
  h+='</div>';
  if(S.dashEdit){
    var hid=order.filter(function(k){return hidden.indexOf(k)>=0;});
    h+='<div class="note"><p>'+(hid.length?'Blocs masqués :':'Glisse les blocs ou utilise les flèches pour les réorganiser. La disposition est mémorisée.')+'</p>'+hid.map(function(k){return '<button class="btn sm" data-act="w-toggle" data-id="'+k+'">'+ic('plus')+WIDGETS[k].t+'</button>';}).join('')+'</div>';
  }
  return h;
}

/* ---------- inbox ---------- */
function vInbox(by){
  var all=inboxTasks(), open=all.filter(function(t){return !t.done;}), done=all.filter(function(t){return t.done;});
  var d=dashData(by), popts={'':T('Ranger dans…')};
  rwProjects(by).forEach(function(p){popts[p.id]=p.name;});
  var h='<header class="phd"><h1>Bazar</h1><p class="lead">Tout ce que tu notes en vrac, à ranger plus tard dans un projet. Visible par toi seul.</p></header>';
  h+=folderBar(open);
  var fc=folderById(folderCur()), shown=folderFilter(open);
  h+='<div class="qadd"><label class="sr" for="ibx">Ajouter rapidement</label>'+ic('plus')+'<input id="ibx" data-draft data-add="inbox" placeholder="'+(fc?tf('Ajouter dans « {0} »…',esc(fc.name)):nt(T('Ajouter rapidement… ex. « Envoyer le devis demain priorité haute »')))+'" autocomplete="off"></div>';
  if(shown.length){
    h+='<ul class="tlist panel">'+shown.map(function(t){
      return taskRow(t,by,{drag:'bz',extra:function(x){return '<span class="row-acts">'+folderSelect(x)+selH('file-'+esc(x.id),'file',esc(x.id),popts,'','in sm',' aria-label="Ranger dans un projet"')+'<button class="ib sm dng" data-act="del-task" data-id="'+esc(x.id)+'" aria-label="Supprimer">'+ic('trash')+'</button></span>';}});
    }).join('')+'</ul>';
  }else if(open.length)h+=empty('folder','Rien dans ce dossier','Ajoute une tâche ci-dessus, ou glisse une tâche du Bazar sur le nom du dossier.');
  else h+=empty('box','Bazar vide','Écris une tâche ci-dessus sans choisir de projet. Tu la rangeras plus tard.');
  var rem=d.late.concat(d.tod).filter(function(t){return t.projectId;});
  if(rem.length)h+='<section class="sect"><h2>Rappels <span class="pillc">'+rem.length+'</span></h2><div class="panel pad-s">'+rem.slice(0,10).map(function(t){return mini(t,by);}).join('')+'</div></section>';
  if(done.length)h+='<section class="sect"><h2>Traitées <span class="cnt">'+done.length+'</span><span class="grow"></span><button class="btn quiet sm" data-act="inbox-clear">Vider</button></h2><ul class="tlist panel">'+done.slice(0,20).map(function(t){return taskRow(t,by);}).join('')+'</ul></section>';
  return h;
}

/* ---------- mes tâches ---------- */
var TF=[['all','À faire'],['today','Aujourd’hui'],['week','Cette semaine'],['late','En retard'],['high','Priorité haute'],['nodue','Sans échéance'],['done','Terminées']];
var BK=[['late','En retard'],['today','Aujourd’hui'],['week','Cette semaine'],['later','Plus tard'],['none','Sans échéance']];
function vTasks(by){
  var today=todayStr(), wk=addDays(7), f=S.tf;
  var pool=liveTasks(by).concat(inboxTasks()).filter(mine);
  function dn(t){return isDone(t,by[t.projectId]||null);}
  var list=pool.filter(function(t){
    if(f==='done')return dn(t);
    if(dn(t))return false;
    var b=bucket(t,today,wk);
    if(f==='today')return b==='today';
    if(f==='week')return b==='today'||b==='week';
    if(f==='late')return b==='late';
    if(f==='high')return prioOf(t)===3;
    if(f==='nodue')return b==='none';
    return true;
  });
  var h='<header class="phd row"><div><h1>Mes tâches</h1><p class="lead">'+(myName()?'Les tâches qui te sont assignées ou sans responsable.':'Toutes tes tâches, tous projets confondus.')+'</p></div>'
    +'<div class="seg" role="group" aria-label="Affichage"><button data-act="tv" data-id="list" aria-pressed="'+(S.tv==='list')+'">'+ic('list')+'Liste</button><button data-act="tv" data-id="board" aria-pressed="'+(S.tv==='board')+'">'+ic('board')+'Kanban</button><button data-act="view" data-id="calendar">'+ic('calendar')+'Calendrier</button></div></header>';
  h+='<div class="chips" role="group" aria-label="Filtres">'+TF.map(function(x){return '<button class="fchip" data-act="tf" data-id="'+x[0]+'" aria-pressed="'+(f===x[0])+'">'+x[1]+'</button>';}).join('')+'</div>';
  if(!list.length){
    return h+(f==='done'?empty('check','Aucune tâche terminée','Les tâches que tu termines apparaîtront ici.'):empty('tasks','Rien dans ce filtre','Change de filtre, ou ajoute une tâche.','<button class="btn primary" data-act="qa">'+ic('plus')+'Nouvelle tâche</button>'));
  }
  if(f==='done')return h+'<ul class="tlist panel">'+list.sort(function(a,b){return (b.doneAt||0)-(a.doneAt||0);}).slice(0,100).map(function(t){return taskRow(t,by,{proj:true});}).join('')+'</ul>';
  var groups={}; BK.forEach(function(b){groups[b[0]]=[];});
  list.forEach(function(t){groups[bucket(t,today,wk)].push(t);});
  function srt(a,b){return (a.due||'9999')<(b.due||'9999')?-1:(a.due||'9999')>(b.due||'9999')?1:prioOf(b)-prioOf(a);}
  if(S.tv==='board'){
    h+='<div class="boardwrap"><div class="board">';
    BK.forEach(function(b){
      var ts=groups[b[0]].sort(srt);
      h+='<section class="col'+(b[0]==='late'&&ts.length?' bad':'')+'"><div class="col-h"><h3 class="col-name">'+b[1]+'</h3><span class="cnt">'+ts.length+'</span></div><div class="cl">'+ts.map(function(t){
        var e=by[t.projectId]||null;
        return '<article class="card'+(S.task===t.id?' sel':'')+'" tabindex="0" data-act="open" data-id="'+esc(t.id)+'" data-card><div class="ct">'+chkBtn(t,e)+'<span class="ctt">'+esc(t.title)+'</span></div>'+(e?'<span class="pchip" style="--c:'+hue(e.p)+'"><span class="picon">'+picon(e.p)+'</span><span class="nm">'+esc(e.p.name)+'</span></span>':'<span class="pchip">'+ic('box')+'<span class="nm">Bazar</span></span>')+badges(t,e)+'</article>';
      }).join('')+'</div></section>';
    });
    return h+'</div></div>';
  }
  BK.forEach(function(b){
    var ts=groups[b[0]].sort(srt); if(!ts.length)return;
    h+='<section class="sect"><h2'+(b[0]==='late'?' class="bad"':'')+'>'+b[1]+' <span class="cnt">'+ts.length+'</span></h2><ul class="tlist panel">'+ts.map(function(t){return taskRow(t,by,{proj:true});}).join('')+'</ul></section>';
  });
  return h;
}

/* ---------- calendrier (page et onglet de projet) ---------- */
function calBlock(tasks,by,pid){
  var now=new Date(); if(!S.cal)S.cal={y:now.getFullYear(),m:now.getMonth()};
  var y=S.cal.y, m=S.cal.m, first=new Date(y,m,1), off=(first.getDay()+6)%7, dim=new Date(y,m+1,0).getDate();
  var cells=Math.ceil((off+dim)/7)*7, byDate={}, nod=0, today=todayStr(), ed=pid?canW(by[pid]):S.canEdit, agendaOnly=S.calMode==='agenda';
  tasks.forEach(function(t){if(t.due){(byDate[t.due]=byDate[t.due]||[]).push(t);}else nod++;});
  function evt(t){var e=by[t.projectId]||null;return '<button class="evt'+(isDone(t,e)?' struck':'')+'" style="--c:'+(e?hue(e.p):'var(--muted)')+'" data-act="open" data-id="'+esc(t.id)+'" title="'+esc(t.title)+'"'+(canW(e)?' draggable="true" data-drag="cal"':'')+'>'+esc(t.title)+'</button>';}
  var h='<div class="panel calp"><div class="calhead"><h2>'+esc(first.toLocaleDateString(LOCALE(),{month:'long',year:'numeric'}))+'</h2>'
    +'<span class="calnav"><button class="ib" data-act="calnav" data-id="-1" aria-label="Mois précédent">'+ic('left')+'</button><button class="btn sm" data-act="calnav" data-id="0">Aujourd’hui</button><button class="ib" data-act="calnav" data-id="1" aria-label="Mois suivant">'+ic('chev')+'</button></span></div>';
  if(!agendaOnly){
    h+='<div class="calwrap hide-s"><div class="cal">'+DAYS.map(function(d){return '<div class="cal-h">'+d+'</div>';}).join('');
    for(var i=0;i<cells;i++){
      var day=i-off+1, date=new Date(y,m,day), key=ds(date), out=day<1||day>dim;
      h+='<div class="cal-d'+(out?' out':'')+(key===today?' today':'')+'" data-date="'+key+'"><span class="cal-top"><span class="dnum">'+date.getDate()+'</span>'+(ed?'<button class="ib xs cal-add" data-act="qa-date" data-id="'+key+'"'+(pid?' data-pid="'+esc(pid)+'"':'')+' aria-label="Ajouter une tâche le '+date.getDate()+'">'+ic('plus')+'</button>':'')+'</span>';
      (byDate[key]||[]).sort(cmpPos).forEach(function(t){h+=evt(t);});
      h+='</div>';
    }
    h+='</div></div>';
  }
  var keys=Object.keys(byDate).filter(function(k){return k.slice(0,7)===y+'-'+pad(m+1);}).sort();
  h+='<div class="agenda'+(agendaOnly?'':' only-s')+'">';
  keys.forEach(function(k){
    var dd=new Date(k+'T12:00:00');
    h+='<div class="ag-d'+(k===today?' today':'')+'"><span class="ag-date">'+esc(dd.toLocaleDateString(LOCALE(),{weekday:'short',day:'numeric'}))+'</span><div class="ag-l">'+byDate[k].sort(cmpPos).map(evt).join('')+'</div></div>';
  });
  if(!keys.length)h+=empty('calendar','Aucune échéance ce mois-ci','Donne une échéance à une tâche pour la voir ici.',ed?'<button class="btn" data-act="qa-date" data-id="'+today+'"'+(pid?' data-pid="'+esc(pid)+'"':'')+'>'+ic('plus')+'Ajouter une tâche</button>':'');
  h+='</div></div>';
  if(nod)h+='<p class="hint">'+pl(nod,'tâche sans échéance n’apparaît','tâches sans échéance n’apparaissent')+' pas ici.</p>';
  return h;
}
function vCalendar(by){
  var tasks=liveTasks(by).concat(inboxTasks());
  if(S.calProj&&by[S.calProj])tasks=tasks.filter(function(t){return t.projectId===S.calProj;});
  var popts={'':T('Tous les projets')}; S.projects.forEach(function(p){if(pstat(p)!=='archived')popts[p.id]=p.name;});
  var h='<header class="phd row"><div><h1>Calendrier</h1><p class="lead">Toutes les échéances'+(S.canEdit?'. Glisse une tâche sur un autre jour pour la déplacer.':'.')+'</p></div>'
    +'<div class="row-btns"><label class="sr" for="calp">Filtrer par projet</label>'+selH('calp','calproj','',popts,S.calProj,'in sm')
    +'<div class="seg hide-s" role="group" aria-label="Affichage"><button data-act="calmode" data-id="month" aria-pressed="'+(S.calMode==='month')+'">Mois</button><button data-act="calmode" data-id="agenda" aria-pressed="'+(S.calMode==='agenda')+'">Agenda</button></div></div></header>';
  return h+calBlock(tasks,by,S.calProj&&by[S.calProj]?S.calProj:'');
}

/* ---------- projets ---------- */
function vProjects(by){
  var ed=S.canEdit, f=S.pf;
  var tabs=[['active','Actifs'],['fav','Favoris'],['archived','Archivés']];
  var h='<header class="phd row"><div><h1>Projets</h1><p class="lead">'+pl(S.projects.length,'projet','projets')+', rangés par espace.</p></div>'
    +'<div class="seg" role="group" aria-label="Filtre">'+tabs.map(function(t){return '<button data-act="pf" data-id="'+t[0]+'" aria-pressed="'+(f===t[0])+'">'+t[1]+'</button>';}).join('')+'</div></header>';
  if(ed)h+='<div class="qadd"><label class="sr" for="npp">Nouveau projet</label>'+ic('plus')+'<input id="npp" data-draft data-add="project" data-space="_" placeholder="Nouveau projet (nom, puis Entrée)" autocomplete="off"></div>';
  var list=S.projects.filter(function(p){
    var a=pstat(p)==='archived';
    if(f==='archived')return a;
    if(f==='fav')return isFav(p)&&!a;
    return !a;
  });
  if(!list.length){
    if(f==='fav')return h+empty('star','Aucun favori','Ouvre un projet et clique sur l’étoile pour le retrouver ici et dans le menu.');
    if(f==='archived')return h+empty('archive','Aucun projet archivé','Passe le statut d’un projet sur « Archivé » pour le ranger ici.');
    return h+empty('folder','Aucun projet pour le moment',ed?'Crée ton premier projet pour commencer à organiser ton travail.':'Les projets partagés apparaîtront ici.');
  }
  var gs={}, order=[];
  list.forEach(function(p){var n=spaceName(p);if(!gs[n]){gs[n]=[];order.push(n);}gs[n].push(p);});
  order.forEach(function(n){h+='<section class="sect"><h2>'+esc(n)+' <span class="cnt">'+gs[n].length+'</span></h2><div class="cards">'+gs[n].map(function(p){return pcard(p,by);}).join('')+'</div></section>';});
  return h;
}

/* ---------- clients ---------- */
function vClients(by){
  var h='<header class="phd"><h1>Clients</h1><p class="lead">Ton carnet de clients. Visible par toi seul, même quand tu partages un projet.</p></header>';
  h+='<div class="qadd"><label class="sr" for="ncl">Nom du client</label>'+ic('plus')+'<input id="ncl" data-draft data-add="client" placeholder="Nouveau client (nom, puis Entrée)" autocomplete="off"></div>';
  if(!S.clients.length)return h+empty('users','Aucun client pour l’instant','Ajoute un client pour suivre ses projets, ses coordonnées et ce qu’il te doit.');
  var ta=0,tp=0;
  h+='<div class="panel tblwrap hide-s"><table><thead><tr><th scope="col">Client</th><th scope="col">Statut</th><th scope="col" class="num">Projets</th><th scope="col">Avancement</th><th scope="col" class="num">Montant</th><th scope="col" class="num">Encaissé</th><th scope="col" class="num">Reste</th></tr></thead><tbody>';
  S.clients.forEach(function(c){
    var s=clientStats(c,by), st=CST[c.status]?c.status:'active'; ta+=s.amount; tp+=s.paid;
    h+='<tr tabindex="0" data-act="view" data-id="c:'+esc(c.id)+'"><td class="tt">'+esc(c.name)+(c.company?' <span class="mut">· '+esc(c.company)+'</span>':'')+'</td><td>'+chip(CST[st],CSTC[st])+'</td><td class="num">'+s.ps.length+'</td>'
      +'<td>'+(s.ps.length?'<div class="prog">'+bar(s.pct)+'<span class="cnt">'+s.pct+' %</span></div>':'')+'</td>'
      +'<td class="num">'+eur(s.amount)+'</td><td class="num">'+eur(s.paid)+'</td><td class="num">'+eur(s.rest)+'</td></tr>';
  });
  h+='</tbody><tfoot><tr><td colspan="4">Total</td><td class="num">'+eur(ta)+'</td><td class="num">'+eur(tp)+'</td><td class="num">'+eur(ta-tp)+'</td></tr></tfoot></table></div>';
  h+='<div class="clist only-s">';
  S.clients.forEach(function(c){
    var s=clientStats(c,by), st=CST[c.status]?c.status:'active';
    h+='<button class="panel ccard" data-act="view" data-id="c:'+esc(c.id)+'"><span class="r"><span class="nm2">'+esc(c.name)+(c.company?' <span class="mut">· '+esc(c.company)+'</span>':'')+'</span>'+chip(CST[st],CSTC[st])+'</span>'
      +'<span class="r money"><span>'+pl(s.ps.length,'projet','projets')+'</span>'+(s.ps.length?'<span>'+s.pct+' %</span>':'')+'</span>'
      +'<span class="r money"><span>'+eur(s.amount)+'</span><span>encaissé '+eur(s.paid)+'</span><span>reste '+eur(s.rest)+'</span></span></button>';
  });
  h+='<p class="hint">Total : '+eur(ta)+' · encaissé '+eur(tp)+' · reste '+eur(ta-tp)+'</p></div>';
  return h;
}
function vClient(c,by){
  var id=esc(c.id), s=clientStats(c,by), st=CST[c.status]?c.status:'active';
  function f(key,label,type){var fid='cf-'+key+'-'+id;return prop(label,'<input class="pv" id="'+fid+'" type="'+(type||'text')+'" value="'+esc(c[key]||'')+'" data-draft data-change="cf" data-f="'+key+'" data-id="'+id+'" placeholder="Vide" autocomplete="off">',fid);}
  var h='<div class="phead"><label class="sr" for="cf-name-'+id+'">Nom du client</label><input class="h1in" id="cf-name-'+id+'" value="'+esc(c.name)+'" data-draft data-change="cf" data-f="name" data-id="'+id+'" autocomplete="off">';
  h+='<div class="props">'+f('company','Société')+f('email','E-mail','email')+f('phone','Téléphone','tel')+f('address','Adresse')+f('siret','SIRET')+prop('Statut',selH('cf-status-'+id,'cf',id,L(CST),st,'pv',' data-f="status"'),'cf-status-'+id)+'</div>'
    +(validEmail(String(c.email||'').trim())?'<div class="row-btns"><button class="btn sm" data-act="mail-new" data-id="'+esc(String(c.email).trim().toLowerCase())+'">'+ic('inbox')+'Lui écrire par Mail</button></div>':'')+'</div>';
  h+='<div class="stats"><div class="stat"><span>Projets</span><b>'+s.ps.length+'</b></div><div class="stat"><span>Montant total</span><b>'+eur(s.amount)+'</b></div><div class="stat"><span>Encaissé</span><b>'+eur(s.paid)+'</b></div><div class="stat'+(s.rest>0?' bad':'')+'"><span>Reste à encaisser</span><b>'+eur(s.rest)+'</b></div></div>';
  h+='<section class="sect"><h2><label for="cf-notes-'+id+'">Notes</label></h2><textarea class="area" id="cf-notes-'+id+'" data-draft data-change="cf" data-f="notes" data-id="'+id+'" placeholder="Besoins, tarifs convenus, interlocuteurs, historique…">'+esc(c.notes||'')+'</textarea></section>';
  h+=qForClient(c);
  h+='<section class="sect"><h2>Projets de ce client</h2>';
  h+='<div class="qadd"><label class="sr" for="ncp">Nouveau projet pour ce client</label>'+ic('plus')+'<input id="ncp" data-draft data-add="cproject" data-client="'+id+'" placeholder="Nouveau projet pour ce client" autocomplete="off"></div>';
  h+=s.ps.length?'<div class="cards">'+s.ps.map(function(p){return pcard(p,by);}).join('')+'</div>':'<p class="hint">Aucun projet relié. Crée-en un ci-dessus, ou choisis ce client dans les détails d’un projet.</p>';
  h+='</section><div class="row-btns">'+(S.confirm==='k:'+c.id?'<span class="cnt">Supprimer ce client ? Ses projets sont conservés.</span><button class="btn danger" data-act="del-client" data-id="'+id+'">Supprimer</button><button class="btn" data-act="cancel">Annuler</button>':'<button class="btn quiet" data-act="del-client" data-id="'+id+'">'+ic('trash')+'Supprimer le client</button>')+'</div>';
  return h;
}

/* ---------- page de projet ---------- */
function vBoard(e){
  var ed=canW(e), h='';
  if(ed&&!e.total&&!(e.p.columns&&e.p.columns.length)){
    h+='<div class="note"><p><strong>Partir d’un modèle de colonnes ?</strong> Sinon, garde les trois colonnes ci-dessous et renomme-les.</p>'+Object.keys(TPL).map(function(k){return '<button class="btn sm" data-act="tpl" data-id="'+k+'" title="'+esc(TPL[k].cols.map(T).join(' → '))+'">'+esc(T(TPL[k].name))+'</button>';}).join('')+'</div>';
  }
  h+='<div class="boardwrap"><div class="board" style="--c:'+hue(e.p)+'">';
  e.cols.forEach(function(c,i){
    var ts=e.by[c.id].slice().sort(cmpPos).filter(pass), cid=esc(c.id);
    h+='<section class="col" data-drop="'+cid+'"><div class="col-h"><span class="col-dot'+(c.done?' done':'')+'"></span>';
    h+=ed?'<label class="sr" for="cn-'+cid+'">Nom de la colonne</label><input class="col-name" id="cn-'+cid+'" value="'+esc(c.name)+'" data-draft data-change="cname" data-id="'+cid+'" autocomplete="off">':'<h3 class="col-name">'+esc(c.name)+'</h3>';
    h+='<span class="cnt">'+ts.length+'</span>';
    if(ed)h+='<button class="ib sm" data-act="colmenu" data-id="'+cid+'" aria-label="Options de la colonne" aria-expanded="'+(S.menu===c.id?'true':'false')+'">'+ic('more')+'</button>';
    if(ed&&S.menu===c.id){
      h+='<div class="pop" role="menu">'
        +'<button data-act="colmove" data-id="'+cid+'" data-dir="-1"'+(i===0?' disabled':'')+'>Déplacer à gauche</button>'
        +'<button data-act="colmove" data-id="'+cid+'" data-dir="1"'+(i===e.cols.length-1?' disabled':'')+'>Déplacer à droite</button>'
        +'<button data-act="coldone" data-id="'+cid+'">'+(c.done?'Ne plus compter comme terminée':'Compter comme terminée')+'</button>'
        +'<button class="dng" data-act="coldel" data-id="'+cid+'"'+(e.cols.length<2?' disabled':'')+'>'+(S.confirm==='c:'+c.id?'Confirmer la suppression':'Supprimer la colonne')+'</button></div>';
    }
    h+='</div><div class="cl" data-cards>'+ts.map(function(t){return cardEl(t,e);}).join('')+'</div>';
    if(ed){
      if(S.comp===c.id){
        h+='<div class="comp"><label class="sr" for="cmp-'+cid+'">Titre de la carte</label><textarea class="cin" id="cmp-'+cid+'" rows="2" data-draft data-add="task" data-pid="'+esc(e.p.id)+'" data-col="'+cid+'" placeholder="Titre de la carte…"></textarea>'
          +'<div class="row-btns"><button class="btn primary sm" data-act="comp-add" data-id="'+cid+'">Ajouter</button><button class="ib sm" data-act="comp-close" aria-label="Fermer">'+ic('x')+'</button></div></div>';
      }else h+='<button class="addcard" data-act="comp-open" data-id="'+cid+'">'+ic('plus')+'Ajouter une carte</button>';
    }
    h+='</section>';
  });
  if(ed)h+='<div class="addcol"><label class="sr" for="ncol">Nouvelle colonne</label><input class="in" id="ncol" data-draft data-add="column" placeholder="+ Ajouter une colonne" autocomplete="off"></div>';
  return h+'</div></div>';
}
function vList(e,by){
  var h='';
  if(canW(e))h+=addForm(e.p.id,e.cols[0].id,'Ajouter une carte, puis Entrée');
  var any=false;
  e.cols.forEach(function(c){
    var ts=e.by[c.id].slice().sort(cmpPos).filter(pass);
    if(!ts.length)return; any=true;
    h+='<section class="sect"><h2>'+esc(c.name)+' <span class="cnt">'+ts.length+'</span></h2><ul class="tlist panel">'+ts.map(function(t){return taskRow(t,by);}).join('')+'</ul></section>';
  });
  if(!any)h+=e.total?empty('search','Aucune carte ne correspond','Change le filtre pour les voir.'):empty('tasks','Aucune carte pour l’instant',canW(e)?'Écris la première dans le champ ci-dessus.':'Les cartes de ce projet apparaîtront ici.');
  return h;
}
function vTable(e){
  var rows=e.tasks.filter(pass), k=S.sort.k, d=S.sort.d;
  var ci={}; e.cols.forEach(function(c,i){ci[c.id]=i;});
  function ratio(t){var c=t.check||[];return c.length?c.filter(function(i){return i.d;}).length/c.length:-1;}
  rows.sort(function(a,b){
    var r=0;
    if(k==='title')r=(a.title||'').localeCompare(b.title||'','fr');
    else if(k==='due')r=(a.due||'9999')<(b.due||'9999')?-1:(a.due||'9999')>(b.due||'9999')?1:0;
    else if(k==='check')r=ratio(a)-ratio(b);
    else if(k==='prio')r=prioOf(b)-prioOf(a);
    else if(k==='who')r=(whoList(a)[0]||'￿').localeCompare(whoList(b)[0]||'￿','fr');
    else r=ci[a._col]-ci[b._col]||cmpPos(a,b);
    return r*d;
  });
  function th(key,label){return '<th scope="col" aria-sort="'+(k===key?(d>0?'ascending':'descending'):'none')+'"><button data-act="sort" data-id="'+key+'">'+nt(T(label)+(k===key?(d>0?' ↑':' ↓'):''))+'</button></th>';}
  var h='';
  if(canW(e))h+=addForm(e.p.id,e.cols[0].id,'Ajouter une carte, puis Entrée');
  h+='<div class="panel tblwrap"><table><thead><tr>'+th('title','Carte')+th('col','Colonne')+th('prio','Priorité')+th('who','Assigné')+'<th scope="col">Labels</th>'+th('due','Échéance')+th('check','Checklist')+'</tr></thead><tbody>';
  rows.forEach(function(t){
    var lb=(t.labels||[]).map(function(id){return findLabel(e.p,id);}).filter(Boolean), ck=t.check||[], dn=ck.filter(function(i){return i.d;}).length, pr=prioOf(t);
    var late=t.due&&!isDone(t,e)&&t.due<todayStr();
    h+='<tr tabindex="0" data-act="open" data-id="'+esc(t.id)+'" data-card><td class="tt"><span class="'+(isDone(t,e)?'struck':'')+'">'+esc(t.title)+'</span></td>'
      +'<td><span class="pill'+(isDone(t,e)?' ok':'')+'">'+esc(colName(e,t._col))+'</span></td>'
      +'<td>'+(pr?'<span class="bd p'+pr+'">'+PRIO[pr]+'</span>':'')+'</td>'
      +'<td><span class="lrow">'+whoChips(whoList(t),2)+'</span></td>'
      +'<td><div class="lrow sm">'+lb.map(function(l){return lchip(l);}).join('')+'</div></td>'
      +'<td>'+(t.due?'<span class="bd due'+(late?' late':'')+'">'+fmtDate(t.due)+'</span>':'')+'</td>'
      +'<td>'+(ck.length?'<span class="cnt">'+dn+'/'+ck.length+'</span>':'')+'</td></tr>';
  });
  if(!rows.length)h+='<tr><td colspan="7" class="mut">Aucune carte à afficher.</td></tr>';
  return h+'</tbody></table></div>';
}
function vDoc(e){
  var p=e.p, id=esc(p.id);
  if(canW(e))return '<label class="sr" for="doc-'+id+'">Notes du projet</label><textarea class="area doc" id="doc-'+id+'" data-draft data-change="pdoc" data-id="'+id+'" placeholder="Notes du projet : brief, comptes rendus, liens utiles, décisions…">'+esc(p.doc||'')+'</textarea><p class="hint">Ces notes sont visibles par les personnes avec qui tu partages ce projet. Pour des notes confidentielles, utilise le bloc « Privé » dans les détails.</p>';
  return p.doc?'<p class="panel docread">'+esc(p.doc)+'</p>':empty('note','Pas de notes','Ce projet n’a pas encore de notes.');
}
function filterBar(e){
  var h='<div class="fbar"><span class="fq">'+ic('search')+'<label class="sr" for="q">Filtrer les cartes</label><input id="q" type="search" value="'+esc(S.q)+'" placeholder="Filtrer les cartes" autocomplete="off"></span>';
  (e.p.labels||[]).forEach(function(l){h+=lchip(l,{act:'fl',on:!S.fl||S.fl===l.id});});
  return h+'</div>';
}
function shareBox(e,mbs,cl){
  var p=e.p, id=esc(p.id), roles={viewer:'Lecteur · voit tout, ne modifie rien',editor:'Éditeur · peut modifier les cartes'};
  var h='<section class="sharebox" id="share"><h4>'+ic('users')+'Partage du projet</h4><ul class="mlist">';
  if(e.own)h+='<li class="mrow">'+avatar(S.me)+'<span class="grow nm">'+esc(S.me?(S.me.name||S.me.email):T('Toi'))+' <span class="mut">(toi)</span></span><span class="pill">Propriétaire</span></li>';
  else h+='<li class="mrow"><span class="av" aria-hidden="true">'+ic('user')+'</span><span class="grow nm">La personne qui a créé le projet</span><span class="pill">Propriétaire</span></li>';
  mbs.forEach(function(m){
    var mid=esc(m.id);
    h+='<li class="mrow">'+avatar({email:m.email})+'<span class="grow nm">'+esc(m.email)+(S.me&&m.email===S.me.email?' <span class="mut">(toi · chef de projet)</span>':'')+'</span><label class="sr" for="mr-'+mid+'">Rôle de '+esc(m.email)+'</label>'+selH('mr-'+mid,'mrole',mid,L({viewer:'Lecteur',editor:'Éditeur'}),m.role,'in sm')+'<button class="ib sm dng" data-act="m-del" data-id="'+mid+'" aria-label="Retirer l’accès de '+esc(m.email)+'" title="Retirer l’accès">'+ic('x')+'</button></li>';
  });
  h+='</ul>';
  if(cl&&cl.email&&validEmail(String(cl.email).trim())&&!mbs.some(function(m){return m.email===String(cl.email).trim().toLowerCase();})){
    h+='<div class="note"><p>Partager avec ton client <strong>'+esc(cl.name)+'</strong> ('+esc(cl.email)+') ?</p><button class="btn sm" data-act="m-client" data-id="viewer">En lecteur</button><button class="btn sm" data-act="m-client" data-id="editor">En éditeur</button></div>';
  }
  h+='<div class="madd"><label class="sr" for="m-email">Adresse e-mail à inviter</label><input class="in sm grow" id="m-email" type="email" data-draft data-add="member" placeholder="adresse@exemple.com" autocomplete="off"><label class="sr" for="m-role">Rôle</label>'+'<select class="in sm" id="m-role">'+Object.keys(roles).map(function(k){return '<option value="'+k+'">'+roles[k]+'</option>';}).join('')+'</select><button class="btn primary sm" data-act="m-add">Inviter</button></div>';
  h+='<p class="hint">La personne se connecte au site avec cette adresse (Google, Discord ou lien par e-mail) et retrouve le projet dans « Partagés avec moi ». Aucun e-mail n’est envoyé automatiquement : envoie-lui le lien. Tes clients, tes montants et tes notes privées ne lui sont jamais montrés.</p><div class="row-btns"><button class="btn sm" data-act="copy-link">'+ic('copy')+'Copier le lien du projet</button></div></section>';
  return h;
}
function vProject(e,by){
  var p=e.p, ed=canW(e), own=S.canEdit&&e.own, mgr=S.canEdit&&!e.own&&e.mgr, id=esc(p.id), st=pstat(p), m=metaOf(p.id), mode=modeOf(p), mbs=membersOf(p.id);
  var late=p.deadline&&st!=='done'&&st!=='archived'&&p.deadline<todayStr();
  var h='<div class="phead" style="--c:'+hue(p)+'"><div class="ptitle"><div class="iconrow">';
  h+=ed?'<button class="bigicon" data-act="iconpick" aria-label="Changer l’icône" aria-expanded="'+(S.iconPick?'true':'false')+'">'+picon(p)+'</button>':'<span class="bigicon">'+picon(p)+'</span>';
  if(ed&&S.iconPick)h+='<div class="pop iconpop">'+EMOJIS.map(function(x){return '<button data-act="seticon" data-id="'+x+'" aria-label="Icône '+x+'">'+x+'</button>';}).join('')+'<button class="rm" data-act="seticon" data-id="">Utiliser la pastille de couleur</button></div>';
  h+='</div>';
  h+=ed?'<label class="sr" for="pn-'+id+'">Nom du projet</label><input class="h1in grow" id="pn-'+id+'" value="'+esc(p.name)+'" data-draft data-change="pname" data-id="'+id+'" autocomplete="off">':'<h1 class="grow">'+esc(p.name)+'</h1>';
  var fav=isFav(p);
  if(S.canEdit)h+='<button class="ib'+(fav?' favon':'')+'" data-act="fav" aria-pressed="'+(fav?'true':'false')+'" aria-label="'+(fav?'Retirer des favoris':'Ajouter aux favoris')+'" title="Favori">'+ic('star')+'</button>';
  h+='</div>';
  if(ed)h+='<label class="sr" for="pd-'+id+'">Description</label><textarea class="desc" id="pd-'+id+'" rows="1" data-draft data-change="pdesc" data-id="'+id+'" placeholder="Ajoute une description (objectif, contexte…)">'+esc(p.desc||'')+'</textarea>';
  else if(p.desc)h+='<p class="desc">'+esc(p.desc)+'</p>';
  var open=(own||mgr)?S.det:true, cl=own?clientOf(p):null;
  h+='<div class="sumrow">'+chip(PST[st],PSTC[st])+'<span class="sum-prog">'+bar(e.pct,hue(p))+'<b>'+e.pct+' %</b><span class="cnt">'+e.done+'/'+e.total+'</span></span>'
    +(p.deadline?'<span class="bd due'+(late?' late':'')+'">'+ic('clock')+fmtDate(p.deadline)+'</span>':'')
    +(own?(mbs.length?'<span class="bd shared">'+ic('users')+'Partagé · '+mbs.length+'</span>':'<span class="bd">'+ic('lock')+'Privé</span>'):'<span class="bd shared">'+ic('users')+(mgr?'Tu es chef de projet':e.rw?'Tu es éditeur':'Tu es lecteur')+'</span>')+(cl?'<span class="bd who">'+esc(cl.name)+'</span>':'')+(peopleOf(p).length?'<span class="bd ppl" title="'+esc(peopleOf(p).join(', '))+'">'+ic('user')+esc(peopleOf(p).slice(0,3).join(', '))+(peopleOf(p).length>3?' +'+(peopleOf(p).length-3):'')+'</span>':'')
    +(own?'<button class="btn sm" data-act="report" title="Préparer un message d’avancement pour ton client">'+ic('msg')+'Point client</button><button class="btn sm" data-act="share">'+ic('users')+'Partager</button><button class="btn sm" data-act="det" aria-expanded="'+(open?'true':'false')+'">'+ic('settings')+(open?'Masquer':'Détails')+'</button>':'')
    +(mgr?'<button class="btn sm" data-act="share">'+ic('users')+'Partager</button><button class="btn sm" data-act="det" aria-expanded="'+(open?'true':'false')+'">'+ic('settings')+(open?'Masquer':'Détails')+'</button>':'')+'</div>';
  if((own||mgr)&&open){
    var dv={}; MODES.forEach(function(x){dv[x[0]]=x[1];});
    h+='<div class="details"><div class="props">'
      +prop('Statut',selH('ps-'+id,'pstatus',id,L(PST),st),'ps-'+id)
      +prop('Début','<input class="pv" type="date" id="pb-'+id+'" value="'+esc(p.start||'')+'" data-change="pstart" data-id="'+id+'">','pb-'+id)
      +prop('Échéance','<input class="pv" type="date" id="pe-'+id+'" value="'+esc(p.deadline||'')+'" data-change="pdead" data-id="'+id+'">','pe-'+id)
      +prop('Vue par défaut',selH('pv-'+id,'pdefview',id,L(dv),p.defView||'board'),'pv-'+id)
      +prop('Responsables',whoEditor('p',id,peopleOf(p),p.id,'Qui pilote ce projet ?'),'mpp-'+id)
      +prop('Couleur','<span class="swatches" role="group" aria-label="Couleur du projet">'+[0,1,2,3,4,5].map(function(i){return '<button class="sw" style="--sc:var(--h'+i+')" data-act="color" data-id="'+i+'" aria-pressed="'+(((p.hue||0)%6)===i?'true':'false')+'" aria-label="'+COLORS[i]+'"></button>';}).join('')+'</span>')
      +'</div>';
    h+=shareBox(e,mbs,cl);
    if(own){   /* client, montants, notes privées, suppression : uniquement le propriétaire */
    var copts={'':T('Aucun')}; S.clients.forEach(function(c){copts[c.id]=c.name;});
    var amount=Number(m.amount)||0, paid=Number(m.paid)||0;
    h+='<section class="privbox"><h4>'+ic('lock')+'Privé · visible par toi seul</h4><div class="props">'
      +prop('Client',selH('pc-'+id,'pclient',id,copts,m.clientId||''),'pc-'+id)
      +prop('Montant (€)','<input class="pv" type="number" min="0" step="1" inputmode="decimal" id="pa-'+id+'" value="'+(m.amount!=null&&m.amount!==''?esc(m.amount):'')+'" data-draft data-change="pamount" data-id="'+id+'" placeholder="0">','pa-'+id)
      +prop('Encaissé (€)','<input class="pv" type="number" min="0" step="1" inputmode="decimal" id="pp-'+id+'" value="'+(m.paid!=null&&m.paid!==''?esc(m.paid):'')+'" data-draft data-change="ppaid" data-id="'+id+'" placeholder="0">','pp-'+id)
      +prop('Reste','<span class="val">'+eur(amount-paid)+'</span>')
      +timeProps(e,m)
      +'</div><label class="sr" for="pno-'+id+'">Notes privées</label><textarea class="area sm" id="pno-'+id+'" data-draft data-change="pnotes" data-id="'+id+'" placeholder="Notes privées : tarif, conditions, contacts, tout ce qui ne se partage pas.">'+esc(m.pnotes||'')+'</textarea>'+payRow(e,m)+qForProject(e)+'</section>';
    if(S.confirm==='p:'+p.id)h+='<div class="row-btns"><span class="cnt">Supprimer ce projet et ses '+pl(e.total,'carte','cartes')+' ?</span><button class="btn danger" data-act="del-project" data-id="'+id+'">Supprimer</button><button class="btn" data-act="cancel">Annuler</button></div>';
    else h+='<div class="row-btns"><button class="btn quiet sm" data-act="dup-project" data-id="'+id+'" title="Copie les colonnes, les labels, les cartes et le tableau blanc. Les cartes repartent de la première colonne.">'+ic('copy')+'Dupliquer le projet</button><button class="btn quiet sm" data-act="del-project" data-id="'+id+'">'+ic('trash')+'Supprimer le projet</button></div>';
    }
    h+='</div>';
  }else if(!ed&&p.start){h+='<p class="hint">Début : '+fmtDate(p.start)+'</p>';}
  h+='</div><div class="toolbar"><div class="tabs" role="group" aria-label="Affichage">'+MODES.map(function(x){return '<button data-act="mode" data-id="'+x[0]+'" aria-pressed="'+(mode===x[0])+'">'+ic(x[2])+x[1]+'</button>';}).join('')+'</div>'+(mode!=='doc'&&mode!=='cal'&&mode!=='wb'?filterBar(e):'')+'</div>';
  var body=mode==='list'?vList(e,by):mode==='table'?vTable(e):mode==='cal'?calBlock(e.tasks.filter(pass),by,p.id):mode==='doc'?vDoc(e):mode==='wb'?vWb(e):vBoard(e);
  return h+body;
}

/* ---------- réglages ---------- */
function segPref(k,opts){
  return '<span class="seg" role="group">'+opts.map(function(o){return '<button data-act="pref" data-k="'+k+'" data-id="'+o[0]+'" aria-pressed="'+(P[k]===o[0])+'">'+(o[2]?ic(o[2]):'')+o[1]+'</button>';}).join('')+'</span>';
}
function vSettings(by){
  var ed=S.canEdit, h='<header class="phd"><h1>Réglages</h1><p class="lead">L’apparence est mémorisée sur cet appareil.</p></header><div class="sgrid">';
  if(S.me)h+='<section class="panel scard"><h2>'+ic('user')+'Compte</h2><div class="acct">'+avatar(S.me,'lg')+'<div class="grow"><strong>'+esc(S.me.name||T('Mon compte'))+(isPaid()?' <span class="pbadge">'+PLANS[myPlan()].n+'</span>':'')+'</strong><span class="mut">'+esc(S.me.email)+'</span></div><button class="btn" data-act="logout">Se déconnecter</button></div><div class="srow"><label for="st-pw">Mot de passe<small>'+(S.cfg.pwSet||hasPw()?'Tu en as déjà un. Écris-en un nouveau pour le changer.':'Choisis-en un pour te connecter sans attendre d’e-mail.')+'</small></label><span class="pwrow"><input class="in" id="st-pw" type="password" autocomplete="new-password" placeholder="8 caractères ou plus" data-draft><button class="btn" data-act="pw-save">Enregistrer</button></span></div></section>';
  if(S.me){
    var mp=myPlan(), pr=planRow();
    h+='<section class="panel scard"><h2>'+ic('star')+'Formule</h2><div class="srow"><span>'+PLANS[mp].n+'<small>'+(S.admin?'Admin : tout est débloqué.':mp==='free'?tf('{0} projets actifs, {1} photos et {2} fichiers par tâche.',PLANS.free.projects,PLANS.free.photos,PLANS.free.files):(pr&&pr.until?tf('Jusqu’au {0}.',fmtDay(pr.until)):'Sans date de fin.'))+'</small></span><button class="btn'+(mp==='free'?' primary':'')+'" data-act="view" data-id="plans">'+(mp==='free'?'Passer à Premium':mp==='premium'&&!S.admin?'Passer à Pro':'Voir les formules')+'</button></div></section>';
  }
  if(ed)h+='<section class="panel scard"><h2>'+ic('user')+'Profil</h2><div class="srow"><label for="st-name">Ton prénom<small>Pour le message d’accueil et « Mes tâches ».</small></label><input class="in" id="st-name" value="'+esc(myName())+'" data-draft data-change="cfgname" placeholder="Ton prénom" autocomplete="off"></div></section>';
  h+='<section class="panel scard"><h2>'+ic('sun')+'Apparence et langue</h2>'
    +'<div class="srow"><span>Langue</span><span class="seg" role="group" aria-label="Langue">'+Object.keys(I18N.langs).map(function(k){return '<button data-act="lang" data-id="'+k+'" aria-pressed="'+(LANG===k)+'">'+nt(I18N.langs[k])+'</button>';}).join('')+'</span></div>'
    +'<div class="srow"><span>Thème</span>'+segPref('theme',[['system','Système','monitor'],['light','Clair','sun'],['dark','Sombre','moon']])+'</div>'
    +'<div class="srow"><span>Couleur d’accent</span><span class="swatches" role="group" aria-label="Couleur d’accent">'+Object.keys(ACCENTS).map(function(k){var a=ACCENTS[k], lock=a.p&&!plan().accents;return '<button class="sw lg'+(lock?' lock':'')+'" style="--sc:'+(isDark()?a.d:a.l)+'" '+(lock?'data-act="upsell" data-id="accents"':'data-act="pref" data-k="accent" data-id="'+k+'"')+' aria-pressed="'+(P.accent===k&&!lock)+'" aria-label="'+nt(T(a.n)+(lock?' (Premium)':''))+'" title="'+nt(T(a.n)+(lock?' (Premium)':''))+'">'+(lock?ic('lock'):'')+'</button>';}).join('')+'</span></div>'
    +skinRows()
    +'<div class="srow"><span>Densité</span>'+segPref('density',[['compact','Compacte'],['normal','Normale'],['comfy','Confortable']])+'</div>'
    +'<div class="srow"><span>Taille du texte</span>'+segPref('size',[['s','Petite'],['m','Moyenne'],['l','Grande']])+'</div></section>';
  if(S.me)h+=notifCard();
  if(ed){
    var hidden=dashHidden();
    h+='<section class="panel scard"><h2>'+ic('grid')+'Tableau de bord</h2><p class="hint">Choisis les blocs affichés sur l’accueil. Pour les réorganiser, utilise « Personnaliser » sur l’accueil.</p><div class="chips">'+WORDER.map(function(k){return '<button class="fchip" data-act="w-toggle" data-id="'+k+'" aria-pressed="'+(hidden.indexOf(k)<0)+'">'+WIDGETS[k].t+'</button>';}).join('')+'</div></section>';
    h+=bizCard();
    h+='<section class="panel scard"><h2>'+ic('users')+'Partage</h2><p class="hint">Chaque projet se partage séparément : ouvre un projet, puis « Partager ». Tu choisis pour chaque personne « Lecteur » ou « Éditeur ». Ton Bazar, tes messages, tes clients, tes montants et tes notes privées restent visibles par toi seul.</p></section>';
    h+='<section class="panel scard"><h2>'+ic('download')+'Données</h2><p class="hint">Télécharge une copie de tout ton espace (projets, tâches, clients) dans un fichier.</p><div class="row-btns"><button class="btn" data-act="export">'+ic('download')+'Exporter en JSON</button><button class="btn" data-act="export-csv">'+ic('table')+'Exporter en tableur (Excel)'+(plan().csv?'':' <span class="pbadge">Pro</span>')+'</button></div></section>';
  }
  h+='<section class="panel scard"><h2>'+ic('bolt')+'Tutoriel</h2><p class="hint">Une visite guidée de l’appli en une minute : le menu, les projets, le partage, les tâches.</p><div class="row-btns"><button class="btn" data-act="tour-start">'+ic('arrow')+'Revoir le tutoriel</button></div></section>';
  h+=keysCard();
  return h+'</div>';
}

/* ---------- écran de connexion ---------- */
function pwBox(id,ac,ph,v){
  var sh=S.gate.show;
  return '<span class="pwbox"><input class="in" id="'+id+'" type="'+(sh?'text':'password')+'" autocomplete="'+ac+'" autocapitalize="off" spellcheck="false" placeholder="'+ph+'" value="'+esc(v)+'"><button type="button" class="pw-eye" data-act="pw-eye" aria-pressed="'+sh+'" aria-label="'+(sh?'Masquer le mot de passe':'Afficher le mot de passe')+'" title="'+(sh?'Masquer le mot de passe':'Afficher le mot de passe')+'">'+ic(sh?'eyeoff':'eye')+'</button></span>';
}
function renderGate(){
  var g=document.getElementById('gate'), old=document.getElementById('lg-email'), val=old?old.value:(LS.get('lgemail','')||''), oldp=document.getElementById('lg-pw'), pwv=oldp?oldp.value:'';
  function put(html){html=tr(html);if(g._h!==html){g.innerHTML=html;g._h=html;}still(g,'gate');}
  document.body.classList.add('gated');
  if(S.auth==='boot'){g.innerHTML='<div class="gate"><div class="gate-card boot">'+LOGO+'<div class="sk sk-l w60"></div><div class="sk sk-l w40"></div></div></div>';g._h=null;return;}
  var langs='<span class="seg sm gate-lang" role="group" aria-label="Langue">'+Object.keys(I18N.langs).map(function(k){return '<button data-act="lang" data-id="'+k+'" aria-pressed="'+(LANG===k)+'" title="'+nt(I18N.langs[k])+'">'+nt(k.toUpperCase())+'</button>';}).join('')+'</span>';
  var h='<div class="gate"><div class="gate-card"><div class="gate-top">'+LOGO+langs+'</div><h1>On Stride</h1><p class="lead">L’espace de travail simple pour organiser tes projets, tes clients et ton travail.</p>';
  if(S.auth==='setup'){
    h+='<div class="note warn"><p><strong>Le site n’est pas encore relié à sa base de données.</strong> Ouvre le fichier <code>config.js</code> et colle l’adresse de ton projet Supabase et sa clé « publishable », puis remets le site en ligne. Le guide <code>LISEZ-MOI.md</code> détaille chaque étape.</p></div>';
  }else if(S.auth==='reset'){
    var rv=(document.getElementById('rs-pw')||{}).value||'';
    h+='<div class="gate-sub"><strong>Choisis ton nouveau mot de passe</strong><span>Pour le compte <b>'+esc(S.me?S.me.email:'')+'</b>.</span></div>'
      +'<div class="gate-mail"><label for="rs-pw">Nouveau mot de passe</label>'+pwBox('rs-pw','new-password','8 caractères ou plus',rv)
      +'<button class="btn primary lg" data-act="reset-save"'+(S.gate.sending?' disabled':'')+'>'+(S.gate.sending?'<i class="spin"></i>Enregistrement…':'Enregistrer et continuer')+'</button>'
      +'<button class="btn quiet sm" data-act="reset-skip">Plus tard</button></div>';
  }else if(S.gate.sent){
    var sk=S.gate.kind, stx={confirm:['Un e-mail de confirmation vient d’être envoyé à','. Clique sur le lien dedans : c’est la seule fois, ensuite ton mot de passe suffit.'],reset:['Un lien pour choisir ton nouveau mot de passe vient d’être envoyé à','. Ouvre-le sur cet appareil.'],link:['Un lien de connexion vient d’être envoyé à','. Ouvre-le sur cet appareil.']}[sk]||['Un lien de connexion vient d’être envoyé à','. Ouvre-le sur cet appareil.'];
    h+='<div class="gate-sent"><span class="empty-ic">'+ic('check')+'</span><strong>Regarde ta boîte mail</strong><span>'+stx[0]+' <b>'+esc(S.gate.sent)+'</b>'+stx[1]+'</span><span class="hint">Rien reçu après quelques minutes ? Regarde dans les spams.</span><button class="btn quiet sm" data-act="login-back">Retour</button></div>';
  }else{
    var names={google:'Google',discord:'Discord',github:'GitHub',apple:'Apple',azure:'Microsoft',gitlab:'GitLab',twitch:'Twitch'};
    var ps=Cloud.providers();
    h+='<div class="gate-btns">'+ps.map(function(p){return '<button class="btn lg" data-act="login" data-id="'+esc(p)+'">Continuer avec '+esc(names[p]||p)+'</button>';}).join('')+'</div>';
    if(Cloud.emailLogin()){
      if(ps.length)h+='<div class="gate-or"><span>ou</span></div>';
      var pwm=S.gate.mode==='pw', su=S.gate.signup, fg=pwm&&S.gate.forgot;
      if(fg){
        h+='<div class="gate-sub"><strong>Mot de passe oublié</strong><span>Entre ton adresse : tu reçois un lien pour en choisir un nouveau. Ça marche aussi si tu n’en as jamais eu.</span></div>';
      }else{
        h+='<div class="seg gate-mode" role="group" aria-label="Façon de se connecter"><button data-act="login-mode" data-id="pw" aria-pressed="'+pwm+'">Mot de passe</button><button data-act="login-mode" data-id="link" aria-pressed="'+(!pwm)+'">Lien par e-mail</button></div>';
      }
      h+='<div class="gate-mail"><label for="lg-email">Adresse e-mail</label><input class="in" id="lg-email" type="email" inputmode="email" autocomplete="email" placeholder="toi@exemple.com" value="'+esc(val)+'">';
      if(fg){
        h+='<button class="btn primary lg" data-act="login-forgot-send"'+(S.gate.sending?' disabled':'')+'>'+(S.gate.sending?'<i class="spin"></i>Envoi…':'Recevoir le lien')+'</button>'
          +'<div class="gate-links"><button class="linkbtn" data-act="login-forgot" data-id="0">'+ic('left')+'Retour à la connexion</button></div>';
      }else if(pwm){
        h+='<label for="lg-pw">Mot de passe</label>'+pwBox('lg-pw',su?'new-password':'current-password',su?'8 caractères ou plus':'Ton mot de passe',pwv)
          +'<button class="btn primary lg" data-act="login-pw"'+(S.gate.sending?' disabled':'')+'>'+(S.gate.sending?'<i class="spin"></i>Connexion…':(su?'Créer mon compte':'Se connecter'))+'</button>'
          +(su?'<p class="hint">Un seul e-mail pour confirmer ton adresse, ensuite ton mot de passe suffit.</p><div class="gate-links"><button class="linkbtn" data-act="login-signup" data-id="0">J’ai déjà un compte</button></div>'
              :'<div class="gate-links"><button class="linkbtn" data-act="login-forgot" data-id="1">Mot de passe oublié ?</button><button class="linkbtn" data-act="login-signup" data-id="1">Créer un compte</button></div>');
      }else{
        h+='<button class="btn primary lg" data-act="login-email"'+(S.gate.sending?' disabled':'')+'>'+(S.gate.sending?'<i class="spin"></i>Envoi…':'Recevoir un lien de connexion')+'</button><p class="hint">Pratique si tu n’as pas encore de mot de passe. Tu pourras en choisir un ensuite dans Réglages.</p>';
      }
      h+='</div>';
    }
  }
  if(S.gate.err)h+='<p class="gate-err" role="alert">'+esc(T(S.gate.err))+'</p>';
  put(h+'</div><p class="gate-foot">Un projet partagé avec toi ? Connecte-toi avec l’adresse e-mail qui a été invitée.</p></div>');
}
