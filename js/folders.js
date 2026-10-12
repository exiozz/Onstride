/* On Stride — dossiers du Bazar : pour ranger les tâches notées en vrac avant de les mettre dans un projet.
   La liste des dossiers est dans les réglages du compte (S.cfg.folders, visible par toi seul) ;
   chaque tâche du Bazar garde l'identifiant de son dossier (t.folder). */
'use strict';

var FOLD={cur:LS.get('bzf',''),add:false,ren:null,confirm:null};
function folders(){return Array.isArray(S.cfg&&S.cfg.folders)?S.cfg.folders.filter(function(f){return f&&f.id;}):[];}
function folderById(id){return folders().find(function(f){return f.id===id;})||null;}
function folderOf(t){return t&&t.folder&&folderById(t.folder)?t.folder:'';}
function folderCur(){var c=FOLD.cur;return c==='_none'||folderById(c)?c:'';}
function folderSet(c){FOLD.cur=c;LS.set('bzf',c);}
function foldersSave(list){return saveCfg({folders:list.map(function(f){return {id:f.id,name:f.name,c:f.c||0};})});}

/* ---------- barre des dossiers, en haut du Bazar ---------- */
function folderBar(open){
  var cur=folderCur(), fs=folders();
  function n(id){return open.filter(function(t){return id==='_none'?!folderOf(t):folderOf(t)===id;}).length;}
  var h='<div class="fbar-f" role="group" aria-label="Dossiers"><button class="fold'+(cur===''?' on':'')+'" data-act="fold-go" data-id="" aria-pressed="'+(cur==='')+'">'+ic('box')+'Tout<span class="cnt">'+open.length+'</span></button>';
  fs.forEach(function(f){
    var id=esc(f.id), on=cur===f.id;
    if(FOLD.ren===f.id){
      h+='<span class="fold on edit" style="--fc:var(--h'+((f.c||0)%6)+')">'+ic('folder')+'<label class="sr" for="fren">Nom du dossier</label><input id="fren" class="fold-in" value="'+esc(f.name)+'" data-draft data-add="fold-ren" data-id="'+id+'" data-change="foldren" autocomplete="off"></span>';
      return;
    }
    h+='<button class="fold'+(on?' on':'')+'" style="--fc:var(--h'+((f.c||0)%6)+')" data-act="fold-go" data-id="'+id+'" data-fold="'+id+'" aria-pressed="'+on+'">'+ic('folder')+esc(f.name)+'<span class="cnt">'+n(f.id)+'</span></button>';
  });
  if(fs.length)h+='<button class="fold'+(cur==='_none'?' on':'')+'" data-act="fold-go" data-id="_none" data-fold="_none" aria-pressed="'+(cur==='_none')+'"><span class="mut">Sans dossier</span><span class="cnt">'+n('_none')+'</span></button>';
  if(FOLD.add)h+='<span class="fold edit">'+ic('folder')+'<label class="sr" for="fnew">Nom du nouveau dossier</label><input id="fnew" class="fold-in" data-draft data-add="fold-new" placeholder="Nom du dossier" autocomplete="off"></span><button class="ib sm" data-act="fold-cancel" aria-label="Annuler">'+ic('x')+'</button>';
  else h+='<button class="fold add" data-act="fold-add">'+ic('plus')+'Dossier</button>';
  h+='</div>';
  var f=folderById(cur);
  if(f){
    h+='<div class="fold-tools"><span class="swatches" role="group" aria-label="Couleur du dossier">'+[0,1,2,3,4,5].map(function(i){return '<button class="sw" style="--sc:var(--h'+i+')" data-act="fold-color" data-id="'+i+'" aria-pressed="'+(((f.c||0)%6)===i)+'" aria-label="'+COLORS[i]+'"></button>';}).join('')+'</span>'
      +'<button class="btn quiet sm" data-act="fold-ren">'+ic('note')+'Renommer</button>'
      +(FOLD.confirm===f.id?'<span class="cnt">Les tâches restent dans le Bazar, sans dossier.</span><button class="btn danger sm" data-act="fold-del">Supprimer le dossier</button><button class="btn sm" data-act="fold-keep">Annuler</button>':'<button class="btn quiet sm" data-act="fold-del">'+ic('trash')+'Supprimer</button>')+'</div>';
  }
  return h;
}
/* liste du Bazar filtrée par le dossier choisi */
function folderFilter(list){
  var cur=folderCur(); if(!cur)return list;
  return list.filter(function(t){return cur==='_none'?!folderOf(t):folderOf(t)===cur;});
}
/* menu « dossier » d'une ligne et du panneau */
function folderSelect(t,cls){
  var fs=folders(); if(!fs.length)return '';
  var o={'':T('Sans dossier')}; fs.forEach(function(f){o[f.id]=f.name;});
  return selH('tf-'+esc(t.id),'tfolder',esc(t.id),o,folderOf(t),cls||'in sm',' aria-label="'+nt(T('Dossier'))+'"');
}
function folderProp(t){
  if(t.projectId||!folders().length)return '';
  return prop(ic('folder')+'Dossier',folderSelect(t,'pv'),'tf-'+esc(t.id));
}

