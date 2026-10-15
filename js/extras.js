/* On Stride — les plus : tableau blanc à blocs reliés, chrono et rentabilité, point client.
   Rien à ajouter dans la base : le tableau blanc vit dans le projet (p.wb), le temps passé dans les
   infos privées du projet (meta.time), le chrono en cours dans les réglages (cfg.timer). */
'use strict';

/* =====================================================================
   1. TABLEAU BLANC : des blocs que l'on pose, déplace et relie entre eux
   ===================================================================== */
var WB_W=232, WB_SY=19;   /* largeur d'un bloc ; hauteur des points d'accroche depuis le haut du bloc */
var WB={sel:null,drag:null,live:null,views:LS.get('wbv',{}),saveT:0};

function wbData(p){
  var w=p&&p.wb||{};
  var d={n:(w.n||[]).map(function(x){return Object.assign({},x);}),l:(w.l||[]).map(function(x){return Object.assign({},x);}),h:(w.h||[]).slice()};
  if(!p||!p.id)return d;
  /* les cartes à faire qui ne sont pas encore posées apparaissent d'office, rangées par colonne sous ce qui existe déjà.
     Elles sont enregistrées à la première modification du tableau ; une carte retirée à la main (d.h) ne revient pas. */
  var used={}, hid={}, top=0, col={}, n=0, cols=colsOf(p), count={};
  d.n.forEach(function(x){if(x.task)used[x.task]=1;top=Math.max(top,(Number(x.y)||0)+200);});
  d.h.forEach(function(id){hid[id]=1;});
  cols.forEach(function(c){if(!c.done)col[c.id]=n++;});
  S.tasks.filter(function(t){return t.projectId===p.id&&!used[t.id]&&!hid[t.id];}).sort(cmpPos).forEach(function(t){
    var cid=t.columnId||t.status; if(!cols.some(function(c){return c.id===cid;}))cid=cols[0].id;
    if(col[cid]==null)return;   /* carte terminée : on ne l'impose pas */
    var k=count[cid]||0; count[cid]=k+1;
    d.n.push({id:'a'+t.id,x:col[cid]*(WB_W+56),y:top+k*168,c:p.hue||0,task:t.id});
  });
  return d;
}
function wbView(pid){
  var v=WB.views[pid];
  if(!v||!(v.z>0))v=WB.views[pid]={x:40,y:70,z:1};
  return v;
}
function wbKeepView(){clearTimeout(WB.saveT);WB.saveT=setTimeout(function(){LS.set('wbv',WB.views);},400);}
/* l'écriture est appliquée à l'écran tout de suite (avant le prochain rendu), puis suivie par l'indicateur d'enregistrement */
function wbRun(pr){return run(function(){return pr;});}
function wbSave(pid,wb){return wbRun(pdoc(pid).update({wb:{n:wb.n,l:wb.l,h:wb.h||[]}}));}
function wbPos(n){
  var l=WB.live;
  return l&&l.id===n.id?{x:l.x,y:l.y}:{x:Number(n.x)||0,y:Number(n.y)||0};
}
function wbPath(x1,y1,x2,y2){
  var d=Math.max(46,Math.abs(x2-x1)/2);
  return 'M'+x1+' '+y1+' C'+(x1+d)+' '+y1+' '+(x2-d)+' '+y2+' '+x2+' '+y2;
}
function wbLinkPath(a,b){var p=wbPos(a), q=wbPos(b);return wbPath(p.x+WB_W,p.y+WB_SY,q.x,q.y+WB_SY);}
/* cartes qui en attendent une autre : un lien A → B entre deux cartes veut dire « A d'abord, puis B » */
function wbBlockers(wb,e){
  var byId={}, out={};
  wb.n.forEach(function(n){byId[n.id]=n;});
  wb.l.forEach(function(l){
    var a=byId[l.a], b=byId[l.b]; if(!a||!b||!a.task||!b.task)return;
    var ta=taskById(a.task); if(!ta||ta.projectId!==e.p.id||isDone(ta,e))return;
    (out[b.id]=out[b.id]||[]).push(ta);
  });
  return out;
}
function vWb(e){
  var p=e.p, ed=canW(e), wb=wbData(p), v=wbView(p.id), sel=WB.sel, blk=wbBlockers(wb,e), byId={};
  wb.n.forEach(function(n){byId[n.id]=n;});
  var seln=sel&&sel.k==='n'?byId[sel.id]:null, sell=sel&&sel.k==='l'?wb.l.find(function(l){return l.id===sel.id;}):null;
  var h='<div class="wbwrap"><div class="wb" id="wb" data-pid="'+esc(p.id)+'" data-ed="'+(ed?1:0)+'" style="--c:'+hue(p)+';background-position:'+v.x+'px '+v.y+'px;background-size:'+(24*v.z)+'px '+(24*v.z)+'px">';
  h+='<div class="wb-world" id="wb-world" style="transform:translate('+v.x+'px,'+v.y+'px) scale('+v.z+')">';
  h+='<svg class="wb-links" id="wb-links" width="1" height="1" aria-hidden="true"><defs><marker id="wb-arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1.5L8.5 5L1 8.5" fill="none" stroke="context-stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';
  wb.l.forEach(function(l){
    var a=byId[l.a], b=byId[l.b]; if(!a||!b)return;
    var d=wbLinkPath(a,b), on=sell&&sell.id===l.id;
    h+='<g class="wb-l'+(on?' on':'')+'" data-link="'+esc(l.id)+'" data-a="'+esc(l.a)+'" data-b="'+esc(l.b)+'"><path class="ln" d="'+d+'" marker-end="url(#wb-arr)"/><path class="hit" d="'+d+'" data-act="wb-link" data-id="'+esc(l.id)+'"/></g>';
  });
  h+='<path class="ln tmp" id="wb-tmp" d="" hidden/></svg>';
  wb.n.forEach(function(n){
    var q=wbPos(n), id=esc(n.id), t=n.task?taskById(n.task):null, on=seln&&seln.id===n.id;
    h+='<article class="wb-node'+(on?' on':'')+(n.task?' is-task':'')+'" data-node="'+id+'" style="left:'+q.x+'px;top:'+q.y+'px;--nc:var(--h'+((Number(n.c)||0)%6)+')">';
    h+='<span class="wb-sock si" aria-hidden="true"></span>'+(ed?'<button class="wb-sock so" data-out="'+id+'" aria-label="Relier ce bloc à un autre" title="Tire vers un autre bloc pour les relier"></button>':'<span class="wb-sock so" aria-hidden="true"></span>');
    if(n.task){
      if(!t){h+='<header class="wb-h"><span class="wb-t mut">Carte supprimée</span></header>';}
      else{
        var done=isDone(t,e), late=t.due&&!done&&t.due<todayStr(), tid=esc(t.id), pr=prioOf(t), wait=blk[n.id]||[];
        h+='<header class="wb-h">'+(ed?chkBtn(t,e):'<span class="chk sm'+(done?' on':'')+'">'+CHECK+'</span>')
          +(ed?'<label class="sr" for="wbk-'+id+'">Titre de la carte</label><input class="wb-t'+(done?' struck':'')+'" id="wbk-'+id+'" value="'+esc(t.title)+'" data-draft data-change="wbk" data-id="'+tid+'" autocomplete="off">':'<span class="wb-t'+(done?' struck':'')+'">'+esc(t.title)+'</span>')+'</header>';
        h+='<div class="wb-b"><div class="bds"><span class="pill'+(done?' ok':'')+'">'+esc(colName(e,t._col))+'</span>'+(pr?'<span class="bd p'+pr+'">'+PRIO[pr]+'</span>':'')+(t.due?'<span class="bd due'+(late?' late':'')+'">'+ic('clock')+fmtDate(t.due)+'</span>':'')+whoChips(whoList(t),2)+'</div>';
        if(wait.length&&!done)h+='<p class="wb-wait">'+ic('lock')+'<span>'+tf(wait.length>1?'En attente de « {0} » et {1} de plus':'En attente de « {0} »',esc(wait[0].title),wait.length-1)+'</span></p>';
        h+='<button class="linkbtn" data-act="open" data-id="'+tid+'">Ouvrir la carte</button></div>';
      }
    }else{
      h+='<header class="wb-h">'+(ed?'<label class="sr" for="wbt-'+id+'">Titre du bloc</label><input class="wb-t" id="wbt-'+id+'" value="'+esc(n.t||'')+'" data-draft data-change="wbt" data-id="'+id+'" placeholder="Titre" autocomplete="off">':'<span class="wb-t">'+esc(n.t||'')+'</span>')+'</header>';
      h+='<div class="wb-b">'+(ed?'<label class="sr" for="wbb-'+id+'">Texte du bloc</label><textarea class="wb-x" id="wbb-'+id+'" rows="2" data-draft data-change="wbb" data-id="'+id+'" placeholder="Écris une idée, une étape, une question…">'+esc(n.b||'')+'</textarea>':(n.b?'<p class="wb-x">'+esc(n.b)+'</p>':''))+'</div>';
    }
    h+='</article>';
  });
  h+='</div>';
  /* barre d'outils */
  h+='<div class="wb-bar">';
  if(ed){
    h+='<button class="btn sm primary" data-act="wb-add">'+ic('plus')+'Bloc</button><button class="btn sm" data-act="wb-addtask">'+ic('tasks')+'Carte</button>';
    var used={}; wb.n.forEach(function(n){if(n.task)used[n.task]=1;});
    var free=e.tasks.filter(function(t){return !used[t.id];}).sort(cmpPos);
    if(free.length){
      var opts={'':T('Poser une carte…')}; free.forEach(function(t){opts[t.id]=t.title||T('Sans titre');});
      h+='<label class="sr" for="wb-pick">Poser une carte existante</label>'+selH('wb-pick','wbpick',esc(p.id),opts,'','in sm wb-pick');
    }
    if(seln){
      h+='<span class="wb-sep"></span><span class="swatches" role="group" aria-label="Couleur du bloc">'+[0,1,2,3,4,5].map(function(i){return '<button class="sw" style="--sc:var(--h'+i+')" data-act="wb-color" data-id="'+i+'" aria-pressed="'+(((Number(seln.c)||0)%6)===i?'true':'false')+'" aria-label="'+COLORS[i]+'"></button>';}).join('')+'</span>';
      if(!seln.task)h+='<button class="btn sm" data-act="wb-totask" title="Transformer ce bloc en carte du Kanban">'+ic('board')+'En faire une carte</button>';
      h+='<button class="btn sm" data-act="wb-del">'+ic('trash')+'Retirer le bloc</button>';
    }else if(sell)h+='<span class="wb-sep"></span><button class="btn sm" data-act="wb-del">'+ic('trash')+'Supprimer le lien</button>';
  }
  h+='</div><div class="wb-zoom"><button class="ib sm" data-act="wb-zoom" data-id="-1" aria-label="Dézoomer">−</button><button class="wb-pct" data-act="wb-zoom" data-id="0" title="Recentrer" aria-label="Recentrer"><span id="wb-pct">'+Math.round(v.z*100)+' %</span></button><button class="ib sm" data-act="wb-zoom" data-id="1" aria-label="Zoomer">+</button></div>';
  if(!wb.n.length)h+='<div class="wb-empty"><h3>Un tableau blanc pour y voir clair</h3><p>'+(ed?'Double-clique dans le vide pour poser un bloc. Tire depuis le point à droite d’un bloc pour le relier à un autre. Tes cartes à faire s’affichent ici toutes seules : un lien entre deux cartes indique laquelle doit être finie d’abord.':'Ce projet n’a pas encore de tableau blanc.')+'</p></div>';
  else if(ed)h+='<p class="wb-tip hide-s">Double-clic : nouveau bloc · Glisser le fond : se déplacer · Molette : zoom · Suppr : effacer la sélection</p>';
  return h+'</div></div>';
}
function wbEl(){return document.getElementById('wb');}
function wbToWorld(cx,cy){
  var el=wbEl(), r=el.getBoundingClientRect(), v=wbView(el.dataset.pid);
  return {x:(cx-r.left-v.x)/v.z,y:(cy-r.top-v.y)/v.z};
}
function wbApplyView(){
  var el=wbEl(); if(!el)return;
  var v=wbView(el.dataset.pid), w=document.getElementById('wb-world'), pc=document.getElementById('wb-pct');
  if(w)w.style.transform='translate('+v.x+'px,'+v.y+'px) scale('+v.z+')';
  el.style.backgroundPosition=v.x+'px '+v.y+'px';el.style.backgroundSize=(24*v.z)+'px '+(24*v.z)+'px';
  if(pc)pc.textContent=Math.round(v.z*100)+' %';
  wbKeepView();
}
function wbZoomAt(cx,cy,z){
  var el=wbEl(); if(!el)return;
  var r=el.getBoundingClientRect(), v=wbView(el.dataset.pid), nz=Math.max(.3,Math.min(2,z));
  var wx=(cx-r.left-v.x)/v.z, wy=(cy-r.top-v.y)/v.z;
  v.x=cx-r.left-wx*nz;v.y=cy-r.top-wy*nz;v.z=nz;
  wbApplyView();
}
function wbFit(e){
  var el=wbEl(), wb=wbData(e.p), v=wbView(e.p.id); if(!el)return;
  if(!wb.n.length){v.x=40;v.y=70;v.z=1;wbApplyView();return;}
  var r=el.getBoundingClientRect(), x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  wb.n.forEach(function(n){
    var d=document.querySelector('[data-node="'+n.id+'"]'), hh=d?d.offsetHeight:110;
    x1=Math.min(x1,n.x);y1=Math.min(y1,n.y);x2=Math.max(x2,n.x+WB_W);y2=Math.max(y2,n.y+hh);
  });
  var bar=document.querySelector('.wb-bar'), top=(bar?bar.offsetHeight:40)+26, bot=62;   /* on laisse la place de la barre d'outils et du zoom */
  var z=Math.max(.3,Math.min(1,Math.min((r.width-64)/(x2-x1),(r.height-top-bot)/(y2-y1))));
  v.z=z;v.x=(r.width-(x2-x1)*z)/2-x1*z;v.y=top+(r.height-top-bot-(y2-y1)*z)/2-y1*z;
  wbApplyView();
}
/* place libre pour un nouveau bloc : au centre de ce qu'on regarde, décalé si la place est prise */
function wbSpot(wb,at){
  var el=wbEl(), r=el.getBoundingClientRect();
  if(at)return {x:Math.round(at.x-20),y:Math.round(at.y-WB_SY)};
  /* première case libre de ce qu'on regarde, en lisant de gauche à droite puis de haut en bas */
  var a=wbToWorld(r.left+24,r.top+70), b=wbToWorld(r.right-24,r.bottom-40), GW=WB_W+44, GH=170;
  function taken(x,y){return wb.n.some(function(n){
    var d=document.querySelector('[data-node="'+n.id+'"]'), hh=(d&&d.offsetHeight)||130;
    return x<n.x+WB_W+20&&x+WB_W+20>n.x&&y<n.y+hh+20&&y+150>n.y;
  });}
  for(var i=0,y=a.y;i<60;i++,y+=GH){
    for(var x=a.x;x+WB_W<=b.x||x===a.x;x+=GW){
      if(taken(x,y))continue;
      if(y+150>b.y){var v=wbView(el.dataset.pid);v.y-=(y+170-b.y)*v.z;wbKeepView();}   /* plus de place à l'écran : on fait suivre la vue */
      return {x:Math.round(x),y:Math.round(y)};
    }
  }
  return {x:Math.round(a.x),y:Math.round(a.y)};
}
function wbAddNote(e,at){
  var wb=wbData(e.p), s=wbSpot(wb,at), n={id:'n'+rnd(),x:s.x,y:s.y,t:'',b:'',c:e.p.hue||0};
  wb.n.push(n);WB.sel={k:'n',id:n.id};S.focus='wbt-'+n.id;
  wbSave(e.p.id,wb);
}
function wbAddTaskNode(e,taskId,focus){
  var wb=wbData(e.p), s=wbSpot(wb), n={id:'n'+rnd(),x:s.x,y:s.y,c:e.p.hue||0,task:taskId};
  wb.n.push(n);WB.sel={k:'n',id:n.id};
  wb.h=(wb.h||[]).filter(function(x){return x!==taskId;});
  if(focus)S.focus='wbk-'+n.id;
  return wbSave(e.p.id,wb);
}
function wbNewTask(e,title,then){
  var ref=S.db.collection(realm(e.p.id)+'tasks').doc(), doc=newTaskDoc({projectId:e.p.id,title:title,columnId:e.cols[0].id});
  wbRun(ref.set(doc));
  then(ref.id);
}
function wbRemoveSel(e){
  var s=WB.sel; if(!s)return false;
  var wb=wbData(e.p), before=wbData(e.p);
  if(s.k==='n'){
    var gone=wb.n.find(function(n){return n.id===s.id;});
    if(gone&&gone.task&&wb.h.indexOf(gone.task)<0)wb.h.push(gone.task);
    wb.n=wb.n.filter(function(n){return n.id!==s.id;});wb.l=wb.l.filter(function(l){return l.a!==s.id&&l.b!==s.id;});
  }
  else wb.l=wb.l.filter(function(l){return l.id!==s.id;});
  WB.sel=null;
  wbSave(e.p.id,wb);
  toast(s.k==='n'?'Bloc retiré du tableau blanc.':'Lien supprimé.',{undo:function(){wbSave(e.p.id,before);}});
  return true;
}
function wbPaintLinks(wb){
  var byId={}; wb.n.forEach(function(n){byId[n.id]=n;});
  document.querySelectorAll('#wb-links [data-link]').forEach(function(g){
    var a=byId[g.getAttribute('data-a')], b=byId[g.getAttribute('data-b')]; if(!a||!b)return;
    var d=wbLinkPath(a,b);
    g.querySelectorAll('path').forEach(function(p){p.setAttribute('d',d);});
  });
}

