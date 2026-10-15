/* On Stride — « Coller un message client » : on colle le message brut d'un client,
   l'appli le range toute seule en une tâche : description (contexte, légende, questions)
   + checklists « À rajouter / À modifier / À supprimer ». On relit, on ajuste, on crée. */
'use strict';

/* ---------- lecture du message ---------- */
var PASTE_VERBS={
  del:/^(supprim|retir|enlev|effac|vir(er|e)\b|[ôo]ter\b|ne\s+plus\b|plus\s+besoin|il\s+ne\s+faut\s+plus|on\s+ne\s+veut\s+plus|pas\s+de\s+\w+\s+(du\s+tout|non\s+plus))/i,
  mod:/^(chang|modifi|remplac|d[ée]plac|bouger|corrig|refai|refaire|agrandi|r[ée]dui|r[ée]tr[ée]ci|ajust|d[ée]cal|invers|renomm|mettre\s+[àa]\s+jour|am[ée]lior|retravaill|revoir|transform|[ée]clairci|assombri|baisser|augment|diminu|rendre|regroup|fusionn|unifi|rassembl|r[ée]organis|r[ée]arrang|simplifi|all[ée]g|compact|optimis|adapt|harmonis|uniformis|retouch|peaufin|affin|align|centr|recadr|redimension|accentu|att[ée]nu|ralenti|acc[ée]l[ée]r|[ée]quilibr|faire\s+en\s+sorte|c.est\s+en\s+sorte|en\s+sorte\s+qu|passer\s|mettre\s+en\s|traduir|reformul|nettoy)/i,
  add:/^(ajout|rajout|mett|met\b|mets\b|ins[ée]r|cr[ée]er|cr[ée]e\b|int[ée]gr|placer|pose|poser|install|faire|fais\b|pr[ée]voir|d[ée]velopp|impl[ée]ment|constru|propos|g[ée]n[ée]r|ins[ée]r|il\s+faudrait|il\s+faut|on\s+veut|on\s+voudrait|je\s+veux|je\s+voudrais|j.aimerais|on\s+aimerait|un\s|une\s|des\s|du\s|nouve(au|lle|aux)|plus\s+de\s)/i
};
/* lignes de politesse / présentation : vont dans la description (ou sont ignorées) */
var PASTE_INTRO=/^(bonjour|bonsoir|salut|hello|coucou|hey|alors|bon\b|ok\b|okay|voici|voil[àa]|comme\s+convenu|suite\s+[àa]|pour\s+info|petit\s+r[ée]cap|j.ai\s+(regard|vu|test)|on\s+a\s+(regard|vu|test))/i;
var PASTE_BYE=/^(merci|cordialement|bonne\s+(journ[ée]e|soir[ée]e|fin)|[àa]\s+(bient[ôo]t|plus)|bisous?|bises|tchao|ciao|@\+)\b/i;
var PASTE_HEADS=[
  ['del',/^(?:[àa]\s+|choses?\s+[àa]\s+|[ée]l[ée]ments?\s+[àa]\s+)?(supprim|retir|enlev)\w*[\s:!.]*/i],
  ['mod',/^(?:[àa]\s+|choses?\s+[àa]\s+|[ée]l[ée]ments?\s+[àa]\s+)?(modifi|chang|corrig)\w*[\s:!.]*/i],
  ['add',/^(?:[àa]\s+|choses?\s+[àa]\s+|[ée]l[ée]ments?\s+[àa]\s+)?(rajout|ajout)\w*[\s:!.]*/i]
];
var PASTE_COLORS=/^(rouge|vert|verte|bleu|bleue|jaune|orange|violet|violette|rose|noir|noire|blanc|blanche|gris|grise|marron|brun|beige|cyan|turquoise|dor[ée]|argent)\b/i;

