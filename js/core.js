/* On Stride — socle : constantes, état, utilitaires, données, écritures.
   Les fichiers se chargent dans l'ordre core → ui → views → overlays → main et partagent ces fonctions globales. */
'use strict';

var PRIV='';  /* sur le site, une seule base : les droits sont gérés par le serveur, ligne par ligne */
var DEFCOLS=[{id:'todo',name:'À faire'},{id:'doing',name:'En cours'},{id:'done',name:'Terminé',done:true}];
var TPL={
  client:{name:'Projet client',cols:['Brief','À faire','En cours','Validation client','Livré']},
  vente:{name:'Suivi de prospects',cols:['Prospect','Contacté','Devis envoyé','Négociation','Gagné']},
  contenu:{name:'Contenu',cols:['Idées','Rédaction','Relecture','Publié']},
  perso:{name:'Perso',cols:['Idées','À faire','En cours','Terminé']}
};
var PST={active:'En cours',wait:'En attente',done:'Livré',archived:'Archivé'};
var PSTC={active:0,wait:3,done:2,archived:-1};
var CST={lead:'Prospect',active:'Actif',pause:'En pause',done:'Terminé'};
var CSTC={lead:3,active:2,pause:-1,done:0};
var PRIO={0:'Aucune',1:'Basse',2:'Moyenne',3:'Haute'};
var COLORS=['Bleu','Rose','Vert','Orange','Violet','Cyan'];
var DAYS=['lun.','mar.','mer.','jeu.','ven.','sam.','dim.'];
var MODES=[['board','Kanban','board'],['list','Liste','list'],['table','Table','table'],['cal','Calendrier','calendar'],['doc','Notes','note'],['wb','Tableau blanc','nodes']];
var EMOJIS=['📌','🚀','💡','🎯','📅','📝','🛠️','🎨','📦','💼','🧪','📚','🏠','💬','🔥','⭐','✅','🌱','🎮','💣','📈','🧩','🔧','🧠'];
var ACCENTS={
  cobalt:{n:'Cobalt',l:'#2F5BEA',d:'#7C9BFF'},
  violet:{n:'Violet',l:'#6E56CF',d:'#A996FF'},
  emeraude:{n:'Émeraude',l:'#0B8A63',d:'#3DD6A0'},
  corail:{n:'Corail',l:'#D9480F',d:'#FF8A5C'},
  rose:{n:'Rose',l:'#C8327A',d:'#FF7EB6'},
  ardoise:{n:'Ardoise',l:'#3B4252',d:'#C3C9D6'},
  /* réservées aux formules Premium et Pro */
  or:{n:'Or',l:'#A86A00',d:'#F5C451',p:true},
  menthe:{n:'Menthe',l:'#0A8A7A',d:'#56E0CB',p:true},
  lavande:{n:'Lavande',l:'#7C4DDB',d:'#C7B2FF',p:true},
  framboise:{n:'Framboise',l:'#B0154F',d:'#FF6E9C',p:true},
  nuit:{n:'Nuit',l:'#1E3A8A',d:'#9DB4FF',p:true}
};
var WIDGETS={
  today:{t:'Aujourd’hui'},week:{t:'Cette semaine'},pay:{t:'À encaisser',owner:true},pace:{t:'Mon rythme'},projects:{t:'Projets récents'},progress:{t:'Progression'},
  activity:{t:'Activité récente'},clients:{t:'Clients',owner:true},quotes:{t:'Devis et factures',owner:true},notes:{t:'Notes rapides',owner:true}
};
var WORDER=['today','week','projects','quotes','progress','activity','clients','pay','pace','notes'];

/* préférences locales (par appareil) */
var LS={
  get:function(k,d){try{var v=localStorage.getItem('av.'+k);return v==null?d:JSON.parse(v);}catch(_){return d;}},
  set:function(k,v){try{localStorage.setItem('av.'+k,JSON.stringify(v));}catch(_){}}
};
var P={theme:LS.get('theme','system'),accent:LS.get('accent','cobalt'),density:LS.get('density','normal'),size:LS.get('size','m')};
if(!ACCENTS[P.accent])P.accent='cobalt';

var S={db:null,dl:null,owner:false,unsure:false,preview:false,canEdit:false,me:null,auth:'boot',roles:{},gate:{sending:false,sent:'',err:'',mode:LS.get('lgmode','pw')==='link'?'link':'pw',signup:false,forgot:false,show:false,kind:''},
  loaded:{s:false,p:false,t:false,c:false,m:false,cfg:false,mb:false,q:false},
  raw:{s:[],p:[],t:[],c:[],m:[],cfg:[],mb:[],q:[]},
  spaces:[],projects:[],tasks:[],clients:[],meta:{},cfg:{},quotes:[],
  view:LS.get('view','home'),lastView:null,pmode:LS.get('pmode',{}),confirm:null,error:'',pending:null,hold:null,
  q:'',fl:null,sort:{k:'pos',d:1},cal:null,calProj:'',calMode:'month',
  task:null,taskFresh:false,menu:null,lblMgr:false,nlc:0,dirty:{},
  coll:LS.get('coll',{}),addSpace:false,addIn:null,ren:null,smenu:null,iconPick:false,comp:null,
  pal:false,pq:'',pi:0,qa:null,tour:null,photo:null,upl:{},fupl:{},sheet:null,ctx:null,focus:null,
  tf:'all',tv:LS.get('tv','list'),pf:'active',dashEdit:false,det:false,
  saving:0,savedAt:0,online:true,sb:LS.get('sb',null),gAt:0};
if(S.view==='overview')S.view='home';
(function(){var d=LS.get('det',null);if(d===true||d===false)S.det=d;})();
function persist(){LS.set('view',S.view);LS.set('pmode',S.pmode);LS.set('coll',S.coll);LS.set('tv',S.tv);}
function isNarrow(){try{return !!(window.matchMedia&&window.matchMedia('(max-width:699px)').matches);}catch(_){return false;}}
function isMid(){try{return !!(window.matchMedia&&window.matchMedia('(max-width:1099px)').matches);}catch(_){return false;}}

