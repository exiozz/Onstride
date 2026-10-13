/* On Stride — devis et factures.
   Un document (table « quotes », visible par son propriétaire seul) est un devis ou une facture :
   des lignes (désignation, quantité, unité, prix unitaire HT, TVA), une remise, un acompte, des conditions.
   - Un devis reçoit son numéro tout de suite (D-2026-001). Accepté, il devient une facture (complète,
     d'acompte ou de solde) ou un projet avec ses cartes, son client et son montant.
   - Une facture reçoit son numéro quand on la valide (F-2026-001) : les numéros se suivent sans trou,
     et une facture validée ne se modifie plus (on l'annule et on en refait une).
   - Le document s'imprime ou s'enregistre en PDF depuis le navigateur.
   Les infos de l'entreprise (nom, SIRET, adresse, IBAN…) sont dans les réglages du compte : S.cfg.biz. */
'use strict';

var QK={quote:'Devis',invoice:'Facture'};
var QST={
  quote:{draft:'Brouillon',sent:'Envoyé',accepted:'Accepté',refused:'Refusé',expired:'Expiré'},
  invoice:{draft:'Brouillon',sent:'À payer',paid:'Payée',late:'En retard',cancelled:'Annulée'}
};
var QSTC={draft:-1,sent:0,accepted:2,refused:1,expired:3,paid:2,late:1,cancelled:-1};
var QUNITS={'':'—',h:'heure',j:'jour',forfait:'forfait',u:'unité',mois:'mois',page:'page',mot:'mot'};
var QUNITS_PL={h:'heures',j:'jours',forfait:'forfaits',u:'unités',mois:'mois',page:'pages',mot:'mots'};
var QDEF={
  qterms:'Devis valable jusqu’à la date indiquée. Un acompte peut être demandé à la signature. Le solde est payable à réception de la facture.',
  iterms:'Paiement par virement à réception, au plus tard à l’échéance indiquée. En cas de retard : pénalités au taux de 3 fois le taux d’intérêt légal, et indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 du Code de commerce). Pas d’escompte pour paiement anticipé.'
};
var QV={tab:LS.get('qtab','quote'),st:'all',q:''};

/* ---------- calculs ---------- */
function qn(x){if(typeof x==='number')return isFinite(x)?x:0;var n=parseFloat(String(x==null?'':x).replace(/\s/g,'').replace(',','.'));return isNaN(n)?0:n;}
function r2(n){return Math.round((Number(n)||0)*100+(n>=0?1e-9:-1e-9))/100;}
function money(n){n=r2(n);try{return new Intl.NumberFormat(LOCALE(),{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);}catch(_){return n.toFixed(2)+' €';}}
function qNumTxt(n){n=Number(n)||0;try{return new Intl.NumberFormat(LOCALE(),{maximumFractionDigits:2}).format(n);}catch(_){return String(n);}}
function bizOf(){return S.cfg.biz||{};}
function qKind(q){return q.kind==='invoice'?'invoice':'quote';}
/* « Devis » est invariable en français : au singulier, l'anglais dit « Quote » (le menu, lui, dit « Quotes ») */
function qKindName(kind){return kind==='invoice'?T('Facture'):LANG==='en'?'Quote':'Devis';}
function qVatFree(q){return q.vatFree!=null?!!q.vatFree:!!bizOf().vatFree;}
function qDefRate(){var b=bizOf();if(b.vatFree)return 0;return b.tva!=null&&b.tva!==''?qn(b.tva):20;}
function qLineHT(l){return r2(qn(l.q)*qn(l.pu));}
function qTotals(q){
  var vf=qVatFree(q), lines=q.lines||[], sub=0, by={};
  lines.forEach(function(l){sub+=qLineHT(l);});
  var disc=Math.min(100,Math.max(0,qn(q.disc))), k=1-disc/100;
  lines.forEach(function(l){if(vf)return;var r=qn(l.tva);by[r]=(by[r]||0)+qLineHT(l)*k;});
  var rates=Object.keys(by).map(function(r){r=Number(r);return {rate:r,base:r2(by[r]),amt:r2(by[r]*r/100)};}).filter(function(x){return x.rate>0;}).sort(function(a,b){return b.rate-a.rate;});
  var tva=0; rates.forEach(function(x){tva+=x.amt;});
  sub=r2(sub); var discAmt=r2(sub*disc/100), ht=r2(sub-discAmt), ttc=r2(ht+tva), dep=Math.min(100,Math.max(0,qn(q.dep)));
  return {sub:sub,disc:disc,discAmt:discAmt,ht:ht,rates:rates,tva:r2(tva),ttc:ttc,dep:dep,depAmt:r2(ttc*dep/100),vf:vf};
}
/* base HT après remise, par taux de TVA : sert aux factures d'acompte et de solde */
function qBases(q){
  var vf=qVatFree(q), k=1-Math.min(100,Math.max(0,qn(q.disc)))/100, by={};
  (q.lines||[]).forEach(function(l){var r=vf?0:qn(l.tva);by[r]=(by[r]||0)+qLineHT(l)*k;});
  return Object.keys(by).map(function(r){return {rate:Number(r),base:r2(by[r])};}).filter(function(x){return x.base;});
}

/* ---------- état ---------- */
function qStatus(q){
  var st=q.status||'draft', td=todayStr();
  if(qKind(q)==='quote'){if(!QST.quote[st])st='draft';if(st==='sent'&&q.until&&q.until<td)return 'expired';return st;}
  if(!QST.invoice[st])st='draft';
  if(st==='sent'&&q.due&&q.due<td)return 'late';
  return st;
}
function qStLabel(q){return QST[qKind(q)][qStatus(q)];}
function qChip(q){var s=qStatus(q);return chip(qStLabel(q),QSTC[s]);}
/* une facture validée ne se modifie plus ; un devis accepté ou refusé non plus (on peut le repasser en brouillon) */
function qLocked(q){var s=q.status||'draft';return qKind(q)==='invoice'?s!=='draft':(s==='accepted'||s==='refused');}
function qClient(q){return q.clientId?S.clients.find(function(c){return c.id===q.clientId;}):null;}
function qClientName(q){var c=qClient(q);return c?c.name:'';}
function qTitle(q){return (q.num?q.num:qKindName(qKind(q))+' '+T('(brouillon)'))+(q.title?' · '+q.title:'');}
function qById(id){return S.quotes.find(function(q){return q.id===id;});}
function qdoc(id){return S.db.doc('quotes/'+id);}
function qReady(){
  var m=Cloud.missing?Cloud.missing('quotes'):'';
  if(m){toast(m==='no_schema'?'Les devis ne sont pas encore activés : relance le fichier supabase/schema.sql dans Supabase.':'Les devis ne se chargent pas pour le moment. Recharge la page.',{bad:true});return false;}
  return true;
}
function qThisMonth(){var d=new Date(),from=new Date(d.getFullYear(),d.getMonth(),1).getTime();return S.quotes.filter(function(q){return (q.createdAt||0)>=from;}).length;}
function qCanCreate(){return !S.planReady||qThisMonth()<(plan().quotes==null?Infinity:plan().quotes);}
function qNextNum(kind,date){
  var b=bizOf(), y=String(date||todayStr()).slice(0,4), pre=(kind==='invoice'?(b.ipre||'F'):(b.qpre||'D'))+'-'+y+'-', max=0;
  S.quotes.forEach(function(q){
    if(qKind(q)!==kind)return; var s=String(q.num||'');
    if(s.indexOf(pre)===0){var n=parseInt(s.slice(pre.length),10);if(n>max)max=n;}
  });
  return pre+String(max+1).padStart(3,'0');
}
function qBlank(){return {id:rnd(),t:'',q:1,unit:'',pu:'',tva:qDefRate()};}
/* prestations déjà facturées : pour compléter une ligne quand on retape la même désignation */
function qHistory(){
  var seen={}, out=[];
  S.quotes.slice().sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}).forEach(function(q){
    (q.lines||[]).forEach(function(l){var k=norm(l.t).trim();if(k&&!seen[k]&&qn(l.pu)>0){seen[k]=1;out.push(l);}});
  });
  return out;
}