function pasteClean(l){
  return l.replace(/^\s*(?:[-–—•*·>]+|\d+\s*[.)-]|\[\s*[xX ]?\s*\]|☐|☑|✅|❌)\s*/,'').replace(/\s+/g,' ').trim();
}
function pasteCap(s){s=s.replace(/^(et\s+|puis\s+|aussi\s+|ensuite\s+)/i,'').replace(/\s*[.;,]+$/,'');return s.charAt(0).toUpperCase()+s.slice(1);}
function pasteHead(l){
  for(var i=0;i<PASTE_HEADS.length;i++){
    var m=l.match(PASTE_HEADS[i][1]);
    /* un titre est court : « A RAJOUTER ! » ou « À modifier : texte » */
    if(m&&(l.length<=28||/[:!]/.test(m[0])))return {k:PASTE_HEADS[i][0],rest:l.slice(m[0].length).trim()};
  }
  return null;
}
function pasteVerb(l){
  var s=l.replace(/^(et\s+|puis\s+|aussi\s+|ensuite\s+|enfin\s+|stp\s+|svp\s+|merci\s+de\s+|pouvez[- ]vous\s+|pourriez[- ]vous\s+|peux[- ]tu\s+|pourrais[- ]tu\s+|tu\s+peux\s+|vous\s+pouvez\s+)+/i,'');
  /* « il faudrait changer… », « j'aimerais retirer… » : on regarde le verbe qui suit */
  var w=s.replace(/^(il\s+faudrait|il\s+faut|faudrait|on\s+veut|on\s+voudrait|je\s+veux|je\s+voudrais|j.aimerais|on\s+aimerait|ce\s+serait\s+bien\s+de|ce\s+serait\s+top\s+de|est-ce\s+possible\s+de|possible\s+de)\s+(qu.on\s+|que\s+tu\s+|que\s+vous\s+|bien\s+|aussi\s+|encore\s+)?/i,'');
  var k=['del','mod','add'];
  if(w!==s){for(var i=0;i<k.length;i++)if(PASTE_VERBS[k[i]].test(w))return k[i];}
  for(var j=0;j<k.length;j++)if(PASTE_VERBS[k[j]].test(s))return k[j];
  return '';
}
function parseClientMsg(txt){
  var r={intro:[],legend:[],questions:[],add:[],mod:[],del:[]}, sec='';
  String(txt||'').replace(/\r/g,'').split('\n').forEach(function(raw){
    var l=pasteClean(raw); if(!l||!/[a-zà-ÿ0-9]/i.test(l)||l.length<3)return;
    var hd=pasteHead(l);
    if(hd){sec=hd.k;if(!/[a-zà-ÿ0-9]/i.test(hd.rest))return;l=pasteCap(hd.rest);}
    if(PASTE_BYE.test(l)&&l.length<60)return;
    if(/\?\s*$/.test(l)||(/\?/.test(l)&&l.length>60)){r.questions.push(l);return;}
    if(PASTE_COLORS.test(l)&&l.length<90&&/[-–—:=]|\s\s/.test(l.slice(0,30))){r.legend.push(l);return;}
    if(PASTE_COLORS.test(l)&&l.split(' ').length<=5){r.legend.push(l);return;}
    /* présentation : début du message, ou ligne qui annonce la suite (« … : ») */
    if(!hd&&(PASTE_INTRO.test(l)||(/:\s*$/.test(l)&&l.length<120))&&!pasteVerb(l.replace(PASTE_INTRO,'').replace(/^[\s,!.]+/,''))){r.intro.push(l);return;}
    var v=pasteVerb(l);
    /* sous un titre du client (« A RAJOUTER ! »), on suit son classement, sauf verbe clair de modification ou de suppression */
    if(sec&&v!=='del'&&v!=='mod')v=sec;
    r[v||'mod'].push(pasteCap(l));
  });
  return r;
}
function pasteNotes(r){
  var out=[];
  if(r.intro.length)out.push(r.intro.join('\n'));
  if(r.legend.length)out.push(unmark(T('Légende :'))+'\n'+r.legend.map(function(x){return '• '+x;}).join('\n'));
  if(r.questions.length)out.push(unmark(T('Questions du client :'))+'\n'+r.questions.map(function(x){return '• '+x;}).join('\n'));
  return out.join('\n\n');
}
function pasteTitle(r){
  var first=r.intro.filter(function(x){return !/^(bonjour|bonsoir|salut|hello|coucou|hey)\b[\s,!.]*$/i.test(x);})[0];
  var s=(first||'').replace(/^(alors|bon|bonjour|bonsoir|salut|hello|coucou|ok|voil[àa])\b[\s,!.]*/i,'').replace(/^(voici|voil[àa])\s+/i,'').replace(/\s*[:.!]+$/,'');
  if(s&&s.length>4&&s.length<=70&&!PASTE_INTRO.test(s))return pasteCap(s);
  var all=r.add.concat(r.mod,r.del);
  if(all.length===1&&all[0].length<=70)return all[0];
  return unmark(tf('Demandes du client · {0}',fmtDate(todayStr())));
}