/* gestes : déplacer un bloc, tirer un lien, déplacer la vue */
document.body.addEventListener('pointerdown',function(ev){
  var el=ev.target.closest&&ev.target.closest('#wb'); if(!el||ev.button>0)return;
  var e=curE(); if(!e)return;
  var ed=el.dataset.ed==='1', out=ev.target.closest('[data-out]'), node=ev.target.closest('[data-node]');
  if(ev.target.closest('.wb-bar,.wb-zoom'))return;
  if(out&&ed){
    ev.preventDefault();
    WB.drag={k:'link',from:out.dataset.out,sx:ev.clientX,sy:ev.clientY};
  }else if(node){
    /* un champ déjà en cours de saisie garde son comportement normal ; sinon on peut attraper le bloc par n'importe où */
    var field=typing(ev.target)?ev.target:null;
    if(!ed||ev.target.closest('button')||(field&&document.activeElement===field))return;
    var wb=wbData(e.p), n=wb.n.find(function(x){return x.id===node.dataset.node;}); if(!n)return;
    WB.drag={k:'node',id:n.id,ox:n.x,oy:n.y,sx:ev.clientX,sy:ev.clientY,moved:false,wb:wb,field:field?field.id:''};
  }else{
    var v=wbView(el.dataset.pid);
    WB.drag={k:'pan',ox:v.x,oy:v.y,sx:ev.clientX,sy:ev.clientY,moved:false};
    el.classList.add('panning');
  }
});
window.addEventListener('pointermove',function(ev){
  var d=WB.drag; if(!d)return;
  var el=wbEl(); if(!el){WB.drag=null;WB.live=null;return;}
  var v=wbView(el.dataset.pid), dx=ev.clientX-d.sx, dy=ev.clientY-d.sy;
  if(d.k==='pan'){
    if(!d.moved&&Math.abs(dx)+Math.abs(dy)<4)return;
    d.moved=true;v.x=d.ox+dx;v.y=d.oy+dy;wbApplyView();
  }else if(d.k==='node'){
    if(!d.moved&&Math.abs(dx)+Math.abs(dy)<4)return;
    d.moved=true;
    WB.live={id:d.id,x:Math.round(d.ox+dx/v.z),y:Math.round(d.oy+dy/v.z)};
    var ne=document.querySelector('[data-node="'+d.id+'"]');
    if(ne){ne.style.left=WB.live.x+'px';ne.style.top=WB.live.y+'px';ne.classList.add('moving');}
    wbPaintLinks(d.wb);
  }else if(d.k==='link'){
    var e=curE(); if(!e)return;
    var a=wbData(e.p).n.find(function(x){return x.id===d.from;}), tmp=document.getElementById('wb-tmp'); if(!a||!tmp)return;
    var w=wbToWorld(ev.clientX,ev.clientY);
    tmp.removeAttribute('hidden');tmp.setAttribute('d',wbPath(a.x+WB_W,a.y+WB_SY,w.x,w.y));
    var over=document.elementFromPoint(ev.clientX,ev.clientY), tn=over&&over.closest?over.closest('[data-node]'):null;
    document.querySelectorAll('.wb-node.target').forEach(function(x){if(x!==tn)x.classList.remove('target');});
    if(tn&&tn.dataset.node!==d.from)tn.classList.add('target');
  }
});
function wbEndDrag(ev){
  var d=WB.drag; if(!d)return;
  WB.drag=null;
  var el=wbEl(), e=curE();
  if(el)el.classList.remove('panning');
  if(!el||!e){WB.live=null;return;}
  if(d.k==='pan'){
    if(!d.moved&&WB.sel){WB.sel=null;render();}
    return;
  }
  if(d.k==='node'){
    var live=WB.live; WB.live=null;
    if(d.moved&&live){
      var wb=wbData(e.p), n=wb.n.find(function(x){return x.id===d.id;});
      if(n){n.x=live.x;n.y=live.y;wbSave(e.p.id,wb);}
    }
    if(!d.moved&&d.field)S.focus=d.field;   /* simple clic sur un champ : on y écrit */
    if(!WB.sel||WB.sel.id!==d.id||S.focus){WB.sel={k:'n',id:d.id};render();}
    return;
  }
  if(d.k==='link'){
    var over=ev&&ev.clientX!=null?document.elementFromPoint(ev.clientX,ev.clientY):null, tn=over&&over.closest?over.closest('[data-node]'):null, to=tn?tn.dataset.node:null;
    var w2=wbData(e.p);
    if(to&&to!==d.from&&!w2.l.some(function(l){return (l.a===d.from&&l.b===to)||(l.a===to&&l.b===d.from);})){
      var l={id:'l'+rnd(),a:d.from,b:to};
      w2.l.push(l);WB.sel={k:'l',id:l.id};wbSave(e.p.id,w2);
    }
    render();
  }
}
window.addEventListener('pointerup',wbEndDrag);
window.addEventListener('pointercancel',function(){var d=WB.drag;WB.drag=null;WB.live=null;if(d)render();});
/* empêche le champ de prendre la main dès l'appui : on ne sait pas encore si c'est un clic ou un déplacement */
document.body.addEventListener('mousedown',function(ev){
  var d=WB.drag;
  if(d&&d.k==='node'&&d.field&&ev.target&&ev.target.id===d.field)ev.preventDefault();
},true);
document.body.addEventListener('dblclick',function(ev){
  var el=ev.target.closest&&ev.target.closest('#wb'); if(!el||el.dataset.ed!=='1')return;
  if(ev.target.closest('[data-node],.wb-bar,.wb-zoom,[data-act]'))return;
  var e=curE(); if(!e)return;
  wbAddNote(e,wbToWorld(ev.clientX,ev.clientY));
});
document.body.addEventListener('wheel',function(ev){
  var el=ev.target.closest&&ev.target.closest('#wb'); if(!el)return;
  if(ev.target.closest('textarea')&&!ev.ctrlKey)return;   /* laisser défiler un long texte */
  ev.preventDefault();
  var v=wbView(el.dataset.pid);
  if(ev.shiftKey){v.x-=ev.deltaY;wbApplyView();return;}
  wbZoomAt(ev.clientX,ev.clientY,v.z*Math.exp(-ev.deltaY*(ev.ctrlKey?.01:.0016)));
},{passive:false});