/* ---------- écritures ---------- */
function qSave(q,patch){return run(function(){return qdoc(q.id).update(patch);});}
function qCreate(kind,opt){
  opt=opt||{};
  if(!qReady())return null;
  if(!qCanCreate()){upsell('quotes');return null;}
  var b=bizOf(), td=todayStr(), ref=S.db.collection('quotes').doc();
  var doc=Object.assign({
    kind:kind, num:kind==='quote'?qNextNum('quote',td):'', title:'', clientId:'', projectId:'',
    date:td, until:kind==='quote'?addDays(qn(b.validity)||30):'', due:kind==='invoice'?addDays(b.payDays===0||b.payDays==='0'?0:(qn(b.payDays)||30)):'',
    status:'draft', lines:[qBlank()], disc:0, dep:kind==='quote'?qn(b.dep):0,
    notes:'', terms:kind==='invoice'?(b.iterms||T(QDEF.iterms)):(b.qterms||T(QDEF.qterms)), vatFree:!!b.vatFree, createdAt:Date.now()
  },opt);
  go('q:'+ref.id);S.pending='q:'+ref.id;S.focus='qt-title';
  run(function(){return ref.set(doc);});
  return ref.id;
}
function qNewFor(kind,o){
  o=o||{};
  var opt={};
  if(o.projectId){var p=projById(o.projectId);if(p){opt.projectId=p.id;opt.title=p.name;opt.clientId=metaOf(p.id).clientId||'';}}
  if(o.clientId)opt.clientId=o.clientId;
  return qCreate(kind,opt);
}
function qDup(q){
  var d=clean(q);
  ['num','status','sentAt','acceptedAt','refusedAt','paidAt','paidSync','invIds','fromId','projectId','cancelledAt'].forEach(function(k){delete d[k];});
  d.lines=(q.lines||[]).map(function(l){return Object.assign({},l,{id:rnd()});});
  d.createdAt=Date.now();
  if(qKind(q)==='invoice'){d.dep=false;}
  var id=qCreate(qKind(q),d);
  if(id)toast(tf('Copie de {0} créée.',q.num||qKindName(qKind(q))));
}
/* statut : envoyé, accepté, payé… avec les effets qui vont avec */
function qSetStatus(q,st){
  var kind=qKind(q), old=q.status||'draft', patch={status:st}, now=Date.now();
  if(old===st)return;
  if(kind==='invoice'&&old==='draft'&&st!=='draft'){
    if(!(q.lines||[]).some(function(l){return String(l.t||'').trim()&&qn(l.pu)!==0;})){toast('Ajoute au moins une ligne avec un prix avant de valider la facture.',{bad:true});return;}
    if(!q.num)patch.num=qNextNum('invoice',q.date);
  }
  if(st==='sent'&&!q.sentAt)patch.sentAt=now;
  if(st==='accepted')patch.acceptedAt=now;
  if(st==='refused')patch.refusedAt=now;
  if(st==='cancelled')patch.cancelledAt=now;
  /* une facture payée compte dans « Encaissé » du projet relié */
  var p=q.projectId&&projById(q.projectId), own=p&&isMine(p), ttc=qTotals(q).ttc;
  if(kind==='invoice'&&st==='paid'){patch.paidAt=now;if(own&&ttc){var m=metaOf(p.id);setMeta(p.id,{paid:r2((Number(m.paid)||0)+ttc)});patch.paidSync=true;}}
  if(kind==='invoice'&&old==='paid'&&st!=='paid'){patch.paidAt=null;if(q.paidSync&&own){var m2=metaOf(p.id);setMeta(p.id,{paid:Math.max(0,r2((Number(m2.paid)||0)-ttc))});}patch.paidSync=false;}
  qSave(q,patch);
  var msg={sent:kind==='invoice'?'Facture validée : elle ne se modifie plus.':'Devis marqué comme envoyé.',accepted:'Bravo ! Devis accepté.',refused:'Devis marqué comme refusé.',paid:own&&ttc?'Facture payée : le montant est ajouté à « Encaissé » du projet.':'Facture marquée comme payée.',cancelled:'Facture annulée.',draft:'Repassé en brouillon.'}[st];
  if(msg)toast(msg);
}
function qDelete(q){
  S.confirm=null;
  if(qKind(q)==='invoice'&&(q.status||'draft')!=='draft'){toast('Une facture validée ne se supprime pas : annule-la.',{bad:true});return;}
  var data=clean(q);
  go('quotes');
  run(function(){return qdoc(q.id).delete();});
  toast(tf('{0} supprimé.',q.num||qKindName(qKind(q))),{undo:function(){run(function(){return S.db.doc('quotes/'+q.id).set(data);});}});
}
/* facture depuis un devis : complète, d'acompte, ou de solde (déduit les acomptes déjà facturés) */
function qInvoiceFrom(q,mode){
  var t=qTotals(q), lines=[], label=q.num||qKindName('quote');
  if(mode==='dep'){
    if(!t.dep){toast('Indique d’abord le pourcentage d’acompte du devis.',{bad:true});return;}
    qBases(q).forEach(function(b){lines.push({id:rnd(),t:unmark(tf('Acompte de {0} % sur le devis {1}',qNumTxt(t.dep),label))+(q.title?' ('+q.title+')':''),q:1,unit:'',pu:r2(b.base*t.dep/100),tva:b.rate});});
  }else{
    var draftDep=S.quotes.find(function(x){return qKind(x)==='invoice'&&x.fromId===q.id&&x.dep&&(x.status||'draft')==='draft';});
    if(draftDep){toast('Valide d’abord la facture d’acompte : la facture de solde reprend son numéro.',{bad:true});go('q:'+draftDep.id);return;}
    lines=(q.lines||[]).filter(function(l){return String(l.t||'').trim()||qn(l.pu);}).map(function(l){return Object.assign({},l,{id:rnd()});});
    if(t.disc)qBases(Object.assign({},q,{disc:0})).forEach(function(b){lines.push({id:rnd(),t:unmark(tf('Remise de {0} %',qNumTxt(t.disc))),q:1,unit:'',pu:-r2(b.base*t.disc/100),tva:b.rate});});
    S.quotes.filter(function(x){return qKind(x)==='invoice'&&x.fromId===q.id&&x.dep&&x.status!=='cancelled';}).forEach(function(x){
      (x.lines||[]).forEach(function(l){lines.push({id:rnd(),t:unmark(tf('Acompte déjà facturé ({0})',x.num||T('brouillon'))),q:1,unit:'',pu:-qLineHT(l),tva:l.tva});});
    });
  }
  var id=qCreate('invoice',{title:q.title||'',clientId:q.clientId||'',projectId:q.projectId||'',lines:lines,fromId:q.id,dep:mode==='dep',vatFree:qVatFree(q)});
  if(!id)return;
  run(function(){return qdoc(q.id).update({invIds:(q.invIds||[]).concat([id]),status:q.status==='sent'||q.status==='draft'?'accepted':q.status,acceptedAt:q.acceptedAt||Date.now()});});
  toast(mode==='dep'?'Facture d’acompte prête : vérifie-la, puis valide-la.':'Facture prête : vérifie-la, puis valide-la.');
}
/* projet depuis un devis : colonnes « Projet client », une carte par ligne, client et montant reliés */
function qToProject(q){
  if(S.planReady&&!canAddProject()){upsell('projects');return;}
  var t=qTotals(q), cols=tplCols('client'), ref=S.db.collection('projects').doc(), now=Date.now();
  var name=String(q.title||qClientName(q)||q.num||T('Nouveau projet')).slice(0,120);
  var doc={name:name,desc:unmark(tf('Créé depuis le devis {0}.',q.num||'')),icon:'',hue:S.projects.length%6,spaceId:'',status:'active',createdAt:now,columns:cols};
  var todo=cols[1]||cols[0], lines=(q.lines||[]).filter(function(l){return String(l.t||'').trim();});
  /* les factures déjà faites depuis ce devis (un acompte, souvent) suivent le projet, et ce qui est payé compte dans « Encaissé » */
  var invs=S.quotes.filter(function(x){return qKind(x)==='invoice'&&x.fromId===q.id&&!x.projectId;}), paid=0;
  invs.forEach(function(x){if(x.status==='paid')paid+=qTotals(x).ttc;});
  run(function(){return qdoc(q.id).update({projectId:ref.id,status:'accepted',acceptedAt:q.acceptedAt||now});});
  go(ref.id);S.pending=ref.id;
  run(function(){
    return ref.set(doc).then(function(){var m={clientId:q.clientId||'',amount:t.ttc};if(paid)m.paid=r2(paid);return S.db.doc('meta/'+ref.id).set(m);}).then(function(){
      var c0=Promise.resolve();
      invs.forEach(function(x){c0=c0.then(function(){return qdoc(x.id).update({projectId:ref.id,paidSync:x.status==='paid'});});});
      return c0;
    }).then(function(){
      var chain=Promise.resolve();
      lines.forEach(function(l,i){
        var qty=qn(l.q), u=l.unit&&QUNITS[l.unit]?' · '+qNumTxt(qty)+' '+T(qty>1&&QUNITS_PL[l.unit]?QUNITS_PL[l.unit]:QUNITS[l.unit]):'';
        chain=chain.then(function(){return S.db.collection('tasks').doc().set(newTaskDoc({projectId:ref.id,title:String(l.t).trim().slice(0,200),columnId:todo.id,pos:now+i,notes:u?unmark(tf('Prévu au devis {0}',q.num||''))+u:''}));});
      });
      return chain;
    });
  });
  toast(tf('Projet « {0} » créé avec {1} cartes.',name,lines.length));
}
function qMailto(q,kind){
  var c=qClient(q), to=c&&validEmail(String(c.email||'').trim())?String(c.email).trim():'', b=bizOf(), t=qTotals(q), who=myName()||b.name||'';
  var label=qKindName(qKind(q))+' '+(q.num||'');
  var subj=kind==='remind'?unmark(tf('Relance : {0}',label+(q.title?' – '+q.title:''))):label+(q.title?' – '+q.title:'')+(b.name?' – '+b.name:'');
  var hello=c&&c.name?unmark(tf('Bonjour {0},',c.name)):T('Bonjour,'), body;
  if(kind==='remind'&&qKind(q)==='quote')body=hello+'\n\n'+unmark(tf('Je reviens vers vous au sujet de mon devis {0} ({1}), envoyé le {2}. Avez-vous pu le consulter ? Je reste disponible pour en parler ou l’ajuster.',q.num||'',money(t.ttc),fmtLong(q.date)))+'\n\n'+T('Bien à vous,')+'\n'+who;
  else if(kind==='remind')body=hello+'\n\n'+unmark(tf('Sauf erreur de ma part, la facture {0} d’un montant de {1}, arrivée à échéance le {2}, n’a pas encore été réglée. Pourriez-vous procéder au paiement ?',q.num||'',money(t.ttc),fmtLong(q.due)))+(b.iban?'\n\nIBAN : '+b.iban+(b.bic?' · BIC : '+b.bic:''):'')+'\n\n'+T('Merci d’avance, bien à vous,')+'\n'+who;
  else if(qKind(q)==='quote')body=hello+'\n\n'+unmark(tf('Vous trouverez ci-joint mon devis {0} d’un montant de {1}, valable jusqu’au {2}.',q.num||'',money(t.ttc),fmtLong(q.until)))+'\n'+T('Pour l’accepter, il suffit de me le renvoyer signé avec la mention « Bon pour accord », ou de répondre à ce message.')+'\n\n'+T('Bien à vous,')+'\n'+who;
  else body=hello+'\n\n'+unmark(tf('Vous trouverez ci-joint la facture {0} d’un montant de {1}, à régler avant le {2}.',q.num||'',money(t.ttc),fmtLong(q.due)))+(b.iban?'\n\nIBAN : '+b.iban+(b.bic?' · BIC : '+b.bic:''):'')+'\n\n'+T('Merci, bien à vous,')+'\n'+who;
  try{window.location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);}catch(_){}
  if(kind!=='remind'&&(q.status||'draft')==='draft')qSetStatus(q,'sent');
  else if(kind==='remind')qSave(q,{remindAt:Date.now()});
  toast(kind==='remind'?'Relance préparée dans ta messagerie.':'Message préparé : joins-y le PDF (bouton « PDF »).');
}
function fmtLong(s){if(!s)return '';var d=new Date(s+'T12:00:00');return isNaN(d)?s:d.toLocaleDateString(LOCALE(),{day:'numeric',month:'long',year:'numeric'});}

