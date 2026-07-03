const SUPABASE_URL = 'https://iprrnmrndjfdlozxjbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcnJubXJuZGpmZGxvenhqYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjUxOTksImV4cCI6MjA5ODA0MTE5OX0.JAteIwydCEoOe6S3z-Isq6-TwRLBdGpU8akn_1FvQb0';
const LOGO_LIGHT = 'img/logo-light.png';
const LOGO_DARK  = 'img/logo-dark.png';
const BACKEND = 'https://web-production-662dc1.up.railway.app';
// Passez à true une fois l'extension approuvée sur le Chrome Web Store.
const EXTENSION_PUBLISHED = false;
const EXTENSION_STORE_URL = 'https://chromewebstore.google.com/detail/vinted-manager/feedjnhhdfeojkocphjgnbjginadclip';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null, allArticles = [], selectedPhotoFile = null, deleteTargetId = null;
let currentFilter = { stock: 'Tous', vendus: 'Tous', preparation: 'all' };
let selectMode = { stock: false, prep: false };
let selectedIds = { stock: new Set(), prep: new Set() };

const PREP_STEPS = [
  { key: 'laver',      label: '🧺 À laver',       color: '#60a5fa' },
  { key: 'photo',      label: '📸 À photographier', color: '#a78bfa' },
  { key: 'publier',    label: '✍️ À publier',       color: '#f59e0b' },
  { key: 'stock',      label: '📦 En stock',        color: '#00e5a0' },
  { key: 'expedition', label: '🚚 À expédier',      color: '#fb923c' },
  { key: 'vendu',      label: '💰 Vendu',           color: '#34d399' },
];

const PAGE_TITLES = { dashboard:'Tableau de bord', preparation:'Mode préparation', stock:'Stock', expedition:'À expédier', vendus:'Vendus', achats:'Achats', messages:'Messages Vinted', analytics:'Statistiques', objectif:'Objectifs', replay:'Resell Replay', settings:'Paramètres' };

// ── THEME ──
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  const logo = t === 'dark' ? LOGO_DARK : LOGO_LIGHT;
  document.querySelectorAll('.app-logo').forEach(el => el.src = logo);
  document.getElementById('btnDark')?.classList.toggle('active', t==='dark');
  document.getElementById('btnLight')?.classList.toggle('active', t==='light');
}
window.setTheme = setTheme;
function initTheme() {
  // Bascule tout le monde une seule fois vers le nouveau défaut "clair" (même les
  // visiteurs déjà passés sur le site avant ce changement, qui avaient "sombre"
  // enregistré sans l'avoir choisi). Les choix faits après cette bascule sont respectés.
  if (!localStorage.getItem('theme_default_migrated')) {
    localStorage.setItem('theme_default_migrated', '1');
    localStorage.setItem('theme', 'light');
  }
  setTheme(localStorage.getItem('theme') || 'light');
}

// ── LANDING ──
window.showAuth = (tab) => {
  document.getElementById('landingScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  switchTab(tab);
};
window.showLanding = () => {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('landingScreen').style.display = 'block';
};

// ── AUTH ──
window.switchTab = (tab) => {
  ['loginForm','registerForm','forgotForm'].forEach(id => document.getElementById(id).style.display='none');
  document.getElementById(tab+'Form').style.display='block';
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active',(tab==='login'&&i===0)||(tab==='register'&&i===1)));
  document.getElementById('authError').textContent='';
  document.getElementById('authSuccess').textContent='';
};

window.doLogin = async () => {
  const email=document.getElementById('loginEmail').value.trim(), password=document.getElementById('loginPwd').value;
  if(!email||!password){showError('Remplissez tous les champs.');return;}
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){showError('Email ou mot de passe incorrect.');return;}
  loginAs(data.user);
};

window.doRegister = async () => {
  const name=document.getElementById('regName').value.trim(), email=document.getElementById('regEmail').value.trim(), password=document.getElementById('regPwd').value;
  if(!name||!email||!password){showError('Remplissez tous les champs.');return;}
  if(password.length<6){showError('Mot de passe trop court (6 car. min).');return;}
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{name}}});
  if(error){showError(error.message);return;}
  loginAs(data.user);
};

window.doForgot = async () => {
  const email=document.getElementById('forgotEmail').value.trim();
  if(!email){showError('Entrez votre email.');return;}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
  if(error){showError(error.message);return;}
  document.getElementById('authSuccess').textContent='✓ Email envoyé ! Vérifiez votre boîte mail.';
};

window.sendResetEmail = async () => {
  const {error}=await sb.auth.resetPasswordForEmail(currentUser.email,{redirectTo:window.location.origin});
  document.getElementById('settingsMsg').textContent = error ? 'Erreur : '+error.message : '✓ Email de réinitialisation envoyé !';
};

window.doLogout = async () => {
  await sb.auth.signOut();
  currentUser=null; allArticles=[];
  document.getElementById('authScreen').style.display='none';
  document.getElementById('mainApp').style.display='none';
  document.getElementById('landingScreen').style.display='block';
};

function showError(msg){document.getElementById('authError').textContent=msg;}

function loginAs(user) {
  currentUser=user;
  const name=user.user_metadata?.name||user.email.split('@')[0];
  document.getElementById('landingScreen').style.display='none';
  document.getElementById('authScreen').style.display='none';
  document.getElementById('mainApp').style.display='flex';
  document.getElementById('userName').textContent=name;
  document.getElementById('userAvatar').textContent=name.charAt(0).toUpperCase();
  const t=localStorage.getItem('theme')||'light';
  document.getElementById('btnDark')?.classList.toggle('active',t==='dark');
  document.getElementById('btnLight')?.classList.toggle('active',t==='light');
  loadArticles();
  maybeShowOnboarding();
}

// ── NAV ──
window.goPage = (id, btn) => {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('topbarTitle').textContent=PAGE_TITLES[id]||'';
  if(id==='settings') renderVintedConnectionStatus();
  if(id==='replay') renderReplay();
  if(id==='calendrier') renderCalendar();
  if(id==='favoris') renderFavoris();
  if(id==='republier') renderRepublier();
  if(id==='messages') renderMessages();
  if(id==='achats') renderAchats();
  if(document.querySelector('.sidebar').classList.contains('open')) toggleSidebar();
};
window.toggleSidebar=()=>document.querySelector('.sidebar').classList.toggle('open');

// ── DATES ──
window.toggleDates=()=>{
  const s=document.getElementById('mStatus').value;
  document.getElementById('sellDateField').style.display=s!=='stock'&&s!=='laver'&&s!=='photo'&&s!=='publier'?'block':'none';
};
function today(){return new Date().toISOString().split('T')[0];}
function daysBetween(d1,d2){if(!d1||!d2)return null;return Math.round((new Date(d2)-new Date(d1))/86400000);}
function sellTimeLabel(a){
  if(['stock','laver','photo','publier'].includes(a.status)) return '';
  const days=daysBetween(a.buy_date,a.sell_date||a.created_at?.split('T')[0]);
  if(days===null)return '';
  if(days===0)return 'Vendu le jour même';
  if(days===1)return 'Vendu en 1 jour';
  return `Vendu en ${days} jours`;
}

// ── HEATMAP ──
function heatmapColor(a) {
  if(!['stock','laver','photo','publier'].includes(a.status)) return null;
  const days = daysBetween(a.buy_date || a.created_at?.split('T')[0], today());
  if(days===null) return null;
  if(days<=30) return {color:'#00e5a0', label:'🟢 Récent'};
  if(days<=90) return {color:'#f59e0b', label:'🟠 Moyen'};
  return {color:'#ef4444', label:'🔴 Ancien'};
}

// ── TENDANCE (favoris qui montent vite) ──
function isTrending(a){
  if(a.status!=='stock'||!a.vinted_item_id) return false;
  const d=daysBetween(a.buy_date||a.created_at?.split('T')[0],today());
  if(d===null||d<1) return false;
  const favoris=a.vinted_favoris||0;
  // Il faut à la fois un volume significatif (8+ favoris) ET un rythme rapide (2+/jour en moyenne).
  return favoris>=8 && (favoris/d)>=2;
}