/* =====================================================================
   2. CHRONO ET RENTABILITÉ : le temps passé reste privé (visible par toi seul)
   ===================================================================== */
var TIMER_MAX=12*3600000;   /* un chrono oublié ne compte pas plus de 12 h */
function timerOn(){var t=S.cfg&&S.cfg.timer;return t&&t.task&&t.at?t:null;}
function timeSaved(pid,tid){var m=metaOf(pid).time||{};return Number(m[tid])||0;}
function timeLive(t){var r=timerOn();return timeSaved(t.projectId,t.id)+(r&&r.task===t.id?Math.min(TIMER_MAX,Math.max(0,Date.now()-r.at)):0);}
function projectTime(e){
  var m=metaOf(e.p.id).time||{}, r=timerOn(), tot=0;
  Object.keys(m).forEach(function(k){tot+=Number(m[k])||0;});
  if(r&&r.pid===e.p.id)tot+=Math.min(TIMER_MAX,Math.max(0,Date.now()-r.at));
  return tot;
}
function fmtClock(ms){var s=Math.floor(ms/1000);return Math.floor(s/3600)+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60);}
function fmtDur(ms){
  var m=Math.round(ms/60000), h=Math.floor(m/60);
  if(!m)return '0 min';
  return h?h+' h'+(m%60?' '+pad(m%60):''):m+' min';
}
function timerStop(){
  var r=timerOn(); if(!r)return Promise.resolve();
  var raw=Date.now()-r.at, el=Math.min(TIMER_MAX,Math.max(0,raw));
  var time=Object.assign({},metaOf(r.pid).time||{}); time[r.task]=(Number(time[r.task])||0)+el;
  if(raw>TIMER_MAX)toast('Chrono resté ouvert longtemps : compté 12 h au maximum. Ajuste si besoin.');
  saveCfg({timer:null});
  return projById(r.pid)?setMeta(r.pid,{time:time}):Promise.resolve();
}
function timerStart(t){
  var r=timerOn();
  return Promise.resolve(r?timerStop():null).then(function(){return saveCfg({timer:{task:t.id,pid:t.projectId,at:Date.now()}});});
}
function timerAdjust(t,delta){
  var time=Object.assign({},metaOf(t.projectId).time||{});
  time[t.id]=Math.max(0,(Number(time[t.id])||0)+delta);
  return setMeta(t.projectId,{time:time});
}
function timerHtml(t,e){
  if(!e||!e.own||!S.canEdit)return '';
  var r=timerOn(), on=r&&r.task===t.id, ms=timeLive(t), id=esc(t.id);
  return '<section class="tp-s tm'+(on?' on':'')+'"><h4>'+ic('clock')+'Temps passé<span class="cnt">Visible par toi seul</span></h4><div class="tm-row"><span class="tm-v"'+(on?' data-tick="'+id+'"':'')+'>'+nt(on?fmtClock(ms):fmtDur(ms))+'</span>'
    +(on?'<button class="btn sm danger" data-act="timer-stop">'+ic('stop')+'Arrêter</button>':'<button class="btn sm primary" data-act="timer-start" data-id="'+id+'">'+ic('play')+'Démarrer</button>')
    +'<span class="grow"></span><button class="btn sm quiet" data-act="timer-adj" data-id="'+id+'" data-v="-15" aria-label="Retirer 15 minutes"'+(ms<60000||on?' disabled':'')+'>−15 min</button><button class="btn sm quiet" data-act="timer-adj" data-id="'+id+'" data-v="15" aria-label="Ajouter 15 minutes"'+(on?' disabled':'')+'>+15 min</button></div></section>';
}
/* lignes ajoutées au bloc « Privé » du projet */
function timeProps(e,m){
  var ms=projectTime(e), amount=Number(m.amount)||0, hrs=ms/3600000;
  var h=prop('Temps passé','<span class="val" data-ptick="'+esc(e.p.id)+'">'+nt(fmtDur(ms))+'</span>');
  h+=prop('Taux horaire réel',plan().rate?'<span class="val">'+(amount&&hrs>=.05?nt(eur(amount/hrs)+' / h'):'<span class="mut">—</span>')+'</span>':'<span class="val"><button class="pbadge" data-act="upsell" data-id="rate" title="Voir ce que ce projet te rapporte vraiment par heure">'+ic('lock')+'Pro</button></span>');
  return h;
}
function timerChip(){
  var box=document.getElementById('tchip');
  if(!box){box=document.createElement('div');box.id='tchip';box.className='tchip';document.body.appendChild(box);}
  var r=S.auth==='in'?timerOn():null, t=r?taskById(r.task):null;
  if(!r||!t||S.task===t.id){if(box._k){box.innerHTML='';box._k='';}box.hidden=true;return;}
  box.hidden=false;
  var k=t.id+'|'+t.title+'|'+LANG;
  if(box._k!==k){
    box._k=k;
    box.innerHTML=tr('<button class="tc-open" data-act="open" data-id="'+esc(t.id)+'" title="Ouvrir la carte"><i class="tc-dot"></i><b data-tick="'+esc(t.id)+'"></b><span class="nm">'+esc(t.title)+'</span></button><button class="ib sm" data-act="timer-stop" aria-label="Arrêter le chrono" title="Arrêter le chrono">'+ic('stop')+'</button>');
  }
  timerTick();
}
function timerTick(){
  var r=timerOn(); if(!r)return;
  var t=taskById(r.task); if(!t)return;
  var txt=fmtClock(timeLive(t));
  document.querySelectorAll('[data-tick]').forEach(function(el){if(el.textContent!==txt)el.textContent=txt;});
}
setInterval(timerTick,1000);

