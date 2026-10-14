/* On Stride — « Coller un message client » : on colle le message brut d'un client,
   l'appli le range toute seule en une tâche : description (contexte, légende, questions)
   + checklists « À rajouter / À modifier / À supprimer ». On relit, on ajuste, on crée. */
'use strict';

/* ---------- lecture du message ---------- */
var PASTE_VERBS={
  del:/^(supprim|retir|enlev|effac|vir(er|e)\b|ôter|oter|plus\s+de\b|pas\s+de\b|sans\b)/i,
  mod:/^(chang|modifi|remplac|d[ée]plac|bouger|corrig|refai|agrandi|r[ée]dui|r[ée]tr[ée]ci|ajust|d[ée]cal|inverser|renomm|mettre\s+[àa]\s+jour|am[ée]lior|retravaill|revoir|transform|[ée]clairci|assombri|baisser|augmenter|diminuer|rendre)/i,
  add:/^(ajout|rajout|mett|met\b|mets\b|ins[ée]r|cr[ée]er|cr[ée]e\b|int[ée]gr|placer|pose|poser|install|faire\s+appara|pr[ée]voir|il\s+faudrait|il\s+faut|on\s+veut|on\s+voudrait|je\s+veux|je\s+voudrais)/i
};
/* titres de section du client : « A RAJOUTER ! », « À modifier : », « Choses à supprimer » … */
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
  var s=l.replace(/^(et\s+|puis\s+|aussi\s+|ensuite\s+|stp\s+|svp\s+|merci\s+de\s+|pouvez[- ]vous\s+|peux[- ]tu\s+|tu\s+peux\s+|vous\s+pouvez\s+)/i,'');
  if(PASTE_VERBS.del.test(s))return 'del';
  if(PASTE_VERBS.mod.test(s))return 'mod';
  if(PASTE_VERBS.add.test(s))return 'add';
  return '';
}
function parseClientMsg(txt){
  var r={intro:[],legend:[],questions:[],other:[],add:[],mod:[],del:[]}, sec='';
  String(txt||'').replace(/\r/g,'').split('\n').forEach(function(raw){
    var l=pasteClean(raw); if(!l||!/[a-zà-ÿ0-9]/i.test(l))return;
    var hd=pasteHead(l);
    if(hd){sec=hd.k;if(!/[a-zà-ÿ0-9]/i.test(hd.rest))return;l=pasteCap(hd.rest);}
    if(/\?\s*$/.test(l)||(/\?/.test(l)&&l.length>60)){r.questions.push(l);return;}
    if(PASTE_COLORS.test(l)&&l.length<90){r.legend.push(l);return;}
    var v=pasteVerb(l);
    if(v){r[v].push(pasteCap(l));return;}
    if(sec){r[sec].push(pasteCap(l));return;}
    if(!r.add.length&&!r.mod.length&&!r.del.length)r.intro.push(l); else r.other.push(l);
  });
  return r;
}
function pasteNotes(r){
  var out=[];
  if(r.intro.length)out.push(r.intro.join('\n'));
  if(r.legend.length)out.push(unmark(T('Légende :'))+'\n'+r.legend.map(function(x){return '• '+x;}).join('\n'));
  if(r.questions.length)out.push(unmark(T('Questions du client :'))+'\n'+r.questions.map(function(x){return '• '+x;}).join('\n'));
  if(r.other.length)out.push(unmark(T('Autres remarques :'))+'\n'+r.other.map(function(x){return '• '+x;}).join('\n'));
  return out.join('\n\n');
}
function pasteTitle(r){
  var s=(r.intro[0]||'').replace(/^(alors|bon|bonjour|salut|hello|coucou|ok|voil[àa])\b[\s,!.]*/i,'').replace(/^(voici|voil[àa])\s+/i,'').replace(/\s*[:.!]+$/,'');
  if(s&&s.length>4&&s.length<=70)return pasteCap(s);
  return unmark(tf('Demandes du client · {0}',fmtDate(todayStr())));
}

