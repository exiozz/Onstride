/* On Stride — formules (Gratuit, Premium, Pro) et espace admin.
   Pas encore de paiement en ligne : on contacte, puis l'admin active la formule avec l'adresse e-mail de la personne.
   La formule de chaque personne est rangée dans la table « premium » ; seuls les admins (table « admins ») peuvent la modifier. */
'use strict';

var MB=1024*1024;
/* Ce que chaque formule permet. Les nombres de projets et de messages sont aussi imposés par le serveur
   (my_project_quota et my_mail_quota dans supabase/schema.sql) : si tu les changes ici, change-les là-bas. */
var PLANS={
  free:{n:'Gratuit',tag:'Pour essayer et pour les petits projets',projects:3,photos:2,files:2,size:5*MB,mail:0,quotes:3,
    accents:false,skins:false,skinAnim:false,repeat:false,dup:false,msgs:false,keys:false,rate:false,csv:false},
  premium:{n:'Premium',tag:'Pour les indépendants qui ont des clients',month:4.99,year:49,projects:15,photos:6,files:8,size:20*MB,mail:15,quotes:Infinity,
    accents:true,skins:true,skinAnim:false,repeat:true,dup:true,msgs:true,keys:true,rate:false,csv:false},
  pro:{n:'Pro',tag:'Pour piloter toute ton activité',month:9.99,year:99,projects:Infinity,photos:15,files:20,size:50*MB,mail:150,quotes:Infinity,
    accents:true,skins:true,skinAnim:true,repeat:true,dup:true,msgs:true,keys:true,rate:true,csv:true}
};
var PLAN_ORDER=['free','premium','pro'];
var PERIODS={month:'1 mois',year:'1 an',gift:'Sans fin (offert)'};

/* formule de la personne connectée */
function planRow(){return S.prem||null;}
function planActive(r){return !!(r&&PLANS[r.plan]&&(!r.until||new Date(r.until).getTime()>Date.now()));}
function myPlan(){if(S.admin)return 'pro';var r=planRow();return planActive(r)?r.plan:'free';}
function plan(){return PLANS[myPlan()];}
function isPaid(){return myPlan()!=='free';}
function ownActiveProjects(){return S.projects.filter(function(p){return (!S.me||!p._owner||p._owner===S.me.id)&&pstat(p)!=='archived';}).length;}
function canAddProject(){return ownActiveProjects()<plan().projects;}

function fmtPrice(n){try{return new Intl.NumberFormat(LOCALE(),{style:'currency',currency:'EUR',minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}).format(n);}catch(_){return n+' €';}}
function fmtDay(iso){if(!iso)return '';var d=new Date(iso);return isNaN(d)?'':d.toLocaleDateString(LOCALE(),{day:'numeric',month:'long',year:'numeric'});}

/* chargement de la formule (et de la liste complète pour l'admin) */
function loadPlan(){
  if(!S.me||!Cloud.premiumMine)return Promise.resolve();
  function safe(f,d){return Promise.resolve().then(f).catch(function(){return d;});}
  return Promise.all([safe(function(){return Cloud.premiumMine(S.me.email);},null),safe(function(){return Cloud.isAdmin();},false)]).then(function(r){
    var was=myPlan();
    S.prem=r[0];S.admin=!!r[1];S.planReady=true;
    if(S.admin)return loadPremiumList();
    if(was!==myPlan())applyPrefs();
  }).then(function(){applyPrefs();queueRender();});
}
function loadPremiumList(){
  return Promise.resolve().then(function(){return Cloud.premiumAll();}).then(function(rows){S.premList=rows||[];S.premErr='';},function(e){S.premList=[];S.premErr=(e&&e.code)==='no_schema'?'no_schema':'err';}).then(queueRender);
}