/* =====================================================================
   3. POINT CLIENT : un message d'avancement prêt à envoyer
   ===================================================================== */
function reportText(e){
  var p=e.p, cl=clientOf(p), m=metaOf(p.id), since=Number(m.reportAt)||(Date.now()-14*86400000), today=todayStr();
  function bul(ts){return ts.map(function(t){return '• '+(t.title||T('Sans titre'))+(t.due&&!isDone(t,e)?' ('+unmark(fmtDate(t.due))+')':'');}).join('\n');}
  var done=e.tasks.filter(function(t){return isDone(t,e)&&(Number(t.doneAt)||0)>since;}).sort(function(a,b){return (a.doneAt||0)-(b.doneAt||0);});
  var first=e.cols[0].id;
  var doing=e.tasks.filter(function(t){return !isDone(t,e)&&t._col!==first;}).sort(cmpPos);
  var next=e.tasks.filter(function(t){return !isDone(t,e)&&t._col===first;}).sort(function(a,b){return (prioOf(b)-prioOf(a))||((a.due||'9999')<(b.due||'9999')?-1:1)||cmpPos(a,b);}).slice(0,5);
  var late=e.tasks.filter(function(t){return !isDone(t,e)&&t.due&&t.due<today;});
  var who=cl?String(cl.name||'').trim().split(' ')[0]:'';
  var L=[unmark(who?tf('Bonjour {0},',who):T('Bonjour,')),''];
  L.push(unmark(tf('Voici où en est « {0} » : {1} % terminé ({2} sur {3}).',p.name,e.pct,e.done,e.total)));
  if(p.deadline)L.push(unmark(tf('Échéance prévue : {0}.',unmark(fmtDate(p.deadline)).replace(/\.$/,''))));
  if(done.length){L.push('',unmark(T(m.reportAt?'Terminé depuis le dernier point :':'Terminé ces deux dernières semaines :')),bul(done));}
  if(doing.length){L.push('',unmark(T('En cours :')),bul(doing));}
  if(next.length){L.push('',unmark(T('Prochaines étapes :')),bul(next));}
  if(late.length)L.push('',unmark(tf(late.length>1?'À noter : {0} points ont pris du retard, je m’en occupe en priorité.':'À noter : un point a pris du retard, je m’en occupe en priorité.',late.length)));
  if(!done.length&&!doing.length&&!next.length)L.push('',unmark(T('Rien de nouveau à signaler pour le moment.')));
  L.push('',unmark(T('N’hésite pas si tu as des questions.')),'',unmark(T('Bonne journée,')),myName()||'');
  return L.join('\n').replace(/\n+$/,'');
}
function reportHtml(by){
  var e=by[S.report]; if(!e){S.report=null;return '';}
  var cl=clientOf(e.p), m=metaOf(e.p.id), mail=cl&&validEmail(String(cl.email||'').trim())?String(cl.email).trim():'';
  if(S.repKind==='pay')return '<div class="ov top" data-act="ov-bg"><div class="rep" role="dialog" aria-labelledby="rep-t"><header><h2 id="rep-t">Relance de paiement</h2><button class="ib" data-act="ov-close" aria-label="Fermer">'+ic('x')+'</button></header>'
    +'<p class="hint">'+(m.remindAt?tf('Dernière relance {0}.',T(ago(Number(m.remindAt))))+' ':'')+'Un message poli à partir du montant et de l’encaissé du projet. Relis-le avant de l’envoyer.</p>'
    +'<label class="sr" for="rep-txt">Message</label><textarea class="area rep-x" id="rep-txt" data-draft>'+esc(payText(e))+'</textarea>'
    +'<footer>'+(mail?'<button class="btn" data-act="report-mail" data-id="'+esc(mail)+'">'+ic('msg')+'Ouvrir dans ma messagerie</button>':'<span class="hint grow">Ajoute l’e-mail du client dans sa fiche pour l’envoyer en un clic.</span>')+'<span class="grow"></span><button class="btn primary" data-act="report-copy">'+ic('copy')+'Copier</button></footer></div></div>';
  return '<div class="ov top" data-act="ov-bg"><div class="rep" role="dialog" aria-labelledby="rep-t"><header><h2 id="rep-t">Point client</h2><button class="ib" data-act="ov-close" aria-label="Fermer">'+ic('x')+'</button></header>'
    +'<p class="hint">'+(m.reportAt?tf('Dernier point envoyé {0}. Ce message reprend ce qui a bougé depuis.',T(ago(Number(m.reportAt)))):'Un message écrit à partir de tes cartes. Relis-le, ajuste-le, puis envoie-le.')+'</p>'
    +'<label class="sr" for="rep-txt">Message</label><textarea class="area rep-x" id="rep-txt" data-draft>'+esc(reportText(e))+'</textarea>'
    +'<footer>'+(mail?'<button class="btn" data-act="report-mail" data-id="'+esc(mail)+'">'+ic('msg')+'Ouvrir dans ma messagerie</button>':'<span class="hint grow">Ajoute l’e-mail du client dans sa fiche pour l’envoyer en un clic.</span>')+'<span class="grow"></span><button class="btn primary" data-act="report-copy">'+ic('copy')+'Copier</button></footer></div></div>';
}

