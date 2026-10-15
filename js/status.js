/* On Stride — statuts personnalisés, pour les tâches et les projets.
   La liste est à toi (Réglages → Statuts, ou « + Nouveau statut… » dans le menu).
   Chaque tâche / projet garde une copie {id, n, c} : les personnes avec qui tu partages voient le même statut. */
'use strict';
var STX_DEF=[['En attente du client',3],['À valider',1],['Bloqué',5],['En pause',4]];
function stxList(){
  if(Array.isArray(S.cfg.statuses))return S.cfg.statuses;
  return STX_DEF.map(function(d,i){return {id:'d'+i,n:unmark(T(d[0])),c:d[1]};});
}
function stxById(id){return stxList().find(function(s){return s.id===id;})||null;}
/* le statut affiché : celui de ta liste s'il existe encore (nom/couleur à jour), sinon la copie gardée sur l'élément */
function stxOf(x){
  var s=x&&x.stx; if(!s||!s.n)return null;
  var m=s.id?stxById(s.id):null;
  return m?{id:m.id,n:m.n,c:m.c}:{id:s.id||'',n:s.n,c:s.c};
}
function stxChip(x,sm){
  var s=stxOf(x); if(!s)return '';
  return '<span class="lchip stx'+(sm?' sm':'')+'" style="--lc:var(--h'+((Number(s.c)||0)%6)+')" title="Statut"><i></i>'+esc(s.n)+'</span>';
}
/* menu de choix (k = 't' tâche, 'p' projet) */
function stxEditor(k,x){
  var id=esc(x.id), cur=stxOf(x), fid='stx-'+k+'-'+id;
  if(S.stxNew&&S.stxNew.k===k&&S.stxNew.id===x.id){
    var c=S.stxNew.c||0;
    return '<span class="stxnew"><label class="sr" for="stxn">Nom du nouveau statut</label><input class="in sm" id="stxn" data-draft data-add="stx" data-k="'+k+'" data-id="'+id+'" placeholder="Nom du statut, puis Entrée" autocomplete="off">'
      +'<span class="swatches" role="group" aria-label="Couleur du statut">'+[0,1,2,3,4,5].map(function(i){return '<button class="sw" style="--sc:var(--h'+i+')" data-act="stx-nc" data-id="'+i+'" aria-pressed="'+(c===i?'true':'false')+'" aria-label="'+COLORS[i]+'"></button>';}).join('')+'</span>'
      +'<button class="ib sm" data-act="stx-cancel" aria-label="Annuler">'+ic('x')+'</button></span>';
  }
  var o={'':T('Aucun')};
  stxList().forEach(function(s){o[s.id]=s.n;});
  if(cur&&!o[cur.id])o[cur.id||'_cur']=cur.n;
  o.__new=T('+ Nouveau statut…');
  var face=cur?stxChip(x):'<span class="lchip stx none">'+ic('plus')+'Statut</span>';
  return '<span class="stxed">'+face+ic('down','stx-car')+selH(fid,'stx',id,o,cur?(cur.id||'_cur'):'','stx-sel',' data-k="'+k+'" aria-label="Statut"')+'</span>';
}
function stxProp(t,ed){
  if(ed)return prop(ic('star')+'Statut',stxEditor('t',t),'stx-t-'+esc(t.id));
  return stxOf(t)?prop(ic('star')+'Statut','<span class="val">'+stxChip(t)+'</span>'):'';
}

