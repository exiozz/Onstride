/* On Stride — encore des plus : mode Focus, relances de paiement, cartes récurrentes.
   Comme js/extras.js, rien à ajouter dans la base : tout vit dans les cartes et les infos privées des projets. */
'use strict';

/* =====================================================================
   1. MODE FOCUS : une seule tâche à l'écran, la plus utile à faire maintenant
   ===================================================================== */
/* cartes qui en attendent une autre sur un tableau blanc : inutile de les proposer */
function waitingIds(by){
  var out={};
  Object.keys(by).forEach(function(pid){
    var e=by[pid]; if(!e.p.wb||!(e.p.wb.l||[]).length)return;
    var wb=wbData(e.p), blk=wbBlockers(wb,e);
    wb.n.forEach(function(n){if(n.task&&blk[n.id])out[n.task]=blk[n.id][0];});
  });
  return out;
}
function zenList(by){
  var today=todayStr(), wk=addDays(7), wait=waitingIds(by), skip=(S.zen&&S.zen.skip)||{}, out=[];
  function days(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000);}
  var pool=liveTasks(by).filter(function(t){var e=by[t.projectId];return e.rw&&!isDone(t,e)&&pstat(e.p)==='active';}).concat(inboxTasks().filter(function(t){return !t.done;}));
  pool.forEach(function(t){
    if(skip[t.id]||wait[t.id]||!mine(t))return;
    var e=by[t.projectId]||null, pr=prioOf(t), s=0, why='';
    if(t.due&&t.due<today){var n=days(t.due,today);s=200+Math.min(60,n);why=unmark(tf(n>1?'En retard de {0} jours':'En retard depuis hier',n));}
    else if(t.due===today){s=150;why=T('À rendre aujourd’hui');}
    else if(t.due&&t.due<=wk){s=60-days(today,t.due)*4;why=unmark(tf('À rendre le {0}',unmark(fmtDate(t.due)).replace(/\.$/,'')));}
    s+=pr*18;
    if(!why&&pr===3)why=T('Priorité haute');
    if(e&&t._col!==e.cols[0].id){s+=14;if(!why)why=T('Déjà commencée : autant la finir');}
    if(!why)why=T('La plus ancienne de ta liste');
    out.push({t:t,e:e,s:s,why:why});
  });
  return out.sort(function(a,b){return (b.s-a.s)||(posOf(a.t)-posOf(b.t));});
}
function zenHtml(by){
  var list=zenList(by), x=list[0], nskip=Object.keys(S.zen.skip||{}).length;
  var h='<div class="ov top" data-act="ov-bg"><div class="zen" role="dialog" aria-labelledby="zen-t"><header><span class="zen-k">'+ic('bolt')+'Focus</span><span class="grow"></span><button class="ib" data-act="ov-close" aria-label="Fermer">'+ic('x')+'</button></header>';
  if(!x){
    h+='<div class="zen-b"><h2 id="zen-t">'+(nskip?'Plus rien à proposer':'Rien à faire pour l’instant')+'</h2><p class="mut">'+(nskip?'Tu as passé toutes les tâches restantes.':'Aucune tâche ouverte ne t’attend. Profites-en.')+'</p></div><footer>'+(nskip?'<button class="btn" data-act="zen-reset">Revoir les tâches passées</button>':'')+'<span class="grow"></span><button class="btn primary" data-act="ov-close">Fermer</button></footer></div></div>';
    return h;
  }
  var t=x.t, e=x.e, id=esc(t.id), r=timerOn(), on=r&&r.task===t.id;
  h+='<div class="zen-b"><p class="zen-why">'+nt(escRaw(x.why))+'</p><h2 id="zen-t">'+esc(t.title||T('Sans titre'))+'</h2>'
    +'<p class="zen-p">'+(e?'<span class="picon">'+picon(e.p)+'</span><span>'+esc(e.p.name)+'</span><span class="cnt">/ '+esc(colName(e,t._col))+'</span>':ic('box')+'<span>Bazar</span>')+'</p>'
    +badges(t,e)+(t.notes?'<p class="zen-n">'+esc(String(t.notes).slice(0,260))+(String(t.notes).length>260?'…':'')+'</p>':'')+'</div>';
  h+='<footer><button class="btn primary" data-act="zen-done" data-id="'+id+'">'+ic('check')+'C’est fait</button>'
    +(e&&e.own?(on?'<button class="btn" data-act="timer-stop">'+ic('stop')+'Arrêter le chrono</button>':'<button class="btn" data-act="zen-go" data-id="'+id+'">'+ic('play')+'Je m’y mets</button>'):'')
    +'<button class="btn quiet" data-act="open" data-id="'+id+'">Ouvrir</button><span class="grow"></span>'
    +(list.length>1?'<button class="btn quiet" data-act="zen-skip" data-id="'+id+'">Passer'+ic('chev')+'</button>':'')+'</footer>'
    +'<p class="zen-c">'+(list.length>1?tf(list.length>2?'Encore {0} tâches après celle-ci.':'Encore une tâche après celle-ci.',list.length-1):'C’est la dernière de ta liste.')+'</p></div></div>';
  return h;
}