/* ---------- message quand une limite est atteinte ---------- */
/* la formule juste au-dessus de celle de la personne */
function nextPlan(){return myPlan()==='free'?'premium':'pro';}
/* ce qui n'existe qu'en Pro : on propose Pro directement */
var PRO_ONLY={csv:1,skinpro:1,rate:1};
function upsellPlan(){return PRO_ONLY[S.upsell]?'pro':nextPlan();}
function upsellText(why){
  var me=PLANS[myPlan()], nx=PLANS[nextPlan()], pre=PLANS.premium, pro=PLANS.pro, free=myPlan()==='free';
  var T2={
    projects:free?tf('Tu as atteint {0} projets actifs, la limite de la formule Gratuite. Archive un projet, ou passe à Premium pour en avoir {1} (illimités en Pro).',me.projects,pre.projects):tf('Tu as atteint {0} projets actifs, la limite de la formule Premium. Archive un projet, ou passe à Pro pour ne plus avoir de limite.',me.projects),
    dup:free?'Dupliquer un projet pour s’en servir de modèle fait partie des formules Premium et Pro.':tf('Dupliquer un projet demande une place libre : tu as atteint {0} projets actifs. La formule Pro n’a pas de limite.',me.projects),
    photos:tf('Ta formule permet {0} photos par tâche. {1} en permet {2}.',me.photos,nx.n,nx.photos),
    files:tf('Ta formule permet {0} fichiers de {1} par tâche. {2} : {3} fichiers de {4}.',me.files,fmtSize(me.size),nx.n,nx.files,fmtSize(nx.size)),
    size:tf('Ce fichier dépasse les {0} permis par ta formule. {1} accepte jusqu’à {2} par fichier.',fmtSize(me.size),nx.n,fmtSize(nx.size)),
    accents:'Ces couleurs sont réservées aux formules Premium et Pro.',
    csv:'L’export en tableur fait partie de la formule Pro.',
    mail:tf('Écrire des messages est réservé aux formules Premium ({0} par heure) et Pro ({1} par heure). En Gratuit, tu peux lire ceux que tu reçois.',pre.mail,pro.mail),
    mailmax:tf('Tu as atteint ton nombre de messages pour cette heure. La formule Pro en permet {0} par heure.',pro.mail),
    skins:'Les thèmes à effets (Sakura, Aurore, Océan) sont réservés aux formules Premium et Pro.',
    skinpro:'Le fond animé des thèmes fait partie de la formule Pro.',
    repeat:'Les cartes récurrentes (chaque jour, semaine ou mois) font partie des formules Premium et Pro.',
    msgs:'Le point client et les relances de paiement prêts à envoyer font partie des formules Premium et Pro.',
    keys:'Créer tes propres raccourcis clavier fait partie des formules Premium et Pro. Tu peux déjà modifier ceux qui existent.',
    quotes:tf('La formule Gratuite permet {0} devis ou factures par mois. Premium et Pro n’ont pas de limite.',PLANS.free.quotes),
    rate:'Le taux horaire réel (ce que chaque projet te rapporte vraiment par heure) fait partie de la formule Pro.'
  };
  return T2[why]||T2.projects;
}
function upsell(why){closeOverlays();S.upsell=why||'projects';render();}
function upsellHtml(){
  var k=upsellPlan(), p=PLANS[k];
  return '<div class="ov top" data-act="ov-bg"><div class="upsell" role="dialog" aria-labelledby="up-t"><span class="up-ic">'+ic(k==='pro'?'bolt':'star')+'</span><h2 id="up-t">'+tf('Passe à {0}',p.n)+'</h2><p>'+upsellText(S.upsell)+'</p>'
    +'<p class="up-price">'+tf('{0} à partir de {1} par mois, sans engagement.',p.n,nt(fmtPrice(Math.round(p.year/12*100)/100)))+'</p>'
    +'<div class="row-btns"><button class="btn quiet" data-act="ov-close">Plus tard</button><button class="btn primary" data-act="view" data-id="plans">Voir les formules</button></div></div></div>';
}