// ── SCORE ──
function calcScore(a) {
  const profit=calcProfit(a);
  const days=daysBetween(a.buy_date,a.sell_date);
  let score=50;
  if(profit>50) score+=20; else if(profit>20) score+=10; else if(profit<0) score-=20;
  const roi=a.buy_price>0?(profit/a.buy_price*100):0;
  if(roi>100) score+=20; else if(roi>50) score+=10; else if(roi<0) score-=10;
  if(days!==null){if(days<=7) score+=10; else if(days<=30) score+=5; else if(days>90) score-=10;}
  return Math.min(100,Math.max(0,score));
}

// ── PHOTO ──
window.previewPhoto=(event)=>{
  const file=event.target.files[0]; if(!file)return;
  selectedPhotoFile=file;
  const reader=new FileReader();
  reader.onload=(e)=>{
    document.getElementById('photoPreview').src=e.target.result;
    document.getElementById('photoPreview').style.display='block';
    document.getElementById('photoPlaceholder').style.display='none';
  };
  reader.readAsDataURL(file);
};
async function uploadPhoto(file,articleId){
  const ext=file.name.split('.').pop();
  const path=`${currentUser.id}/${articleId}.${ext}`;
  const {error}=await sb.storage.from('photos').upload(path,file,{upsert:true});
  if(error)return null;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

// ── LOAD ──
let allPurchases=[];
async function loadArticles(){
  const {data}=await sb.from('articles').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
  allArticles=data||[];
  const {data:purchasesData}=await sb.from('vinted_purchases').select('*').eq('user_id',currentUser.id).order('purchase_date',{ascending:false});
  allPurchases=purchasesData||[];
  renderAll();
  renderSyncBanner();
  updateMessagesBadge();
}

// ── MODAL ──
window.editArticle=(id)=>{ openModal(allArticles.find(a=>a.id===id)||null); };
window.openModal=(article=null)=>{
  selectedPhotoFile=null;
  document.getElementById('photoPreview').style.display='none';
  document.getElementById('photoPlaceholder').style.display='flex';
  document.getElementById('mPhoto').value='';
  document.getElementById('mId').value=article?.id||'';
  document.getElementById('mName').value=article?.name||'';
  document.getElementById('mBuy').value=article?.buy_price||'';
  document.getElementById('mSell').value=article?.sell_price||'';
  document.getElementById('mExtraCosts').value=article?.extra_costs||'';
  document.getElementById('mPlatform').value=article?.platform||'Vinted';
  document.getElementById('mStatus').value=article?.status||'laver';
  document.getElementById('mBuyDate').value=article?.buy_date||today();
  document.getElementById('mSellDate').value=article?.sell_date||today();
  document.getElementById('mLocation').value=article?.location||'';
  document.getElementById('mSource').value=article?.source||'Vinted';
  document.getElementById('modalTitle').textContent=article?"Modifier l'article":'Ajouter un article';
  document.getElementById('btnSave').textContent=article?'Enregistrer':'Ajouter';
  toggleDates();
  if(article?.photo_url){
    document.getElementById('photoPreview').src=article.photo_url;
    document.getElementById('photoPreview').style.display='block';
    document.getElementById('photoPlaceholder').style.display='none';
  }
  document.getElementById('modalBg').classList.add('open');
};
window.closeModal=()=>document.getElementById('modalBg').classList.remove('open');
window.handleModalBgClick=(e)=>{if(e.target===document.getElementById('modalBg'))closeModal();};

window.saveArticle=async()=>{
  const id=document.getElementById('mId').value;
  const name=document.getElementById('mName').value.trim();
  const buy=parseFloat(document.getElementById('mBuy').value.replace(',','.'))||0;
  const sell=parseFloat(document.getElementById('mSell').value.replace(',','.'))||0;
  const extra_costs=parseFloat(document.getElementById('mExtraCosts').value.replace(',','.'))||0;
  const platform=document.getElementById('mPlatform').value;
  const status=document.getElementById('mStatus').value;
  const buy_date=document.getElementById('mBuyDate').value||today();
  const sell_date=!['stock','laver','photo','publier'].includes(status)?(document.getElementById('mSellDate').value||today()):null;
  const location=document.getElementById('mLocation').value.trim();
  const source=document.getElementById('mSource').value;
  if(!name)return;

  const btn=document.getElementById('btnSave');
  btn.textContent='...'; btn.disabled=true;

  let photoUrl=id?allArticles.find(a=>a.id===id)?.photo_url:null;
  const articleId=id||crypto.randomUUID();
  if(selectedPhotoFile) photoUrl=await uploadPhoto(selectedPhotoFile,articleId);

  const payload={name,buy_price:buy,sell_price:sell,extra_costs,platform,status,buy_date,sell_date,photo_url:photoUrl,location,source};

  if(id){
    const {data}=await sb.from('articles').update(payload).eq('id',id).eq('user_id',currentUser.id).select();
    if(data){const idx=allArticles.findIndex(a=>a.id===id);if(idx>=0)allArticles[idx]=data[0];}
  } else {
    const {data}=await sb.from('articles').insert([{id:articleId,user_id:currentUser.id,...payload}]).select();
    if(data) allArticles.unshift(data[0]);
  }

  btn.textContent=id?'Enregistrer':'Ajouter'; btn.disabled=false;
  closeModal(); renderAll();
};

// ── DELETE ──
window.confirmDelete=(id)=>{
  deleteTargetId=id;
  document.getElementById('confirmBg').classList.add('open');
  document.getElementById('btnConfirmDelete').onclick=async()=>{
    await sb.from('articles').delete().eq('id',deleteTargetId).eq('user_id',currentUser.id);
    allArticles=allArticles.filter(a=>a.id!==deleteTargetId);
    closeConfirm(); renderAll();
  };
};
window.closeConfirm=()=>{document.getElementById('confirmBg').classList.remove('open');deleteTargetId=null;};

// ── PREP STEP ──
window.moveToStep=async(id,step)=>{
  const sell_date=!['stock','laver','photo','publier'].includes(step)?today():null;
  const {data}=await sb.from('articles').update({status:step,sell_date}).eq('id',id).eq('user_id',currentUser.id).select();
  if(data){const idx=allArticles.findIndex(a=>a.id===id);if(idx>=0)allArticles[idx]=data[0];}
  renderAll();
};

// ── FILTERS ──
window.filterPlatform=(p,btn,section)=>{
  currentFilter[section]=p;
  btn.closest('.page-filters').querySelectorAll('.pf-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(section==='stock') renderStock();
  if(section==='vendus') renderVendus();
};

window.filterPrep=(step,btn)=>{
  currentFilter.preparation=step;
  document.querySelectorAll('.prep-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderPreparation();
};

// ── HELPERS ──
function calcProfit(a){
  if(a.vinted_transaction_status==='failed') return 0;
  return(parseFloat(a.sell_price)||0)-(parseFloat(a.buy_price)||0)-(parseFloat(a.extra_costs)||0);
}
function fmtPrice(v){return parseFloat(v||0).toFixed(2).replace('.',',')+' €';}
function fmtDate(d){ if(!d) return '—'; const dt=new Date(d); return isNaN(dt)?'—':dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function platformBadgeClass(p){return{Vinted:'badge-vinted',eBay:'badge-ebay',Leboncoin:'badge-leboncoin'}[p]||'badge-autre';}

function stepBadge(s){
  const step=PREP_STEPS.find(p=>p.key===s);
  if(!step) return '';
  return `<span class="badge" style="background:${step.color}22;color:${step.color}">${step.label}</span>`;
}

function heatBadge(a){
  const h=heatmapColor(a);
  return h?`<span class="badge badge-clickable" style="background:${h.color}22;color:${h.color};font-size:10px;" onclick="showHeatInfo()">${h.label}</span>`:'';
}

function photoEl(a){
  if(a.photo_url) return `<div class="article-photo"><img src="${a.photo_url}" alt="${a.name}" /></div>`;
  return `<div class="article-photo">📦</div>`;
}

function articleHTML(a, opts={}) {
  const profit=a.status==='vendu'?calcProfit(a):0;
  const sellTime=sellTimeLabel(a);
  const heat=heatBadge(a);
  const locBadge=a.location?`<span class="badge badge-autre">📍 ${a.location}</span>`:'';
  const scoreVal=a.status==='vendu'?calcScore(a):null;
  const scoreRoi=a.buy_price>0?(profit/a.buy_price*100):0;
  const scoreDays=daysBetween(a.buy_date,a.sell_date);
  const scoreBadge=scoreVal!==null?`<span class="badge badge-clickable" style="background:${scoreVal>=70?'#00e5a022':'#f59e0b22'};color:${scoreVal>=70?'#00e5a0':'#f59e0b'}" onclick="showScoreInfo(${scoreVal},${profit},${scoreRoi},${scoreDays===null?'null':scoreDays})">⭐ ${scoreVal}/100</span>`:'';
  const vintedStatsBadge=a.vinted_item_id&&a.status==='stock'
    ?`<span class="badge badge-vinted badge-clickable" title="Voir l'évolution" onclick="showHistory('${a.vinted_item_id}','${a.name.replace(/'/g,"\\'")}')">👁️ ${a.vinted_vues||0} · ❤️ ${a.vinted_favoris||0}</span>`:'';
  const trendingBadge=isTrending(a)?`<span class="badge badge-clickable" style="background:#fb923c22;color:#fb923c;" onclick="showTrendingInfo()">🔥 Tendance</span>`:'';
  const shippingBadge=a.status==='vendu'&&a.vinted_shipping_status?orderStatusBadge(a.vinted_transaction_status,a.vinted_shipping_status):'';
  const nextStep=PREP_STEPS[PREP_STEPS.findIndex(p=>p.key===a.status)+1];
  const moveBtn=opts.showMove&&nextStep?`<button class="btn-edit" style="font-size:10px;" onclick="moveToStep('${a.id}','${nextStep.key}')">→ ${nextStep.label}</button>`:'';
  const checkbox=opts.selectSection&&selectMode[opts.selectSection]
    ?`<input type="checkbox" class="article-select-checkbox" ${selectedIds[opts.selectSection].has(a.id)?'checked':''} onchange="toggleArticleSelect('${opts.selectSection}','${a.id}',this.checked)" />`:'';
  return `<div class="article-card" style="${heatmapColor(a)?'border-left:3px solid '+heatmapColor(a).color:''}" onclick="showDetail('${a.id}')">
    <span onclick="event.stopPropagation()">${checkbox}</span>
    ${photoEl(a)}
    <div class="article-info">
      <div class="article-name">${a.name}</div>
      <div class="article-meta">Achat ${fmtPrice(a.buy_price)} · Vente ${a.vinted_transaction_status==='failed'?fmtPrice(0):fmtPrice(a.sell_price)}${a.extra_costs?' · Frais '+fmtPrice(a.extra_costs):''}</div>
      ${sellTime?`<div class="sell-time">${sellTime}</div>`:''}
      <div class="article-badges" onclick="event.stopPropagation()">
        <span class="badge ${platformBadgeClass(a.platform)}">${a.platform}</span>
        ${stepBadge(a.status)}
        ${heat}${locBadge}${scoreBadge}${vintedStatsBadge}${trendingBadge}${shippingBadge}
      </div>
    </div>
    <div class="article-right">
      <div class="article-profit ${a.status!=='vendu'?'profit-neutral':(profit>=0?'profit-pos':'profit-neg')}">${a.status==='vendu'&&profit>=0?'+':''}${fmtPrice(profit)}</div>
      <div class="article-actions" onclick="event.stopPropagation()">
        ${moveBtn}
        <button class="btn-edit" onclick="editArticle('${a.id}')">✎</button>
        <button class="btn-edit" style="color:var(--danger);border-color:var(--danger);" onclick="confirmDelete('${a.id}')">✕</button>
      </div>
    </div>
  </div>`;
}

function emptyState(msg){return `<div class="empty-state"><div class="empty-icon">📭</div>${msg}</div>`;}

// ── RENDER ALL ──
function renderAll(){renderDashboard();renderPreparation();renderStock();renderExpedition();renderVendus();renderAnalytics();renderObjectif();}

function renderDashboard(){
  const vendus=allArticles.filter(a=>a.status==='vendu');
  const stock=allArticles.filter(a=>['stock','laver','photo','publier'].includes(a.status));
  const expedition=allArticles.filter(a=>a.status==='expedition');
  const totalProfit=vendus.reduce((s,a)=>s+calcProfit(a),0);
  const investi=stock.reduce((s,a)=>s+(parseFloat(a.buy_price)||0),0);
  const roi=investi>0?(totalProfit/investi*100):0;
  const now=new Date();
  const profitMois=vendus.filter(a=>{const d=new Date(a.sell_date||a.created_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,a)=>s+calcProfit(a),0);
  const capitalBloque=allArticles.filter(a=>{
    if(!['stock','laver','photo','publier'].includes(a.status))return false;
    const days=daysBetween(a.buy_date||a.created_at?.split('T')[0],today());
    return days!==null&&days>30;
  }).reduce((s,a)=>s+(parseFloat(a.buy_price)||0),0);
  const achatsMois=allPurchases.filter(p=>{
    const d=new Date(p.purchase_date||p.synced_at);
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  }).reduce((s,p)=>s+(p.transaction_status==='failed'?0:(parseFloat(p.price)||0)),0);

  document.getElementById('kpiGrid').innerHTML=`
    <div class="kpi-card"><div class="kpi-label">Profit total</div><div class="kpi-val ${totalProfit>=0?'green':'red'}">${fmtPrice(totalProfit)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Profit ce mois</div><div class="kpi-val ${profitMois>=0?'green':'red'}">${fmtPrice(profitMois)}</div><div class="kpi-sub">Automatique</div></div>
    <div class="kpi-card"><div class="kpi-label">En stock</div><div class="kpi-val">${stock.length}</div><div class="kpi-sub">${fmtPrice(investi)} investis</div></div>
    <div class="kpi-card"><div class="kpi-label">À expédier</div><div class="kpi-val" style="color:var(--warning)">${expedition.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Vendus</div><div class="kpi-val">${vendus.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Capital bloqué +30j</div><div class="kpi-val red">${fmtPrice(capitalBloque)}</div></div>
    <div class="kpi-card"><div class="kpi-label">🛍️ Achats Vinted ce mois</div><div class="kpi-val red">-${fmtPrice(achatsMois)}</div><div class="kpi-sub">Automatique</div></div>
  `;

  // IA Coach
  const coach=generateCoach();
  document.getElementById('coachBox').innerHTML=coach;

  document.getElementById('recentList').innerHTML=allArticles.slice(0,4).length
    ?`<div class="article-list">${allArticles.slice(0,4).map(a=>articleHTML(a)).join('')}</div>`
    :emptyState('Aucun article encore.');
  renderMiniChart('dashChartBars','dashChartLabels');
  renderWeeklySummary();
}

// ── RÉSUMÉ HEBDOMADAIRE ──
function renderWeeklySummary(){
  const el=document.getElementById('weeklySummary');
  if(!el) return;
  const weekAgo=new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const ventesSemaine=allArticles.filter(a=>a.status==='vendu').filter(a=>new Date(a.sell_date||a.created_at)>=weekAgo);
  const profitSemaine=ventesSemaine.reduce((s,a)=>s+calcProfit(a),0);
  el.innerHTML=`
    <div><div class="weekly-title">📅 Cette semaine</div><div class="weekly-val ${profitSemaine>=0?'green':'red'}">${fmtPrice(profitSemaine)} de profit</div></div>
    <div><div class="weekly-title">Articles vendus cette semaine</div><div class="weekly-val">${ventesSemaine.length}</div></div>
  `;
}

// ── EXPORT CSV ──
function toCSV(rows, headers){
  const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const lines=[headers.map(h=>esc(h.label)).join(';')];
  rows.forEach(r=>lines.push(headers.map(h=>esc(h.get(r))).join(';')));
  return lines.join('\n');
}
function downloadCSV(content, filename){
  const blob=new Blob(['﻿'+content], {type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.exportArticlesCSV = (section) => {
  const arts = section==='stock' ? allArticles.filter(a=>a.status==='stock') : allArticles.filter(a=>a.status==='vendu');
  const headers=[
    {label:'Nom', get:a=>a.name},
    {label:'Plateforme', get:a=>a.platform},
    {label:'Prix achat', get:a=>a.buy_price||0},
    {label:'Prix vente', get:a=>a.sell_price||0},
    {label:'Frais annexes', get:a=>a.extra_costs||0},
    {label:'Profit', get:a=>section==='vendus'?calcProfit(a).toFixed(2):''},
    {label:'Date achat', get:a=>a.buy_date||''},
    {label:'Date vente', get:a=>a.sell_date||''},
    {label:'Emplacement', get:a=>a.location||''},
  ];
  downloadCSV(toCSV(arts, headers), `vinted-manager-${section}-${today()}.csv`);
};
window.exportAnnualRecapCSV = () => {
  const vendus=allArticles.filter(a=>a.status==='vendu');
  const byYear={};
  vendus.forEach(a=>{
    const y=new Date(a.sell_date||a.created_at).getFullYear();
    if(!byYear[y]) byYear[y]={year:y,count:0,buy:0,sell:0,profit:0};
    byYear[y].count++;
    byYear[y].buy+=parseFloat(a.buy_price)||0;
    byYear[y].sell+=parseFloat(a.sell_price)||0;
    byYear[y].profit+=calcProfit(a);
  });
  const rows=Object.values(byYear).sort((a,b)=>a.year-b.year);
  if(!rows.length){ alert('Aucune vente enregistrée pour le moment.'); return; }
  const headers=[
    {label:'Année', get:r=>r.year},
    {label:'Nombre de ventes', get:r=>r.count},
    {label:'Total achats', get:r=>r.buy.toFixed(2)},
    {label:'Total ventes', get:r=>r.sell.toFixed(2)},
    {label:'Profit total', get:r=>r.profit.toFixed(2)},
  ];
  downloadCSV(toCSV(rows, headers), `vinted-manager-recap-fiscal-${today()}.csv`);
};

// ── RECHERCHE GLOBALE ──
function statusLabel(s){
  const step=PREP_STEPS.find(p=>p.key===s);
  return step?step.label:s;
}
window.handleGlobalSearch = (query) => {
  const resultsEl=document.getElementById('searchResults');
  const q=query.trim().toLowerCase();
  if(!q){ resultsEl.style.display='none'; resultsEl.innerHTML=''; return; }
  const matches=allArticles.filter(a=>a.name.toLowerCase().includes(q)).slice(0,8);
  resultsEl.innerHTML = matches.length ? matches.map(a=>`
    <div class="search-result-item" onclick="editArticle('${a.id}');document.getElementById('searchResults').style.display='none';document.getElementById('globalSearch').value='';">
      <div class="search-result-name">${a.name}</div>
      <div class="search-result-meta">${statusLabel(a.status)} · ${a.platform} · ${fmtPrice(a.sell_price)}</div>
    </div>`).join('') : `<div class="search-result-item">Aucun résultat</div>`;
  resultsEl.style.display='block';
};
document.addEventListener('click', (e) => {
  const wrap=document.getElementById('globalSearch')?.closest('.topbar-search');
  const results=document.getElementById('searchResults');
  if(wrap && results && !wrap.contains(e.target)) results.style.display='none';
});

function generateCoach(){
  if(allArticles.length===0) return `<div class="coach-msg">👋 Bienvenue ! Ajoutez votre premier article pour commencer.</div>`;
  const msgs=[];
  const expedition=allArticles.filter(a=>a.status==='expedition');
  if(expedition.length>0) msgs.push(`📦 Vous avez <strong>${expedition.length} colis</strong> à envoyer aujourd'hui.`);
  const apublier=allArticles.filter(a=>a.status==='publier');
  if(apublier.length>0) msgs.push(`✍️ <strong>${apublier.length} articles</strong> sont prêts à être publiés sur Vinted.`);
  const anciens=allArticles.filter(a=>{
    if(!['stock','laver','photo','publier'].includes(a.status))return false;
    const d=daysBetween(a.buy_date||a.created_at?.split('T')[0],today());
    return d!==null&&d>60;
  });
  if(anciens.length>0) msgs.push(`🔴 <strong>${anciens.length} articles</strong> sont en stock depuis plus de 60 jours. Pensez à baisser les prix.`);
  const sansVues=allArticles.filter(a=>{
    if(a.status!=='stock'||!a.vinted_item_id)return false;
    const d=daysBetween(a.synced_at&&a.buy_date||a.buy_date||a.created_at?.split('T')[0],today());
    return (a.vinted_vues||0)===0&&d!==null&&d>7;
  });
  if(sansVues.length>0) msgs.push(`👁️ <strong>${sansVues.length} articles</strong> n'ont eu <strong>aucune vue</strong> sur Vinted depuis plus d'une semaine. Republiez-les ou revoyez les photos/le prix.`);
  const tendance=allArticles.filter(isTrending);
  if(tendance.length>0){
    const noms=tendance.map(a=>a.name).join(', ');
    msgs.push(`🔥 <strong>${noms}</strong> reçoi${tendance.length>1?'vent':'t'} beaucoup de favoris rapidement — envisagez d'augmenter le prix ou de répondre vite si on vous contacte dessus.`);
  }
  const vendus=allArticles.filter(a=>a.status==='vendu');
  if(vendus.length>=3){
    const byPlatform={};
    vendus.forEach(a=>{byPlatform[a.platform]=(byPlatform[a.platform]||0)+calcProfit(a);});
    const best=Object.entries(byPlatform).sort((a,b)=>b[1]-a[1])[0];
    if(best) msgs.push(`🏆 Votre meilleure plateforme est <strong>${best[0]}</strong> avec ${fmtPrice(best[1])} de profit total.`);
  }
  if(msgs.length===0) msgs.push(`✅ Tout est en ordre. Continuez comme ça !`);
  return msgs.map(m=>`<div class="coach-msg">🤖 ${m}</div>`).join('');
}

function renderPreparation(){
  const filter=currentFilter.preparation;
  let arts=allArticles.filter(a=>filter==='all'?['laver','photo','publier','stock'].includes(a.status):a.status===filter);
  const container=document.getElementById('prepList');
  if(!arts.length){container.innerHTML=emptyState('Aucun article dans cette étape.');return;}
  container.innerHTML=`<div class="article-list">${arts.map(a=>articleHTML(a,{showMove:true,selectSection:'prep'})).join('')}</div>`;
  // Stats par étape
  const stats=PREP_STEPS.slice(0,4).map(s=>{
    const count=allArticles.filter(a=>a.status===s.key).length;
    return `<div class="prep-stat" style="border-color:${s.color}"><div class="prep-stat-num" style="color:${s.color}">${count}</div><div class="prep-stat-label">${s.label}</div></div>`;
  }).join('');
  document.getElementById('prepStats').innerHTML=stats;
}

function renderStock(){
  let arts=allArticles.filter(a=>a.status==='stock');
  if(currentFilter.stock!=='Tous') arts=arts.filter(a=>a.platform===currentFilter.stock);
  document.getElementById('stockCount').textContent=arts.length+' article(s) en stock';
  document.getElementById('stockList').innerHTML=arts.length
    ?`<div class="article-list">${arts.map(a=>articleHTML(a,{selectSection:'stock'})).join('')}</div>`
    :emptyState('Aucun article en stock.');
}

// ── SÉLECTION MULTIPLE / ACTIONS GROUPÉES ──
window.toggleSelectMode = (section) => {
  selectMode[section] = !selectMode[section];
  selectedIds[section].clear();
  document.getElementById('selectModeBtn-'+section).textContent = selectMode[section] ? '✕ Annuler la sélection' : '☑ Sélection multiple';
  document.getElementById('bulkBar-'+section).style.display = 'none';
  if(section==='stock') renderStock(); else renderPreparation();
};

window.toggleArticleSelect = (section, id, checked) => {
  if(checked) selectedIds[section].add(id); else selectedIds[section].delete(id);
  const count = selectedIds[section].size;
  document.getElementById('bulkCount-'+section).textContent = count+' sélectionné(s)';
  document.getElementById('bulkBar-'+section).style.display = count>0 ? 'flex' : 'none';
};

window.applyBulkMove = async (section) => {
  const ids = Array.from(selectedIds[section]);
  if(!ids.length) return;
  const target = document.getElementById('bulkTarget-'+section).value;
  const sell_date = !['stock','laver','photo','publier'].includes(target) ? today() : null;
  const {data} = await sb.from('articles').update({status:target, sell_date}).in('id', ids).eq('user_id', currentUser.id).select();
  if(data){
    data.forEach(updated=>{
      const idx = allArticles.findIndex(a=>a.id===updated.id);
      if(idx>=0) allArticles[idx]=updated;
    });
  }
  selectedIds[section].clear();
  selectMode[section] = false;
  document.getElementById('selectModeBtn-'+section).textContent = '☑ Sélection multiple';
  document.getElementById('bulkBar-'+section).style.display = 'none';
  renderAll();
};

function renderExpedition(){
  const arts=allArticles.filter(a=>a.status==='expedition');
  document.getElementById('expeditionCount').textContent=arts.length+' article(s) à expédier';
  const stored=JSON.parse(localStorage.getItem('checklist_'+currentUser.id)||'{}');
  document.getElementById('checklistWrap').innerHTML=arts.length?`
    <div class="checklist-card">
      <div class="checklist-title">✅ Checklist d'expédition</div>
      ${arts.map(a=>`
        <div class="checklist-item">
          <input type="checkbox" id="chk_${a.id}" ${stored[a.id]?'checked':''} onchange="toggleCheck('${a.id}',this)" />
          <label for="chk_${a.id}" class="${stored[a.id]?'done':''}">${a.name}${a.location?' — 📍 '+a.location:''} — ${a.platform}</label>
        </div>`).join('')}
    </div>`:'';
  document.getElementById('expeditionList').innerHTML=arts.length
    ?`<div class="article-list">${arts.map(a=>articleHTML(a)).join('')}</div>`
    :emptyState('Aucun article en attente 🎉');
}

window.toggleCheck=(id,el)=>{
  const stored=JSON.parse(localStorage.getItem('checklist_'+currentUser.id)||'{}');
  stored[id]=el.checked;
  localStorage.setItem('checklist_'+currentUser.id,JSON.stringify(stored));
  el.nextElementSibling?.classList.toggle('done',el.checked);
};

function renderVendus(){
  let arts=allArticles.filter(a=>a.status==='vendu');
  if(currentFilter.vendus!=='Tous') arts=arts.filter(a=>a.platform===currentFilter.vendus);
  document.getElementById('vendusCount').textContent=arts.length+' article(s) vendu(s)';
  document.getElementById('vendusList').innerHTML=arts.length
    ?`<div class="article-list">${arts.map(a=>articleHTML(a)).join('')}</div>`
    :emptyState('Aucun article vendu encore.');
}

function getMonths(){
  const now=new Date();
  return Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
    return{label:d.toLocaleString('fr',{month:'short'}),profit:0,month:d.getMonth(),year:d.getFullYear()};
  });
}

function renderMiniChart(barsId,labelsId){
  const months=getMonths();
  allArticles.filter(a=>a.status==='vendu').forEach(a=>{
    const d=new Date(a.sell_date||a.created_at);
    const m=months.find(m=>m.month===d.getMonth()&&m.year===d.getFullYear());
    if(m) m.profit+=calcProfit(a);
  });
  const maxP=Math.max(...months.map(m=>Math.abs(m.profit)),1);
  document.getElementById(barsId).innerHTML=months.map(m=>{
    const h=Math.max(4,Math.abs(m.profit)/maxP*110);
    return `<div class="bar-wrap"><div class="bar ${m.profit<0?'negative':''}" style="height:${h}px;"></div></div>`;
  }).join('');
  document.getElementById(labelsId).innerHTML=months.map(m=>
    `<div class="chart-label">${m.label}<strong>${m.profit>=0?'+':''}${fmtPrice(m.profit)}</strong></div>`
  ).join('');
}

function renderAnalytics(){
  const months=getMonths();
  allArticles.filter(a=>a.status==='vendu').forEach(a=>{
    const d=new Date(a.sell_date||a.created_at);
    const m=months.find(m=>m.month===d.getMonth()&&m.year===d.getFullYear());
    if(m) m.profit+=calcProfit(a);
  });
  const vendus=allArticles.filter(a=>a.status==='vendu');
  const totalP=vendus.reduce((s,a)=>s+calcProfit(a),0);
  const avgP=vendus.length?totalP/vendus.length:0;
  const bestMonth=Math.max(0,...months.map(m=>m.profit));
  const now=new Date();
  const profitMois=months.find(m=>m.month===now.getMonth()&&m.year===now.getFullYear())?.profit||0;
  const avecDates=vendus.filter(a=>a.buy_date&&a.sell_date);
  const avgDays=avecDates.length?Math.round(avecDates.reduce((s,a)=>s+daysBetween(a.buy_date,a.sell_date),0)/avecDates.length):null;
  const avgScore=vendus.length?Math.round(vendus.reduce((s,a)=>s+calcScore(a),0)/vendus.length):null;

  document.getElementById('analyticsKpi').innerHTML=`
    <div class="kpi-card"><div class="kpi-label">Ce mois</div><div class="kpi-val green">${fmtPrice(profitMois)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Meilleur mois</div><div class="kpi-val green">${fmtPrice(bestMonth)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Marge moyenne</div><div class="kpi-val">${fmtPrice(avgP)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Temps vente moy.</div><div class="kpi-val">${avgDays!==null?avgDays+'j':'—'}</div></div>
    <div class="kpi-card"><div class="kpi-label">Score moyen</div><div class="kpi-val green">${avgScore!==null?avgScore+'/100':'—'}</div></div>
  `;
  const maxP=Math.max(...months.map(m=>Math.abs(m.profit)),1);
  document.getElementById('chartBars').innerHTML=months.map(m=>{
    const h=Math.max(4,Math.abs(m.profit)/maxP*110);
    return `<div class="bar-wrap"><div class="bar ${m.profit<0?'negative':''}" style="height:${h}px;"></div></div>`;
  }).join('');
  document.getElementById('chartLabels').innerHTML=months.map(m=>
    `<div class="chart-label">${m.label}<strong>${m.profit>=0?'+':''}${fmtPrice(m.profit)}</strong></div>`
  ).join('');
}

function renderReplay(){
  const arts=allArticles.filter(a=>a.status==='vendu').slice(0,10);
  const container=document.getElementById('replayList');
  if(!arts.length){container.innerHTML=emptyState('Aucun article vendu encore.');return;}
  container.innerHTML=arts.map(a=>{
    const isRefunded=a.vinted_transaction_status==='failed';
    const profit=calcProfit(a);
    const days=daysBetween(a.buy_date,a.sell_date);
    const score=calcScore(a);
    return `<div class="replay-card" onclick="showDetail('${a.id}')">
      <div class="replay-header">
        ${a.photo_url?`<img src="${a.photo_url}" class="replay-photo" />`:'<div class="replay-photo">📦</div>'}
        <div class="replay-headinfo">
          <div class="replay-name">${a.name}</div>
          <div class="replay-meta">${a.platform}${days!==null&&!isRefunded?' · Vendu en '+days+'j':''} · Score ${score}/100</div>
        </div>
        <div class="replay-profit ${profit>=0?'profit-pos':'profit-neg'}">${profit>=0?'+':''}${fmtPrice(profit)}</div>
      </div>
      <div class="replay-flow">
        <div class="replay-flow-step">
          <div class="replay-flow-label">🛒 Acheté</div>
          <div class="replay-flow-val">${fmtPrice(a.buy_price)}</div>
          <div class="replay-flow-date">${fmtDate(a.buy_date)}</div>
        </div>
        <div class="replay-flow-arrow">→</div>
        <div class="replay-flow-step">
          <div class="replay-flow-label">💸 Vendu</div>
          <div class="replay-flow-val">${isRefunded?fmtPrice(0):fmtPrice(a.sell_price)}</div>
          <div class="replay-flow-date">${fmtDate(a.sell_date)}</div>
        </div>
      </div>
      ${a.vinted_shipping_status?`<div class="replay-shipping">${orderStatusBadge(a.vinted_transaction_status,a.vinted_shipping_status)}</div>`:''}
    </div>`;
  }).join('');
}

function renderObjectif(){
  const goal=parseFloat(localStorage.getItem('goal_'+currentUser.id)||'500');
  const now=new Date();
  const profitMois=allArticles.filter(a=>a.status==='vendu').filter(a=>{
    const d=new Date(a.sell_date||a.created_at);
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  }).reduce((s,a)=>s+calcProfit(a),0);
  const pct=Math.min(100,goal>0?profitMois/goal*100:0);
  document.getElementById('goalHero').innerHTML=`
    <div class="kpi-label">Profit ce mois · Calculé automatiquement</div>
    <div class="goal-big">${fmtPrice(profitMois)}</div>
    <div class="goal-label">sur ${fmtPrice(goal)} d'objectif — ${pct.toFixed(0)}% atteint</div>
    <div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div>
    <div class="goal-limits"><span>0 €</span><span>${fmtPrice(goal)}</span></div>
  `;
  document.getElementById('goalInput').value=goal;
}

window.saveGoal=()=>{
  const v=parseFloat(document.getElementById('goalInput').value);
  if(isNaN(v)||v<=0)return;
  localStorage.setItem('goal_'+currentUser.id,v);
  renderObjectif();
};

// ── CALENDRIER ──
function renderCalendar() {
  const now = new Date();
  document.getElementById('calendarHeader').innerHTML = `
    <div class="calendar-date">${now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
    <div class="calendar-sub">Voici ce qu'il vous reste à faire aujourd'hui</div>
  `;
  const expedition = allArticles.filter(a=>a.status==='expedition');
  const publier = allArticles.filter(a=>a.status==='publier');
  const photo = allArticles.filter(a=>a.status==='photo');
  const laver = allArticles.filter(a=>a.status==='laver');
  const goal = parseFloat(localStorage.getItem('goal_'+currentUser.id)||'500');
  const profitMois = allArticles.filter(a=>a.status==='vendu').filter(a=>{
    const d=new Date(a.sell_date||a.created_at);
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  }).reduce((s,a)=>s+calcProfit(a),0);

  const groups = [
    {title:'🚚 Colis à envoyer', items:expedition},
    {title:'✍️ Articles à publier', items:publier},
    {title:'📸 Articles à photographier', items:photo},
    {title:'🧺 Articles à laver', items:laver},
  ];
  let html = groups.map(g => g.items.length ? `
    <div class="task-group">
      <div class="task-group-title">${g.title} <span class="task-count-badge">${g.items.length}</span></div>
      <div class="article-list">${g.items.map(a=>articleHTML(a,{showMove:true})).join('')}</div>
    </div>` : '').join('');

  if (!expedition.length && !publier.length && !photo.length && !laver.length) {
    html = emptyState('Rien à faire aujourd\'hui, tout est à jour ! 🎉');
  }

  html += `<div class="task-group"><div class="task-group-title">🎯 Objectif du mois</div>
    <div class="goal-card"><div class="goal-label">${fmtPrice(profitMois)} sur ${fmtPrice(goal)} (${Math.min(100,(profitMois/goal*100)).toFixed(0)}%)</div>
    <div class="progress-track"><div class="progress-bar" style="width:${Math.min(100,goal>0?profitMois/goal*100:0)}%"></div></div></div></div>`;

  document.getElementById('calendarTasks').innerHTML = html;
}

// ── MESSAGES FAVORIS ──
window.saveFavMessage = () => {
  const savedEl = document.getElementById('favMsgSaved');
  localStorage.setItem('favMessage_'+currentUser.id, document.getElementById('favMessage').value);
  savedEl.textContent = '✓ Modèle enregistré !';
};

window.copyFavMessage = (btn) => {
  const template = document.getElementById('favMessage').value;
  const msg = template.replace(/\{item\}/g, btn.dataset.name || 'cet article');
  navigator.clipboard.writeText(msg).then(() => {
    const original = btn.textContent;
    btn.textContent = '✓ Copié !';
    setTimeout(() => btn.textContent = original, 1500);
  });
};

function renderFavoris() {
  const saved = localStorage.getItem('favMessage_'+currentUser.id) || '';
  document.getElementById('favMessage').value = saved;
  const stock = allArticles.filter(a=>a.status==='stock');
  document.getElementById('favorisList').innerHTML = stock.length ? stock.map(a => `
    <div class="fav-card">
      ${photoEl(a)}
      <div class="article-info">
        <div class="article-name">${a.name}</div>
        <div class="article-meta">${a.platform} · ${fmtPrice(a.sell_price)}</div>
      </div>
      <button class="fav-copy-btn" data-name="${a.name.replace(/"/g,'&quot;')}" onclick="copyFavMessage(this)">📋 Copier pour cet article</button>
    </div>`).join('') : emptyState('Aucun article en stock pour le moment.');
}

// ── MESSAGES VINTED (synchronisés par l'extension) ──
function timeAgo(iso){
  if(!iso)return '';
  const d=new Date(iso);
  if(isNaN(d))return '';
  const mins=Math.round((Date.now()-d.getTime())/60000);
  if(mins<1)return 'à l\'instant';
  if(mins<60)return `il y a ${mins} min`;
  const hours=Math.round(mins/60);
  if(hours<24)return `il y a ${hours}h`;
  const days=Math.round(hours/24);
  return `il y a ${days}j`;
}

async function renderMessages(){
  const container=document.getElementById('messagesList');
  container.innerHTML=emptyState('Chargement...');
  const {data,error}=await sb.from('vinted_conversations')
    .select('*').eq('user_id',currentUser.id).order('updated_at',{ascending:false});
  if(error||!data||!data.length){
    container.innerHTML=emptyState('Aucun message Vinted synchronisé pour le moment. Gardez un onglet vinted.fr ouvert pour que l\'extension synchronise votre messagerie.');
    return;
  }
  container.innerHTML=data.map(m=>`
    <div class="msg-card ${m.non_lu?'unread':''} ${m.est_offre?'offer':''}">
      <div class="msg-avatar">${(m.interlocuteur||'?').charAt(0).toUpperCase()}</div>
      <div class="msg-info">
        <div class="msg-name">${m.interlocuteur||'Utilisateur'} ${m.non_lu?'<span class="msg-dot"></span>':''} ${m.est_offre?`<span class="offer-badge">💰 Offre ${fmtPrice(m.offre_prix)}</span>`:''}</div>
        ${m.article_titre?`<div class="msg-article">${m.article_titre}</div>`:''}
        ${m.dernier_message&&m.dernier_message!==m.article_titre?`<div class="msg-preview">${m.dernier_message}</div>`:''}
      </div>
      <div class="msg-time">${timeAgo(m.updated_at)}</div>
    </div>`).join('');
}

// ── STATUT DE COMMANDE VINTED (ventes + achats) ──
function orderStatusBadge(statutCode, statutText){
  if(!statutText) return '';
  const style = statutCode==='completed' ? 'background:#00e5a022;color:#00e5a0;'
    : statutCode==='failed' ? 'background:#ef444422;color:#ef4444;'
    : statutCode==='waiting' ? 'background:#f59e0b22;color:#f59e0b;'
    : 'background:var(--surface2);color:var(--muted);';
  return `<span class="badge" style="${style}" title="${statutText}">${statutText}</span>`;
}

function renderAchats(){
  const el=document.getElementById('achatsList');
  document.getElementById('achatsCount').textContent=allPurchases.length+' achat(s)';
  el.innerHTML=allPurchases.length ? allPurchases.map(p=>{
    const isRefunded=p.transaction_status==='failed';
    return `
    <div class="article-card" onclick="showPurchaseDetail('${p.id}')">
      <div class="article-photo">${p.photo_url?`<img src="${p.photo_url}" alt="">`:'📦'}</div>
      <div class="article-info">
        <div class="article-name">${p.title||'Article'}</div>
        <div class="article-meta">${p.purchase_date||''}</div>
        <div class="article-badges" onclick="event.stopPropagation()">${orderStatusBadge(p.transaction_status,p.status)}</div>
      </div>
      <div class="article-right">
        <div class="article-profit profit-neg">${isRefunded?fmtPrice(0):'-'+fmtPrice(p.price)}</div>
      </div>
    </div>`;
  }).join('') : emptyState('Aucun achat Vinted synchronisé pour le moment.');
}

async function updateMessagesBadge(){
  const badge=document.getElementById('navMsgBadge');
  if(!badge)return;
  const {count}=await sb.from('vinted_conversations')
    .select('id',{count:'exact',head:true}).eq('user_id',currentUser.id).eq('non_lu',true);
  if(count>0){ badge.textContent=count; badge.style.display='inline-block'; }
  else { badge.style.display='none'; }
}

// ── BANDEAU DE SYNCHRONISATION (dashboard) ──
async function renderSyncBanner(){
  const el=document.getElementById('dashSyncBanner');
  if(!el)return;
  const {data}=await sb.from('vinted_accounts').select('*').eq('user_id',currentUser.id).single();
  if(!data||!data.connected){
    el.style.display='flex';
    el.innerHTML=`<div class="sync-banner-text">🔌 Extension Chrome non connectée — <strong>connectez-la dans Paramètres</strong> pour synchroniser automatiquement vos ventes, votre stock et votre messagerie Vinted.</div>`;
    return;
  }
  const daysSinceSync=data.last_sync?daysBetween(data.last_sync,today()):null;
  if(daysSinceSync!==null&&daysSinceSync>=3){
    el.style.display='flex';
    el.classList.add('sync-banner-warning');
    el.innerHTML=`<div class="sync-banner-text">⚠️ Aucune synchronisation depuis ${daysSinceSync} jours — votre connexion Vinted a probablement expiré. <strong>Reconnectez-vous dans Paramètres.</strong></div>`;
    return;
  }
  el.classList.remove('sync-banner-warning');
  el.style.display='flex';
  el.innerHTML=`<div class="sync-banner-text">✅ Vinted connecté — <strong>@${data.vinted_login||'—'}</strong> · dernière synchro ${data.last_sync?new Date(data.last_sync).toLocaleDateString('fr-FR'):'—'}</div>`;
}

// ── REPUBLICATION ──
window.saveRepublishDays = () => {
  const v = parseInt(document.getElementById('republishDays').value);
  if (isNaN(v) || v <= 0) return;
  localStorage.setItem('republishDays_'+currentUser.id, v);
  renderRepublier();
};

function renderRepublier() {
  const days = parseInt(localStorage.getItem('republishDays_'+currentUser.id) || '3');
  document.getElementById('republishDays').value = days;
  const stock = allArticles.filter(a => a.status==='stock' && a.platform==='Vinted');
  const toRepublish = stock.filter(a => {
    const d = daysBetween(a.buy_date || a.created_at?.split('T')[0], today());
    return d !== null && d >= days;
  });
  document.getElementById('republierList').innerHTML = toRepublish.length
    ? `<div class="article-list">${toRepublish.map(a=>articleHTML(a)).join('')}</div>`
    : emptyState('Aucun article à republier pour le moment.');
}

function renderExtensionInstallBtn() {
  const el = document.getElementById('extensionInstallBtn');
  if (!el) return;
  el.innerHTML = EXTENSION_PUBLISHED
    ? `<a href="${EXTENSION_STORE_URL}" target="_blank" style="display:block;margin-top:14px;padding:10px;background:var(--accent);color:#000;border-radius:var(--radius);text-align:center;font-weight:700;text-decoration:none;font-size:13px;">⚡ Installer l'extension Chrome</a>`
    : `<div style="margin-top:14px;padding:10px;background:var(--warning-dim);color:var(--warning);border-radius:var(--radius);text-align:center;font-weight:700;font-size:13px;">⏳ Extension en cours de validation par Google — bientôt disponible</div>`;
}

async function renderVintedConnectionStatus() {
  renderExtensionInstallBtn();
  const statusEl = document.getElementById('vintedStatus');
  const badgeEl = document.getElementById('vintedStatusBadge');
  const loginEl = document.getElementById('vintedLogin');
  const lastSyncEl = document.getElementById('vintedLastSync');
  if (!statusEl) return;

  try {
    const { data } = await sb.from('vinted_accounts')
      .select('*').eq('user_id', currentUser.id).single();

    if (!data) {
      statusEl.textContent = 'Aucun compte connecté';
      badgeEl.innerHTML = '<span style="color:#ef4444;">● Déconnecté</span>';
      return;
    }
    if (data.connected) {
      statusEl.textContent = 'Extension Chrome active';
      badgeEl.innerHTML = '<span style="color:#00e5a0;">● Connecté</span>';
      loginEl.textContent = '@' + (data.vinted_login || '—');
      lastSyncEl.textContent = data.last_sync
        ? new Date(data.last_sync).toLocaleDateString('fr-FR') : '—';
      document.getElementById('vintedLoginRow').style.display = 'flex';
      renderReputationGrid(data);
    } else {
      statusEl.textContent = 'Compte enregistré mais extension inactive';
      badgeEl.innerHTML = '<span style="color:#f59e0b;">● Inactif</span>';
    }
  } catch(e) {
    if (statusEl) statusEl.textContent = 'Erreur de chargement';
  }
}

function renderReputationGrid(data){
  const el = document.getElementById('reputationGrid');
  if(!el) return;
  const hasAny = (data.review_count||data.followers_count||data.vinted_item_count);
  if(!hasAny){ el.style.display = 'none'; return; }
  el.style.display = 'grid';
  el.innerHTML = `
    <div class="reputation-stat"><div class="reputation-val">${(data.feedback_reputation||0).toFixed(1)}/5</div><div class="reputation-label">⭐ Note moyenne</div></div>
    <div class="reputation-stat"><div class="reputation-val">${data.review_count||0}</div><div class="reputation-label">💬 Avis</div></div>
    <div class="reputation-stat"><div class="reputation-val">${data.followers_count||0}</div><div class="reputation-label">👥 Abonnés</div></div>
  `;
}

// ── HISTORIQUE VUES/FAVORIS ──
window.showHistory = async (itemId, itemName) => {
  document.getElementById('historyTitle').textContent = `Évolution — ${itemName}`;
  document.getElementById('historyBody').innerHTML = emptyState('Chargement...');
  document.getElementById('historyBg').classList.add('open');
  const { data, error } = await sb.from('vinted_stats_history')
    .select('*').eq('vinted_item_id', itemId).order('stat_date', { ascending: true });
  const bodyEl = document.getElementById('historyBody');
  if(error || !data || !data.length){
    bodyEl.innerHTML = emptyState('Pas encore assez de données. Revenez dans quelques jours pour voir l\'évolution.');
    return;
  }
  const maxVal = Math.max(...data.map(d=>Math.max(d.vues||0,d.favoris||0)), 1);
  bodyEl.innerHTML = `<p style="font-size:12px;color:var(--muted);margin-bottom:10px;">👁️ vues · ❤️ favoris, un point par jour synchronisé</p>` + data.map(d => `
    <div class="history-row">
      <div class="history-date">${new Date(d.stat_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</div>
      <div class="history-bar-wrap"><div class="history-bar-fill" style="width:${Math.max(4,(d.vues||0)/maxVal*100)}%"></div></div>
      <div class="history-vals">👁️ ${d.vues||0} · ❤️ ${d.favoris||0}</div>
    </div>`).join('');
};
window.closeHistory = () => document.getElementById('historyBg').classList.remove('open');

// ── DÉTAIL ARTICLE ──
function detailRow(label,val){return `<div class="detail-row"><span class="detail-row-label">${label}</span><span class="detail-row-val">${val}</span></div>`;}

window.showDetail = (id) => {
  const a=allArticles.find(x=>x.id===id);
  if(!a) return;
  const isRefunded=a.vinted_transaction_status==='failed';
  const profit=a.status==='vendu'?calcProfit(a):0;
  const roi=a.buy_price>0?(profit/a.buy_price*100):0;
  const days=daysBetween(a.buy_date,a.sell_date);
  const score=a.status==='vendu'?calcScore(a):null;
  document.getElementById('detailTitle').textContent=a.name;
  document.getElementById('detailBody').innerHTML=`
    ${a.photo_url?`<img src="${a.photo_url}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:var(--radius-lg);margin-bottom:12px;">`:''}
    <div class="article-badges" style="margin-bottom:12px;">
      <span class="badge ${platformBadgeClass(a.platform)}">${a.platform}</span>
      ${stepBadge(a.status)}
      ${a.location?`<span class="badge badge-autre">📍 ${a.location}</span>`:''}
    </div>
    ${detailRow('🛒 Achat', fmtPrice(a.buy_price)+(a.buy_date?' · '+a.buy_date:''))}
    ${a.status==='vendu'?detailRow('💸 Vente', (isRefunded?fmtPrice(0):fmtPrice(a.sell_price))+(a.sell_date?' · '+a.sell_date:'')):''}
    ${a.extra_costs?detailRow('🧾 Frais annexes', fmtPrice(a.extra_costs)):''}
    ${a.status==='vendu'?detailRow('📊 Profit', `<span class="${profit>=0?'profit-pos':'profit-neg'}">${profit>=0?'+':''}${fmtPrice(profit)}</span> · ROI ${roi.toFixed(0)}%`):''}
    ${days!==null&&!isRefunded?detailRow('⏱ Délai', 'Vendu en '+days+' jour(s)'):''}
    ${score!==null?detailRow('⭐ Score', score+'/100'):''}
    ${a.vinted_item_id&&a.status==='stock'?detailRow('👁️ Stats Vinted', `${a.vinted_vues||0} vues · ❤️ ${a.vinted_favoris||0} favoris`):''}
    ${a.vinted_shipping_status?detailRow('📦 Statut Vinted', a.vinted_shipping_status):''}
    ${a.source?detailRow('🔗 Source', a.source):''}
  `;
  document.getElementById('detailEditBtn').style.display='inline-block';
  document.getElementById('detailEditBtn').onclick=()=>{ closeDetail(); editArticle(id); };
  document.getElementById('detailBg').classList.add('open');
};
window.closeDetail = () => document.getElementById('detailBg').classList.remove('open');

window.showPurchaseDetail = (id) => {
  const p=allPurchases.find(x=>x.id===id);
  if(!p) return;
  const isRefunded=p.transaction_status==='failed';
  document.getElementById('detailTitle').textContent=p.title||'Article';
  document.getElementById('detailBody').innerHTML=`
    ${p.photo_url?`<img src="${p.photo_url}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:var(--radius-lg);margin-bottom:12px;">`:''}
    <div class="article-badges" style="margin-bottom:12px;">${orderStatusBadge(p.transaction_status,p.status)}</div>
    ${detailRow('💸 Prix', (isRefunded?fmtPrice(0):fmtPrice(p.price))+(p.purchase_date?' · '+p.purchase_date:''))}
    ${p.status?detailRow('📦 Statut Vinted', p.status):''}
  `;
  document.getElementById('detailEditBtn').style.display='none';
  document.getElementById('detailBg').classList.add('open');
};

// ── INFO GÉNÉRIQUE (explication des badges) ──
window.showInfo = (title, bodyHtml) => {
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoBody').innerHTML = bodyHtml;
  document.getElementById('infoBg').classList.add('open');
};
window.closeInfo = () => document.getElementById('infoBg').classList.remove('open');

window.showScoreInfo = (score, profit, roi, days) => {
  showInfo('⭐ Score de qualité de la vente', `
    <p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Note sur 100 qui résume à quel point cette vente a été rentable, calculée à partir de 3 critères :</p>
    <div class="history-row"><div class="history-vals">💰 Profit réalisé : ${fmtPrice(profit)} ${profit>50?'(bonus)':profit>20?'(petit bonus)':profit<0?'(malus, vente à perte)':''}</div></div>
    <div class="history-row"><div class="history-vals">📈 ROI (profit / prix d'achat) : ${roi.toFixed(0)}% ${roi>100?'(bonus)':roi>50?'(petit bonus)':roi<0?'(malus)':''}</div></div>
    <div class="history-row"><div class="history-vals">⏱ Vendu en ${days!==null?days+' jour(s)':'—'} ${days!==null&&days<=7?'(bonus rapidité)':days!==null&&days>90?'(malus, vente lente)':''}</div></div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px;">Base de 50/100, ajustée par ces critères. Purement indicatif — utile pour repérer vos meilleures affaires d'un coup d'œil.</p>
  `);
};

window.showHeatInfo = (label) => {
  showInfo('🕐 Ancienneté du stock', `
    <p style="font-size:13px;color:var(--muted);">Indique depuis combien de temps l'article est en stock sans être vendu :</p>
    <div class="history-row"><div class="history-vals">🟢 Récent : acheté il y a moins de 30 jours</div></div>
    <div class="history-row"><div class="history-vals">🟠 Moyen : entre 30 et 90 jours</div></div>
    <div class="history-row"><div class="history-vals">🔴 Ancien : plus de 90 jours — pensez à baisser le prix ou relancer l'annonce</div></div>
  `);
};

window.showTrendingInfo = () => {
  showInfo('🔥 Article tendance', `
    <p style="font-size:13px;color:var(--muted);">Cet article reçoit beaucoup de favoris rapidement depuis sa mise en ligne (au moins 8 favoris, à un rythme d'au moins 2 par jour). C'est le moment idéal pour le mettre en avant ou répondre vite aux messages à son sujet.</p>
  `);
};

// ── ONBOARDING ──
function getOnboardingSteps(){
  return [
    { title: 'Bienvenue sur Vinted Manager 👋', body: 'Ce petit guide vous montre les bases en quelques étapes rapides.' },
    { title: '📦 Ajoutez vos articles', body: 'Utilisez le bouton "+ Ajouter" en haut à droite pour suivre chaque article, de l\'achat à la vente.' },
    EXTENSION_PUBLISHED
      ? { title: '🔗 Connectez l\'extension Chrome', body: 'Dans Paramètres, installez l\'extension pour synchroniser automatiquement vos ventes, votre stock et votre messagerie Vinted.' }
      : { title: '🔗 Extension Chrome bientôt disponible', body: 'Une extension pour synchroniser automatiquement vos ventes, votre stock et votre messagerie est en cours de validation par Google. En attendant, ajoutez vos articles manuellement.' },
    { title: '📅 Consultez le Calendrier', body: 'Chaque jour, retrouvez ce qu\'il reste à faire : laver, photographier, publier, expédier.' },
    { title: '❤️ Messages favoris', body: 'Préparez un message type, puis copiez-le personnalisé pour chaque article afin de relancer les personnes qui l\'ont mis en favori.' },
  ];
}
let onboardingStep = 0;
function maybeShowOnboarding(){
  if(localStorage.getItem('onboarding_done_'+currentUser.id)) return;
  onboardingStep = 0;
  renderOnboardingStep();
  document.getElementById('onboardingBg').classList.add('open');
}
function renderOnboardingStep(){
  const steps = getOnboardingSteps();
  const s = steps[onboardingStep];
  document.getElementById('onboardingBody').innerHTML = `
    <h3 style="margin-bottom:10px;">${s.title}</h3>
    <p style="color:var(--muted);font-size:14px;line-height:1.6;">${s.body}</p>
    <div style="margin-top:14px;font-size:12px;color:var(--muted);">Étape ${onboardingStep+1}/${steps.length}</div>
  `;
  document.getElementById('onboardingNext').textContent = onboardingStep===steps.length-1 ? 'Terminer' : 'Suivant';
}
window.onboardingNext = () => {
  onboardingStep++;
  if(onboardingStep>=getOnboardingSteps().length){ closeOnboarding(); return; }
  renderOnboardingStep();
};
window.closeOnboarding = () => {
  document.getElementById('onboardingBg').classList.remove('open');
  localStorage.setItem('onboarding_done_'+currentUser.id, '1');
};

// ── FEEDBACK ──
window.openFeedback = () => {
  document.getElementById('feedbackMessage').value = '';
  document.getElementById('feedbackMsg').textContent = '';
  document.getElementById('feedbackBg').classList.add('open');
};
window.closeFeedback = () => document.getElementById('feedbackBg').classList.remove('open');
window.sendFeedback = async () => {
  const msg = document.getElementById('feedbackMessage').value.trim();
  const msgEl = document.getElementById('feedbackMsg');
  if(!msg){ msgEl.textContent = 'Écrivez un message avant d\'envoyer.'; return; }
  const btn = document.getElementById('btnFeedbackSend');
  btn.disabled = true; btn.textContent = 'Envoi...';
  const {error} = await sb.from('feedback').insert([{user_id:currentUser.id, message:msg}]);
  btn.disabled = false; btn.textContent = 'Envoyer';
  if(error){ msgEl.textContent = 'Erreur, réessayez.'; return; }
  msgEl.textContent = '✓ Merci, votre message a été envoyé !';
  setTimeout(closeFeedback, 1500);
};

// ── INIT ──
initTheme();
document.getElementById('landingLogo').src = LOGO_LIGHT;
sb.auth.onAuthStateChange((event,session)=>{if(session?.user)loginAs(session.user);});