/* ---------- document imprimable (PDF) ---------- */
function qDocHtml(q){
  var b=bizOf(), c=qClient(q)||{}, t=qTotals(q), kind=qKind(q), inv=kind==='invoice';
  function e(s){return escRaw(s==null?'':s);}
  function nl(s){return e(s).replace(/\n/g,'<br>');}
  var title=inv?(q.dep?T('Facture d’acompte'):T('Facture')):qKindName('quote');
  var css='*{box-sizing:border-box}body{margin:0;font:13px/1.5 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1b1f29;background:#f2f3f6}'
    +'.page{max-width:820px;margin:24px auto;background:#fff;padding:48px 52px;box-shadow:0 4px 24px rgba(0,0,0,.08);border-radius:6px}'
    +'.bar{position:sticky;top:0;display:flex;gap:8px;justify-content:center;padding:10px;background:#1b1f29}.bar button{font:600 14px sans-serif;padding:9px 16px;border-radius:8px;border:0;background:#fff;cursor:pointer}'
    +'header{display:flex;justify-content:space-between;gap:32px;align-items:flex-start}h1{font-size:30px;letter-spacing:-.02em;margin:0 0 6px;color:'+e(b.color||'#2F5BEA')+'}'
    +'.me b{font-size:16px}.me,.meta{color:#4a5262}.meta{text-align:right}.meta b{color:#1b1f29}'
    +'.parties{display:flex;justify-content:flex-end;margin:28px 0 18px}.to{min-width:260px;padding:14px 16px;border:1px solid #e3e6ec;border-radius:8px}.to small{display:block;text-transform:uppercase;letter-spacing:.08em;color:#8a92a3;font-size:10px;margin-bottom:4px}'
    +'.obj{margin:6px 0 16px;font-size:14px}table{width:100%;border-collapse:collapse;margin-top:6px}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#8a92a3;border-bottom:2px solid #1b1f29;padding:8px 6px}'
    +'td{padding:9px 6px;border-bottom:1px solid #eceef2;vertical-align:top}.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}'
    +'.tot{margin-left:auto;margin-top:14px;width:300px}.tot div{display:flex;justify-content:space-between;padding:5px 6px}.tot .big{border-top:2px solid #1b1f29;margin-top:4px;padding-top:9px;font-size:16px;font-weight:700}'
    +'.dep{margin-top:6px;color:#4a5262;text-align:right}.blk{margin-top:22px;color:#4a5262}.blk b{color:#1b1f29}'
    +'.sign{margin-top:28px;display:flex;justify-content:flex-end}.sign div{width:300px;height:110px;border:1px dashed #b9bfcb;border-radius:8px;padding:10px;color:#8a92a3;font-size:12px}'
    +'footer{margin-top:36px;padding-top:12px;border-top:1px solid #eceef2;color:#8a92a3;font-size:11px;text-align:center}'
    +'@media print{body{background:#fff}.bar{display:none}.page{box-shadow:none;margin:0;max-width:none;padding:0;border-radius:0}@page{margin:16mm 14mm}tr{page-break-inside:avoid}}'
    +'@media (max-width:640px){.page{padding:24px 18px;margin:0}header{flex-direction:column;gap:12px}.meta{text-align:left}.parties{justify-content:flex-start}.tot{width:100%}.hide-m{display:none}}';
  var me='<div class="me"><b>'+e(b.name||myName()||(S.me&&S.me.email)||'')+'</b>'+(b.legal?'<br>'+e(b.legal):'')+(b.address?'<br>'+nl(b.address):'')+(b.email||b.phone?'<br>'+e([b.email,b.phone].filter(Boolean).join(' · ')):'')+(b.siret?'<br>SIRET : '+e(b.siret):'')+(b.vatNo&&!t.vf?'<br>'+e(T('TVA intracom.'))+' : '+e(b.vatNo):'')+'</div>';
  var meta='<div class="meta"><h1>'+e(title)+'</h1>'+(q.num?'<b>N° '+e(q.num)+'</b><br>':'<b>'+e(T('Brouillon'))+'</b><br>')+e(T('Date'))+' : '+e(fmtLong(q.date))
    +(!inv&&q.until?'<br>'+e(T('Valable jusqu’au'))+' : '+e(fmtLong(q.until)):'')+(inv&&q.due?'<br>'+e(T('Échéance'))+' : '+e(fmtLong(q.due)):'');
  var src=q.fromId&&qById(q.fromId); if(src&&src.num)meta+='<br>'+e(T('Réf. devis'))+' : '+e(src.num);
  meta+='</div>';
  var to='<div class="parties"><div class="to"><small>'+e(inv?T('Facturé à'):T('Adressé à'))+'</small><b>'+e(c.company||c.name||T('Client'))+'</b>'+(c.company&&c.name?'<br>'+e(c.name):'')+(c.address?'<br>'+nl(c.address):'')+(c.email?'<br>'+e(c.email):'')+(c.siret?'<br>SIRET : '+e(c.siret):'')+'</div></div>';
  var rows=(q.lines||[]).filter(function(l){return String(l.t||'').trim()||qn(l.pu);}).map(function(l){
    var qty=qn(l.q), u=l.unit&&QUNITS[l.unit]?T(qty>1&&QUNITS_PL[l.unit]?QUNITS_PL[l.unit]:QUNITS[l.unit]):'';
    return '<tr><td>'+nl(l.t)+'</td><td class="n">'+e(qNumTxt(qty))+(u?' '+e(u):'')+'</td><td class="n">'+e(money(qn(l.pu)))+'</td>'+(t.vf?'':'<td class="n hide-m">'+e(qNumTxt(qn(l.tva)))+' %</td>')+'<td class="n">'+e(money(qLineHT(l)))+'</td></tr>';
  }).join('');
  var table='<table><thead><tr><th>'+e(T('Désignation'))+'</th><th class="n">'+e(T('Qté'))+'</th><th class="n">'+e(t.vf?T('Prix unitaire'):T('P.U. HT'))+'</th>'+(t.vf?'':'<th class="n hide-m">'+e(T('TVA'))+'</th>')+'<th class="n">'+e(t.vf?T('Total'):T('Total HT'))+'</th></tr></thead><tbody>'+rows+'</tbody></table>';
  var tot='<div class="tot">';
  if(t.disc)tot+='<div><span>'+e(T('Sous-total'))+'</span><span>'+e(money(t.sub))+'</span></div><div><span>'+e(unmark(tf('Remise {0} %',qNumTxt(t.disc))))+'</span><span>− '+e(money(t.discAmt))+'</span></div>';
  if(t.vf)tot+='<div class="big"><span>'+e(T('Total'))+'</span><span>'+e(money(t.ttc))+'</span></div>';
  else{
    tot+='<div><span>'+e(T('Total HT'))+'</span><span>'+e(money(t.ht))+'</span></div>';
    t.rates.forEach(function(r){tot+='<div><span>'+e(T('TVA'))+' '+e(qNumTxt(r.rate))+' %</span><span>'+e(money(r.amt))+'</span></div>';});
    tot+='<div class="big"><span>'+e(T('Total TTC'))+'</span><span>'+e(money(t.ttc))+'</span></div>';
  }
  tot+='</div>';
  if(!inv&&t.dep)tot+='<p class="dep">'+e(unmark(tf('Acompte à la signature : {0} % soit {1}',qNumTxt(t.dep),money(t.depAmt))))+'</p>';
  var blk='';
  if(t.vf)blk+='<p class="blk">'+e(b.vatNote||T('TVA non applicable, art. 293 B du CGI'))+'</p>';
  if(q.notes)blk+='<p class="blk">'+nl(q.notes)+'</p>';
  if(inv&&(b.iban||b.bic))blk+='<p class="blk"><b>'+e(T('Règlement par virement'))+'</b><br>IBAN : '+e(b.iban||'')+(b.bic?'<br>BIC : '+e(b.bic):'')+'</p>';
  if(q.terms)blk+='<p class="blk"><b>'+e(T('Conditions'))+'</b><br>'+nl(q.terms)+'</p>';
  var sign=!inv?'<div class="sign"><div>'+e(T('Bon pour accord — date et signature du client'))+'</div></div>':'';
  var foot='<footer>'+e([b.name,b.legal,b.siret?'SIRET '+b.siret:'',b.rcs].filter(Boolean).join(' · '))+(b.footer?'<br>'+nl(b.footer):'')+'</footer>';
  var docTitle=(q.num||title)+(c.name?' - '+c.name:'');
  return '<!doctype html><html lang="'+LANG+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+e(docTitle)+'</title><style>'+css+'</style></head><body>'
    +'<div class="bar"><button onclick="window.print()">'+e(T('Imprimer ou enregistrer en PDF'))+'</button></div>'
    +'<div class="page"><header>'+me+meta+'</header>'+to+(q.title?'<p class="obj"><b>'+e(T('Objet'))+' :</b> '+e(q.title)+'</p>':'')+table+tot+blk+sign+foot+'</div>'
    +'<script>window.addEventListener("load",function(){setTimeout(function(){try{window.print()}catch(e){}},300)});<\/script></body></html>';
}
function qPrint(q){
  var html=qDocHtml(q), w=null;
  try{w=window.open('','_blank');}catch(_){}
  if(w&&w.document){w.document.open();w.document.write(html);w.document.close();try{w.focus();}catch(_){}return;}
  /* fenêtre bloquée : on imprime depuis un cadre caché */
  var f=document.createElement('iframe');
  f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';f.setAttribute('aria-hidden','true');
  document.body.appendChild(f);
  f.srcdoc=html.replace(/<script>[\s\S]*?<\/script>/,'');
  f.onload=function(){try{f.contentWindow.focus();f.contentWindow.print();}catch(_){toast('Impression impossible : autorise les fenêtres pour ce site.',{bad:true});}setTimeout(function(){if(f.parentNode)f.parentNode.removeChild(f);},60000);};
}