/* =====================================================================
   2. RELANCES DE PAIEMENT : ce qu'il reste à encaisser, et le message pour le demander
   ===================================================================== */
function payList(by){
  return S.projects.map(function(p){
    var e=by[p.id], m=metaOf(p.id), rest=(Number(m.amount)||0)-(Number(m.paid)||0);
    if(!e||!e.own||rest<=0||pstat(p)==='archived')return null;
    return {e:e,m:m,rest:rest,due:pstat(p)==='done'||e.pct===100&&e.total>0};
  }).filter(Boolean).sort(function(a,b){return (b.due-a.due)||(b.rest-a.rest);});
}
function payWidget(by){
  var l=payList(by), due=l.filter(function(x){return x.due;}), tot=0;
  if(!l.length)return empty('check','Rien à encaisser','Renseigne le montant et l’encaissé d’un projet pour suivre ce qu’on te doit.');
  l.forEach(function(x){tot+=x.rest;});
  var h=l.slice(0,5).map(function(x){
    var cl=clientOf(x.e.p), id=esc(x.e.p.id);
    return '<div class="payrow"><button class="mini" data-act="view" data-id="'+id+'"><span class="picon">'+picon(x.e.p)+'</span><span class="mini-t">'+esc(x.e.p.name)+(cl?' <span class="mut">· '+esc(cl.name)+'</span>':'')+'</span><span class="cnt">'+(x.m.remindAt?tf('relancé {0} · ',T(ago(Number(x.m.remindAt)))):'')+nt(eur(x.rest))+'</span></button>'
      +(x.due?'<button class="btn sm" data-act="pay-remind" data-id="'+id+'">Relancer</button>':'<span class="pill" title="Le projet n’est pas encore livré">En cours</span>')+'</div>';
  }).join('');
  return h+'<p class="wfoot">'+(due.length?tf(due.length>1?'{0} projets livrés attendent un règlement.':'Un projet livré attend un règlement.',due.length)+' ':'')+'Total à encaisser : <b>'+nt(eur(tot))+'</b></p>';
}
function payText(e){
  var p=e.p, cl=clientOf(p), m=metaOf(p.id), amount=Number(m.amount)||0, paid=Number(m.paid)||0, rest=amount-paid;
  var who=cl?String(cl.name||'').trim().split(' ')[0]:'', again=!!m.remindAt;
  var L=[unmark(who?tf('Bonjour {0},',who):T('Bonjour,')),''];
  L.push(unmark(tf(again?'Je me permets de revenir vers toi au sujet du règlement de « {0} ».':'J’espère que tu vas bien. Je reviens vers toi au sujet du règlement de « {0} ».',p.name)));
  L.push(unmark(paid>0?tf('Sauf erreur de ma part, il reste {0} à régler sur un total de {1} (déjà reçu : {2}).',unmark(eur(rest)),unmark(eur(amount)),unmark(eur(paid))):tf('Sauf erreur de ma part, le montant de {0} n’a pas encore été réglé.',unmark(eur(rest)))));
  L.push('',unmark(T('Peux-tu me dire quand le règlement est prévu ? Je te renvoie la facture si besoin.')),'',unmark(T('Merci d’avance,')),myName()||'');
  return L.join('\n').replace(/\n+$/,'');
}
/* bouton ajouté au bloc « Privé » d'un projet */
function payRow(e,m){
  var rest=(Number(m.amount)||0)-(Number(m.paid)||0);
  if(rest<=0)return '';
  return '<div class="row-btns"><button class="btn sm" data-act="pay-remind" data-id="'+esc(e.p.id)+'">'+ic('msg')+'Relancer le paiement</button>'+(m.remindAt?'<span class="cnt">'+tf('Dernière relance {0}',T(ago(Number(m.remindAt))))+'</span>':'')+'</div>';
}

