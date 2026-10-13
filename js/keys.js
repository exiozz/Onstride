/* On Stride — raccourcis clavier modifiables.
   Chaque raccourci relie une combinaison de touches à une action. La liste est rangée dans les réglages du compte
   (S.cfg.keys) : elle suit la personne d'un appareil à l'autre. Sans liste enregistrée, on utilise KEY_DEFAULTS.
   Une combinaison s'écrit « mod+k », « shift+p », « n » ; une suite de deux touches s'écrit « g h ». */
'use strict';

var KEY_DEFAULTS=[
  {a:'pal',k:'mod+k'},{a:'pal',k:'/'},{a:'sb',k:'mod+b'},{a:'qa',k:'n'},{a:'newproj',k:'shift+p'},
  {a:'go:home',k:'g h'},{a:'go:mail',k:'g m'},{a:'go:inbox',k:'g b'},{a:'go:tasks',k:'g t'},{a:'go:calendar',k:'g c'},{a:'go:quotes',k:'g d'},{a:'go:projects',k:'g p'},{a:'go:settings',k:'g s'}
];
/* touches que le navigateur garde pour lui : inutile de les proposer */
var KEY_TAKEN=['mod+w','mod+t','mod+n','mod+r','mod+q','mod+l','mod+shift+t','mod+shift+n','mod+tab','alt+f4','f5','f11','f12'];
var KEYS={rec:null,pre:'',preAt:0,timer:0};

function keyGo(v){S.view=v;if(!validView(index()))S.view='home';go(S.view);}
/* actions possibles. e : demande de pouvoir modifier ; run() renvoie false si l'action ne s'applique pas ici */
var KEY_ACTS={
  'pal':{n:'Rechercher et lancer une commande',g:'Général',run:function(){if(!S.db)return false;if(S.pal)closeOverlays();else openPal();}},
  'sb':{n:'Afficher ou masquer le menu',g:'Général',run:function(){cycleSb('toggle');}},
  'theme':{n:'Passer du thème clair au thème sombre',g:'Général',run:function(){setPref('theme',isDark()?'light':'dark');}},
  'qa':{n:'Nouvelle tâche',g:'Créer',e:1,run:function(){openQa();}},
  'newproj':{n:'Nouveau projet',g:'Créer',e:1,run:function(){go('projects');S.pf='active';S.focus='npp';}},
  'newclient':{n:'Nouveau client',g:'Créer',e:1,run:function(){go('clients');S.focus='ncl';}},
  'mailnew':{n:'Nouveau message',g:'Créer',e:1,run:function(){mailClick('mail-new','');}},
  'newquote':{n:'Nouveau devis',g:'Créer',e:1,run:function(){qNewFor('quote');}},
  'newinvoice':{n:'Nouvelle facture',g:'Créer',e:1,run:function(){qNewFor('invoice');}},
  'zen':{n:'Ouvrir le mode Focus',g:'Créer',e:1,run:function(){moreClick('zen','');}},
  'timerstop':{n:'Arrêter le chrono',g:'Créer',e:1,run:function(){if(!timerOn())return false;timerStop();}},
  'go:home':{n:'Aller à l’accueil',g:'Aller à',run:function(){keyGo('home');}},
  'go:mail':{n:'Aller à Mail',g:'Aller à',e:1,run:function(){keyGo('mail');}},
  'go:inbox':{n:'Aller au Bazar',g:'Aller à',e:1,run:function(){keyGo('inbox');}},
  'go:tasks':{n:'Aller à Mes tâches',g:'Aller à',e:1,run:function(){keyGo('tasks');}},
  'go:calendar':{n:'Aller au calendrier',g:'Aller à',run:function(){keyGo('calendar');}},
  'go:clients':{n:'Aller aux clients',g:'Aller à',e:1,run:function(){keyGo('clients');}},
  'go:quotes':{n:'Aller aux devis et factures',g:'Aller à',e:1,run:function(){keyGo('quotes');}},
  'go:projects':{n:'Aller aux projets',g:'Aller à',run:function(){keyGo('projects');}},
  'go:plans':{n:'Aller aux formules',g:'Aller à',run:function(){keyGo('plans');}},
  'go:settings':{n:'Aller aux réglages',g:'Aller à',run:function(){keyGo('settings');}}
};
MODES.forEach(function(m){KEY_ACTS['mode:'+m[0]]={n:'Vue '+m[1]+' du projet ouvert',g:'Dans un projet',run:function(){var p=projById(S.view);if(!p)return false;S.pmode[p.id]=m[0];S.comp=null;persist();}};});