/* ---------- page des formules ---------- */
/* lignes d'une carte de formule : [texte, inclus ?] */
function featList(k){
  var p=PLANS[k], L=[];
  function yes(t){L.push([t,true]);} function no(t){L.push([t,false]);}
  if(k==='free'){
    yes(tf('{0} projets actifs',p.projects));
    yes(tf('{0} photos et {1} fichiers par tâche ({2})',p.photos,p.files,fmtSize(p.size)));
    yes('Kanban, tableau blanc, calendrier, partage');
    yes('Chrono, mode Focus, clients');
    yes('Mail : lire les messages reçus');
    yes(tf('{0} devis ou factures par mois',p.quotes));
    no('Écrire dans Mail');no('Cartes récurrentes');no('Thèmes à effets');
  }else if(k==='premium'){
    yes(tf('{0} projets actifs',p.projects));
    yes(tf('{0} photos et {1} fichiers par tâche ({2})',p.photos,p.files,fmtSize(p.size)));
    yes(tf('Mail : écrire, {0} messages par heure',p.mail));
    yes('Cartes récurrentes et duplication de projet');
    yes('Point client et relances de paiement');
    yes('Devis et factures illimités');
    yes('Thèmes à effets et couleurs en plus');
    yes('Tes propres raccourcis clavier');
    no('Fond animé, taux horaire réel, export');
  }else{
    yes('Projets illimités');
    yes(tf('{0} photos et {1} fichiers par tâche ({2})',p.photos,p.files,fmtSize(p.size)));
    yes(tf('Mail : écrire, {0} messages par heure',p.mail));
    yes('Thèmes à effets avec fond animé');
    yes('Taux horaire réel de chaque projet');
    yes('Export des tâches et du livre des recettes en tableur');
    yes('Aide prioritaire');
  }
  return L;
}
/* tableau de comparaison : [ligne, gratuit, premium, pro] ; true = inclus, false = non, texte = précision */
function planTable(){
  var f=PLANS.free, a=PLANS.premium, b=PLANS.pro;
  function q(p){return p.projects===Infinity?T('Illimités'):String(p.projects);}
  function m(p){return p.mail?unmark(tf('{0} par heure',p.mail)):T('Lecture seule');}
  return [
    ['L’essentiel'],
    ['Projets actifs',q(f),q(a),q(b)],
    ['Photos par tâche',String(f.photos),String(a.photos),String(b.photos)],
    ['Fichiers par tâche',String(f.files),String(a.files),String(b.files)],
    ['Taille de chaque fichier',unmark(fmtSize(f.size)),unmark(fmtSize(a.size)),unmark(fmtSize(b.size))],
    ['Kanban, liste, table, calendrier, notes',true,true,true],
    ['Tableau blanc à blocs reliés',true,true,true],
    ['Partage avec lecteurs et éditeurs',true,true,true],
    ['Clients, montants, à encaisser',true,true,true],
    ['Devis et factures (PDF)',unmark(tf('{0} par mois',f.quotes)),T('Illimités'),T('Illimités')],
    ['Gagner du temps'],
    ['Chrono sur les cartes et mode Focus',true,true,true],
    ['Cartes récurrentes',f.repeat,a.repeat,b.repeat],
    ['Dupliquer un projet comme modèle',f.dup,a.dup,b.dup],
    ['Point client et relances de paiement',f.msgs,a.msgs,b.msgs],
    ['Créer ses raccourcis clavier',f.keys,a.keys,b.keys],
    ['Taux horaire réel de chaque projet',f.rate,a.rate,b.rate],
    ['Export des tâches et du livre des recettes en tableur',f.csv,a.csv,b.csv],
    ['Échanger et personnaliser'],
    ['Messages dans Mail',m(f),m(a),m(b)],
    ['Couleurs d’accent en plus',f.accents,a.accents,b.accents],
    ['Thèmes à effets (Sakura, Aurore, Océan)',f.skins,a.skins,b.skins],
    ['Fond animé des thèmes',f.skinAnim,a.skinAnim,b.skinAnim],
    ['Aide prioritaire',false,false,true]
  ];
}
function contactUrl(k){
  var cfg=window.AVANCEE_CONFIG||{}, to=cfg.contact||'', per=(S.planPer||'year')==='year'?T('à l’année'):T('au mois');
  if(!to)return '';
  var subj=unmark(tf('On Stride {0} ({1})',PLANS[k].n,per)), body=unmark(tf('Bonjour, je voudrais passer à la formule {0} ({1}) pour le compte {2}. Merci !',PLANS[k].n,per,S.me?S.me.email:''));
  if(/^https?:/.test(to))return to;
  return 'mailto:'+to.replace(/^mailto:/,'')+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
}
function vPlans(){
  var per=S.planPer||'year', cur=myPlan(), r=planRow();
  var h='<header class="phd plan-hd"><h1>Choisis ta formule</h1><p class="lead">Commence gratuitement. Passe à la suite quand ton activité grandit.</p></header>';
  if(cur!=='free')h+='<div class="note"><p>'+ic('star')+' '+tf(S.admin?'Tu es admin : tout est débloqué.':(r&&r.until?'Tu as la formule {0} jusqu’au {1}.':'Tu as la formule {0}.'),PLANS[cur].n,r?fmtDay(r.until):'')+'</p></div>';
  h+='<div class="plan-per"><span class="seg" role="group" aria-label="Facturation"><button data-act="plan-per" data-id="month" aria-pressed="'+(per==='month')+'">Mensuel</button><button data-act="plan-per" data-id="year" aria-pressed="'+(per==='year')+'">Annuel <span class="save">2 mois offerts</span></button></span></div>';
  h+='<div class="plans">';
  var tags={premium:'Recommandé',pro:'Le plus complet'};
  PLAN_ORDER.forEach(function(k){
    var p=PLANS[k], mine=k===cur, rec=k==='premium', lower=PLAN_ORDER.indexOf(k)<PLAN_ORDER.indexOf(cur);
    h+='<section class="plan plan-'+k+(rec?' rec':'')+(mine?' mine':'')+'"><header>'+(tags[k]?'<span class="plan-tag">'+tags[k]+'</span>':'')+'<h2>'+p.n+'</h2><p class="plan-for">'+p.tag+'</p>';
    if(k==='free')h+='<p class="price"><b>'+nt(fmtPrice(0))+'</b></p><p class="per">Pour toujours, sans carte bancaire</p>';
    else if(per==='year'){
      var mo=Math.round(p.year/12*100)/100, off=Math.round((1-p.year/(p.month*12))*100);
      h+='<p class="price"><b>'+nt(fmtPrice(mo))+'</b><span> / mois</span><s>'+nt(fmtPrice(p.month))+'</s></p><p class="per">'+tf('{0} facturés une fois par an',nt(fmtPrice(p.year)))+' <span class="plan-off">'+tf('−{0} %',off)+'</span></p>';
    }else h+='<p class="price"><b>'+nt(fmtPrice(p.month))+'</b><span> / mois</span></p><p class="per">'+tf('ou {0} par an : 2 mois offerts',nt(fmtPrice(p.year)))+'</p>';
    h+='</header>';
    if(mine)h+='<button class="btn" disabled>Ta formule actuelle</button>';
    else if(k==='free'||lower)h+='<span class="plan-gap"></span>';
    else{var u=contactUrl(k);h+=u?'<a class="btn'+(rec||k==='pro'?' primary':'')+(k==='pro'?' pro':'')+'" href="'+esc(u)+'" target="_blank" rel="noopener">'+tf('Passer à {0}',p.n)+ic('arrow')+'</a>':'<button class="btn" disabled>Bientôt disponible</button>';}
    h+='<p class="plan-inc">'+(k==='free'?'Ce qui est inclus :':k==='premium'?'Tout Gratuit, en plus grand :':'Tout Premium, et en plus :')+'</p>';
    h+='<ul>'+featList(k).map(function(f){return '<li'+(f[1]?'':' class="no"')+'>'+ic(f[1]?'check':'x')+'<span>'+f[0]+(f[1]?'':'<span class="sr"> (non inclus)</span>')+'</span></li>';}).join('')+'</ul>';
    h+='</section>';
  });
  h+='</div><p class="hint plan-note">'+ic('lock')+'Sans engagement : tu peux revenir à la formule Gratuite quand tu veux, tes projets et tes données restent.</p>';
  /* comparaison détaillée */
  function cell(v){return v===true?'<span class="pt-y">'+ic('check')+'<span class="sr">Inclus</span></span>':v===false?'<span class="pt-n" aria-hidden="true">—</span><span class="sr">Non inclus</span>':nt(escRaw(v));}
  h+='<section class="sect"><h2>Comparer en détail</h2><div class="panel tblwrap"><table class="ptable"><thead><tr><th scope="col"><span class="sr">Fonction</span></th>'+PLAN_ORDER.map(function(k){return '<th scope="col"'+(k===cur?' class="cur"':'')+'>'+PLANS[k].n+'</th>';}).join('')+'</tr></thead><tbody>';
  planTable().forEach(function(row){
    if(row.length===1){h+='<tr class="pt-g"><th scope="colgroup" colspan="4">'+row[0]+'</th></tr>';return;}
    h+='<tr><th scope="row">'+row[0]+'</th>'+[1,2,3].map(function(i){return '<td'+(PLAN_ORDER[i-1]===cur?' class="cur"':'')+'>'+cell(row[i])+'</td>';}).join('')+'</tr>';
  });
  h+='</tbody></table></div></section>';
  h+='<section class="sect plan-faq"><h2>Questions fréquentes</h2>'
    +'<details class="panel"><summary>Comment je passe à Premium ou à Pro ?</summary><p>Le paiement en ligne arrive bientôt. En attendant, clique sur le bouton de la formule : il prépare un message. Ta formule est ensuite activée à la main, avec l’adresse e-mail de ton compte.</p></details>'
    +'<details class="panel"><summary>Que se passe-t-il si j’atteins une limite ?</summary><p>Rien n’est supprimé ni bloqué. Tu ne peux simplement plus en ajouter (un projet, une photo, un message) tant que tu n’as pas fait de la place ou changé de formule.</p></details>'
    +'<details class="panel"><summary>Et si j’arrête ma formule ?</summary><p>Tu reviens à la formule Gratuite. Tes projets, tes cartes et tes messages restent là et restent lisibles ; seules les limites de la formule Gratuite s’appliquent pour en créer de nouveaux.</p></details>'
    +'<details class="panel"><summary>Mes invités doivent-ils payer ?</summary><p>Non. Les personnes que tu invites sur un projet y accèdent avec un compte gratuit.</p></details></section>';
  return h;
}