/* =====================================================================
   3. CARTES RÉCURRENTES : une fois terminée, la carte revient à la prochaine date
   ===================================================================== */
var REP={'':'Jamais',day:'Chaque jour',week:'Chaque semaine',month:'Chaque mois'};
function repNext(from,rep){
  var today=todayStr(), d=new Date((from||today)+'T12:00:00'), day=d.getDate(), n=0;
  do{
    if(rep==='day')d.setDate(d.getDate()+1);
    else if(rep==='week')d.setDate(d.getDate()+7);
    else{d.setDate(1);d.setMonth(d.getMonth()+1);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}
  }while(ds(d)<=today&&++n<400);
  return ds(d);
}
/* appelée quand une carte passe à « terminé » : crée la suivante et renvoie true */
function repeatTask(t,e){
  if(!t||!REP[t.rep]||!t.rep||!S.db)return false;
  var d=clean(t), due=repNext(t.due,t.rep);
  d.due=due;d.pos=Date.now();d.createdAt=Date.now();d.doneAt=null;
  d.act=[{t:'Carte récurrente créée',at:Date.now()}];
  delete d.photos;delete d.files;delete d.log;
  if(d.check)d.check=d.check.map(function(i){var o={id:rnd(),t:i.t,d:false};if(i.k)o.k=i.k;return o;});
  if(e)d.columnId=e.cols[0].id; else d.done=false;
  var ref=S.db.collection((t._priv?PRIV:'')+'tasks').doc();
  run(function(){return ref.set(d);});
  toast(tf('Carte récurrente : la suivante est prévue le {0}.',unmark(fmtDate(due)).replace(/\.$/,'')));
  return true;
}
function repProp(t,ed){
  var id=esc(t.id);
  if(ed)return prop(ic('repeat')+'Répéter',selH('mr-'+id,'trep',id,L(REP),t.rep||''),'mr-'+id);
  return t.rep&&REP[t.rep]?prop(ic('repeat')+'Répéter','<span class="val">'+REP[t.rep]+'</span>'):'';
}

/* =====================================================================
   4. MON RYTHME : cartes terminées sur les 7 derniers jours, comparées aux 7 d'avant
   ===================================================================== */
function paceWidget(by){
  var days=[], n=0, prev=0, now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6).getTime(), before=start-7*86400000, mx=1;
  for(var i=6;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);days.push({k:ds(d),d:d,n:0});}
  var idx={}; days.forEach(function(x){idx[x.k]=x;});
  liveTasks(by).filter(function(t){return isDone(t,by[t.projectId]);}).concat(inboxTasks().filter(function(t){return t.done;})).forEach(function(t){
    var at=Number(t.doneAt)||0; if(!at)return;
    if(at>=start){var x=idx[ds(new Date(at))];if(x){x.n++;n++;}}
    else if(at>=before)prev++;
  });
  days.forEach(function(x){mx=Math.max(mx,x.n);});
  var diff=n-prev, msg=!n&&!prev?'Termine une carte pour voir ton rythme ici.':diff>0?tf(diff>1?'{0} de plus que les 7 jours d’avant.':'Une de plus que les 7 jours d’avant.',diff):diff<0?tf(diff<-1?'{0} de moins que les 7 jours d’avant.':'Une de moins que les 7 jours d’avant.',-diff):'Autant que les 7 jours d’avant.';
  var h='<div class="pace"><p class="pace-n"><b>'+n+'</b> <span>'+(n>1?'cartes terminées en 7 jours':'carte terminée en 7 jours')+'</span></p>';
  h+='<div class="pace-bars" role="img" aria-label="'+tf('Cartes terminées par jour : {0}',days.map(function(x){return unmark(nt(x.d.toLocaleDateString(LOCALE(),{weekday:'short'})))+' '+x.n;}).join(', '))+'">'+days.map(function(x,i){
    return '<span class="pace-c'+(i===6?' today':'')+'" aria-hidden="true"><i class="pace-v">'+(x.n||'')+'</i><i class="pace-b'+(x.n?'':' zero')+'" style="height:'+(x.n?Math.max(10,Math.round(x.n/mx*100)):0)+'%"></i><i class="pace-d">'+nt(escRaw(x.d.toLocaleDateString(LOCALE(),{weekday:'narrow'})))+'</i></span>';
  }).join('')+'</div><p class="wfoot">'+msg+'</p></div>';
  return h;
}