function keyList(){
  var l=S.cfg&&Array.isArray(S.cfg.keys)?S.cfg.keys:KEY_DEFAULTS;
  return l.filter(function(b){return b&&b.k&&keyAct(b.a);});
}
/* une action : soit de la liste fixe, soit « ouvrir tel projet » */
function keyAct(a){
  if(KEY_ACTS[a])return KEY_ACTS[a];
  if(String(a).indexOf('p:')===0){
    var id=a.slice(2), p=projById(id);
    return {n:p?unmark(tf('Ouvrir le projet « {0} »',p.name)):T('Ouvrir un projet (supprimé)'),raw:true,gone:!p,run:function(){if(!projById(id))return false;go(id);}};
  }
  return null;
}
/* nom d'une action en texte simple, déjà traduit */
function keyLabel(a){var x=keyAct(a);return x?(x.raw?x.n:unmark(T(x.n))):'';}
function keyName(a){var x=keyAct(a);return x?(x.raw?nt(escRaw(x.n)):x.n):'';}
function keySave(list){return saveCfg({keys:list.map(function(b){return {a:b.a,k:b.k};})});}

/* ---------- lecture d'une touche ---------- */
function keyCombo(ev){
  var k=ev.key; if(!k||k==='Control'||k==='Shift'||k==='Alt'||k==='Meta'||k==='Dead'||k==='AltGraph'||k==='CapsLock')return '';
  var plain=k.length===1, name=plain?k.toLowerCase():k.toLowerCase().replace(/^arrow/,'');
  if(k===' ')name='space';
  var letter=plain&&k.toLowerCase()!==k.toUpperCase();
  var out='';
  if(ev.ctrlKey||ev.metaKey)out+='mod+';
  if(ev.altKey)out+='alt+';
  /* pour un signe ou un chiffre (/, ?, 1…), Maj fait partie de la façon de le taper selon le clavier : on ne la note pas */
  if(ev.shiftKey&&(!plain||letter))out+='shift+';
  return out+name;
}
function keyHasMod(c){return /(^|\+)(mod|alt)\+/.test('+'+c)||/^f\d{1,2}$/.test(c.replace(/^shift\+/,''));}
var KEY_LABEL={mod:(/Mac|iPhone|iPad/.test(navigator.platform||'')?'⌘':'Ctrl'),alt:'Alt',shift:'Maj',space:'Espace',enter:'Entrée',escape:'Échap',up:'↑',down:'↓',left:'←',right:'→',backspace:'Retour arrière','delete':'Suppr',tab:'Tab'};
function keyText(c){return c.split('+').map(function(x){return KEY_LABEL[x]||(x.length===1?x.toUpperCase():x.charAt(0).toUpperCase()+x.slice(1));}).join(' ');}
function keyHtml(k){return String(k).split(' ').map(function(c){return kbd(keyText(c));}).join('<span class="k-then">puis</span>');}
/* raccourci actuel d'une action, pour les infobulles (« Rechercher (Ctrl K) ») */
function keyHint(a){
  var b=keyList().find(function(x){return x.a===a;}); if(!b)return '';
  var D=I18N.dict[LANG]||{};
  return b.k.split(' ').map(function(c){return keyText(c).split(' ').map(function(x){return D[x]||x;}).join(' ');}).join(' '+(D.puis||'puis')+' ');
}
function keyTip(label,a){var h=keyHint(a);return nt(unmark(T(label))+(h?' ('+h+')':''));}

/* ---------- exécution ---------- */
function keyBusy(){return !!(S.photo||S.pal||S.qa||S.sheet||S.ctx||S.upsell||S.report||S.zen);}
function keyRun(b){
  var x=keyAct(b.a); if(!x||(x.e&&!S.canEdit))return false;
  if(x.run()===false)return false;
  render();return true;
}
function keysHandle(ev){
  if(KEYS.rec)return keysRecord(ev);
  if(S.auth!=='in'||S.tour!=null)return false;
  var c=keyCombo(ev); if(!c)return false;
  var strong=keyHasMod(c), list=keyList();
  /* une touche seule ne doit rien déclencher pendant qu'on écrit, ni par-dessus une fenêtre ouverte */
  if(!strong&&(typing(ev.target)||!S.db))return false;
  if(!strong&&keyBusy())return false;
  if(KEYS.pre&&Date.now()-KEYS.preAt<1300){
    var seq=KEYS.pre+' '+c, hit=list.find(function(b){return b.k===seq;});
    KEYS.pre='';
    if(hit){ev.preventDefault();keyRun(hit);return true;}
  }
  var one=list.find(function(b){return b.k===c;});
  if(one){if(keyRun(one)){ev.preventDefault();return true;}return false;}
  if(list.some(function(b){return b.k.indexOf(c+' ')===0;})){KEYS.pre=c;KEYS.preAt=Date.now();return true;}
  return false;
}