/* ---------- espace admin ---------- */
function premDefaultUntil(per,from){
  if(per==='gift')return null;
  var d=new Date(Math.max(Date.now(),from?new Date(from).getTime():0));
  if(per==='year')d.setFullYear(d.getFullYear()+1);else d.setMonth(d.getMonth()+1);
  return d.toISOString();
}
function vAdmin(){
  var h='<header class="phd"><h1>Admin</h1><p class="lead">Choisis qui a Premium ou Pro. Visible par toi seul.</p></header>';
  if(S.premErr==='no_schema')return h+'<div class="note bad"><p>La table des formules n’existe pas encore : relance le fichier supabase/schema.sql dans Supabase (SQL Editor), puis recharge la page.</p></div>';
  var rows=(S.premList||[]).slice().sort(function(a,b){return (b.updated_at||'')<(a.updated_at||'')?-1:1;});
  var act=rows.filter(planActive), np=act.filter(function(r){return r.plan==='premium';}).length, npro=act.length-np;
  h+='<div class="stats"><div class="stat"><span>'+ic('star')+'Premium actifs</span><b>'+np+'</b></div><div class="stat"><span>'+ic('bolt')+'Pro actifs</span><b>'+npro+'</b></div><div class="stat"><span>'+ic('clock')+'Expirés</span><b>'+(rows.length-act.length)+'</b></div></div>';
  h+='<section class="panel scard admin-add"><h2>'+ic('plus')+'Donner une formule</h2><div class="adm-form">'
    +'<label class="sr" for="adm-email">Adresse e-mail</label><input class="in grow" id="adm-email" type="email" data-draft placeholder="adresse@exemple.com" autocomplete="off">'
    +'<label class="sr" for="adm-plan">Formule</label>'+selH('adm-plan','','',{premium:'Premium',pro:'Pro'},S.admPlan||'premium','in')
    +'<label class="sr" for="adm-per">Durée</label>'+selH('adm-per','','',L(PERIODS),S.admPer||'month','in')
    +'<button class="btn primary" data-act="adm-save">Activer</button></div>'
    +'<p class="hint">La personne doit se connecter avec cette adresse. Si elle a déjà une formule en cours, la durée s’ajoute à ce qui reste.</p></section>';
  var q=norm(S.admQ||'');
  var list=rows.filter(function(r){return !q||norm(r.email).indexOf(q)>=0;});
  h+='<section class="sect"><h2>Comptes avec une formule <span class="cnt">'+rows.length+'</span><span class="grow"></span><span class="fq">'+ic('search')+'<label class="sr" for="adm-q">Chercher une adresse</label><input id="adm-q" type="search" value="'+esc(S.admQ||'')+'" placeholder="Chercher une adresse" autocomplete="off"></span></h2>';
  if(!rows.length)return h+empty('star','Personne pour l’instant','Ajoute une adresse e-mail ci-dessus pour donner Premium ou Pro.')+'</section>';
  h+='<ul class="tlist panel adm-list">';
  list.forEach(function(r){
    var on=planActive(r), e=esc(r.email);
    h+='<li class="trow adm-row"><span class="grow adm-who"><b>'+e+'</b><span class="mut">'+nt(escRaw(unmark(r.until?tf(on?'jusqu’au {0}':'expiré le {0}',fmtDay(r.until)):T('sans fin'))+(r.granted_by?' · '+unmark(tf('par {0}',r.granted_by)):'')))+'</span></span>'
      +'<span class="pill'+(on?' ok':'')+'">'+(on?PLANS[r.plan].n:'Expiré')+'</span>'
      +'<button class="btn sm" data-act="adm-extend" data-id="'+e+'" title="'+tf('Prolonger de {0}',T(PERIODS[r.period==='year'?'year':'month']))+'">'+(r.period==='year'?'+1 an':'+1 mois')+'</button>'
      +(S.confirm==='adm:'+r.email?'<button class="btn sm danger" data-act="adm-del" data-id="'+e+'">Confirmer</button>':'<button class="ib sm dng" data-act="adm-del" data-id="'+e+'" aria-label="'+tf('Retirer la formule de {0}',e)+'">'+ic('trash')+'</button>')+'</li>';
  });
  if(!list.length)h+='<li class="trow mut">Aucune adresse ne correspond.</li>';
  return h+'</ul></section>';
}
function admSave(email,planK,per,extend){
  email=String(email||'').trim().toLowerCase();
  if(!validEmail(email)){toast('Adresse e-mail invalide.',{bad:true});return;}
  var old=(S.premList||[]).find(function(r){return r.email===email;});
  var from=old&&planActive(old)&&old.until?old.until:null;
  var row={email:email,plan:planK,period:per,until:premDefaultUntil(per,from),granted_by:S.me.email,updated_at:new Date().toISOString()};
  /* optimiste : on affiche tout de suite, on recharge après */
  S.premList=(S.premList||[]).filter(function(r){return r.email!==email;}).concat([row]);render();
  Cloud.premiumSave(row).then(function(r){
    if(r&&r.error)throw r.error;
    toast(extend?tf('{0} : prolongé.',email):tf('{0} a maintenant la formule {1}.',email,PLANS[planK].n));
    if(email===S.me.email)S.prem=row;
    loadPremiumList();
  }).catch(function(){toast('Enregistrement impossible. Réessaie dans un instant.',{bad:true});loadPremiumList();});
}
function admRemove(email){
  S.confirm=null;
  var old=(S.premList||[]).find(function(r){return r.email===email;});
  S.premList=(S.premList||[]).filter(function(r){return r.email!==email;});render();
  Cloud.premiumRemove(email).then(function(r){
    if(r&&r.error)throw r.error;
    toast(tf('{0} repasse en formule Gratuite.',email),{undo:old?function(){Cloud.premiumSave(old).then(loadPremiumList);}:null});
    loadPremiumList();
  }).catch(function(){toast('Suppression impossible. Réessaie dans un instant.',{bad:true});loadPremiumList();});
}