/* ---------- écritures ---------- */
function stxApply(k,id,s){
  var val=s?{id:s.id,n:s.n,c:s.c}:null;
  if(k==='t'){var t=taskById(id);if(!t)return;run(function(){return tdoc(id).update({stx:val,act:actOf(t,s?tf('Statut : {0}',s.n):'Statut retiré')});});}
  else if(projById(id))run(function(){return pdoc(id).update({stx:val});});
}
function stxSaveList(l){return saveCfg({statuses:l});}
function stxCreate(name,c){
  var s={id:rnd(),n:name,c:Number(c)||0};
  stxSaveList(stxList().concat([s]));
  return s;
}
/* après un renommage / changement de couleur : met à jour la copie sur tes tâches et projets */
function stxSync(s){
  S.tasks.forEach(function(t){if(t.stx&&t.stx.id===s.id&&canW(index()[t.projectId]||null))run(function(){return tdoc(t.id).update({stx:{id:s.id,n:s.n,c:s.c}});});});
  S.projects.forEach(function(p){var e=index()[p.id];if(p.stx&&p.stx.id===s.id&&e&&canW(e))run(function(){return pdoc(p.id).update({stx:{id:s.id,n:s.n,c:s.c}});});});
}
function stxChange(k,id,v,el){
  if(k==='stx'){
    var kk=el&&el.dataset.k==='p'?'p':'t';
    if(!S.canEdit)return true;
    if(v==='__new'){S.stxNew={k:kk,id:id,c:0};S.focus='stxn';render();return true;}
    if(v==='_cur')return true;
    stxApply(kk,id,v?stxById(v):null);return true;
  }
  if(k==='stxname'){
    var l=stxList().map(function(s){return s.id===id?{id:s.id,n:v.trim()||s.n,c:s.c}:s;});
    stxSaveList(l);var s1=l.find(function(s){return s.id===id;});if(s1)stxSync(s1);return true;
  }
  return false;
}
function stxClick(act,id,b){
  if(act==='stx-nc'&&S.stxNew){var inp=document.getElementById('stxn');if(inp)S.dirty.stxn=true;S.stxNew.c=Number(id)||0;S.focus='stxn';render();return true;}
  if(act==='stx-cancel'){S.stxNew=null;render();return true;}
  if(act==='stx-color'){
    var l=stxList().map(function(s){return s.id===id?{id:s.id,n:s.n,c:((Number(s.c)||0)+1)%6}:s;});
    stxSaveList(l);var s=l.find(function(x){return x.id===id;});if(s)stxSync(s);render();return true;
  }
  if(act==='stx-del'){stxSaveList(stxList().filter(function(s){return s.id!==id;}));toast('Statut supprimé de ta liste. Les éléments qui l’ont le gardent.');render();return true;}
  if(act==='stx-up'||act==='stx-down'){
    var a=stxList().slice(), i=a.findIndex(function(s){return s.id===id;}), j=act==='stx-up'?i-1:i+1;
    if(i>=0&&j>=0&&j<a.length){var x=a[i];a[i]=a[j];a[j]=x;stxSaveList(a);}render();return true;
  }
  return false;
}
/* Entrée dans un champ « nouveau statut » */
function stxEnter(kind,el,v){
  if(kind==='stx'){
    var c=S.stxNew?S.stxNew.c:0, s=stxCreate(v,c);
    stxApply(el.dataset.k==='p'?'p':'t',el.dataset.id,s);
    S.stxNew=null;render();return true;
  }
  if(kind==='stxset'){stxCreate(v,stxList().length%6);S.focus=el.id;render();return true;}
  return false;
}
/* Réglages → Statuts */
function stxSettings(){
  var l=stxList(), n=l.length;
  var h='<section class="panel scard"><h2>'+ic('star')+'Statuts</h2><p class="hint">Tes statuts à toi, pour les tâches et les projets (ex. « En attente du client », « À valider »). Clique sur la pastille pour changer la couleur.</p><ul class="stxlist">';
  l.forEach(function(s,i){
    var id=esc(s.id);
    h+='<li><button class="sw" style="--sc:var(--h'+((Number(s.c)||0)%6)+')" data-act="stx-color" data-id="'+id+'" aria-label="Changer la couleur"></button>'
      +'<label class="sr" for="stxs-'+id+'">Nom du statut</label><input class="in sm grow" id="stxs-'+id+'" value="'+esc(s.n)+'" data-draft data-change="stxname" data-id="'+id+'" autocomplete="off">'
      +'<button class="ib sm" data-act="stx-up" data-id="'+id+'" aria-label="Monter"'+(i===0?' disabled':'')+'>'+ic('up')+'</button><button class="ib sm" data-act="stx-down" data-id="'+id+'" aria-label="Descendre"'+(i===n-1?' disabled':'')+'>'+ic('down')+'</button>'
      +'<button class="ib sm dng" data-act="stx-del" data-id="'+id+'" aria-label="Supprimer le statut">'+ic('trash')+'</button></li>';
  });
  h+='</ul><label class="sr" for="stxadd">Nouveau statut</label><input class="in sm" id="stxadd" data-draft data-add="stxset" placeholder="+ Nouveau statut, puis Entrée" autocomplete="off"></section>';
  return h;
}