/* ---------- enregistrement d'une nouvelle combinaison ---------- */
function keyRecStart(target){clearTimeout(KEYS.timer);KEYS.rec={t:target,first:''};}
function keyRecStop(){clearTimeout(KEYS.timer);KEYS.rec=null;}
function keyRecCommit(k){
  var r=KEYS.rec; keyRecStop(); if(!r)return;
  var list=keyList().map(function(b){return {a:b.a,k:b.k};}), act=r.t==='new'?(document.getElementById('key-act')||{}).value:null;
  if(r.t==='new'&&!keyAct(act)){render();return;}
  var cur=r.t==='new'?null:list[r.t];
  var clash=list.find(function(b){return b.k===k&&b!==cur;});
  /* une touche seule qui commence une suite existante (« g » alors que « g h » existe) la rendrait inutilisable */
  var prefix=list.find(function(b){return b!==cur&&b!==clash&&(b.k.indexOf(k+' ')===0||k.indexOf(b.k+' ')===0);});
  if(prefix){toast(tf('Impossible : {0} se mélange avec le raccourci de « {1} ».',keyHint2(k),keyLabel(prefix.a)),{bad:true});render();return;}
  if(clash){list=list.filter(function(b){return b!==clash;});toast(tf('Ce raccourci était utilisé par « {0} » : il lui a été retiré.',keyLabel(clash.a)));}
  if(cur)cur.k=k; else list.push({a:act,k:k});
  keySave(list);render();
}
function keyHint2(k){var D=I18N.dict[LANG]||{};return k.split(' ').map(function(c){return keyText(c).split(' ').map(function(x){return D[x]||x;}).join(' ');}).join(' '+(D.puis||'puis')+' ');}
function keysRecord(ev){
  var r=KEYS.rec; if(!r)return false;
  ev.preventDefault();ev.stopPropagation();
  if(ev.key==='Escape'){keyRecStop();render();return true;}
  var c=keyCombo(ev); if(!c)return true;
  var bare=c.replace(/^shift\+/,'');
  if(!r.first){
    if(KEY_TAKEN.indexOf(c)>=0){toast(tf('{0} est réservé par le navigateur. Choisis une autre combinaison.',keyHint2(c)),{bad:true});return true;}
    if(['enter','tab','space','backspace','delete','up','down','left','right'].indexOf(bare)>=0&&!keyHasMod(c)){toast('Cette touche sert déjà à écrire ou à se déplacer. Ajoute Ctrl ou Alt, ou choisis une lettre.',{bad:true});return true;}
    if(keyHasMod(c)){keyRecCommit(c);return true;}
    /* une touche seule : on laisse une seconde pour en taper une deuxième (« G puis H ») */
    r.first=c;render();
    KEYS.timer=setTimeout(function(){if(KEYS.rec===r)keyRecCommit(r.first);},1100);
    return true;
  }
  if(keyHasMod(c)){toast('La deuxième touche doit être une touche seule, sans Ctrl ni Alt.',{bad:true});return true;}
  keyRecCommit(r.first+' '+c);
  return true;
}

