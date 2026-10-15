/* On Stride — panneau de tâche redimensionnable.
   - Tirer le bord gauche du panneau change sa largeur (gardée pour la prochaine fois).
   - Le bouton « Agrandir » l'ouvre en grand ; le même bouton le remet comme avant (choix gardé).
   La page derrière se pousse toujours de la largeur du panneau : rien ne passe dessous. */
'use strict';
var PW={min:380,def:520,w:Number(LS.get('pw',520))||520,wide:!!LS.get('pwide',false)};
function pwMax(){return Math.max(PW.min,Math.min(1000,(window.innerWidth||1200)-560));}
function pwApply(){
  var w=Math.round(Math.max(PW.min,Math.min(pwMax(),PW.w)));
  document.documentElement.style.setProperty('--pw',w+'px');
  document.body.classList.toggle('panel-wide',PW.wide);
  /* s'il ne resterait pas assez de place pour la page, le panneau passe au-dessus (avec un fond) au lieu de l'écraser */
  var app=document.getElementById('app'), sb=app?app.dataset.sb:'open', sw=(window.innerWidth||1200)<700?0:sb==='rail'?64:sb==='hidden'?0:264;
  document.body.classList.toggle('panel-over',(window.innerWidth||1200)-sw-w-32<600);
}
function pwToggleWide(){PW.wide=!PW.wide;LS.set('pwide',PW.wide);pwApply();}
pwApply();
window.addEventListener('resize',pwApply);
document.body.addEventListener('pointerdown',function(ev){
  var h=ev.target.closest&&ev.target.closest('.tp-resize'); if(!h||PW.wide)return;
  ev.preventDefault();
  var startX=ev.clientX, startW=PW.w=Math.max(PW.min,Math.min(pwMax(),PW.w));
  document.body.classList.add('pw-drag');
  function mv(e){PW.w=Math.max(PW.min,Math.min(pwMax(),startW+(startX-e.clientX)));pwApply();}
  function up(){window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);document.body.classList.remove('pw-drag');LS.set('pw',Math.round(PW.w));}
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
});
/* double-clic sur la poignée : largeur par défaut */
document.body.addEventListener('dblclick',function(ev){
  if(ev.target.closest&&ev.target.closest('.tp-resize')){PW.w=PW.def;LS.set('pw',PW.w);pwApply();}
});
function layoutClick(act){
  if(act==='pw-wide'){pwToggleWide();render();return true;}
  return false;
}