/* ---------- utilitaires ---------- */
function esc(s){return nt(escRaw(s));}   /* contenu saisi : échappé, et jamais traduit */
function escRaw(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return String(n).padStart(2,'0');}
function ds(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function todayStr(){return ds(new Date());}
function addDays(n,from){var d=from?new Date(from):new Date();d.setDate(d.getDate()+n);return ds(d);}
function fmtDate(s){if(!s)return '';var d=new Date(s+'T12:00:00');return isNaN(d)?s:d.toLocaleDateString(LOCALE(),{day:'numeric',month:'short'});}
function fmtStamp(n){var d=new Date(n);return isNaN(d)?'':d.toLocaleDateString(LOCALE(),{day:'numeric',month:'short'});}
function ago(n){
  var s=Math.max(0,(Date.now()-n)/1000);
  if(s<90)return 'à l’instant';
  if(s<3600)return 'il y a '+Math.round(s/60)+' min';
  if(s<86400)return 'il y a '+Math.round(s/3600)+' h';
  if(s<86400*7)return 'il y a '+Math.round(s/86400)+' j';
  return fmtStamp(n);
}
function eur(n){n=Number(n)||0;try{return new Intl.NumberFormat(LOCALE(),{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);}catch(_){return n+' €';}}
function pl(n,s,p){return n+' '+(n>1?p:s);}
function rnd(){return Math.random().toString(36).slice(2,9);}
function hue(p){return 'var(--h'+(((p&&p.hue)||0)%6)+')';}
function posOf(t){return t.pos!=null?t.pos:(t.createdAt||0);}
function cmpPos(a,b){return posOf(a)-posOf(b);}
function byDue(a,b){return a.due<b.due?-1:a.due>b.due?1:0;}
function defCols(){return LANG==='fr'?DEFCOLS:DEFCOLS.map(function(c){return Object.assign({},c,{name:T(c.name)});});}
function colsOf(p){return (p.columns&&p.columns.length)?p.columns:defCols();}
function findLabel(p,id){return (p.labels||[]).find(function(l){return l.id===id;});}
function prioOf(t){return t.prio!=null?(Number(t.prio)||0):(t.urgent?3:0);}
function pstat(p){return PST[p.status]?p.status:'active';}
function spaceName(p){if(S.me&&p._owner&&p._owner!==S.me.id)return T('Partagés avec moi');var s=S.spaces.find(function(x){return x.id===p.spaceId;});return s?s.name:T('Mes projets');}
function metaOf(pid){return S.meta[pid]||{};}
/* favori : sur mes projets, c'est noté dans le projet ; sur un projet partagé avec moi, c'est noté dans mes réglages
   (chacun ses favoris, et on n'a pas besoin de pouvoir modifier le projet) */
function isMine(p){return !S.me||!p._owner||p._owner===S.me.id;}
function isFav(p){return isMine(p)?!!p.fav:(S.cfg.favs||[]).indexOf(p.id)>=0;}
function toggleFav(p){
  if(isMine(p))return run(function(){return pdoc(p.id).update({fav:!p.fav});});
  var l=(S.cfg.favs||[]).filter(function(x){return x!==p.id&&projById(x);});
  if(!isFav(p))l.push(p.id);
  return saveCfg({favs:l});
}
function clientOf(p){var id=metaOf(p.id).clientId;return id?S.clients.find(function(c){return c.id===id;}):null;}
function clean(o){var n=JSON.parse(JSON.stringify(o));delete n.id;delete n._priv;delete n._col;delete n._owner;return n;}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function hasPw(){return !!(S.me&&(S.me.amr||[]).indexOf('password')>=0);}
function myName(){var n=String(S.cfg.name||'').trim();if(n)return n;return S.me&&S.me.name?String(S.me.name).split(' ')[0]:'';}

/* ---------- apparence ---------- */
var HOST_THEME=document.documentElement.getAttribute('data-theme');
function isDark(){
  var t=document.documentElement.getAttribute('data-theme');
  if(t==='dark')return true; if(t==='light')return false;
  try{return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}catch(_){return false;}
}
function applyPrefs(){
  var r=document.documentElement;
  if(P.theme==='light'||P.theme==='dark')r.setAttribute('data-theme',P.theme);
  else if(HOST_THEME)r.setAttribute('data-theme',HOST_THEME); else r.removeAttribute('data-theme');
  var a=ACCENTS[P.accent]||ACCENTS.cobalt, dark=isDark();
  if(a.p&&S.planReady&&!plan().accents)a=ACCENTS.cobalt;   /* formule terminée : on revient à la couleur de base */
  r.style.setProperty('--accent',dark?a.d:a.l);
  r.style.setProperty('--on-accent',dark?'#0B1020':'#FFFFFF');
  r.setAttribute('data-density',P.density);
  r.setAttribute('data-size',P.size);
}
function setPref(k,v){P[k]=v;LS.set(k,v);applyPrefs();}

/* ---------- données ---------- */
function merge(a,b){
  var m={},out=[];
  a.concat(b).forEach(function(o){if(!(o.id in m))out.push(o.id);m[o.id]=o;});
  return out.map(function(id){return m[id];});
}
function rebuild(){
  S.canEdit=!!S.me;
  S.spaces=S.raw.s;
  S.projects=S.raw.p.slice().sort(function(a,b){return (a.createdAt||0)-(b.createdAt||0);});
  S.tasks=S.raw.t;
  S.clients=S.raw.c.slice().sort(function(a,b){return (a.name||'').localeCompare(b.name||'','fr');});
  S.meta={};S.raw.m.forEach(function(m){S.meta[m.id]=m;});
  S.cfg=S.raw.cfg.find(function(c){return c.id==='main';})||{};
  S.quotes=S.raw.q;
  S.roles={};
  if(S.me)S.raw.mb.forEach(function(m){if(m.email===S.me.email)S.roles[m.projectId]=m.role;});
}
/* droits : own = c'est mon projet ; rw = je peux modifier son contenu (propriétaire ou éditeur) */
function canW(e){return S.canEdit&&(!e||e.rw);}
function membersOf(pid){return S.raw.mb.filter(function(m){return m.projectId===pid;}).sort(function(a,b){return a.email<b.email?-1:1;});}
function isShared(p){return (S.me&&p._owner&&p._owner!==S.me.id)||membersOf(p.id).length>0;}
function rwProjects(by){by=by||index();return S.projects.filter(function(p){return pstat(p)!=='archived'&&by[p.id]&&by[p.id].rw;});}
function index(){
  var by={};
  S.projects.forEach(function(p){
    var cols=colsOf(p), own=!S.me||!p._owner||p._owner===S.me.id, e={p:p,own:own,mgr:own||(!!S.admin&&!!S.roles[p.id]),rw:own||S.roles[p.id]==='editor'||(!!S.admin&&!!S.roles[p.id]),cols:cols,tasks:[],by:{},doneIds:{},total:0,done:0,pct:0};
    cols.forEach(function(c){e.by[c.id]=[];if(c.done)e.doneIds[c.id]=1;});
    by[p.id]=e;
  });
  S.tasks.forEach(function(t){
    var e=by[t.projectId]; if(!e)return;
    var id=t.columnId||t.status; if(!e.by[id])id=e.cols[0].id;
    t._col=id; e.tasks.push(t); e.by[id].push(t); if(e.doneIds[id])e.done++;
  });
  Object.keys(by).forEach(function(k){var e=by[k];e.total=e.tasks.length;e.pct=e.total?Math.round(e.done/e.total*100):0;});
  return by;
}
function isDone(t,e){return e?!!e.doneIds[t._col]:!!t.done;}
function colName(e,id){var c=e.cols.find(function(x){return x.id===id;});return c?c.name:'';}
function pass(t){
  if(S.fl&&(t.labels||[]).indexOf(S.fl)<0)return false;
  if(S.q){
    var hay=norm((t.title||'')+' '+(t.notes||'')+' '+(t.who||'')+' '+(t.check||[]).map(function(i){return i.t;}).join(' '));
    if(hay.indexOf(norm(S.q))<0)return false;
  }
  return true;
}
function inboxTasks(){return S.canEdit?S.tasks.filter(function(t){return !t.projectId;}).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}):[];}
function liveTasks(by){return S.tasks.filter(function(t){return by[t.projectId]&&pstat(by[t.projectId].p)!=='archived';});}
function bucket(t,today,wk){
  if(!t.due)return 'none';
  if(t.due<today)return 'late';
  if(t.due===today)return 'today';
  if(t.due<=wk)return 'week';
  return 'later';
}
function mine(t){return mineWho(t);}   /* js/people.js : une carte peut avoir plusieurs personnes */
function modeOf(p){var m=S.pmode[p.id]||p.defView||'board';return MODES.some(function(x){return x[0]===m;})?m:'board';}
function validView(by){
  var v=S.view;
  if(v==='home'||v==='projects'||v==='calendar'||v==='settings'||v==='plans')return true;
  if(v==='admin')return !!S.admin;
  if(v==='inbox'||v==='mail'||v==='tasks'||v==='clients'||v==='quotes')return S.canEdit;
  if(v.indexOf('q:')===0)return S.canEdit&&S.quotes.some(function(q){return 'q:'+q.id===v;});
  if(v.indexOf('c:')===0)return S.canEdit&&S.clients.some(function(c){return 'c:'+c.id===v;});
  return !!by[v];
}
function clientStats(c,by){
  var ps=S.projects.filter(function(p){return metaOf(p.id).clientId===c.id;});
  var tot=0,done=0,amount=0,paid=0;
  ps.forEach(function(p){var e=by[p.id],m=metaOf(p.id);tot+=e.total;done+=e.done;amount+=Number(m.amount)||0;paid+=Number(m.paid)||0;});
  return {ps:ps,pct:tot?Math.round(done/tot*100):0,amount:amount,paid:paid,rest:amount-paid};
}
function recentActivity(by,n){
  var out=[];
  S.tasks.forEach(function(t){
    if(t.projectId&&!by[t.projectId])return;
    var a=t.act||[];
    if(!a.length&&t.createdAt)out.push({at:t.createdAt,t:'Carte créée',task:t});
    a.forEach(function(x){out.push({at:x.at,t:x.t,task:t,uid:x.uid,by:x.by});});
  });
  return out.sort(function(a,b){return b.at-a.at;}).slice(0,n||8);
}