/* ---------- réglages ---------- */
function keysCard(){
  var list=keyList(), custom=Array.isArray(S.cfg.keys), rec=KEYS.rec;
  var h='<section class="panel scard hide-s" id="keys"><h2>'+ic('bolt')+'Raccourcis clavier</h2><p class="hint">Clique sur un raccourci pour le changer, puis tape la nouvelle combinaison. Une lettre seule, deux touches à la suite (« G puis H »), ou avec Ctrl, Alt ou Maj. Tes raccourcis te suivent sur tous tes appareils.</p>';
  h+='<ul class="klist kedit">';
  list.forEach(function(b,i){
    var on=rec&&rec.t===i, x=keyAct(b.a);
    h+='<li'+(x.gone?' class="gone"':'')+'><span class="grow">'+keyName(b.a)+'</span>'
      +(on?'<span class="k-rec" role="status">'+(rec.first?keyHtml(rec.first)+'<span class="k-then">puis…</span>':'Tape la combinaison…')+'</span><button class="btn quiet sm" data-act="key-cancel">Annuler</button>'
          :'<button class="k-btn" data-act="key-rec" data-id="'+i+'" title="Changer ce raccourci" aria-label="'+nt(escRaw(unmark(T('Changer le raccourci :'))+' '+keyLabel(b.a)+', '+keyHint2(b.k)))+'">'+keyHtml(b.k)+'</button>')
      +'<button class="ib sm dng" data-act="key-del" data-id="'+i+'" aria-label="Supprimer ce raccourci" title="Supprimer ce raccourci">'+ic('x')+'</button></li>';
  });
  if(!list.length)h+='<li class="mut">Aucun raccourci. Ajoutes-en un ci-dessous.</li>';
  h+='</ul>';
  /* ajouter : on choisit l'action, puis on tape la combinaison */
  var groups={}, order=[];
  Object.keys(KEY_ACTS).forEach(function(a){var g=KEY_ACTS[a].g;if(!groups[g]){groups[g]=[];order.push(g);}groups[g].push(a);});
  var opts=order.map(function(g){return '<optgroup label="'+escRaw(unmark(T(g)))+'">'+groups[g].map(function(a){return '<option value="'+a+'"'+(KEYS.pick===a?' selected':'')+'>'+KEY_ACTS[a].n+'</option>';}).join('')+'</optgroup>';}).join('');
  var ps=S.projects.filter(function(p){return pstat(p)!=='archived';});
  if(ps.length)opts+='<optgroup label="'+escRaw(unmark(T('Ouvrir un projet')))+'">'+ps.map(function(p){return '<option value="p:'+escRaw(p.id)+'"'+(KEYS.pick==='p:'+p.id?' selected':'')+'>'+esc(p.name)+'</option>';}).join('')+'</optgroup>';
  var onNew=rec&&rec.t==='new';
  h+='<div class="k-add"><label class="sr" for="key-act">Action du nouveau raccourci</label><select class="in sm grow" id="key-act" data-change="keypick"'+(onNew?' disabled':'')+'>'+opts+'</select>'
    +(onNew?'<span class="k-rec" role="status">'+(rec.first?keyHtml(rec.first)+'<span class="k-then">puis…</span>':'Tape la combinaison…')+'</span><button class="btn quiet sm" data-act="key-cancel">Annuler</button>'
           :'<button class="btn sm primary" data-act="key-new">'+ic('plus')+'Ajouter un raccourci</button>')+'</div>';
  h+='<div class="row-btns"><span class="hint grow">Échap ferme toujours la fenêtre ouverte ; ce raccourci ne se change pas.</span>'+(custom?'<button class="btn quiet sm" data-act="key-reset">Remettre les raccourcis d’origine</button>':'')+'</div></section>';
  return h;
}
function keysClick(act,id){
  if(act.indexOf('key-')!==0)return false;
  if(act==='key-rec'){keyRecStart(parseInt(id,10));render();var f=document.activeElement;if(f&&f.blur)f.blur();return true;}
  if(act==='key-new'){if(S.planReady&&!plan().keys){upsell('keys');return true;}var s=document.getElementById('key-act');KEYS.pick=s?s.value:'';keyRecStart('new');render();var g=document.activeElement;if(g&&g.blur)g.blur();return true;}
  if(act==='key-cancel'){keyRecStop();render();return true;}
  if(act==='key-del'){
    var list=keyList().map(function(b){return {a:b.a,k:b.k};}), i=parseInt(id,10), old=list.slice();
    if(!list[i])return true;
    keyRecStop();list.splice(i,1);keySave(list);
    toast('Raccourci supprimé.',{undo:function(){keySave(old);render();}});
    render();return true;
  }
  if(act==='key-reset'){
    var before=keyList().map(function(b){return {a:b.a,k:b.k};});
    keyRecStop();
    var n=Object.assign({},S.cfg);delete n.id;delete n.keys;S.cfg=Object.assign({id:'main'},n);
    run(function(){return S.db.doc(PRIV+'settings/main').set(n);});
    toast('Raccourcis d’origine remis.',{undo:function(){keySave(before);render();}});
    render();return true;
  }
  render();return true;
}
/* un clic ailleurs pendant qu'on attend une touche annule l'enregistrement */
document.body.addEventListener('pointerdown',function(ev){
  if(KEYS.rec&&!(ev.target.closest&&ev.target.closest('#keys')))keyRecStop(),queueRender();
},true);