/* ---------- fenêtre ---------- */
function pasteHtml(by){
  var e=by[S.paste.pid]; if(!e||!canW(e)){S.paste=null;return '';}
  var P=S.paste, h='<div class="ov top" data-act="ov-bg"><div class="rep paste" role="dialog" aria-labelledby="pst-t"><header><h2 id="pst-t">'+(P.step===2?'Vérifie le rangement':'Coller un message client')+'</h2><button class="ib" data-act="ov-close" aria-label="Fermer">'+ic('x')+'</button></header>';
  if(P.step!==2){
    h+='<p class="hint">Colle le message tel que le client te l’a envoyé. L’appli trie toute seule ce qu’il faut rajouter, modifier ou supprimer, et met le reste (contexte, légende, questions) dans la description.</p>'
      +'<label class="sr" for="pst-src">Message du client</label><textarea class="area rep-x" id="pst-src" data-draft placeholder="Ex. : A RAJOUTER ! mettre plus de végétation, changer la couleur du titre, supprimer la bannière…">'+esc(P.src||'')+'</textarea>'
      +'<footer><span class="grow"></span><button class="btn" data-act="ov-close">Annuler</button><button class="btn primary" data-act="paste-parse">'+ic('bolt')+'Ranger</button></footer>';
  }else{
    var d=P.d;
    function rows(t,min,max){var n=String(t||'').split('\n').reduce(function(a,l){return a+Math.max(1,Math.ceil(l.length/66));},0);return Math.min(max,Math.max(min,n+1));}
    h+='<p class="hint">Une demande par ligne. Corrige ce qui est mal rangé, puis crée la tâche.</p>'
      +'<div class="pst-f"><label for="pst-title">Titre de la tâche</label><input class="in" id="pst-title" data-draft value="'+esc(d.title)+'" autocomplete="off"></div>'
      +'<div class="pst-f"><label for="pst-notes">Description</label><textarea class="area sm" id="pst-notes" data-draft rows="'+rows(d.notes,3,10)+'">'+esc(d.notes)+'</textarea></div>';
    CKREQ_ORDER.forEach(function(k){
      var c=CKREQ[k];
      h+='<div class="pst-f rq-g rq-'+k+'"><label for="pst-'+k+'"><span class="rq-l">'+ic(c.ic)+c.n+'</span><span class="cnt">'+pl(d[k].length,'demande','demandes')+'</span></label><textarea class="area sm" id="pst-'+k+'" data-draft rows="'+rows(d[k].join('\n'),2,14)+'">'+esc(d[k].join('\n'))+'</textarea></div>';
    });
    h+='<label class="qchk"><input type="checkbox" id="pst-bio"'+(P.bio?' checked':'')+'> Ajouter aussi le contexte à la description du projet</label>'
      +'<footer><button class="btn quiet" data-act="paste-back">'+ic('left')+'Retour</button><span class="grow"></span><button class="btn primary" data-act="paste-ok">'+ic('plus')+'Créer la tâche</button></footer>';
  }
  return h+'</div></div>';
}
function pasteVal(id){var el=document.getElementById(id);return el?el.value:'';}
function pasteLines(id){return pasteVal(id).split('\n').map(pasteClean).filter(Boolean);}

function pasteClick(act,id,b){
  if(act==='paste-open'){
    var e=index()[id]; if(!e||!canW(e)||!S.db)return true;
    closeOverlays();S.paste={pid:e.p.id,step:1,src:'',bio:!(e.p.desc||'').trim()};S.focus='pst-src';render();return true;
  }
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
    var P=S.paste, d=P.d, pe=index()[P.pid];
    if(!pe||!canW(pe)){closeOverlays();render();return true;}
    var check=[];
    CKREQ_ORDER.forEach(function(k){d[k].forEach(function(t){check.push({id:rnd(),t:t,d:false,k:k});});});
    if(!d.title.trim()&&!check.length){toast('Rien à créer : le message est vide.',{bad:true});return true;}
    var title=d.title.trim()||unmark(tf('Demandes du client · {0}',fmtDate(todayStr())));
    addTask(pe.p.id,title,pe.cols[0].id,{notes:d.notes.trim(),check:check});
    if(P.bio&&d.notes.trim()){
      var cur=(pe.p.desc||'').trim(), nd=cur?cur+'\n\n'+d.notes.trim():d.notes.trim();
      run(function(){return pdoc(pe.p.id).update({desc:nd});});
    }
    toast(tf('Rangé : {0} dans « {1} ».',pl(check.length,'demande','demandes'),pe.p.name));
    ['pst-title','pst-notes','pst-add','pst-mod','pst-del','pst-src'].forEach(function(k){delete S.dirty[k];});
    S.paste=null;render();return true;
  }
  return true;
}
/* garde ce qui a été corrigé à la main avant de changer d'étape */
function pasteKeep(){
  var P=S.paste; if(!P||P.step!==2||!P.d)return;
  P.d.title=pasteVal('pst-title');P.d.notes=pasteVal('pst-notes');
  CKREQ_ORDER.forEach(function(k){P.d[k]=pasteLines('pst-'+k);});
  var bx=document.getElementById('pst-bio');if(bx)P.bio=bx.checked;
}