/* ---------- fenêtre ---------- */
function pasteHtml(by){
  var tg=pasteTarget(); if(!tg){S.paste=null;return '';}
  var P=S.paste, h='<div class="ov top" data-act="ov-bg"><div class="rep paste" role="dialog" aria-labelledby="pst-t"><header><h2 id="pst-t">'+(P.step===2?'Vérifie le rangement':'Coller un message client')+'</h2><button class="ib" data-act="ov-close" aria-label="Fermer">'+ic('x')+'</button></header>';
  if(P.step!==2){
    h+='<p class="hint">Colle le message tel que le client te l’a envoyé. Chaque ligne devient une demande, triée toute seule en « à rajouter », « à modifier » ou « à supprimer ». Le bonjour, la légende et les questions vont dans la description.</p>'
      +'<label class="sr" for="pst-src">Message du client</label><textarea class="area rep-x" id="pst-src" data-draft placeholder="Ex. : A RAJOUTER ! mettre plus de végétation, changer la couleur du titre, supprimer la bannière…">'+esc(P.src||'')+'</textarea>'
      +'<footer><span class="grow"></span><button class="btn" data-act="ov-close">Annuler</button><button class="btn primary" data-act="paste-parse">'+ic('bolt')+'Ranger</button></footer>';
  }else{
    var d=P.d;
    function rows(t,min,max){var n=String(t||'').split('\n').reduce(function(a,l){return a+Math.max(1,Math.ceil(l.length/66));},0);return Math.min(max,Math.max(min,n+1));}
    h+='<p class="hint">Une demande par ligne. Corrige ce qui est mal rangé, puis crée la tâche.</p>'
      +'<div class="pst-f"><label for="pst-title">Titre de la tâche</label><input class="in" id="pst-title" data-draft value="'+esc(d.title)+'" autocomplete="off"></div>'
      +'<div class="pst-f"><label for="pst-notes">Description</label><textarea class="area sm auto" id="pst-notes" data-draft rows="'+rows(d.notes,3,10)+'">'+esc(d.notes)+'</textarea></div>';
    CKREQ_ORDER.forEach(function(k){
      var c=CKREQ[k];
      h+='<div class="pst-f rq-g rq-'+k+'"><label for="pst-'+k+'"><span class="rq-l">'+ic(c.ic)+c.n+'</span><span class="cnt">'+pl(d[k].length,'demande','demandes')+'</span></label><textarea class="area sm auto" id="pst-'+k+'" data-draft rows="'+rows(d[k].join('\n'),2,14)+'">'+esc(d[k].join('\n'))+'</textarea></div>';
    });
    var po={'':T('Bazar (pas encore rangée)')}; rwProjects(index()).forEach(function(x){po[x.id]=x.name;});
    var co={'':T('Aucun')}; S.clients.forEach(function(x){co[x.id]=x.name;});
    h+='<div class="pst-dest"><div class="pst-f"><label for="pst-pid">'+ic('folder')+'Ranger dans</label>'+selH('pst-pid','pstdest','pid',po,P.pid||'','in')+'</div>'
      +(tg.e?'':(S.clients.length?'<div class="pst-f"><label for="pst-cid">'+ic('users')+'Client</label>'+selH('pst-cid','pstdest','cid',co,P.cid||'','in')+'</div>':''))+'</div>';
    var bioL=tg.e?'Ajouter aussi le contexte à la description du projet':tg.c?'Ajouter aussi le contexte aux notes du client':'';
    if(bioL)h+='<label class="qchk"><input type="checkbox" id="pst-bio"'+(P.bio?' checked':'')+'> '+bioL+'</label>';
    h+=''
      +'<footer><button class="btn quiet" data-act="paste-back">'+ic('left')+'Retour</button><span class="grow"></span><button class="btn primary" data-act="paste-ok">'+ic('plus')+'Créer la tâche</button></footer>';
  }
  return h+'</div></div>';
}
function pasteVal(id){var el=document.getElementById(id);return el?el.value:'';}
function pasteLines(id){return pasteVal(id).split('\n').map(pasteClean).filter(Boolean);}