/* ---------- export en tableur (Pro) ---------- */
function exportCsv(){
  if(!plan().csv){upsell('csv');return;}
  var by=index(), sep=';', rows=[[T('Projet'),T('Tâche'),T('Colonne'),T('Terminée'),T('Priorité'),T('Échéance'),T('Assigné à'),T('Labels'),T('Description')]];
  function cell(v){v=String(v==null?'':v);return /[";\n\r]/.test(v)||/^[=+\-@]/.test(v)?'"'+(/^[=+\-@]/.test(v)?"'":'')+v.replace(/"/g,'""')+'"':v;}
  S.tasks.forEach(function(t){
    var e=by[t.projectId]||null, p=e?e.p:null;
    rows.push([p?p.name:'Bazar',t.title,e?colName(e,t._col):'',isDone(t,e)?T('Oui'):T('Non'),T(PRIO[prioOf(t)]),t.due||'',t.who||'',p?(t.labels||[]).map(function(id){var l=findLabel(p,id);return l?(l.name||''):'';}).filter(Boolean).join(', '):'',t.notes||'']);
  });
  var csv='﻿'+rows.map(function(r){return r.map(cell).join(sep);}).join('\r\n');
  try{
    var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    var a=document.createElement('a');a.href=url;a.download='onstride-tasks-'+todayStr()+'.csv';document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},500);
    toast('Export téléchargé.');
  }catch(_){toast('Export impossible pour le moment.',{bad:true});}
}