/* ---------- écritures ---------- */
function folderMove(tid,fid){
  var t=taskById(tid); if(!t||t.projectId)return;
  fid=fid&&folderById(fid)?fid:'';
  if(folderOf(t)===fid)return;
  var f=folderById(fid);
  run(function(){return tdoc(tid).update({folder:fid,act:actOf(t,f?'Rangée dans le dossier « '+f.name+' »':'Sortie de son dossier')});});
  toast(f?'Rangée dans « '+f.name+' ».':'Sortie de son dossier.');
}
function folderNew(name){
  name=String(name||'').replace(/\s+/g,' ').trim().slice(0,40); if(!name)return;
  var fs=folders(), f={id:'f'+rnd(),name:name,c:fs.length%6};
  foldersSave(fs.concat([f]));FOLD.add=false;folderSet(f.id);
}
function folderRename(id,name){
  name=String(name||'').replace(/\s+/g,' ').trim().slice(0,40);
  FOLD.ren=null; if(!name)return;
  foldersSave(folders().map(function(f){return f.id===id?{id:f.id,name:name,c:f.c}:f;}));
}
function folderDelete(id){
  var f=folderById(id); if(!f)return;
  var ts=S.tasks.filter(function(t){return !t.projectId&&t.folder===id;});
  FOLD.confirm=null;folderSet('');
  foldersSave(folders().filter(function(x){return x.id!==id;}));
  run(function(){var ch=Promise.resolve();ts.forEach(function(t){ch=ch.then(function(){return tdoc(t.id).update({folder:''});});});return ch;});
  toast(tf(ts.length>1?'Dossier « {0} » supprimé : ses {1} tâches restent dans le Bazar.':'Dossier « {0} » supprimé.',f.name,ts.length));
}

/* ---------- branchements ---------- */
function folderClick(act,id){
  if(act.indexOf('fold-')!==0)return false;
  if(act==='fold-go'){folderSet(id);FOLD.confirm=null;FOLD.ren=null;render();return true;}
  if(!S.canEdit){render();return true;}
  if(act==='fold-add'){FOLD.add=true;FOLD.ren=null;S.focus='fnew';render();return true;}
  if(act==='fold-cancel'){FOLD.add=false;render();return true;}
  var cur=folderById(folderCur());
  if(act==='fold-ren'&&cur){FOLD.ren=cur.id;S.focus='fren';render();return true;}
  if(act==='fold-color'&&cur){foldersSave(folders().map(function(f){return f.id===cur.id?{id:f.id,name:f.name,c:parseInt(id,10)||0}:f;}));render();return true;}
  if(act==='fold-keep'){FOLD.confirm=null;render();return true;}
  if(act==='fold-del'&&cur){if(FOLD.confirm===cur.id)folderDelete(cur.id);else FOLD.confirm=cur.id;render();return true;}
  render();return true;
}
function folderChange(k,id,v,el){
  if(k==='tfolder'){if(S.canEdit)folderMove(id,v);render();return true;}
  if(k==='foldren'){if(S.painting||!el.isConnected)return true;if(FOLD.ren===id)folderRename(id,v);render();return true;}
  return false;
}
function folderEnter(kind,el,v){
  if(kind==='fold-new'){folderNew(v);render();return true;}
  if(kind==='fold-ren'){folderRename(el.dataset.id,v);render();return true;}
  return false;
}
/* glisser une tâche du Bazar sur un dossier */
document.body.addEventListener('dragover',function(ev){
  if(typeof drag==='undefined'||drag.kind!=='bz'||!drag.id)return;
  var tg=ev.target.closest&&ev.target.closest('[data-fold]'); if(!tg)return;
  ev.preventDefault();
  document.querySelectorAll('.fold.over').forEach(function(x){if(x!==tg)x.classList.remove('over');});
  tg.classList.add('over');
});
document.body.addEventListener('drop',function(ev){
  if(typeof drag==='undefined'||drag.kind!=='bz'||!drag.id)return;
  var tg=ev.target.closest&&ev.target.closest('[data-fold]'), id=drag.id;
  document.querySelectorAll('.fold.over').forEach(function(x){x.classList.remove('over');});
  if(!tg)return;
  ev.preventDefault();
  folderMove(id,tg.dataset.fold==='_none'?'':tg.dataset.fold);
});
document.body.addEventListener('dragend',function(){document.querySelectorAll('.fold.over').forEach(function(x){x.classList.remove('over');});});
