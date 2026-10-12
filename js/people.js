/* On Stride — plusieurs personnes par carte et par projet.
   Carte : t.whos (liste de noms) ; t.who garde les mêmes noms séparés par des virgules,
   pour la recherche, l'export et les anciennes versions. Projet : p.people (responsables du projet). */
'use strict';

var WHO_MAX=12;
function splitNames(s){return String(s||'').split(/\s*[,;]\s*/).map(function(x){return x.replace(/\s+/g,' ').trim().slice(0,60);}).filter(Boolean);}
function whoList(t){return Array.isArray(t&&t.whos)?t.whos.filter(Boolean):splitNames(t&&t.who);}
function peopleOf(p){return Array.isArray(p&&p.people)?p.people.filter(Boolean):[];}
/* ajoute sans doublon (sans tenir compte des majuscules et des accents) */
function addNames(list,names){
  var out=list.slice(), seen={};
  out.forEach(function(n){seen[norm(n)]=1;});
  names.forEach(function(n){if(!seen[norm(n)]&&out.length<WHO_MAX){seen[norm(n)]=1;out.push(n);}});
  return out;
}
/* est-ce que cette carte me concerne ? (pas de personne = tout le monde) */
function whoIsMe(n){var x=norm(n), me=norm(myName());return (me&&x===me)||(S.me&&x===norm(S.me.email))||(S.me&&S.me.name&&x===norm(S.me.name));}
function mineWho(t){var l=whoList(t);return !l.length||(!myName()&&!S.me)||l.some(whoIsMe);}

/* noms proposés : moi, les responsables et invités du projet, les noms déjà utilisés dans le projet */
function whoSuggest(pid){
  var out=[], seen={};
  function add(n){n=String(n||'').trim();if(n&&!seen[norm(n)]){seen[norm(n)]=1;out.push(n);}}
  add(myName());
  var p=pid?projById(pid):null;
  if(p)peopleOf(p).forEach(add);
  if(pid)membersOf(pid).forEach(function(m){add(m.email);});
  S.tasks.forEach(function(t){if(!pid||t.projectId===pid)whoList(t).forEach(add);});
  return out.slice(0,40);
}
/* pastilles en lecture : quelques noms puis « +n » */
function whoChips(list,max){
  if(!list.length)return '';
  max=max||2;
  var h=list.slice(0,max).map(function(n){return '<span class="bd who" title="'+esc(n)+'">'+esc(n)+'</span>';}).join('');
  if(list.length>max)h+='<span class="bd who more" title="'+esc(list.slice(max).join(', '))+'">+'+(list.length-max)+'</span>';
  return h;
}
/* éditeur : pastilles avec croix + champ pour ajouter (Entrée ou virgule) */
function whoEditor(kind,id,list,pid,ph){
  var fid=(kind==='p'?'mpp-':'mw-')+id, lid='wl-'+fid;
  var h='<div class="whos">'+list.map(function(n,i){return '<span class="bd who wchip">'+esc(n)+'<button data-act="who-del" data-k="'+kind+'" data-id="'+id+'" data-item="'+i+'" aria-label="'+tf('Retirer {0}',esc(n))+'">'+ic('x')+'</button></span>';}).join('');
  h+='<input class="pv who-in" id="'+fid+'" list="'+lid+'" data-draft data-add="who" data-k="'+kind+'" data-id="'+id+'" data-change="whoadd" placeholder="'+(list.length?'+ Ajouter':(ph||'Ajouter une personne'))+'" autocomplete="off" aria-label="'+(kind==='p'?'Ajouter un responsable':'Ajouter une personne')+'">';
  var sug=whoSuggest(pid).filter(function(n){return !list.some(function(x){return norm(x)===norm(n);});});
  h+='<datalist id="'+lid+'">'+sug.map(function(n){return '<option value="'+escRaw(n)+'">';}).join('')+'</datalist></div>';
  return h;
}

/* ---------- écritures ---------- */
function whoAdd(kind,id,text){
  var names=splitNames(text); if(!names.length)return;
  if(kind==='p'){
    var p=projById(id); if(!p)return;
    var pl=addNames(peopleOf(p),names); if(pl.length===peopleOf(p).length)return;
    run(function(){return pdoc(id).update({people:pl});});
    return;
  }
  var t=taskById(id); if(!t)return;
  var cur=whoList(t), l=addNames(cur,names), added=l.slice(cur.length);
  if(!added.length){if(cur.length>=WHO_MAX)toast(tf('{0} personnes au maximum par carte.',WHO_MAX),{bad:true});return;}
  run(function(){return tdoc(id).update({whos:l,who:l.join(', '),act:actOf(t,'Assignée à '+added.join(', '))});});
}
function whoDel(kind,id,i){
  if(kind==='p'){
    var p=projById(id); if(!p)return;
    var pl=peopleOf(p).slice(); pl.splice(i,1);
    run(function(){return pdoc(id).update({people:pl});});
    return;
  }
  var t=taskById(id); if(!t)return;
  var l=whoList(t).slice(), gone=l.splice(i,1)[0];
  if(gone==null)return;
  run(function(){return tdoc(id).update({whos:l,who:l.join(', '),act:actOf(t,l.length?'Plus assignée à '+gone:'Plus assignée')});});
}
function peopleClick(act,id,b){
  if(act!=='who-del')return false;
  var k=b.dataset.k==='p'?'p':'t', i=parseInt(b.dataset.item,10)||0, by=index();
  var ok=k==='p'?!!(by[id]&&by[id].rw):(function(){var t=taskById(id);return !!t&&canW(t.projectId?by[t.projectId]||{rw:false}:null);})();
  if(ok&&S.canEdit)whoDel(k,id,i);
  render();return true;
}
/* la virgule valide aussi un nom pendant qu'on tape */
document.body.addEventListener('input',function(ev){
  var el=ev.target;
  if(!el||!el.classList||!el.classList.contains('who-in')||el.value.indexOf(',')<0)return;
  var parts=el.value.split(','), rest=parts.pop();
  if(parts.join(',').trim())whoAdd(el.dataset.k==='p'?'p':'t',el.dataset.id,parts.join(','));
  el.value=rest;delete S.dirty[el.id];
});