function pasteClick(act,id,b){
  if(act==='paste-open'){
    var cid=b&&b.dataset.client, cl=cid?S.clients.find(function(x){return x.id===cid;}):null, e=(!cid&&id)?index()[id]:null;
    if(!S.db||!S.canEdit)return true;
    if(e&&!canW(e))e=null;
    if(!e&&!cl&&index()[S.view]&&canW(index()[S.view]))e=index()[S.view];   /* depuis le menu « + » dans un projet */
    closeOverlays();S.paste={pid:e?e.p.id:'',cid:cl?cl.id:'',step:1,src:'',bio:e?!(e.p.desc||'').trim():cl?!(cl.notes||'').trim():false};S.focus='pst-src';render();return true;
  }
  if(act==='link-p'||act==='link-t'||act==='link-all')return linkClick(act,id,b);
  if(!S.paste||act.indexOf('paste-')!==0)return false;
  if(act==='paste-parse'){
    var src=pasteVal('pst-src'); S.paste.src=src;
    if(!src.trim()){toast('Colle d’abord le message du client.',{bad:true});S.focus='pst-src';render();return true;}
    var r=parseClientMsg(src);
    S.paste.d={title:pasteTitle(r),notes:pasteNotes(r),add:r.add,mod:r.mod,del:r.del};
    S.paste.step=2;delete S.dirty['pst-src'];
    ['pst-title','pst-notes','pst-add','pst-mod','pst-del'].forEach(function(k){delete S.dirty[k];});
    S.focus='pst-title';render();return true;
  }
  if(act==='paste-back'){
    pasteKeep();S.paste.step=1;render();return true;
  }
  if(act==='paste-ok'){
    pasteKeep();
    var P=S.paste, d=P.d, tg=pasteTarget();
    if(!tg){closeOverlays();render();return true;}
    var check=[];
    CKREQ_ORDER.forEach(function(k){d[k].forEach(function(t){check.push({id:rnd(),t:t,d:false,k:k});});});
    if(!d.title.trim()&&!check.length){toast('Rien à créer : le message est vide.',{bad:true});return true;}
    var title=d.title.trim()||unmark(tf('Demandes du client · {0}',fmtDate(todayStr())));
    var extra={notes:d.notes.trim(),check:check};
    if(tg.e)addTask(tg.e.p.id,title,tg.e.cols[0].id,extra);
    else addInbox(title,tg.c?Object.assign(extra,{clientId:tg.c.id}):extra);
    if(P.bio&&d.notes.trim()&&(tg.e||tg.c)){
      var cur=((tg.e?tg.e.p.desc:tg.c.notes)||'').trim(), nd=cur?cur+'\n\n'+d.notes.trim():d.notes.trim();
      if(tg.e)run(function(){return pdoc(tg.e.p.id).update({desc:nd});});
      else run(function(){return cdoc(tg.c.id).update({notes:nd});});
    }
    toast(tf('Rangé : {0} dans « {1} ».',pl(check.length,'demande','demandes'),tg.e?tg.e.p.name:(tg.c?tg.c.name+' · '+unmark(T('Bazar')):unmark(T('Bazar')))));
    ['pst-title','pst-notes','pst-add','pst-mod','pst-del','pst-src'].forEach(function(k){delete S.dirty[k];});
    S.paste=null;render();return true;
  }
  return true;
}
/* où va la tâche : un projet (e) ou un client (c, tâche du Bazar rattachée au client) */
function pasteTarget(){
  var P=S.paste; if(!P||!S.canEdit)return null;
  var e=P.pid?index()[P.pid]:null; if(P.pid&&(!e||!canW(e)))e=null;
  var c=(!e&&P.cid)?S.clients.find(function(x){return x.id===P.cid;})||null:null;
  return {e:e,c:c};
}
/* garde ce qui a été corrigé à la main avant de changer d'étape */
function pasteKeep(){
  var P=S.paste; if(!P||P.step!==2||!P.d)return;
  P.d.title=pasteVal('pst-title');P.d.notes=pasteVal('pst-notes');
  CKREQ_ORDER.forEach(function(k){P.d[k]=pasteLines('pst-'+k);});
  var bx=document.getElementById('pst-bio');if(bx)P.bio=bx.checked;
  var sp=document.getElementById('pst-pid');if(sp)P.pid=sp.value;
  var sc=document.getElementById('pst-cid');if(sc)P.cid=sc.value;
}