/* =====================================================================
   5. DUPLIQUER UN PROJET : s'en servir comme modèle pour le suivant
   ===================================================================== */
function dupProject(e){
  if(S.planReady&&(!plan().dup||!canAddProject())){upsell('dup');return;}
  var p=e.p, ref=S.db.collection((p._priv?PRIV:'')+'projects').doc(), map={}, first=e.cols[0].id, now=Date.now();
  var doc=clean(p);
  doc.name=(p.name||'')+T(' (copie)');doc.status='active';doc.createdAt=now;doc.fav=false;delete doc.start;delete doc.deadline;delete doc.demo;
  var tasks=e.tasks.slice().sort(function(a,b){var ia=e.cols.findIndex(function(c){return c.id===a._col;}), ib=e.cols.findIndex(function(c){return c.id===b._col;});return (ia-ib)||cmpPos(a,b);}).map(function(t,i){
    var tref=S.db.collection(realm(p.id)+'tasks').doc(), d=clean(t); map[t.id]=tref.id;
    d.projectId=ref.id;d.columnId=first;d.pos=now+i;d.createdAt=now;d.doneAt=null;d.due='';
    d.act=[{t:'Carte créée',at:now}];delete d.photos;delete d.files;delete d.log;
    if(d.check)d.check=d.check.map(function(c){var o={id:rnd(),t:c.t,d:false};if(c.k)o.k=c.k;return o;});
    return {ref:tref,d:d};
  });
  if(doc.wb){
    delete doc.wb.h;
    var keep={}; doc.wb.n=(doc.wb.n||[]).filter(function(n){if(!n.task)return true;if(map[n.task]){n.task=map[n.task];return true;}keep[n.id]=1;return false;});
    doc.wb.l=(doc.wb.l||[]).filter(function(l){return !keep[l.a]&&!keep[l.b];});
  }
  var cid=metaOf(p.id).clientId;
  S.view=ref.id;S.pending=ref.id;S.task=null;S.confirm=null;persist();
  toast(tf('Projet dupliqué : {0} copiées, à refaire depuis la première colonne.',pl(tasks.length,T('carte'),T('cartes'))));
  return run(function(){
    var chain=ref.set(doc);
    tasks.forEach(function(x){chain=chain.then(function(){return x.ref.set(x.d);});});
    return chain.then(function(){if(cid)return S.db.doc(PRIV+'meta/'+ref.id).set({clientId:cid});});
  });
}

/* ---------- branchements (appelés depuis js/extras.js) ---------- */
function moreClick(act,id,b){
  if(act==='zen'){closeOverlays();S.zen={skip:{}};render();return true;}
  if(act.indexOf('zen-')===0){
    if(!S.zen){render();return true;}
    var t=id?taskById(id):null;
    if(act==='zen-reset'){S.zen.skip={};render();return true;}
    if(act==='zen-skip'){S.zen.skip[id]=1;render();return true;}
    if(act==='zen-done'&&t){toggleTask(t,index()[t.projectId]||null);render();return true;}
    if(act==='zen-go'&&t){timerStart(t);closeOverlays();openTask(t.id);render();return true;}
    render();return true;
  }
  if(act==='dup-project'){var de=index()[id];if(de&&de.own&&S.canEdit)dupProject(de);render();return true;}
  if(act==='pay-remind'){
    var e=index()[id];
    if(e&&e.own&&S.planReady&&!plan().msgs){upsell('msgs');return true;}
    if(e&&e.own){closeOverlays();S.report=id;S.repKind='pay';S.focus='rep-txt';}
    render();return true;
  }
  return false;
}
function moreChange(k,id,v){
  if(k==='trep'){
    var t=taskById(id); if(!t)return true;
    v=REP[v]?v:'';
    if(v&&S.planReady&&!plan().repeat){upsell('repeat');return true;}   /* une carte déjà récurrente continue de se répéter */
    run(function(){return tdoc(id).update({rep:v,act:actOf(t,v?'Répétition : '+REP[v].toLowerCase():'Répétition retirée')});});
    if(v&&!t.due)toast('Ajoute une échéance : la prochaine carte partira de cette date.');
    return true;
  }
  return false;
}