/* ---------- clics ---------- */
function planClick(act,id,b){
  if(act==='plan-per'){S.planPer=id==='year'?'year':'month';render();return true;}
  if(act==='upsell'){upsell(id);return true;}
  if(act==='export-csv'){exportCsv();return true;}
  if(!S.admin)return false;
  if(act==='adm-save'){
    var em=(document.getElementById('adm-email')||{}).value, pk=(document.getElementById('adm-plan')||{}).value||'premium', pr=(document.getElementById('adm-per')||{}).value||'month';
    S.admPlan=pk;S.admPer=pr;
    if(!validEmail(String(em||'').trim().toLowerCase())){toast('Adresse e-mail invalide.',{bad:true});var ei=document.getElementById('adm-email');if(ei)ei.focus();return true;}
    var ie=document.getElementById('adm-email');if(ie)ie.value='';delete S.dirty['adm-email'];
    admSave(em,pk,pr,false);return true;
  }
  if(act==='adm-extend'){var r=(S.premList||[]).find(function(x){return x.email===id;});if(r)admSave(r.email,r.plan,r.period==='year'?'year':'month',true);return true;}
  if(act==='adm-del'){if(S.confirm==='adm:'+id)admRemove(id);else{S.confirm='adm:'+id;render();}return true;}
  return false;
}