/* ---------- livre des recettes (factures payées) ---------- */
function qExportCsv(){
  if(S.planReady&&!plan().csv){upsell('csv');return;}
  var sep=';', rows=[[T('Date d’encaissement'),T('Numéro'),T('Date de facture'),T('Client'),T('Objet'),T('Montant HT'),T('TVA'),T('Montant TTC'),T('Statut')]];
  function cell(v){v=String(v==null?'':v);return /[";\n\r]/.test(v)||/^[=+\-@]/.test(v)?'"'+(/^[=+\-@]/.test(v)?"'":'')+v.replace(/"/g,'""')+'"':v;}
  function dec(n){return String(r2(n).toFixed(2)).replace('.',LANG==='fr'?',':'.');}
  S.quotes.filter(function(q){return qKind(q)==='invoice'&&q.num;}).sort(function(a,b){return String(a.num).localeCompare(String(b.num));}).forEach(function(q){
    var t=qTotals(q);
    rows.push([q.paidAt?ds(new Date(q.paidAt)):'',q.num,q.date||'',qClientName(q),q.title||'',dec(t.ht),dec(t.tva),dec(t.ttc),T(qStLabel(q))]);
  });
  var csv='﻿'+rows.map(function(r){return r.map(cell).join(sep);}).join('\r\n');
  try{
    var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    var a=document.createElement('a');a.href=url;a.download='onstride-factures-'+todayStr()+'.csv';document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},500);
    toast('Export téléchargé.');
  }catch(_){toast('Export impossible pour le moment.',{bad:true});}
}

/* ---------- chiffres ---------- */
function qStats(){
  var y=String(new Date().getFullYear()), out={pend:0,pendN:0,due:0,dueN:0,late:0,lateN:0,paidY:0,acc:0,dec:0};
  S.quotes.forEach(function(q){
    var s=qStatus(q), t=qTotals(q);
    if(qKind(q)==='quote'){
      if(s==='sent'){out.pend+=t.ttc;out.pendN++;}
      if(s==='accepted')out.acc++; if(s==='refused'||s==='expired')out.dec++;
    }else{
      if(s==='sent'||s==='late'){out.due+=t.ttc;out.dueN++;}
      if(s==='late'){out.late+=t.ttc;out.lateN++;}
      if(s==='paid'&&q.paidAt&&String(new Date(q.paidAt).getFullYear())===y)out.paidY+=t.ttc;
    }
  });
  out.rate=out.acc+out.dec?Math.round(out.acc/(out.acc+out.dec)*100):null;
  return out;
}
/* ce qui demande une action : factures en retard, devis envoyés depuis plus de 7 jours ou expirés, brouillons */
function qTodo(){
  var wk=Date.now()-7*86400000, out=[];
  S.quotes.forEach(function(q){
    var s=qStatus(q), why='';
    if(s==='late')why='Paiement en retard';
    else if(s==='sent'&&qKind(q)==='invoice')why='En attente de paiement';
    else if(s==='expired')why='Devis expiré';
    else if(s==='sent'&&(q.sentAt||q.createdAt||0)<wk&&(!q.remindAt||q.remindAt<wk))why='À relancer';
    else if(s==='sent')why='En attente de réponse';
    else if(s==='draft')why='Brouillon à finir';
    if(why)out.push({q:q,why:why,rank:{late:0,expired:2,draft:4}[s]!=null?{late:0,expired:2,draft:4}[s]:why==='À relancer'?1:3});
  });
  return out.sort(function(a,b){return a.rank-b.rank||(b.q.createdAt||0)-(a.q.createdAt||0);});
}
function quotesWidget(){
  if(Cloud.missing&&Cloud.missing('quotes'))return empty('file','Devis pas encore activés','Relance le fichier supabase/schema.sql dans Supabase pour créer tes devis et factures.');
  var l=qTodo(), st=qStats();
  if(!S.quotes.length)return empty('file','Aucun devis pour l’instant','Prépare un devis propre en deux minutes, puis transforme-le en facture ou en projet.','<button class="btn primary" data-act="q-new" data-id="quote">'+ic('plus')+'Faire un devis</button>');
  var h=l.slice(0,5).map(function(x){var q=x.q,t=qTotals(q),late=qStatus(q)==='late';return '<button class="mini" data-act="view" data-id="q:'+esc(q.id)+'"><span class="picon">'+ic(qKind(q)==='invoice'?'receipt':'file')+'</span><span class="mini-t">'+esc(q.num||T('Brouillon'))+(qClientName(q)?' · '+esc(qClientName(q)):'')+'<small class="mut"> · '+x.why+'</small></span><span class="cnt'+(late?' bad':'')+'">'+nt(money(t.ttc))+'</span></button>';}).join('');
  if(!l.length)h=empty('check','Tout est à jour','Aucun devis en attente ni facture à encaisser.');
  return h+'<p class="wfoot">'+(st.pendN?tf('Devis en attente : {0}',nt(money(st.pend)))+' · ':'')+tf('À encaisser : {0}',nt(money(st.due)))+'</p>';
}