/* =====================================================================
   Branchements : clics, saisie, clavier, après chaque rendu
   ===================================================================== */
function extraClick(act,id,b){
  if(pasteClick(act,id,b))return true;
  if(stxClick(act,id,b))return true;
  if(moreClick(act,id,b))return true;
  if(mailClick(act,id))return true;
  if(skinClick(act,id))return true;
  if(peopleClick(act,id,b))return true;
  if(folderClick(act,id))return true;
  if(keysClick(act,id))return true;
  if(quoteClick(act,id,b))return true;
  if(act.indexOf('wb-')===0){
    var e=curE(); if(!e)return true;
    if(act==='wb-zoom'){
      var n=parseInt(id,10), el=wbEl(); if(!el)return true;
      if(!n){wbFit(e);return true;}
      var r=el.getBoundingClientRect();wbZoomAt(r.left+r.width/2,r.top+r.height/2,wbView(e.p.id).z*(n>0?1.2:1/1.2));
      return true;
    }
    if(act==='wb-link'){WB.sel={k:'l',id:id};render();return true;}
    if(!canW(e))return true;
    if(act==='wb-add'){wbAddNote(e);render();return true;}
    if(act==='wb-addtask'){
      wbNewTask(e,T('Nouvelle carte'),function(tid){wbAddTaskNode(e,tid,true);});
      render();
      var nf=document.activeElement;if(nf&&nf.classList&&nf.classList.contains('wb-t')&&nf.select)nf.select();
      return true;
    }
    if(act==='wb-del'){wbRemoveSel(e);render();return true;}
    var wb=wbData(e.p), sn=WB.sel&&WB.sel.k==='n'?wb.n.find(function(x){return x.id===WB.sel.id;}):null;
    if(act==='wb-color'&&sn){sn.c=parseInt(id,10)||0;wbSave(e.p.id,wb);render();return true;}
    if(act==='wb-totask'&&sn&&!sn.task){
      var title=String(sn.t||sn.b||'').replace(/\s+/g,' ').trim().slice(0,140)||T('Nouvelle carte'), notes=sn.t?String(sn.b||''):'';
      var ref=S.db.collection(realm(e.p.id)+'tasks').doc();
      wbRun(ref.set(newTaskDoc({projectId:e.p.id,title:title,notes:notes,columnId:e.cols[0].id})));
      sn.task=ref.id;delete sn.t;delete sn.b;wbSave(e.p.id,wb);
      toast('Carte créée dans « '+e.cols[0].name+' ».');render();return true;
    }
    render();return true;
  }
  if(act==='timer-start'){var t=taskById(id);if(t&&S.canEdit)timerStart(t);render();return true;}
  if(act==='timer-stop'){timerStop();render();return true;}
  if(act==='timer-adj'){var t2=taskById(id);if(t2&&S.canEdit)timerAdjust(t2,(parseInt(b.dataset.v,10)||0)*60000);render();return true;}
  if(act==='report'){var ce=curE();if(ce&&ce.own&&S.planReady&&!plan().msgs){upsell('msgs');return true;}if(ce&&ce.own){closeOverlays();S.report=ce.p.id;S.repKind='';S.focus='rep-txt';}render();return true;}
  if(act==='report-copy'||act==='report-mail'){
    var ta=document.getElementById('rep-txt'), txt=ta?ta.value:'', pid=S.report, pr=projById(pid), pay=S.repKind==='pay';
    if(!pr)return true;
    if(act==='report-mail'){
      var subj=unmark(tf(pay?'Règlement : {0}':'Point d’avancement : {0}',pr.name));
      try{window.location.href='mailto:'+encodeURIComponent(id)+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(txt);}catch(_){}
    }else{
      var ok=function(){toast(pay?'Relance copiée. Colle-la dans ton e-mail ou ta messagerie.':'Point copié. Colle-le dans ton e-mail ou ta messagerie.');}, ko=function(){toast('Copie impossible : sélectionne le texte et copie-le à la main.',{bad:true});};
      try{navigator.clipboard.writeText(txt).then(ok,ko);}catch(_){try{ta.select();document.execCommand('copy')?ok():ko();}catch(__){ko();}}
    }
    delete S.dirty['rep-txt'];
    closeOverlays();setMeta(pid,pay?{remindAt:Date.now()}:{reportAt:Date.now()});render();return true;
  }
  return false;
}
function extraChange(k,id,v,el){
  if(clientTaskChange(k,id,v))return true;
  if(stxChange(k,id,v,el))return true;
  if(folderChange(k,id,v,el))return true;
  if(quoteChange(k,id,v,el))return true;
  if(k==='whoadd'){if(S.painting||!el.isConnected){if(el.id)S.dirty[el.id]=true;return true;}if(v.trim()){whoAdd(el.dataset.k==='p'?'p':'t',id,v);el.value='';delete S.dirty[el.id];}return true;}
  if(k==='keypick'){KEYS.pick=v;return true;}
  if(moreChange(k,id,v))return true;
  var e=curE();
  if(k==='wbpick'){if(e&&canW(e)&&v&&taskById(v))wbAddTaskNode(e,v);render();return true;}
  if(k==='wbt'||k==='wbb'||k==='wbk'){
    /* un champ remplacé pendant un rafraîchissement n'est pas une validation : le texte en cours est reporté tel quel dans le nouveau champ */
    if(S.painting||!el.isConnected){if(el.id)S.dirty[el.id]=true;return true;}
    if(!e||!canW(e))return true;
    if(k==='wbk'){v=v.replace(/\s+/g,' ').trim();if(v&&taskById(id))run(function(){return tdoc(id).update({title:v});});else render();return true;}
    var wb=wbData(e.p), n=wb.n.find(function(x){return x.id===id;}); if(!n)return true;
    if(k==='wbt')n.t=v.trim(); else n.b=v;
    wbSave(e.p.id,wb);return true;
  }
  return false;
}
function extraKey(ev){
  var key=ev.key;
  if(mailKey(ev))return true;
  if(key==='Escape'&&(FOLD.add||FOLD.ren)){FOLD.add=false;FOLD.ren=null;render();return true;}
  if(key==='Escape'&&(S.paste||S.report||S.zen)){closeOverlays();render();return true;}
  if(!document.getElementById('wb')||typing(ev.target)||S.task||S.pal||S.qa)return false;
  var e=curE(); if(!e)return false;
  if((key==='Delete'||key==='Backspace')&&WB.sel&&canW(e)){ev.preventDefault();wbRemoveSel(e);render();return true;}
  if(key==='Escape'&&WB.sel){WB.sel=null;render();return true;}
  return false;
}
/* les zones de texte des blocs grandissent avec leur contenu */
function extraAfter(){
  document.querySelectorAll('textarea.wb-x').forEach(function(el){el.style.height='auto';if(el.scrollHeight)el.style.height=Math.min(220,el.scrollHeight)+'px';});
  timerChip();
  mailAfter();
}
document.body.addEventListener('input',function(ev){
  var el=ev.target;
  if(el&&el.classList&&el.classList.contains('wb-x')){el.style.height='auto';el.style.height=Math.min(220,el.scrollHeight)+'px';}
});
