/* On Stride — petits composants : icônes, pastilles, cartes, lignes de tâche. */
'use strict';

var ICONS={
  search:'<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2L17 17"/>',
  home:'<path d="M3.5 9.3L10 3.6l6.5 5.7V16a.8.8 0 0 1-.8.8h-3.4v-4.6H7.7v4.6H4.3a.8.8 0 0 1-.8-.8z"/>',
  inbox:'<path d="M3 11l2.2-6.2h9.6L17 11v4.4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 11h4l1 2.2h4l1-2.2h4"/>',
  tasks:'<circle cx="10" cy="10" r="7"/><path d="M7 10.2l2.1 2.1 4-4.4"/>',
  calendar:'<rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/>',
  users:'<circle cx="7.5" cy="7" r="2.6"/><path d="M3 16.2c0-2.7 2-4.3 4.5-4.3s4.5 1.6 4.5 4.3"/><circle cx="13.9" cy="7.6" r="2"/><path d="M13.7 11.8c2 0 3.5 1.4 3.5 4.2"/>',
  grid:'<rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.2"/><rect x="11" y="3.5" width="5.5" height="5.5" rx="1.2"/><rect x="3.5" y="11" width="5.5" height="5.5" rx="1.2"/><rect x="11" y="11" width="5.5" height="5.5" rx="1.2"/>',
  star:'<path d="M10 3.2l2.1 4.3 4.7.6-3.4 3.3.8 4.7L10 13.9l-4.2 2.2.8-4.7-3.4-3.3 4.7-.6z"/>',
  archive:'<rect x="3" y="4" width="14" height="3.5" rx="1"/><path d="M4.5 7.5V15a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7.5M8 11h4"/>',
  settings:'<path d="M4 6h6.5M14.5 6H16M4 14h1.5M9.5 14H16"/><circle cx="12.5" cy="6" r="1.8"/><circle cx="7.5" cy="14" r="1.8"/>',
  plus:'<path d="M10 4.5v11M4.5 10h11"/>',
  chev:'<path d="M7.5 4.5L13 10l-5.5 5.5"/>',
  down:'<path d="M4.5 7.5L10 13l5.5-5.5"/>',
  up:'<path d="M4.5 12.5L10 7l5.5 5.5"/>',
  more:'<circle cx="4.5" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor" stroke="none"/>',
  eye:'<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.3"/>',
  lock:'<rect x="4.5" y="9" width="11" height="7.5" rx="1.8"/><path d="M7 9V6.8a3 3 0 0 1 6 0V9"/>',
  sidebar:'<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M8 4v12"/>',
  x:'<path d="M5 5l10 10M15 5L5 15"/>',
  check:'<path d="M4.5 10.5l3.6 3.6 7.4-8"/>',
  list:'<path d="M7.5 5.5H16M7.5 10H16M7.5 14.5H16"/><circle cx="4.2" cy="5.5" r=".9" fill="currentColor" stroke="none"/><circle cx="4.2" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="4.2" cy="14.5" r=".9" fill="currentColor" stroke="none"/>',
  board:'<rect x="3" y="4" width="4" height="12" rx="1"/><rect x="8" y="4" width="4" height="7.5" rx="1"/><rect x="13" y="4" width="4" height="10" rx="1"/>',
  table:'<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M3 8.5h14M3 12.5h14M8 8.5V16"/>',
  note:'<path d="M5 3.5h6.5L15.5 7.5V16a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M7.5 10.5h5M7.5 13.5h5"/>',
  trash:'<path d="M4 6h12M8 6V4.5h4V6M5.5 6l.7 9.5a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L14.5 6"/>',
  copy:'<rect x="7" y="7" width="9" height="9" rx="1.8"/><path d="M4 12.5V5a1 1 0 0 1 1-1h7.5"/>',
  clock:'<circle cx="10" cy="10" r="7"/><path d="M10 6v4.2l2.6 1.6"/>',
  flag:'<path d="M5 17V3.5M5 4.5h9l-1.8 3 1.8 3H5"/>',
  sun:'<circle cx="10" cy="10" r="3.2"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/>',
  moon:'<path d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5z"/>',
  monitor:'<rect x="3" y="4" width="14" height="9.5" rx="1.6"/><path d="M7.5 16.5h5M10 13.5v3"/>',
  offline:'<path d="M5.5 15h8.7a3 3 0 0 0 .6-5.9A4.8 4.8 0 0 0 6 8a3.5 3.5 0 0 0-.5 7zM3.5 3.5l13 13"/>',
  menu:'<path d="M3.5 6h13M3.5 10h13M3.5 14h13"/>',
  grip:'<circle cx="7.5" cy="5.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="5.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="7.5" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="7.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/>',
  eyeoff:'<path d="M3.5 3.5l13 13M8.2 5A8.4 8.4 0 0 1 10 4.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.4 3M12.6 14.9a7.6 7.6 0 0 1-2.6.6C5 15.500 2 10 2 10a13.600 13.600 0 0 1 3.300-3.800"/>',
  arrow:'<path d="M4 10h12M11.500 5.500L16 10l-4.500 4.500"/>',
  left:'<path d="M12.500 4.500L7 10l5.500 5.500"/>',
  msg:'<path d="M3.5 4.500h13v9H9l-3.500 3v-3h-2z"/>',
  checklist:'<rect x="3.500" y="3.500" width="13" height="13" rx="3"/><path d="M6.800 10.300l2.200 2.200 4.300-4.600"/>',
  lines:'<path d="M3.500 5.500h13M3.500 10h13M3.500 14.500h8"/>',
  bolt:'<path d="M11 2.500L4.500 11.500H10l-1 6 6.500-9H10z"/>',
  download:'<path d="M10 3.500v9M6 9l4 4 4-4M4 16.500h12"/>',
  activity:'<path d="M2.500 10.500h3.500l2-5.500 4 10 2-4.500h3.500"/>',
  folder:'<path d="M3 6a1 1 0 0 1 1-1h3.600l1.600 1.800H16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  image:'<rect x="3" y="4" width="14" height="12" rx="2"/><circle cx="7.300" cy="8.200" r="1.400"/><path d="M3.500 14l3.800-3.600 2.900 2.600 2.300-2 4 3.500"/>',
  bell:'<path d="M5.200 13.800V9.300a4.800 4.800 0 0 1 9.600 0v4.500l1.400 1.700H3.800z"/><path d="M8.300 17.200a1.900 1.900 0 0 0 3.400 0"/>',
  clip:'<path d="M15.500 9.300l-5.900 5.900a3.600 3.600 0 0 1-5.100-5.100l6.200-6.200a2.400 2.400 0 0 1 3.400 3.400l-6 6a1.200 1.200 0 0 1-1.700-1.700l5.500-5.500"/>',
  file:'<path d="M5.500 2.800h6l3.500 3.500v10.400a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V3.300a.5.5 0 0 1 .5-.5z"/><path d="M11.500 2.800v3.500H15"/>',
  nodes:'<rect x="2.5" y="3.5" width="6" height="4.5" rx="1.2"/><rect x="11.5" y="12" width="6" height="4.5" rx="1.2"/><path d="M8.5 5.8h2.2a2 2 0 0 1 2 2v4.200"/>',
  box:'<path d="M3.500 7.200L10 3.500l6.500 3.700v6.600L10 17.500l-6.500-3.700z"/><path d="M3.500 7.200L10 11l6.500-3.800M10 11v6.500"/>',
  repeat:'<path d="M4.5 9.200V8a3 3 0 0 1 3-3h7.500M12.500 2.500L15 5l-2.500 2.500M15.500 10.800V12a3 3 0 0 1-3 3H5M7.500 17.500L5 15l2.500-2.500"/>',
  play:'<path d="M6.5 4.300v11.400l9-5.700z" fill="currentColor"/>',
  stop:'<rect x="5.500" y="5.500" width="9" height="9" rx="1.600" fill="currentColor"/>',
  user:'<circle cx="10" cy="7" r="3.200"/><path d="M4 17c0-3.300 2.700-5.200 6-5.200s6 1.900 6 5.200"/>'
};
function ic(n,cls){return '<svg class="ic'+(cls?' '+cls:'')+'" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[n]||'')+'</svg>';}
var CHECK='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function avatar(me,cls){
  if(me&&me.avatar)return '<img class="av'+(cls?' '+cls:'')+'" src="'+esc(me.avatar)+'" alt="" referrerpolicy="no-referrer">';
  var n=(me&&(me.name||me.email))||'?';
  return '<span class="av'+(cls?' '+cls:'')+'" aria-hidden="true">'+esc(n.charAt(0).toUpperCase())+'</span>';
}
var LOGO='<svg class="logo" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="var(--accent)"/><rect x="6.500" y="15.500" width="3.600" height="6" rx="1.500" fill="var(--on-accent)" opacity=".55"/><rect x="12.200" y="11" width="3.600" height="10.500" rx="1.500" fill="var(--on-accent)" opacity=".8"/><rect x="17.900" y="6.500" width="3.600" height="15" rx="1.500" fill="var(--on-accent)"/></svg>';