/* ---------- écrans ---------- */
function qSetupNote(){
  var m=Cloud.missing?Cloud.missing('quotes'):'';
  if(m)return '<div class="note bad"><p>'+(m==='no_schema'?'Les devis et factures ne sont pas encore activés : dans Supabase, ouvre SQL Editor, colle tout le fichier supabase/schema.sql et clique « Run », puis recharge la page. Rien n’est supprimé.':'Les devis ne se chargent pas pour le moment. Recharge la page.')+'</p></div>';
  var b=bizOf();
  if(!b.name||!b.address)return '<div class="note warn"><p><strong>Complète tes infos d’entreprise.</strong> Nom, adresse, SIRET et IBAN apparaissent sur chaque devis et chaque facture.</p><button class="btn sm" data-act="q-biz">'+ic('settings')+'Mes infos d’entreprise</button></div>';
  return '';
}
function qRow(q){
  var t=qTotals(q), s=qStatus(q);
  return '<tr tabindex="0" data-act="view" data-id="q:'+esc(q.id)+'"><td class="tt mono">'+(q.num?esc(q.num):'<span class="mut">'+T('Brouillon')+'</span>')+'</td><td>'+esc(qClientName(q)||'—')+'</td><td class="tt">'+esc(q.title||'')+'</td><td>'+fmtDate(q.date)+'</td><td>'+qChip(q)+'</td><td class="num'+(s==='late'?' bad':'')+'">'+nt(money(t.ttc))+'</td></tr>';
}
function qCard(q){
  var t=qTotals(q);
  return '<button class="panel ccard" data-act="view" data-id="q:'+esc(q.id)+'"><span class="r"><span class="nm2">'+(q.num?esc(q.num):T('Brouillon'))+(qClientName(q)?' <span class="mut">· '+esc(qClientName(q))+'</span>':'')+'</span>'+qChip(q)+'</span>'
    +(q.title?'<span class="r">'+esc(q.title)+'</span>':'')+'<span class="r money"><span>'+fmtDate(q.date)+'</span><span class="grow"></span><b>'+nt(money(t.ttc))+'</b></span></button>';
}
function qListHtml(list,emptyH){
  if(!list.length)return emptyH;
  return '<div class="panel tblwrap hide-s"><table class="qtbl"><thead><tr><th scope="col">Numéro</th><th scope="col">Client</th><th scope="col">Objet</th><th scope="col">Date</th><th scope="col">Statut</th><th scope="col" class="num">Montant</th></tr></thead><tbody>'+list.map(qRow).join('')+'</tbody></table></div>'
    +'<div class="clist only-s">'+list.map(qCard).join('')+'</div>';
}
function vQuotes(){
  var st=qStats(), kind=QV.tab==='invoice'?'invoice':'quote';
  var all=S.quotes.filter(function(q){return qKind(q)===kind;}).sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))||(b.createdAt||0)-(a.createdAt||0);});
  var list=all.filter(function(q){return QV.st==='all'||qStatus(q)===QV.st;});
  if(QV.q){var k=norm(QV.q);list=list.filter(function(q){return norm((q.num||'')+' '+(q.title||'')+' '+qClientName(q)+' '+(q.lines||[]).map(function(l){return l.t;}).join(' ')).indexOf(k)>=0;});}
  var h='<header class="phd row"><div><h1>Devis et factures</h1><p class="lead">Prépare tes devis, transforme-les en factures ou en projets, et suis ce qu’on te doit.</p></div><div class="row-btns"><button class="btn" data-act="q-new" data-id="invoice">'+ic('receipt')+'Nouvelle facture</button><button class="btn primary" data-act="q-new" data-id="quote">'+ic('plus')+'Nouveau devis</button></div></header>';
  h+=qSetupNote();
  h+='<div class="stats"><button class="stat" data-act="q-filter" data-id="quote:sent"><span>'+ic('file')+'Devis en attente</span><b>'+nt(money(st.pend))+'</b><small class="cnt">'+pl(st.pendN,'devis','devis')+'</small></button>'
    +'<div class="stat"><span>'+ic('check')+'Taux d’acceptation</span><b>'+(st.rate==null?'—':st.rate+' %')+'</b><small class="cnt">'+tf('{0} acceptés, {1} refusés ou expirés',st.acc,st.dec)+'</small></div>'
    +'<button class="stat'+(st.lateN?' bad':'')+'" data-act="q-filter" data-id="invoice:'+(st.lateN?'late':'sent')+'"><span>'+ic('clock')+'À encaisser</span><b>'+nt(money(st.due))+'</b><small class="cnt">'+(st.lateN?tf('dont {0} en retard',nt(money(st.late))):pl(st.dueN,'facture','factures'))+'</small></button>'
    +'<div class="stat"><span>'+ic('activity')+'Encaissé en '+new Date().getFullYear()+'</span><b>'+nt(money(st.paidY))+'</b><small class="cnt">Factures payées</small></div></div>';
  var nQ=S.quotes.filter(function(q){return qKind(q)==='quote';}).length, nI=S.quotes.length-nQ;
  h+='<div class="toolbar qbar"><span class="seg" role="group" aria-label="Type de document"><button data-act="q-tab" data-id="quote" aria-pressed="'+(kind==='quote')+'">'+ic('file')+'Devis <span class="cnt">'+nQ+'</span></button><button data-act="q-tab" data-id="invoice" aria-pressed="'+(kind==='invoice')+'">'+ic('receipt')+'Factures <span class="cnt">'+nI+'</span></button></span>';
  h+='<div class="chips">'+['all'].concat(Object.keys(QST[kind])).map(function(s){var n=s==='all'?all.length:all.filter(function(q){return qStatus(q)===s;}).length;if(s!=='all'&&!n&&QV.st!==s)return '';return '<button class="fchip" data-act="q-st" data-id="'+s+'" aria-pressed="'+(QV.st===s)+'">'+(s==='all'?T('Tous'):T(QST[kind][s]))+' <span class="cnt">'+n+'</span></button>';}).join('')+'</div>';
  h+=(all.length>5||QV.q?'<span class="fq">'+ic('search')+'<label class="sr" for="qq-s">Chercher un document</label><input id="qq-s" type="search" value="'+esc(QV.q)+'" placeholder="Numéro, client, objet…" autocomplete="off"></span>':'')+'</div>';
  var none=kind==='quote'?empty('file','Aucun devis','Un devis clair, numéroté et prêt à signer. Accepté, il devient une facture ou un projet en un clic.','<button class="btn primary" data-act="q-new" data-id="quote">'+ic('plus')+'Faire un devis</button>')
    :empty('receipt','Aucune facture','Crée une facture ici, ou depuis un devis accepté pour reprendre ses lignes.','<button class="btn primary" data-act="q-new" data-id="invoice">'+ic('plus')+'Nouvelle facture</button>');
  if(all.length&&!list.length)none=empty('search','Rien ne correspond','Essaie un autre filtre ou un autre mot.');
  h+=qListHtml(list,none);
  if(kind==='invoice'&&nI)h+='<div class="row-btns"><button class="btn quiet sm" data-act="q-csv" title="Toutes tes factures validées, avec leur date d’encaissement, dans un fichier pour ton comptable">'+ic('table')+'Livre des recettes (tableur)'+(plan().csv?'':' <span class="pbadge">Pro</span>')+'</button></div>';
  if(S.planReady&&plan().quotes!=null&&plan().quotes!==Infinity)h+='<p class="hint">'+tf('Formule {0} : {1} documents par mois ({2} ce mois-ci).',PLANS[myPlan()].n,plan().quotes,qThisMonth())+' <button class="linkbtn" data-act="view" data-id="plans">Illimité avec Premium</button></p>';
  return h;
}
function qIn(id,q,f,val,ro,attrs){return '<input class="pv" id="'+id+'" value="'+esc(val==null?'':val)+'" data-draft data-change="qf" data-f="'+f+'" data-id="'+esc(q.id)+'"'+(ro?' disabled':'')+(attrs||'')+' autocomplete="off">';}
function qLinesHtml(q,ro){
  var t=qTotals(q), vf=t.vf, qid=esc(q.id), n=(q.lines||[]).length;
  var rates={}; [0,2.1,5.5,10,20].forEach(function(r){rates[r]=qNumTxt(r)+' %';});
  var h='<div class="panel qlines'+(vf?' novat':'')+'"><div class="ql-h" aria-hidden="true"><span>Désignation</span><span>Qté</span><span>Unité</span><span>'+(vf?'Prix unitaire':'P.U. HT')+'</span>'+(vf?'':'<span>TVA</span>')+'<span>'+(vf?'Total':'Total HT')+'</span><span></span></div>';
  (q.lines||[]).forEach(function(l,i){
    var lid=esc(l.id), base='ql-'+lid, at=' data-change="ql" data-id="'+qid+'" data-line="'+lid+'"'+(ro?' disabled':'');
    var ropts=Object.assign({},rates); if(!(qn(l.tva) in ropts))ropts[qn(l.tva)]=qNumTxt(qn(l.tva))+' %';
    h+='<div class="ql">'
      +'<label class="sr" for="'+base+'-t">Désignation, ligne '+(i+1)+'</label><input class="pv ql-t" id="'+base+'-t" data-draft data-f="t" list="ql-hist" value="'+esc(l.t||'')+'"'+at+' placeholder="Ex. Création de la maquette" autocomplete="off">'
      +'<label class="sr" for="'+base+'-q">Quantité</label><input class="pv num" id="'+base+'-q" inputmode="decimal" data-draft data-f="q" value="'+esc(l.q==null?'':String(l.q).replace('.',LANG==='fr'?',':'.'))+'"'+at+' autocomplete="off">'
      +'<label class="sr" for="'+base+'-u">Unité</label><select class="pv" id="'+base+'-u" data-f="unit"'+at+'>'+Object.keys(QUNITS).map(function(k){return '<option value="'+k+'"'+((l.unit||'')===k?' selected':'')+'>'+T(QUNITS[k])+'</option>';}).join('')+'</select>'
      +'<label class="sr" for="'+base+'-p">Prix unitaire</label><input class="pv num" id="'+base+'-p" inputmode="decimal" data-draft data-f="pu" value="'+esc(l.pu==null||l.pu===''?'':String(l.pu).replace('.',LANG==='fr'?',':'.'))+'" placeholder="0"'+at+' autocomplete="off">'
      +(vf?'':'<label class="sr" for="'+base+'-v">TVA</label><select class="pv" id="'+base+'-v" data-f="tva"'+at+'>'+Object.keys(ropts).sort(function(a,b){return b-a;}).map(function(k){return '<option value="'+k+'"'+(qn(l.tva)===Number(k)?' selected':'')+'>'+ropts[k]+'</option>';}).join('')+'</select>')
      +'<span class="ql-tot">'+nt(money(qLineHT(l)))+'</span>'
      +'<span class="ql-acts">'+(ro?'':(i>0?'<button class="ib sm" data-act="q-lmove" data-id="'+qid+'" data-line="'+lid+'" data-dir="-1" aria-label="Monter la ligne" title="Monter">'+ic('up')+'</button>':'')+(i<n-1?'<button class="ib sm" data-act="q-lmove" data-id="'+qid+'" data-line="'+lid+'" data-dir="1" aria-label="Descendre la ligne" title="Descendre">'+ic('down')+'</button>':'')+'<button class="ib sm dng" data-act="q-ldel" data-id="'+qid+'" data-line="'+lid+'" aria-label="Supprimer la ligne" title="Supprimer la ligne">'+ic('x')+'</button>')+'</span></div>';
  });
  if(!ro)h+='<div class="ql-add"><button class="btn quiet sm" data-act="q-ladd" data-id="'+qid+'">'+ic('plus')+'Ajouter une ligne</button>'+(qHistory().length?'<span class="hint hide-s">Retape une prestation déjà facturée : son prix se remplit tout seul.</span>':'')+'</div>';
  h+='<datalist id="ql-hist">'+qHistory().slice(0,80).map(function(l){return '<option value="'+escRaw(l.t)+'">';}).join('')+'</datalist></div>';
  /* totaux */
  h+='<div class="qtot panel">';
  if(t.disc)h+='<div><span>Sous-total</span><span>'+nt(money(t.sub))+'</span></div><div><span>'+tf('Remise {0} %',qNumTxt(t.disc))+'</span><span>− '+nt(money(t.discAmt))+'</span></div>';
  if(vf)h+='<div class="big"><span>Total</span><span>'+nt(money(t.ttc))+'</span></div><p class="hint">'+esc(bizOf().vatNote||T('TVA non applicable, art. 293 B du CGI'))+'</p>';
  else{
    h+='<div><span>Total HT</span><span>'+nt(money(t.ht))+'</span></div>';
    t.rates.forEach(function(r){h+='<div><span>TVA '+qNumTxt(r.rate)+' %</span><span>'+nt(money(r.amt))+'</span></div>';});
    h+='<div class="big"><span>Total TTC</span><span>'+nt(money(t.ttc))+'</span></div>';
  }
  if(qKind(q)==='quote'&&t.dep)h+='<p class="hint">'+tf('Acompte à la signature : {0}',nt(money(t.depAmt)))+'</p>';
  return h+'</div>';
}
function qActions(q){
  var kind=qKind(q), s=q.status||'draft', es=qStatus(q), id=esc(q.id), h='', t=qTotals(q);
  var c=qClient(q), mail=c&&validEmail(String(c.email||'').trim());
  h+='<button class="btn primary" data-act="q-print" data-id="'+id+'" title="Ouvre le document : imprime-le ou enregistre-le en PDF">'+ic('download')+'PDF</button>';
  h+='<button class="btn" data-act="q-mail" data-id="'+id+'" title="'+(mail?'Prépare un e-mail à ton client':'Prépare un e-mail (ajoute l’adresse de ton client dans sa fiche)')+'">'+ic('msg')+'Envoyer</button>';
  if(kind==='quote'){
    if(s==='draft')h+='<button class="btn" data-act="q-set" data-id="'+id+'" data-st="sent">'+ic('arrow')+'Marquer envoyé</button>';
    if(s==='sent'){h+='<button class="btn" data-act="q-set" data-id="'+id+'" data-st="accepted">'+ic('check')+'Accepté</button><button class="btn quiet" data-act="q-set" data-id="'+id+'" data-st="refused">'+ic('x')+'Refusé</button>';}
    if(es==='sent'||es==='expired')h+='<button class="btn quiet" data-act="q-remind" data-id="'+id+'">'+ic('bell')+'Relancer</button>';
    if(s==='accepted'||s==='sent'){
      if(t.dep)h+='<button class="btn" data-act="q-inv" data-id="'+id+'" data-mode="dep">'+ic('receipt')+'Facture d’acompte</button>';
      var hasDep=S.quotes.some(function(x){return qKind(x)==='invoice'&&x.fromId===q.id&&x.dep&&x.status!=='cancelled';});
      h+='<button class="btn" data-act="q-inv" data-id="'+id+'" data-mode="full">'+ic('receipt')+(hasDep?'Facture de solde':'Créer la facture')+'</button>';
      if(q.projectId&&projById(q.projectId))h+='<button class="btn quiet" data-act="view" data-id="'+esc(q.projectId)+'">'+ic('grid')+'Ouvrir le projet</button>';
      else h+='<button class="btn" data-act="q-proj" data-id="'+id+'" title="Un projet avec une carte par ligne, relié au client et au montant">'+ic('grid')+'Créer le projet</button>';
    }
    if(s==='accepted'||s==='refused')h+='<button class="btn quiet" data-act="q-set" data-id="'+id+'" data-st="draft">Repasser en brouillon</button>';
  }else{
    if(s==='draft')h+='<button class="btn" data-act="q-set" data-id="'+id+'" data-st="sent" title="Lui donne son numéro définitif. Ensuite, elle ne se modifie plus.">'+ic('check')+'Valider la facture</button>';
    if(s==='sent'){h+='<button class="btn" data-act="q-set" data-id="'+id+'" data-st="paid">'+ic('check')+'Marquer payée</button>';if(es==='late')h+='<button class="btn quiet" data-act="q-remind" data-id="'+id+'">'+ic('bell')+'Relancer</button>';}
    if(s==='paid')h+='<button class="btn quiet" data-act="q-set" data-id="'+id+'" data-st="sent">Pas encore payée</button>';
    if(s==='sent'||s==='paid'){h+=S.confirm==='qc:'+q.id?'<span class="cnt">Annuler cette facture ?</span><button class="btn danger sm" data-act="q-set" data-id="'+id+'" data-st="cancelled">Annuler la facture</button><button class="btn sm" data-act="cancel">Non</button>':'<button class="btn quiet" data-act="q-cancel" data-id="'+id+'">Annuler la facture</button>';}
  }
  h+='<button class="btn quiet" data-act="q-dup" data-id="'+id+'">'+ic('copy')+'Dupliquer</button>';
  if(kind==='quote'||s==='draft')h+=S.confirm==='q:'+q.id?'<span class="cnt">Supprimer ce document ?</span><button class="btn danger sm" data-act="q-del" data-id="'+id+'">Supprimer</button><button class="btn sm" data-act="cancel">Annuler</button>':'<button class="btn quiet" data-act="q-del" data-id="'+id+'">'+ic('trash')+'Supprimer</button>';
  return '<div class="row-btns qacts">'+h+'</div>';
}
function vQuote(q){
  if(!q)return empty('file','Document introuvable','Il a peut-être été supprimé.','<button class="btn" data-act="view" data-id="quotes">Retour aux devis</button>');
  var kind=qKind(q), ro=qLocked(q), id=esc(q.id), es=qStatus(q);
  var copts={'':T('Choisir un client')}; S.clients.forEach(function(c){copts[c.id]=c.name+(c.company?' · '+c.company:'');});
  var popts={'':T('Aucun')}; S.projects.filter(function(p){return isMine(p)&&(pstat(p)!=='archived'||p.id===q.projectId);}).forEach(function(p){popts[p.id]=p.name;});
  var h=qSetupNote();
  h+='<div class="phead qhead"><p class="eyebrow">'+nt(kind==='invoice'?(q.dep?T('Facture d’acompte'):T('Facture')):qKindName('quote'))+' · '+(q.num?esc(q.num):T('numéro attribué à la validation'))+'</p>';
  h+='<div class="ptitle"><label class="sr" for="qt-title">Objet</label>'+(ro?'<h1 class="grow">'+esc(q.title||qKindName(kind))+'</h1>':'<input class="h1in grow" id="qt-title" value="'+esc(q.title||'')+'" data-draft data-change="qf" data-f="title" data-id="'+id+'" placeholder="'+(kind==='quote'?T('Objet du devis, ex. Refonte du site'):T('Objet de la facture'))+'" autocomplete="off">')+qChip(q)+'</div>';
  if(ro)h+='<p class="hint">'+(kind==='invoice'?(es==='cancelled'?'Facture annulée : elle reste dans tes comptes avec son numéro. Duplique-la pour en refaire une.':'Facture validée : elle ne se modifie plus. Pour corriger une erreur, annule-la et duplique-la.'):'Devis '+(q.status==='accepted'?'accepté':'refusé')+' : repasse-le en brouillon pour le modifier.')+'</p>';
  h+='<div class="props">'
    +prop('Client',selH('qt-client','qf',id,copts,q.clientId||'','pv',' data-f="clientId"'+(ro?' disabled':'')),'qt-client')
    +prop('Projet',selH('qt-proj','qf',id,popts,q.projectId||'','pv',' data-f="projectId"'+(ro?' disabled':'')),'qt-proj')
    +prop('Date',qIn('qt-date',q,'date',q.date,ro,' type="date"'),'qt-date')
    +(kind==='quote'?prop('Valable jusqu’au',qIn('qt-until',q,'until',q.until,ro,' type="date"'),'qt-until'):prop('Échéance',qIn('qt-due',q,'due',q.due,ro,' type="date"'),'qt-due'))
    +(kind==='quote'?prop('Numéro',qIn('qt-num',q,'num',q.num,ro),'qt-num'):'')
    +prop('Remise (%)',qIn('qt-disc',q,'disc',q.disc?q.disc:'',ro,' inputmode="decimal" placeholder="0"'),'qt-disc')
    +(kind==='quote'?prop('Acompte (%)',qIn('qt-dep',q,'dep',q.dep?q.dep:'',ro,' inputmode="decimal" placeholder="0"'),'qt-dep'):'')
    +prop('TVA','<label class="qchk"><input type="checkbox" id="qt-vf" data-change="qf" data-f="vatFree" data-id="'+id+'"'+(qVatFree(q)?' checked':'')+(ro?' disabled':'')+'> Non applicable (micro-entreprise)</label>','qt-vf')
    +'</div>';
  var c=qClient(q);
  if(c&&!c.address&&!ro)h+='<p class="hint">'+tf('L’adresse de {0} n’est pas renseignée : ajoute-la dans sa fiche pour qu’elle figure sur le document.',esc(c.name))+' <button class="linkbtn" data-act="view" data-id="c:'+esc(c.id)+'">Ouvrir la fiche</button></p>';
  if(!S.clients.length&&!ro)h+='<p class="hint">Pas encore de client : <button class="linkbtn" data-act="new-client">ajoute-en un</button> pour qu’il apparaisse sur le document.</p>';
  h+=qActions(q)+'</div>';
  h+='<section class="sect"><h2>'+ic('list')+'Lignes</h2>'+qLinesHtml(q,ro)+'</section>';
  h+='<div class="qtexts"><section class="sect"><h2><label for="qt-notes">Message au client</label></h2><textarea class="area sm" id="qt-notes" data-draft data-change="qf" data-f="notes" data-id="'+id+'"'+(ro?' disabled':'')+' placeholder="Affiché sur le document : déroulé, délais, ce qui est inclus ou non…">'+esc(q.notes||'')+'</textarea></section>'
    +'<section class="sect"><h2><label for="qt-terms">Conditions</label></h2><textarea class="area sm" id="qt-terms" data-draft data-change="qf" data-f="terms" data-id="'+id+'"'+(ro?' disabled':'')+'>'+esc(q.terms||'')+'</textarea></section></div>';
  /* documents reliés */
  var rel=[];
  if(q.fromId){var src=qById(q.fromId);if(src)rel.push(src);}
  S.quotes.forEach(function(x){if(x.fromId===q.id)rel.push(x);});
  if(rel.length)h+='<section class="sect"><h2>'+ic('nodes')+'Documents reliés</h2>'+qListHtml(rel,'')+'</section>';
  return h;
}
/* réglages : infos de l'entreprise imprimées sur les documents */
function bizCard(){
  var b=bizOf();
  function f(k,label,hint,attrs){return '<div class="srow"><label for="bz-'+k+'">'+label+(hint?'<small>'+hint+'</small>':'')+'</label><input class="in" id="bz-'+k+'" value="'+esc(b[k]==null?'':b[k])+'" data-draft data-change="biz" data-f="'+k+'"'+(attrs||'')+' autocomplete="off"></div>';}
  var h='<section class="panel scard" id="biz"><h2>'+ic('receipt')+'Entreprise (devis et factures)</h2><p class="hint">Ces informations sont imprimées sur tes devis et factures. Visibles par toi seul.</p>';
  h+=f('name','Nom ou raison sociale','Ex. Camille Martin, ou Studio Martin')
    +f('legal','Statut','Ex. Entrepreneur individuel, SASU au capital de 1 000 €')
    +'<div class="srow"><label for="bz-address">Adresse</label><textarea class="area sm" id="bz-address" rows="2" data-draft data-change="biz" data-f="address" placeholder="12 rue des Lilas&#10;75011 Paris">'+esc(b.address||'')+'</textarea></div>'
    +f('siret','SIRET')+f('email','E-mail',null,' type="email"')+f('phone','Téléphone',null,' type="tel"')
    +f('iban','IBAN','Imprimé sur les factures pour le virement')+f('bic','BIC')
    +'<div class="srow"><span>TVA<small>Cochée : « TVA non applicable, art. 293 B du CGI » sur tes documents.</small></span><label class="qchk"><input type="checkbox" id="bz-vatFree" data-change="biz" data-f="vatFree"'+(b.vatFree?' checked':'')+'> Franchise en base (micro-entreprise)</label></div>'
    +(b.vatFree?'':f('tva','Taux de TVA par défaut (%)',null,' inputmode="decimal" placeholder="20"')+f('vatNo','N° de TVA intracommunautaire'))
    +f('validity','Validité des devis (jours)',null,' inputmode="numeric" placeholder="30"')
    +f('payDays','Délai de paiement des factures (jours)',null,' inputmode="numeric" placeholder="30"')
    +f('dep','Acompte par défaut sur les devis (%)',null,' inputmode="decimal" placeholder="0"')
    +f('qpre','Préfixe des devis',null,' placeholder="D" maxlength="8"')+f('ipre','Préfixe des factures',null,' placeholder="F" maxlength="8"')
    +f('color','Couleur du titre',null,' type="color"')
    +'<div class="srow"><label for="bz-footer">Pied de page<small>Ex. RCS, assurance professionnelle, médiateur.</small></label><textarea class="area sm" id="bz-footer" rows="2" data-draft data-change="biz" data-f="footer">'+esc(b.footer||'')+'</textarea></div>';
  return h+'</section>';
}
/* fiche client et projet : leurs documents */
function qForClient(c){
  var list=S.quotes.filter(function(q){return q.clientId===c.id;}).sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));});
  var h='<section class="sect"><h2 class="row">'+ic('file')+'Devis et factures<span class="grow"></span><button class="btn sm" data-act="q-new" data-id="invoice" data-c="'+esc(c.id)+'">'+ic('receipt')+'Facture</button><button class="btn sm primary" data-act="q-new" data-id="quote" data-c="'+esc(c.id)+'">'+ic('plus')+'Devis</button></h2>';
  return h+(list.length?qListHtml(list,''):'<p class="hint">Aucun devis ni facture pour ce client.</p>')+'</section>';
}
function qForProject(e){
  var list=S.quotes.filter(function(q){return q.projectId===e.p.id;});
  var h='<div class="qproj"><span class="hint grow">'+(list.length?tf('Documents : {0}',list.map(function(q){return '<button class="linkbtn" data-act="view" data-id="q:'+esc(q.id)+'">'+esc(q.num||T('Brouillon'))+'</button> ('+T(qStLabel(q)).toLowerCase()+')';}).join(', ')):T('Aucun devis ni facture pour ce projet.'))+'</span>';
  return h+'<button class="btn sm" data-act="q-new" data-id="quote" data-p="'+esc(e.p.id)+'">'+ic('file')+'Faire un devis</button><button class="btn sm" data-act="q-new" data-id="invoice" data-p="'+esc(e.p.id)+'">'+ic('receipt')+'Facturer</button></div>';
}