/* ---------- ajout rapide en langage naturel ---------- */
function parseQuick(text,projects,now){
  now=now?new Date(now):new Date();
  var out={title:'',due:'',prio:0,projectId:null}, s=' '+String(text||'')+' ';
  function cut(re,fn){var m=s.match(re);if(m){fn(m);s=s.replace(re,' ');}}
  cut(/\s#([^\s#]+)/,function(m){
    var k=norm(m[1]), hit=(projects||[]).find(function(p){return norm(p.name).replace(/\s+/g,'').indexOf(k)===0;})||(projects||[]).find(function(p){return norm(p.name).replace(/\s+/g,'').indexOf(k)>=0;});
    if(hit)out.projectId=hit.id;
  });
  cut(/\s(?:priorit[ée]\s+haute|high\s+priority|urgente?|!!!)(?=\s)/i,function(){out.prio=3;});
  if(!out.prio)cut(/\s(?:priorit[ée]\s+(?:moyenne|normale)|(?:medium|normal)\s+priority)(?=\s)/i,function(){out.prio=2;});
  if(!out.prio)cut(/\s(?:priorit[ée]\s+(?:basse|faible)|low\s+priority)(?=\s)/i,function(){out.prio=1;});
  function plus(n){var d=new Date(now);d.setDate(d.getDate()+n);return ds(d);}
  cut(/\s(?:apr[èe]s[- ]demain|(?:the\s+)?day\s+after\s+tomorrow)(?=\s)/i,function(){out.due=plus(2);});
  if(!out.due)cut(/\s(?:demain|tomorrow)(?=\s)/i,function(){out.due=plus(1);});
  if(!out.due)cut(/\s(?:aujourd[’']?hui|today)(?=\s)/i,function(){out.due=plus(0);});
  if(!out.due)cut(/\s(?:dans|in)\s+(\d{1,3})\s+(?:jours?|days?)(?=\s)/i,function(m){out.due=plus(parseInt(m[1],10));});
  if(!out.due)cut(/\s(?:dans|in)\s+(\d{1,2})\s+(?:semaines?|weeks?)(?=\s)/i,function(m){out.due=plus(7*parseInt(m[1],10));});
  if(!out.due)cut(/\s(?:le\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/,function(m){
    var y=m[3]?parseInt(m[3],10):now.getFullYear(); if(y<100)y+=2000;
    var d=new Date(y,parseInt(m[2],10)-1,parseInt(m[1],10),12);
    if(!m[3]&&ds(d)<ds(now))d.setFullYear(y+1);
    if(!isNaN(d))out.due=ds(d);
  });
  if(!out.due){
    var wd=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'], we=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    cut(/\s(?:on\s+)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?=\s)/i,function(m){
      var w=m[1].toLowerCase(), target=wd.indexOf(w)>=0?wd.indexOf(w):we.indexOf(w), diff=(target-now.getDay()+7)%7; if(diff===0)diff=7;
      out.due=plus(diff);
    });
  }
  out.title=s.replace(/\s+/g,' ').trim();
  return out;
}

/* messages de connexion : ceux du serveur sont en anglais et peu clairs */
function gateErr(e){
  var m=String((e&&e.message)||e||''), st=e&&e.status;
  if(st===429||/rate limit|too many|only request this after/i.test(m))return 'Trop d’e-mails envoyés pour le moment. Attends un peu (jusqu’à une heure), ou connecte-toi avec ton mot de passe.';
  if(/invalid login credentials/i.test(m))return 'Adresse ou mot de passe incorrect. Si tu n’as jamais choisi de mot de passe, utilise « Lien par e-mail ».';
  if(/not confirmed/i.test(m))return 'Ton adresse n’est pas encore confirmée : clique sur le lien reçu par e-mail.';
  if(/at least|too short|weak/i.test(m))return 'Mot de passe trop court : 8 caractères au minimum.';
  if(/different from the old/i.test(m))return 'C’est déjà ton mot de passe actuel.';
  if(/expired|invalid.*link|otp/i.test(m))return 'Ce lien de connexion a expiré ou a déjà servi. Demandes-en un nouveau.';
  return m||'Connexion impossible pour le moment.';
}
/* ne rejoue pas les animations d'entrée quand une zone est simplement redessinée */
function still(el,key){if(!el)return;key=String(key);el.classList.toggle('noanim',el._k===key);el._k=key;}

/* ---------- toasts, indicateur d'enregistrement ---------- */
var TOAST={n:0,undo:{}};
function toast(msg,opt){
  var box=document.getElementById('toasts'); if(!box)return;
  var id='t'+(++TOAST.n), el=document.createElement('div');
  el.className='toast'+(opt&&opt.bad?' bad':''); el.dataset.toast=id;
  var sp=document.createElement('span'); sp.textContent=unmark(trMixed(msg)); el.appendChild(sp);
  if(opt&&opt.undo){
    TOAST.undo[id]=opt.undo;
    var b=document.createElement('button'); b.type='button'; b.textContent=(I18N.dict[LANG]||{})['@undo']||'Annuler'; b.dataset.act='toast-undo'; b.dataset.id=id; el.appendChild(b);
  }
  box.appendChild(el);
  while(box.children.length>3)box.removeChild(box.firstChild);
  setTimeout(function(){delete TOAST.undo[id];if(el.parentNode)el.parentNode.removeChild(el);},opt&&opt.undo?6500:3500);
}
function saveHtml(){
  if(!S.online)return '<span class="sv off" id="save">'+ic('offline')+'Hors ligne</span>';
  if(S.saving>0)return '<span class="sv" id="save"><i class="spin"></i>Enregistrement…</span>';
  if(S.savedAt&&Date.now()-S.savedAt<2600)return '<span class="sv ok" id="save">'+ic('check')+'Enregistré</span>';
  return '<span class="sv" id="save"></span>';
}
function paintSave(){var el=document.getElementById('save');if(el)el.outerHTML=tr(saveHtml());}
function run(fn){
  S.saving++;paintSave();
  return Promise.resolve().then(fn).then(function(){
    S.saving=Math.max(0,S.saving-1);S.savedAt=Date.now();paintSave();
    setTimeout(paintSave,2800);
  },function(e){
    S.saving=Math.max(0,S.saving-1);S.pending=null;
    var denied=e&&e.code==='invalid_argument';
    if(denied&&S.unsure){S.owner=false;rebuild();}
    toast(denied?'Modification refusée : tu n’as pas les droits sur cet élément.':'Enregistrement impossible. Réessaie dans un instant.',{bad:true});
    render();
  });
}

/* ---------- références ---------- */
function projById(id){return S.projects.find(function(p){return p.id===id;});}
function taskById(id){return S.tasks.find(function(x){return x.id===id;});}
function realm(pid){if(!pid)return PRIV;var p=projById(pid);return p&&p._priv?PRIV:'';}
function tdoc(id){var t=taskById(id);return S.db.doc((t&&t._priv?PRIV:'')+'tasks/'+id);}
function pdoc(id){return S.db.doc(realm(id)+'projects/'+id);}
function sdoc(id){return S.db.doc('spaces/'+id);}
function cdoc(id){return S.db.doc(PRIV+'clients/'+id);}
function curE(){return index()[S.view];}
/* chaque ligne d'historique garde qui l'a faite : sert à prévenir les autres personnes du projet */
function actOf(t,text){var a={t:text,at:Date.now()};if(S.me){a.uid=S.me.id;a.by=myName()||S.me.name||S.me.email;}return (t.act||[]).concat([a]).slice(-30);}

/* ---------- écritures ---------- */
function setMeta(pid,patch){
  var n=Object.assign({},metaOf(pid),patch);delete n.id;
  return run(function(){return S.db.doc(PRIV+'meta/'+pid).set(n);});
}
function saveCfg(patch){
  var n=Object.assign({},S.cfg,patch);delete n.id;
  S.cfg=Object.assign({id:'main'},n);
  return run(function(){return S.db.doc(PRIV+'settings/main').set(n);});
}
function addSpace(name){
  S.addSpace=false;
  return run(function(){return S.db.collection('spaces').doc().set({name:name,createdAt:Date.now()});});
}
function tplCols(k){var c=TPL[k].cols;return c.map(function(n,i){var o={id:'c'+rnd(),name:T(n)};if(i===c.length-1)o.done=true;return o;});}
function addProject(name,spaceId,opt){
  opt=opt||{};
  if(S.planReady&&!canAddProject()){upsell('projects');return;}
  var ref=S.db.collection((opt.priv?PRIV:'')+'projects').doc();
  S.view=ref.id;S.pending=ref.id;S.q='';S.fl=null;S.addIn=null;S.comp=null;S.task=null;persist();
  var doc={name:name,desc:'',icon:'',hue:S.projects.length%6,spaceId:(!spaceId||spaceId==='_')?'':spaceId,status:'active',createdAt:Date.now()};
  if(opt.tpl)doc.columns=tplCols(opt.tpl);
  return run(function(){
    return ref.set(doc).then(function(){if(opt.clientId)return S.db.doc(PRIV+'meta/'+ref.id).set({clientId:opt.clientId});});
  });
}
function addClient(name){
  var ref=S.db.collection(PRIV+'clients').doc();
  S.view='c:'+ref.id;S.pending=S.view;persist();
  return run(function(){return ref.set({name:name,company:'',email:'',phone:'',status:'active',notes:'',createdAt:Date.now()});});
}
function delClient(id){
  var ms=S.raw.m.filter(function(m){return m.clientId===id;});
  S.confirm=null;S.view='clients';persist();
  return run(function(){
    var chain=Promise.resolve();
    ms.forEach(function(m){chain=chain.then(function(){var n=clean(m);n.clientId='';return S.db.doc(PRIV+'meta/'+m.id).set(n);});});
    return chain.then(function(){return cdoc(id).delete();});
  });
}
function deleteSpace(id){
  var ps=S.projects.filter(function(p){return p.spaceId===id;});
  S.confirm=null;S.smenu=null;
  return run(function(){
    var chain=Promise.resolve();
    ps.forEach(function(p){chain=chain.then(function(){return pdoc(p.id).update({spaceId:''});});});
    return chain.then(function(){return sdoc(id).delete();});
  });
}
function newTaskDoc(o){
  return Object.assign({projectId:'',title:'',columnId:'',pos:Date.now(),prio:0,due:'',notes:'',who:'',createdAt:Date.now(),doneAt:null,act:[S.me?{t:'Carte créée',at:Date.now(),uid:S.me.id,by:myName()||S.me.name||S.me.email}:{t:'Carte créée',at:Date.now()}]},o);
}
function addTask(pid,title,colId,extra){
  var doc=newTaskDoc(Object.assign({projectId:pid,title:title,columnId:colId},extra||{}));
  return run(function(){return S.db.collection(realm(pid)+'tasks').doc().set(doc);});
}
function addInbox(title,extra){
  extra=Object.assign({},extra||{});
  var fc=folderCur();   /* depuis un dossier du Bazar, la tâche y est rangée directement */
  if(S.view==='inbox'&&fc&&fc!=='_none'&&!('folder' in extra))extra.folder=fc;
  var doc=newTaskDoc(Object.assign({title:title,done:false},extra||{}));
  return run(function(){return S.db.collection(PRIV+'tasks').doc().set(doc);});
}
/* crée une tâche depuis l'ajout rapide : dans un projet (première colonne) ou dans l'Inbox */
function quickCreate(q){
  var extra={due:q.due||'',prio:q.prio||0};
  if(q.projectId&&projById(q.projectId)){
    var e=index()[q.projectId];
    addTask(q.projectId,q.title,e.cols[0].id,extra);
    toast('Tâche ajoutée à « '+e.p.name+' ».');
  }else{addInbox(q.title,extra);toast('Tâche ajoutée au Bazar.');}
}
/* range une tâche de l'Inbox dans un projet */
function fileTask(id,pid){
  var t=taskById(id), e=index()[pid]; if(!t||!e)return;
  var d=clean(t);d.projectId=pid;d.columnId=e.cols[0].id;d.pos=Date.now();delete d.done;d.act=actOf(t,'Rangée dans « '+e.p.name+' »');
  var to=realm(pid), from=t._priv?PRIV:'';
  toast('Rangée dans « '+e.p.name+' ».');
  return run(function(){
    if(to===from)return S.db.doc(to+'tasks/'+id).set(d);
    return S.db.doc(to+'tasks/'+id).set(d).then(function(){return S.db.doc(from+'tasks/'+id).delete();});
  });
}
function moveTask(e,id,colId,pos){
  var t=taskById(id), patch={columnId:colId,pos:pos,doneAt:e.doneIds[colId]?Date.now():null};
  if(t&&t._col!==colId)patch.act=actOf(t,'Déplacée vers « '+colName(e,colId)+' »');
  if(t&&e.doneIds[colId]&&!e.doneIds[t._col]&&repeatTask(t,e))patch.rep='';   /* la répétition passe à la carte suivante */
  return run(function(){return tdoc(id).update(patch);});
}
function toggleTask(t,e){
  if(!e){
    var nd=!t.done;
    var ip={done:nd,doneAt:nd?Date.now():null,act:actOf(t,nd?'Marquée comme terminée':'Rouverte')};
    if(nd&&repeatTask(t,null))ip.rep='';
    return run(function(){return tdoc(t.id).update(ip);});
  }
  var done=isDone(t,e), target=done?e.cols.find(function(c){return !c.done;}):e.cols.find(function(c){return c.done;});
  if(!target)return;
  moveTask(e,t.id,target.id,Date.now());
}
function deleteTask(t){
  var path=(t._priv?PRIV:'')+'tasks/'+t.id, data=clean(t), files=photoPaths([t]);
  run(function(){return S.db.doc(path).delete();});
  var docs=filePaths([t]);
  if(files.length||docs.length)setTimeout(function(){if(!taskById(t.id)){Cloud.photoRemove(files);Cloud.fileRemove(docs);}},9000);   /* après le délai d'annulation */
  toast('Carte supprimée.',{undo:function(){run(function(){return S.db.doc(path).set(data);});}});
}
function saveCols(pid,arr){return run(function(){return pdoc(pid).update({columns:arr});});}
function addColumn(e,name){return saveCols(e.p.id,e.cols.concat([{id:'c'+rnd(),name:name}]));}
function moveColumn(e,cid,dir){
  var arr=e.cols.slice(), i=arr.findIndex(function(c){return c.id===cid;}), j=i+dir;
  if(i<0||j<0||j>=arr.length)return;
  var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;saveCols(e.p.id,arr);
}
function deleteColumn(e,cid){
  var arr=e.cols.filter(function(c){return c.id!==cid;}); if(!arr.length)return;
  var target=arr[0], moved=e.by[cid]||[];
  S.confirm=null;S.menu=null;
  return run(function(){
    var chain=Promise.resolve();
    moved.forEach(function(t){chain=chain.then(function(){return tdoc(t.id).update({columnId:target.id,doneAt:target.done?Date.now():null});});});
    return chain.then(function(){return pdoc(e.p.id).update({columns:arr});});
  });
}
function delProjectDocs(p,ts){
  var base=p._priv?PRIV:'', chain=Cloud.photoRemove(photoPaths(ts)).then(function(){return Cloud.fileRemove(filePaths(ts));});
  ts.forEach(function(t){chain=chain.then(function(){return S.db.doc(base+'tasks/'+t.id).delete();});});
  return chain.then(function(){return S.db.doc(base+'projects/'+p.id).delete();}).then(function(){if(S.raw.m.some(function(m){return m.id===p.id;}))return S.db.doc(PRIV+'meta/'+p.id).delete();});
}
function delProject(id){
  var p=projById(id); if(!p)return;
  var ts=S.tasks.filter(function(t){return t.projectId===id;});
  S.confirm=null;S.view='projects';S.task=null;persist();
  return run(function(){return delProjectDocs(p,ts);});
}
function delDemo(){
  var ps=S.projects.filter(function(p){return p.demo;}), cs=S.clients.filter(function(c){return c.demo;}), sp=S.spaces.filter(function(s){return s.demo;});
  var tasks=S.tasks.slice();
  S.confirm=null;S.task=null;
  return run(function(){
    var chain=Promise.resolve();
    ps.forEach(function(p){chain=chain.then(function(){return delProjectDocs(p,tasks.filter(function(t){return t.projectId===p.id;}));});});
    cs.forEach(function(c){chain=chain.then(function(){return cdoc(c.id).delete();});});
    sp.forEach(function(s){chain=chain.then(function(){return sdoc(s.id).delete();});});
    return chain;
  });
}
function setPrivate(e,priv){
  var p=e.p; if(!!p._priv===priv)return;
  var from=priv?'':PRIV, to=priv?PRIV:'', pd=clean(p), ts=e.tasks.map(function(t){return {id:t.id,d:clean(t)};});
  toast(priv?'Projet privé : tes invités ne le voient plus.':'Projet partagé : tes invités peuvent le voir.');
  S.hold=p.id;
  function release(){setTimeout(function(){if(S.hold===p.id){S.hold=null;render();}},1200);}
  return run(function(){
    var chain=S.db.doc(to+'projects/'+p.id).set(pd);
    ts.forEach(function(t){chain=chain.then(function(){return S.db.doc(to+'tasks/'+t.id).set(t.d);});});
    ts.forEach(function(t){chain=chain.then(function(){return S.db.doc(from+'tasks/'+t.id).delete();});});
    return chain.then(function(){return S.db.doc(from+'projects/'+p.id).delete();});
  }).then(release,release);
}
function exportData(){
  var data={app:'On Stride',exportedAt:new Date().toISOString(),spaces:S.spaces,projects:S.projects.map(clean_keep),tasks:S.tasks.map(clean_keep),clients:S.clients,meta:S.raw.m,quotes:S.quotes,settings:S.cfg};
  try{
    var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    var a=document.createElement('a');a.href=url;a.download='onstride-'+todayStr()+'.json';document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},500);
    toast('Export téléchargé.');
  }catch(_){toast('Export impossible pour le moment.',{bad:true});}
}
/* ---------- photos d'une tâche ---------- */
var PHOTO_SIDE=1600;   /* le nombre de photos permis dépend de la formule : plan().photos */
var PH={url:{},want:{},timer:0};
function photoPaths(ts){var out=[];ts.forEach(function(t){(t.photos||[]).forEach(function(p){if(p.path)out.push(p.path);});});return out;}
/* adresse d'affichage d'une photo : le serveur donne un lien valable une heure, gardé en mémoire */
function photoUrl(path){
  var c=PH.url[path], now=Date.now();
  if(c&&c.exp>now)return c.u;
  PH.want[path]=1;
  if(!PH.timer)PH.timer=setTimeout(photoFlush,40);
  return c?c.u:'';
}
function photoFlush(){
  PH.timer=0;
  var paths=Object.keys(PH.want); PH.want={};
  if(!paths.length)return;
  Cloud.photoUrls(paths).then(function(m){
    paths.forEach(function(p){PH.url[p]=m[p]?{u:m[p],exp:Date.now()+50*60000}:{u:'',exp:Date.now()+60000};});
  },function(){
    paths.forEach(function(p){PH.url[p]={u:'',exp:Date.now()+60000};});
  }).then(queueRender);
}
/* réduit une image avant l'envoi : 1600 px de côté au plus, en JPEG */
function shrinkImage(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file), im=new Image();
    im.onload=function(){
      try{
        var k=Math.min(1,PHOTO_SIDE/Math.max(im.naturalWidth,im.naturalHeight,1)), w=Math.max(1,Math.round(im.naturalWidth*k)), h=Math.max(1,Math.round(im.naturalHeight*k));
        var c=document.createElement('canvas');c.width=w;c.height=h;
        var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);
        URL.revokeObjectURL(url);
        c.toBlob(function(b){if(b)res({blob:b,w:w,h:h});else rej(new Error('image'));},'image/jpeg',0.82);
      }catch(e){URL.revokeObjectURL(url);rej(e);}
    };
    im.onerror=function(){URL.revokeObjectURL(url);rej(new Error('image'));};
    im.src=url;
  });
}
function addPhotos(id,files){
  var t=taskById(id); if(!t)return Promise.resolve();
  var list=[].slice.call(files||[]).filter(function(f){return /^image\//.test(f.type||'');});
  var lim=plan().photos, room=lim-(t.photos||[]).length-(S.upl[id]||0);
  if(!list.length){toast('Choisis une image : photo, capture d’écran…',{bad:true});return Promise.resolve();}
  if(room<=0){if(myPlan()!=='pro')upsell('photos');else toast(tf('Maximum {0} photos par tâche.',lim),{bad:true});return Promise.resolve();}
  if(list.length>room){list=list.slice(0,room);toast(tf('Maximum {0} photos par tâche : les suivantes n’ont pas été ajoutées.',lim));}
  S.upl[id]=(S.upl[id]||0)+list.length;render();
  var added=[], unread=0, failed=0, nobucket=false, chain=Promise.resolve();
  list.forEach(function(f){
    chain=chain.then(function(){
      return shrinkImage(f).then(function(r){
        return Cloud.photoUpload(id,r.blob).then(function(path){added.push({id:rnd(),path:path,w:r.w,h:r.h});},function(e){failed++;if(e&&e.code==='no_bucket')nobucket=true;});
      },function(){unread++;}).then(function(){S.upl[id]=Math.max(0,(S.upl[id]||1)-1);});
    });
  });
  return chain.then(function(){
    if(!S.upl[id])delete S.upl[id];
    if(nobucket)toast('Les photos ne sont pas encore activées : relance le fichier supabase/schema.sql dans Supabase.',{bad:true});
    else if(failed)toast('Envoi de la photo impossible. Réessaie dans un instant.',{bad:true});
    if(unread)toast('Cette image ne peut pas être lue.',{bad:true});
    var cur=taskById(id);
    if(!added.length||!cur){if(added.length)Cloud.photoRemove(added.map(function(p){return p.path;}));render();return;}
    return run(function(){return tdoc(id).update({photos:(cur.photos||[]).concat(added),act:actOf(cur,added.length>1?'Photos ajoutées':'Photo ajoutée')});});
  });
}
function removePhoto(t,pid){
  var ph=(t.photos||[]).find(function(p){return p.id===pid;}); if(!ph)return;
  var rest=t.photos.filter(function(p){return p.id!==pid;}), old=t.photos.slice();
  run(function(){return tdoc(t.id).update({photos:rest});});
  var gone=false;
  setTimeout(function(){var c=taskById(t.id);if(!gone&&(!c||!(c.photos||[]).some(function(p){return p.id===pid;})))Cloud.photoRemove([ph.path]);},9000);
  toast('Photo supprimée.',{undo:function(){gone=true;var c=taskById(t.id);if(c)run(function(){return tdoc(t.id).update({photos:old});});}});
}

/* ---------- fichiers joints d'une tâche ---------- */
/* nombre et taille des fichiers : selon la formule, plan().files et plan().size */
function filePaths(ts){var out=[];ts.forEach(function(t){(t.files||[]).forEach(function(f){if(f.path)out.push(f.path);});});return out;}
function fmtSize(n){
  n=Number(n)||0;
  if(n<1024)return n+' o';
  if(n<1024*1024)return Math.max(1,Math.round(n/1024))+' Ko';
  return (n/1048576).toFixed(n<10*1048576?1:0).replace(/\.0$/,'').replace('.',LANG==='fr'?',':'.')+' Mo';
}
function fileExt(name){var m=String(name||'').match(/\.([a-z0-9]{1,5})$/i);return m?m[1].toUpperCase():'';}
function addFiles(id,files){
  var t=taskById(id); if(!t)return Promise.resolve();
  var pl=plan(), list=[].slice.call(files||[]), room=pl.files-(t.files||[]).length-(S.fupl[id]||[]).length;
  if(!list.length)return Promise.resolve();
  if(room<=0){if(myPlan()!=='pro')upsell('files');else toast(tf('Maximum {0} fichiers par tâche.',pl.files),{bad:true});return Promise.resolve();}
  var big=list.filter(function(f){return f.size>pl.size;});
  if(big.length){if(myPlan()!=='pro')upsell('size');else toast(tf(big.length>1?'{0} fichiers trop lourds ({1} maximum).':'« {0} » est trop lourd ({1} maximum).',big.length>1?big.length:big[0].name,fmtSize(pl.size)),{bad:true});}
  list=list.filter(function(f){return f.size<=pl.size;});
  if(list.length>room){list=list.slice(0,room);toast(tf('Maximum {0} fichiers par tâche : les suivants n’ont pas été ajoutés.',pl.files));}
  if(!list.length)return Promise.resolve();
  S.fupl[id]=(S.fupl[id]||[]).concat(list.map(function(f){return f.name;}));render();
  var added=[], failed=0, nobucket=false, chain=Promise.resolve();
  list.forEach(function(f){
    chain=chain.then(function(){
      return Cloud.fileUpload(id,f).then(function(path){added.push({id:rnd(),path:path,name:f.name,size:f.size,type:f.type||'',at:Date.now()});},function(e){failed++;if(e&&e.code==='no_bucket')nobucket=true;})
        .then(function(){var q=S.fupl[id]||[],i=q.indexOf(f.name);if(i>=0)q.splice(i,1);render();});
    });
  });
  return chain.then(function(){
    if(S.fupl[id]&&!S.fupl[id].length)delete S.fupl[id];
    if(nobucket)toast('Les fichiers ne sont pas encore activés : relance le fichier supabase/schema.sql dans Supabase.',{bad:true});
    else if(failed)toast('Envoi du fichier impossible. Réessaie dans un instant.',{bad:true});
    var cur=taskById(id);
    if(!added.length||!cur){if(added.length)Cloud.fileRemove(added.map(function(f){return f.path;}));render();return;}
    return run(function(){return tdoc(id).update({files:(cur.files||[]).concat(added),act:actOf(cur,added.length>1?'Fichiers ajoutés':'Fichier ajouté')});});
  });
}
function removeFile(t,fid){
  var f=(t.files||[]).find(function(x){return x.id===fid;}); if(!f)return;
  var old=t.files.slice(), gone=false;
  run(function(){return tdoc(t.id).update({files:t.files.filter(function(x){return x.id!==fid;})});});
  setTimeout(function(){var c=taskById(t.id);if(!gone&&(!c||!(c.files||[]).some(function(x){return x.id===fid;})))Cloud.fileRemove([f.path]);},9000);
  toast(tf('« {0} » supprimé.',f.name),{undo:function(){gone=true;if(taskById(t.id))run(function(){return tdoc(t.id).update({files:old});});}});
}
function downloadFile(t,fid){
  var f=(t.files||[]).find(function(x){return x.id===fid;}); if(!f)return;
  Cloud.fileUrl(f.path,f.name).then(function(url){
    var a=document.createElement('a');a.href=url;a.download=f.name;a.rel='noopener';document.body.appendChild(a);a.click();
    setTimeout(function(){if(a.parentNode)a.parentNode.removeChild(a);},500);
  },function(){toast('Téléchargement impossible pour le moment.',{bad:true});});
}

/* ---------- partage d'un projet ---------- */
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);}
function addMember(pid,email,role){
  email=String(email||'').trim().toLowerCase();
  if(!validEmail(email)){toast('Adresse e-mail invalide.',{bad:true});return false;}
  if(S.me&&email===S.me.email){var mp=projById(pid);toast(mp&&mp._owner&&mp._owner!==S.me.id?'C’est ton adresse : tu as déjà accès à ce projet.':'C’est ton adresse : tu es déjà propriétaire.',{bad:true});return false;}
  var ex=membersOf(pid).find(function(m){return m.email===email;});
  if(ex){if(ex.role!==role)setMemberRole(ex.id,role);else toast('Cette personne a déjà accès.');return true;}
  run(function(){return S.db.collection('members').doc().set({projectId:pid,email:email,role:role==='editor'?'editor':'viewer'});});
  toast(tf(role==='editor'?'{0} peut maintenant modifier ce projet.':'{0} peut maintenant voir ce projet.',email));
  return true;
}
function setMemberRole(id,role){return run(function(){return S.db.doc('members/'+id).update({role:role==='editor'?'editor':'viewer'});});}
function removeMember(id){
  var m=S.raw.mb.find(function(x){return x.id===id;});
  run(function(){return S.db.doc('members/'+id).delete();});
  if(m)toast(tf('{0} n’a plus accès.',m.email),{undo:function(){run(function(){return S.db.collection('members').doc().set({projectId:m.projectId,email:m.email,role:m.role});});}});
}
function clean_keep(o){var n=JSON.parse(JSON.stringify(o));delete n._col;if(n._priv){n.prive=true;}delete n._priv;return n;}

/* ---------- navigation ---------- */
function go(v){
  S.view=v;S.task=null;S.q='';S.fl=null;S.comp=null;S.dirty={};S.sheet=null;S.ctx=null;S.menu=null;S.iconPick=false;S.confirm=null;
  if(v&&projById(v)){var r=LS.get('recent',[]).filter(function(x){return x!==v;});r.unshift(v);LS.set('recent',r.slice(0,8));}
  persist();
  try{history.replaceState(null,'',projById(v)?'#p='+v:location.pathname+location.search);}catch(_){}
}
function openTask(id){
  var t=taskById(id); if(!t)return;
  S.task=id;S.taskFresh=true;S.lblMgr=false;S.dirty={};S.ctx=null;S.pal=false;
}
function closeTask(){S.task=null;S.confirm=null;S.lblMgr=false;S.dirty={};}