function picon(p){
  if(p&&p.icon)return '<span class="pe">'+esc(p.icon)+'</span>';
  return '<span class="pdot" style="--c:'+hue(p)+'"></span>';
}
function chip(label,c){
  var col=c<0?'var(--muted)':'var(--h'+(c%6)+')';
  return '<span class="lchip" style="--lc:'+col+'"><i></i>'+esc(T(label))+'</span>';
}
function lchip(l,o){
  var st='style="--lc:var(--h'+(l.c%6)+')"', inner='<i></i>'+esc(l.name||T(COLORS[l.c%6]));
  if(o&&o.act)return '<button class="lchip'+(o.on?'':' off')+'" '+st+' data-act="'+o.act+'" data-id="'+esc(l.id)+'" aria-pressed="'+(o.on?'true':'false')+'">'+inner+'</button>';
  return '<span class="lchip" '+st+'>'+inner+'</span>';
}
function ring(pct,size,col){
  var r=15.5, c=2*Math.PI*r, off=c*(1-Math.max(0,Math.min(100,pct))/100);
  return '<svg class="ring" width="'+size+'" height="'+size+'" viewBox="0 0 36 36" role="img" aria-label="'+pct+' % terminé"><circle cx="18" cy="18" r="'+r+'" fill="none" stroke="var(--hover)" stroke-width="3.500"/><circle cx="18" cy="18" r="'+r+'" fill="none" stroke="'+(col||'var(--accent)')+'" stroke-width="3.500" stroke-linecap="round" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 18 18)"/></svg>';
}
function bar(pct,col){return '<div class="bar" role="img" aria-label="'+pct+' % terminé"'+(col?' style="--c:'+col+'"':'')+'><i style="width:'+pct+'%"></i></div>';}
function badges(t,e){
  var h='', done=isDone(t,e), late=t.due&&!done&&t.due<todayStr(), pr=prioOf(t);
  if(pr)h+='<span class="bd p'+pr+'">'+ic('flag')+PRIO[pr]+'</span>';
  if(t.due)h+='<span class="bd due'+(late?' late':done?' ok':'')+'">'+ic('clock')+fmtDate(t.due)+'</span>';
  var ck=t.check||[];
  if(ck.length){var d=ck.filter(function(i){return i.d;}).length;h+='<span class="bd'+(d===ck.length?' ok':'')+'" title="Checklist">'+ic('checklist')+d+'/'+ck.length+'</span>';}
  if(t.rep)h+='<span class="bd" title="Carte récurrente">'+ic('repeat')+'</span>';
  if(t.notes)h+='<span class="bd" title="Description">'+ic('lines')+'</span>';
  if((t.photos||[]).length)h+='<span class="bd" title="Photos">'+ic('image')+t.photos.length+'</span>';
  if((t.files||[]).length)h+='<span class="bd" title="Fichiers">'+ic('clip')+t.files.length+'</span>';
  if((t.log||[]).length)h+='<span class="bd" title="Commentaires">'+ic('msg')+t.log.length+'</span>';
  h+=whoChips(whoList(t),2);
  return h?'<div class="bds">'+h+'</div>':'';
}
function chkBtn(t,e){
  var done=isDone(t,e);
  if(e&&!e.cols.some(function(c){return c.done;}))return '';
  if(!canW(e))return '<span class="chk'+(done?' on':'')+'" role="img" aria-label="'+(done?'Terminée':'Pas terminée')+'">'+CHECK+'</span>';
  return '<button class="chk'+(done?' on':'')+'" data-act="toggle" data-id="'+esc(t.id)+'" aria-pressed="'+(done?'true':'false')+'" aria-label="'+(done?'Remettre à faire':'Marquer comme terminée')+'">'+CHECK+'</button>';
}
function nextBtn(t,e){
  if(!canW(e))return '';
  var i=e.cols.findIndex(function(c){return c.id===t._col;}), n=e.cols[i+1];
  if(!n)return '';
  return '<button class="mv" data-act="next" data-id="'+esc(t.id)+'" aria-label="'+tf('Passer dans « {0} »',esc(n.name))+'" title="'+tf('Passer dans « {0} »',esc(n.name))+'">'+ic('chev')+'</button>';
}
function photoImg(ph,alt){
  var u=photoUrl(ph.path);
  return u?'<img src="'+esc(u)+'" alt="'+(alt||'')+'" loading="lazy" decoding="async">':'<span class="ph-wait sk"></span>';
}
function cardEl(t,e){
  var done=isDone(t,e), ed=canW(e);
  var lb=(t.labels||[]).map(function(id){return findLabel(e.p,id);}).filter(Boolean);
  var ck=t.check||[], cd=ck.filter(function(i){return i.d;}).length;
  return '<article class="card'+(done?' isdone':'')+(S.task===t.id?' sel':'')+'" tabindex="0" data-act="open" data-id="'+esc(t.id)+'" data-card data-drag="task" '+(ed?'draggable="true"':'')+'>'
    +((t.photos||[]).length?'<div class="cover">'+photoImg(t.photos[0])+'</div>':'')
    +(lb.length?'<div class="lrow sm">'+lb.map(function(l){return lchip(l);}).join('')+'</div>':'')
    +'<div class="ct">'+chkBtn(t,e)+'<span class="ctt'+(done?' struck':'')+'">'+esc(t.title)+'</span>'+nextBtn(t,e)+'</div>'+badges(t,e)
    +(ck.length&&cd<ck.length?'<div class="cprog"><i style="width:'+Math.round(cd/ck.length*100)+'%"></i></div>':'')+'</article>';
}
function addForm(pid,colId,ph){
  var id='add-'+pid+'-'+colId;
  return '<div class="addrow"><label class="sr" for="'+esc(id)+'">Nouvelle carte</label><input class="in" id="'+esc(id)+'" data-draft data-add="task" data-pid="'+esc(pid)+'" data-col="'+esc(colId)+'" placeholder="'+esc(T(ph))+'" autocomplete="off"></div>';
}
function prop(label,html,forId){
  return '<div class="prop">'+(forId?'<label class="k" for="'+forId+'">'+label+'</label>':'<span class="k">'+label+'</span>')+'<div>'+html+'</div></div>';
}
function selH(id,change,did,opts,val,cls,extra){
  return '<select class="'+(cls||'pv')+'" id="'+id+'" data-change="'+change+'" data-id="'+did+'"'+(extra||'')+'>'+Object.keys(opts).map(function(k){return '<option value="'+esc(k)+'"'+(String(k)===String(val)?' selected':'')+'>'+esc(opts[k])+'</option>';}).join('')+'</select>';
}
/* ligne de tâche générique (Mes tâches, Inbox, widgets, liste de projet) */
function taskRow(t,by,opt){
  opt=opt||{};
  var e=by[t.projectId]||null, done=isDone(t,e);
  var h='<li class="trow'+(done?' isdone':'')+(S.task===t.id?' sel':'')+'" data-card data-id="'+esc(t.id)+'"'+(opt.drag&&S.canEdit?' draggable="true" data-drag="'+opt.drag+'"':'')+'>'+chkBtn(t,e)
    +'<button class="tt'+(done?' struck':'')+'" data-act="open" data-id="'+esc(t.id)+'">'+esc(t.title)+'</button>';
  if(opt.proj&&e)h+='<span class="pchip" style="--c:'+hue(e.p)+'"><span class="picon">'+picon(e.p)+'</span><span class="nm">'+esc(e.p.name)+'</span></span>';
  h+=badges(t,e);
  if(opt.extra)h+=opt.extra(t);
  return h+'</li>';
}
function mini(t,by){
  var e=by[t.projectId], late=t.due&&t.due<todayStr()&&!isDone(t,e);
  return '<button class="mini" data-act="open" data-id="'+esc(t.id)+'"><span class="picon">'+(e?picon(e.p):ic('inbox'))+'</span><span class="mini-t">'+esc(t.title)+'</span>'+(prioOf(t)===3?'<span class="bd p3">'+ic('flag')+'</span>':'')+(t.due?'<span class="bd due'+(late?' late':'')+'">'+fmtDate(t.due)+'</span>':'')+'</button>';
}
function pcard(p,by){
  var e=by[p.id], st=pstat(p), c=e.own?clientOf(p):null;
  var late=p.deadline&&st!=='done'&&st!=='archived'&&p.deadline<todayStr();
  return '<button class="pcard" data-act="view" data-id="'+esc(p.id)+'" style="--c:'+hue(p)+'">'
    +'<span class="pc-top"><span class="pc-ic">'+picon(p)+'</span><span class="pc-name">'+esc(p.name)+'</span>'+(isFav(p)?ic('star','fav'):'')+(isShared(p)?ic('users','mut'):'')+'</span>'
    +(p.desc?'<span class="pc-desc">'+esc(p.desc)+'</span>':'')
    +'<span class="pc-prog">'+bar(e.pct,hue(p))+'<b>'+e.pct+' %</b></span>'
    +'<span class="pc-meta">'+chip(PST[st],PSTC[st])+'<span class="cnt">'+e.done+'/'+e.total+'</span>'+(p.deadline?'<span class="bd due'+(late?' late':'')+'">'+ic('clock')+fmtDate(p.deadline)+'</span>':'')+(c?'<span class="bd who">'+esc(c.name)+'</span>':'')+'</span></button>';
}
function empty(icon,title,text,cta){
  return '<div class="empty"><span class="empty-ic">'+ic(icon)+'</span><strong>'+title+'</strong><span>'+text+'</span>'+(cta||'')+'</div>';
}
function skeleton(){
  var c='<div class="sk sk-card"><div class="sk sk-l w40"></div><div class="sk sk-l w80"></div><div class="sk sk-l w60"></div></div>';
  return '<div class="sk-wrap" aria-busy="true" aria-label="Chargement"><div class="sk sk-h"></div><div class="sk sk-l w40"></div><div class="sk-grid">'+c+c+c+c+'</div></div>';
}
function kbd(k){var D=I18N.dict[LANG]||{};return '<kbd>'+nt(String(k).split(' ').map(function(x){return D[x]||x;}).join(' '))+'</kbd>';}