/* ---------- branchements ---------- */
function quoteClick(act,id,b){
  if(act.indexOf('q-')!==0)return false;
  if(act!=='q-del'&&act!=='q-cancel'&&!(act==='q-set'&&b.dataset.st==='cancelled'))S.confirm=null;
  var q=id?qById(id):null;
  if(act==='q-new'){closeOverlays();qNewFor(id==='invoice'?'invoice':'quote',{clientId:b.dataset.c,projectId:b.dataset.p});render();return true;}
  if(act==='q-tab'){QV.tab=id==='invoice'?'invoice':'quote';QV.st='all';LS.set('qtab',QV.tab);render();return true;}
  if(act==='q-st'){QV.st=id;render();return true;}
  if(act==='q-filter'){var p=id.split(':');QV.tab=p[0];QV.st=p[1];LS.set('qtab',QV.tab);render();return true;}
  if(act==='q-csv'){qExportCsv();return true;}
  if(act==='q-biz'){go('settings');render();setTimeout(function(){var el=document.getElementById('biz');if(el)try{el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_){el.scrollIntoView();}var f=document.getElementById('bz-name');if(f)f.focus({preventScroll:true});},60);return true;}
  if(!q){render();return true;}
  var locked=qLocked(q);
  if(act==='q-print'){qPrint(q);return true;}
  if(act==='q-mail'){qMailto(q,'send');render();return true;}
  if(act==='q-remind'){qMailto(q,'remind');render();return true;}
  if(act==='q-set'){qSetStatus(q,b.dataset.st);S.confirm=null;render();return true;}
  if(act==='q-cancel'){S.confirm='qc:'+q.id;render();return true;}
  if(act==='q-inv'){qInvoiceFrom(q,b.dataset.mode==='dep'?'dep':'full');render();return true;}
  if(act==='q-proj'){qToProject(q);render();return true;}
  if(act==='q-dup'){qDup(q);render();return true;}
  if(act==='q-del'){if(S.confirm==='q:'+q.id)qDelete(q);else S.confirm='q:'+q.id;render();return true;}
  if(locked){render();return true;}
  var lines=(q.lines||[]).slice(), li=lines.findIndex(function(l){return l.id===b.dataset.line;});
  if(act==='q-ladd'){var nl=qBlank();lines.push(nl);S.focus='ql-'+nl.id+'-t';qSave(q,{lines:lines});render();return true;}
  if(act==='q-ldel'&&li>=0){var gone=lines.splice(li,1)[0];if(!lines.length)lines.push(qBlank());qSave(q,{lines:lines});if(String(gone.t||'').trim())toast('Ligne supprimée.',{undo:function(){var cur=qById(q.id);if(!cur)return;var l2=(cur.lines||[]).slice();l2.splice(Math.min(li,l2.length),0,gone);qSave(cur,{lines:l2});}});render();return true;}
  if(act==='q-lmove'&&li>=0){var j=li+(parseInt(b.dataset.dir,10)||0);if(j>=0&&j<lines.length){var tmp=lines[li];lines[li]=lines[j];lines[j]=tmp;qSave(q,{lines:lines});}render();return true;}
  render();return true;
}
function quoteChange(k,id,v,el){
  if(k!=='qf'&&k!=='ql'&&k!=='biz')return false;
  /* un champ remplacé pendant un rafraîchissement n'est pas une validation */
  if(S.painting||!el.isConnected){if(el.id&&el.type!=='checkbox'&&el.tagName!=='SELECT')S.dirty[el.id]=true;return true;}
  var f=el.dataset.f;
  if(k==='biz'){
    var b=Object.assign({},bizOf());
    if(f==='vatFree')b.vatFree=!!el.checked;
    else if(f==='address'||f==='footer')b[f]=v;
    else b[f]=v.trim();
    saveCfg({biz:b});render();return true;
  }
  var q=qById(id); if(!q)return true;
  if(qLocked(q)){render();return true;}
  if(k==='qf'){
    var patch={};
    if(f==='vatFree')patch.vatFree=!!el.checked;
    else if(f==='disc'||f==='dep'){var n=Math.min(100,Math.max(0,qn(v)));patch[f]=v.trim()===''?0:r2(n);}
    else if(f==='num'){v=v.replace(/\s+/g,' ').trim();if(!v){render();return true;}patch.num=v.slice(0,40);}
    else if(f==='title')patch.title=v.replace(/\s+/g,' ').trim().slice(0,200);
    else if(f==='notes'||f==='terms')patch[f]=v;
    else if(f==='projectId'){patch.projectId=v;var pp=projById(v);if(pp&&!q.clientId&&metaOf(pp.id).clientId)patch.clientId=metaOf(pp.id).clientId;}
    else patch[f]=v;
    /* devis daté d'une autre année : son numéro automatique suit l'année */
    var oy=String(q.date||'').slice(0,4);
    if(f==='date'&&v&&qKind(q)==='quote'&&oy&&oy!==v.slice(0,4)&&new RegExp('^'+(bizOf().qpre||'D')+'-'+oy+'-\\d+$').test(String(q.num||'')))patch.num=qNextNum('quote',v);
    qSave(q,patch);render();return true;
  }
  /* ligne */
  var lines=(q.lines||[]).map(function(l){return Object.assign({},l);}), l=lines.find(function(x){return x.id===el.dataset.line;});
  if(!l){render();return true;}
  if(f==='t'){
    l.t=v.replace(/\s+/g,' ').trim().slice(0,300);
    if(String(l.pu)===''||qn(l.pu)===0){
      var hit=qHistory().find(function(x){return norm(x.t).trim()===norm(l.t).trim();});
      if(hit){l.pu=hit.pu;l.unit=hit.unit||'';if(!qVatFree(q))l.tva=hit.tva;toast(tf('Prix repris : {0}.',nt(money(qn(hit.pu)))));}
    }
  }
  else if(f==='q'||f==='pu'){l[f]=v.trim()===''?'':r2(qn(v));}
  else if(f==='tva')l.tva=qn(v);
  else if(f==='unit')l.unit=QUNITS[v]!=null?v:'';
  qSave(q,{lines:lines});render();return true;
}
document.body.addEventListener('input',function(ev){
  var el=ev.target;
  if(el&&el.id==='qq-s'){QV.q=el.value;render();return;}
});