/* ---------- tâches rattachées directement à un client (sans projet) ---------- */
function taskClient(t){
  if(!t||t.projectId||!t.clientId)return null;
  return S.clients.find(function(c){return c.id===t.clientId;})||null;
}
function clientProp(t){
  if(t.projectId||!S.clients.length)return '';
  var o={'':T('Aucun')}; S.clients.forEach(function(c){o[c.id]=c.name;});
  return prop(ic('users')+'Client',selH('mcl-'+esc(t.id),'tclient',esc(t.id),o,taskClient(t)?t.clientId:''),'mcl-'+esc(t.id));
}
function clientTaskChange(k,id,v){
  if(k==='clinkp'){if(v&&S.canEdit){linkProject(v,id);toast('Projet relié au client.');}render();return true;}
  if(k==='clinkt'){if(v&&S.canEdit){linkTask(v,id);toast('Tâche reliée au client.');}render();return true;}
  if(k!=='tclient')return false;
  var t=taskById(id); if(!t||t.projectId||!S.canEdit)return true;
  var c=v?S.clients.find(function(x){return x.id===v;}):null;
  run(function(){return tdoc(id).update({clientId:c?c.id:'',act:actOf(t,c?tf('Client : {0}',c.name):'Plus de client')});});
  return true;
}
function clientTasksHtml(c,by){
  var id=esc(c.id), ts=S.tasks.filter(function(t){return !t.projectId&&t.clientId===c.id;});
  var todo=ts.filter(function(t){return !isDone(t,null);}).sort(cmpPos), done=ts.filter(function(t){return isDone(t,null);});
  var h='<section class="sect"><h2>Tâches de ce client'+(ts.length?' <span class="cnt">'+todo.length+'</span>':'')+'<span class="grow"></span>'
    +(S.canEdit?'<button class="btn sm" data-act="paste-open" data-client="'+id+'" title="Colle un message de ton client : les demandes sont rangées toutes seules dans une tâche">'+ic('checklist')+'Message client</button>':'')+'</h2>';
  if(S.canEdit)h+='<div class="qadd"><label class="sr" for="nct">Nouvelle tâche pour ce client</label>'+ic('plus')+'<input id="nct" data-draft data-add="ctask" data-client="'+id+'" placeholder="Nouvelle tâche pour ce client, puis Entrée" autocomplete="off"></div>'+linkTaskSel(c);
  if(todo.length)h+='<ul class="tlist panel">'+todo.map(function(t){return taskRow(t,by);}).join('')+'</ul>';
  else h+='<p class="hint">'+(done.length?'Tout est fait pour ce client.':'Aucune tâche pour ce client. Ajoute-en une ci-dessus : elle n’a pas besoin de projet et apparaît aussi dans ton Bazar.')+'</p>';
  if(done.length)h+='<details class="cdone"><summary>'+pl(done.length,'tâche terminée','tâches terminées')+'</summary><ul class="tlist panel">'+done.slice(0,30).map(function(t){return taskRow(t,by);}).join('')+'</ul></details>';
  return h+'</section>';
}

