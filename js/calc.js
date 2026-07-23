/**
 * Fonctions de calcul pures (aucune dépendance au DOM/Supabase).
 * Extraites d'app.js pour pouvoir être testées isolément (voir test.html)
 * sans avoir besoin d'installer d'outillage supplémentaire.
 */

// toISOString() renvoie l'heure UTC, pas locale : en France (UTC+1/+2), entre
// minuit local et le passage à minuit UTC, ça renvoyait encore la date de la
// veille — décalait "aujourd'hui"/"ce mois-ci" pendant 1 à 2h chaque nuit
// (ventes du jour non comptées, date d'achat par défaut fausse...). Construit
// depuis les composants de date LOCAUX à la place (signalé le 2026-07-22).
function today(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function daysBetween(d1,d2){if(!d1||!d2)return null;return Math.round((new Date(d2)-new Date(d1))/86400000);}

// Recherche insensible aux accents et à l'ordre des mots (repéré chez
// Vinteer le 2026-07-23) : "jean levis" retrouve "Levis Jean bleu". Chaque
// mot de la recherche doit apparaître quelque part dans le texte, dans
// n'importe quel ordre — pas de correspondance exacte de sous-chaîne.
function normalizeSearch(s){
  return (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function matchesSearch(text, term){
  if(!term) return true;
  const normText=normalizeSearch(text);
  const words=normalizeSearch(term).split(/\s+/).filter(Boolean);
  return words.every(w=>normText.includes(w));
}

function fmtPrice(v){return parseFloat(v||0).toFixed(2).replace('.',',')+' €';}

function fmtDate(d){ if(!d) return '—'; const dt=new Date(d); return isNaN(dt)?'—':dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}); }

// Une vente remboursée n'a rapporté aucun profit réel : l'argent a été rendu.
function calcProfit(a){
  if(a.vinted_transaction_status==='failed') return 0;
  return(parseFloat(a.sell_price)||0)-(parseFloat(a.buy_price)||0)-(parseFloat(a.extra_costs)||0);
}

// Chiffre d'affaires : même règle que calcProfit, une vente remboursée ne compte pas.
function calcCA(a){
  if(a.vinted_transaction_status==='failed') return 0;
  return parseFloat(a.sell_price)||0;
}

// Il faut à la fois un volume significatif (8+ favoris) ET un rythme rapide (2+/jour en moyenne).
function isTrending(a){
  if(a.status!=='stock'||!a.vinted_item_id) return false;
  const d=daysBetween(a.buy_date||a.created_at?.split('T')[0],today());
  if(d===null||d<1) return false;
  const favoris=a.vinted_favoris||0;
  return favoris>=8 && (favoris/d)>=2;
}

function calcScore(a) {
  const profit=calcProfit(a);
  const days=daysBetween(a.buy_date,a.sell_date);
  let score=50;
  if(profit>50) score+=20; else if(profit>20) score+=10; else if(profit<0) score-=20;
  const roi=a.buy_price>0?(profit/a.buy_price*100):0;
  if(roi>100) score+=20; else if(roi>50) score+=10; else if(roi<0) score-=10;
  if(days!==null && days>=0){if(days<=7) score+=10; else if(days<=30) score+=5; else if(days>90) score-=10;}
  return Math.min(100,Math.max(0,score));
}

// Utilisable depuis le navigateur (variables globales) et depuis Node (require) sans changement.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { today, daysBetween, fmtPrice, fmtDate, calcProfit, calcCA, isTrending, calcScore };
}