/* ---------- relier à un client ce qui existe déjà ---------- */
function clientNames(c){return [c.name,c.company].map(function(x){return norm(String(x||'').trim());}).filter(function(x){return x.length>=3;});}
function hasName(txt,names){var s=norm(txt);return names.some(function(n){return s.indexOf(n)>=0;});}
/* projets et tâches du Bazar pas encore reliés, où le nom du client apparaît (responsables, assigné à, titre…) */
function clientGuess(c){
  var ns=clientNames(c); if(!ns.length)return {ps:[],ts:[]};
  var ps=S.projects.filter(function(p){var cid=metaOf(p.id).clientId;return !cid&&p.status!=='archived'&&hasName([p.name,p.desc,peopleOf(p).join(' ')].join(' '),ns);});
  var ts=S.tasks.filter(function(t){return !t.projectId&&!t.clientId&&!t.done&&hasName([t.title,t.notes,whoList(t).join(' ')].join(' '),ns);});
  return {ps:ps,ts:ts};
}
function clientGuessHtml(c){
  if(!S.canEdit)return '';
  var g=clientGuess(c), id=esc(c.id); if(!g.ps.length&&!g.ts.length)return '';
  var h='<section class="note guess"><p><strong>'+tf('Le nom « {0} » apparaît ici, mais ce n’est pas encore relié à ce client :',esc(c.name))+'</strong></p><ul>';
  g.ps.forEach(function(p){h+='<li>'+ic('folder')+'<span class="grow">'+esc(p.name)+' <span class="cnt">Projet</span></span><button class="btn sm" data-act="link-p" data-id="'+esc(p.id)+'" data-client="'+id+'">Relier</button></li>';});
  g.ts.forEach(function(t){h+='<li>'+ic('box')+'<span class="grow">'+esc(t.title)+' <span class="cnt">Tâche du Bazar</span></span><button class="btn sm" data-act="link-t" data-id="'+esc(t.id)+'" data-client="'+id+'">Relier</button></li>';});
  h+='</ul>'+(g.ps.length+g.ts.length>1?'<div class="row-btns"><button class="btn primary sm" data-act="link-all" data-client="'+id+'">Tout relier</button></div>':'')+'</section>';
  return h;
}
function linkProjectSel(c){
  if(!S.canEdit)return '';
  var o={'':T('Relier un projet existant…')}, n=0;
  S.projects.forEach(function(p){if(metaOf(p.id).clientId!==c.id&&p.status!=='archived'){o[p.id]=p.name+(metaOf(p.id).clientId?' '+T('(déjà relié à un autre client)'):'');n++;}});
  return n?'<div class="linkrow">'+selH('lkp-'+esc(c.id),'clinkp',esc(c.id),o,'','in sm',' aria-label="Relier un projet existant"')+'</div>':'';
}
function linkTaskSel(c){
  if(!S.canEdit)return '';
  var o={'':T('Relier une tâche du Bazar…')}, n=0;
  S.tasks.forEach(function(t){if(!t.projectId&&!t.done&&t.clientId!==c.id){o[t.id]=t.title;n++;}});
  return n?'<div class="linkrow">'+selH('lkt-'+esc(c.id),'clinkt',esc(c.id),o,'','in sm',' aria-label="Relier une tâche du Bazar"')+'</div>':'';
}
function linkTask(tid,cid){var t=taskById(tid), c=S.clients.find(function(x){return x.id===cid;});if(!t||t.projectId||!c)return;run(function(){return tdoc(tid).update({clientId:cid,act:actOf(t,tf('Client : {0}',c.name))});});}
function linkProject(pid,cid){if(projById(pid)&&S.clients.some(function(x){return x.id===cid;}))setMeta(pid,{clientId:cid});}
function linkClick(act,id,b){
  var cid=b&&b.dataset.client; if(!S.canEdit||!cid)return true;
  if(act==='link-p'){linkProject(id,cid);toast('Projet relié au client.');}
  else if(act==='link-t'){linkTask(id,cid);toast('Tâche reliée au client.');}
  else if(act==='link-all'){
    var c=S.clients.find(function(x){return x.id===cid;}); if(!c)return true;
    var g=clientGuess(c); g.ps.forEach(function(p){linkProject(p.id,cid);}); g.ts.forEach(function(t){linkTask(t.id,cid);});
    toast(tf('{0} relié(s) au client.',g.ps.length+g.ts.length));
  }
  render();return true;
}

/* « Ranger dans » / « Client » changés dans la fenêtre */
function pasteDestChange(k,id,v){
  if(k!=='pstdest'||!S.paste)return false;
  pasteKeep();
  if(id==='pid'){S.paste.pid=v;var e=v?index()[v]:null;S.paste.bio=e?!(e.p.desc||'').trim():false;}
  else{S.paste.cid=v;var c=v?S.clients.find(function(x){return x.id===v;}):null;S.paste.bio=c?!(c.notes||'').trim():false;}
  ['pst-title','pst-notes','pst-add','pst-mod','pst-del'].forEach(function(x){delete S.dirty[x];});
  render();return true;
}
