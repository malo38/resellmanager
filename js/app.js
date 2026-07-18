const SUPABASE_URL = 'https://iprrnmrndjfdlozxjbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcnJubXJuZGpmZGxvenhqYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjUxOTksImV4cCI6MjA5ODA0MTE5OX0.JAteIwydCEoOe6S3z-Isq6-TwRLBdGpU8akn_1FvQb0';
const LOGO_LIGHT = 'img/logo-light.png';
const LOGO_DARK  = 'img/logo-dark.png';
const BACKEND = 'https://web-production-662dc1.up.railway.app';
// Passez à true une fois l'extension approuvée sur le Chrome Web Store.
const EXTENSION_PUBLISHED = true;
const EXTENSION_STORE_URL = 'https://chromewebstore.google.com/detail/vinted-manager/feedjnhhdfeojkocphjgnbjginadclip';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null, allArticles = [], deleteTargetId = null;
// Galerie photo de l'article en cours d'édition : liste ordonnée de
// {url} (déjà enregistrée) ou {file, previewUrl} (nouvelle, pas encore
// uploadée) — index 0 = photo principale. Voir renderPhotoGallery().
let photoEntries = [];
let vintedAccounts = [], selectedVintedAccountId = null; // null = "Tous les comptes" (agrégat)
let currentFilter = { stockall: 'Tous', replay: 'Tous' };
let selectMode = { stockall: false };
let selectedIds = { stockall: new Set() };

// Les 3 dernières étapes sont fixes : les calculs du dashboard (profit, ROI,
// capital bloqué...) dépendent de ces statuts précis, contrairement aux
// étapes de préparation qui précèdent la mise en stock (personnalisables,
// voir getPrepSteps()).
const FIXED_STEPS = [
  { key: 'stock',      label: '📦 En stock',   color: '#00e5a0' },
  { key: 'expedition', label: '🚚 À expédier', color: '#fb923c' },
  { key: 'vendu',      label: '💰 Vendu',      color: '#34d399' },
];
const DEFAULT_PREP_STEPS = [
  { key: 'laver',   label: '🧺 À laver',        color: '#60a5fa' },
  { key: 'photo',   label: '📸 À photographier', color: '#a78bfa' },
  { key: 'publier', label: '✍️ À publier',       color: '#f59e0b' },
];
function getPrepSteps(){
  const raw=localStorage.getItem('prepSteps_'+currentUser.id);
  if(raw===null) return DEFAULT_PREP_STEPS;
  try { const parsed=JSON.parse(raw); return Array.isArray(parsed)?parsed:DEFAULT_PREP_STEPS; }
  catch { return DEFAULT_PREP_STEPS; }
}
function getAllSteps(){ return [...getPrepSteps(), ...FIXED_STEPS]; }
// Vrai pour "stock" et toutes les étapes de préparation avant publication
// (personnalisables) : pas encore vendu, donc pas de date de vente.
function isPreSaleStatus(status){ return status==='stock'||getPrepSteps().some(s=>s.key===status); }

const PAGE_TITLES = { dashboard:'Tableau de bord', stock:'Stock', achats:'Achats', messages:'Messages Vinted', analytics:'Statistiques', comptabilite:'Comptabilité', objectif:'Objectifs', depenses:'Dépenses', ventes:'Ventes', settings:'Paramètres', boost:'Boost', calendrier:'Calendrier', favoris:'Messages favoris', republier:'Republication' };

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
  // Bascule tout le monde une seule fois vers le nouveau défaut "sombre", pour rester
  // cohérent avec la landing page et l'écran de connexion (thème sombre façon Vinteer).
  // Les choix faits après cette bascule sont respectés.
  if (!localStorage.getItem('theme_default_migrated_v2')) {
    localStorage.setItem('theme_default_migrated_v2', '1');
    localStorage.setItem('theme', 'dark');
  }
  setTheme(localStorage.getItem('theme') || 'dark');
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
  // loadVintedAccounts() restaure d'abord le compte sélectionné en mémoire
  // (localStorage) avant que loadArticles() ne l'utilise pour filtrer —
  // sinon le premier chargement ignorerait la préférence sauvegardée et
  // partirait toujours en vue agrégée.
  loadVintedAccounts().then(loadArticles);
  maybeShowOnboarding();
  restoreNavGroupsState();
  restoreNavOrder();
  initNavDragDrop();
}

// ── MULTICOMPTE VINTED ──
// Un utilisateur VintControl peut avoir plusieurs comptes Vinted connectés en
// parallèle (données stockées séparément, jamais écrasées) — voir le
// sélecteur de compte dans la sidebar. `selectedVintedAccountId` vaut null
// pour "Tous les comptes" (vue agrégée, comportement historique).
async function loadVintedAccounts(){
  const res = await backendFetch('/api/extension/accounts');
  vintedAccounts = res?.accounts || [];
  const stored = localStorage.getItem('selectedVintedAccountId_'+currentUser.id);
  selectedVintedAccountId = stored && vintedAccounts.some(a=>a.id===stored) ? stored : null;
  renderAccountSwitcher();
}

// Pastille verte/orange par compte (connected vient tel quel de
// vinted_accounts.connected en base) plutôt qu'un <select> natif brut — les
// <option> ne peuvent pas afficher de pastille colorée, remplacé par le même
// menu déroulant que "actions-menu" (Stock) pour rester cohérent visuellement.
function renderAccountSwitcher(){
  const wrap = document.getElementById('accountSwitcher');
  const btn = document.getElementById('accountSwitcherBtn');
  const body = document.getElementById('accountSwitcherBody');
  if(!wrap || !btn || !body) return;
  if(!vintedAccounts.length){ wrap.style.display='none'; return; }
  wrap.style.display='block';
  const dot=connected=>`<span class="account-dot ${connected?'account-dot-on':'account-dot-off'}"></span>`;
  const current = vintedAccounts.find(a=>a.id===selectedVintedAccountId);
  btn.innerHTML = current
    ? `${dot(current.connected)}<span class="account-switcher-label">@${current.vinted_login||'compte'}</span><i class="ti ti-chevron-down" style="margin-left:auto;"></i>`
    : `<span class="account-switcher-label">🔗 Tous les comptes</span><i class="ti ti-chevron-down" style="margin-left:auto;"></i>`;
  body.innerHTML = `<button type="button" onclick="onAccountSwitch('');this.closest('.actions-menu').classList.remove('open')">🔗 Tous les comptes</button>` +
    vintedAccounts.map(a=>`<button type="button" onclick="onAccountSwitch('${a.id}');this.closest('.actions-menu').classList.remove('open')">${dot(a.connected)}@${a.vinted_login||'compte'}</button>`).join('');
}

window.onAccountSwitch = async (id) => {
  selectedVintedAccountId = id || null;
  localStorage.setItem('selectedVintedAccountId_'+currentUser.id, selectedVintedAccountId || '');
  renderAccountSwitcher();
  // loadArticles() doit être terminé avant de redessiner quoi que ce soit :
  // sans l'attendre, les pages ci-dessous se redessinaient avec les données
  // encore en mémoire de l'ancien compte (la requête n'avait pas fini).
  await loadArticles();
  // loadArticles() ne redessine déjà que Dashboard/Stock/Statistiques/Objectifs
  // (via renderAll) — sans ça, les autres pages gardaient l'affichage de
  // l'ancien compte tant qu'on ne changeait pas de page ou ne rechargeait pas.
  if(document.getElementById('page-settings')?.classList.contains('active')) renderVintedConnectionStatus();
  if(document.getElementById('page-favoris')?.classList.contains('active')) renderFavoris();
  if(document.getElementById('page-republier')?.classList.contains('active')) renderRepublier();
  if(document.getElementById('page-comptabilite')?.classList.contains('active')) renderComptabilite();
  if(document.getElementById('page-achats')?.classList.contains('active')) renderAchats();
  if(document.getElementById('page-boost')?.classList.contains('active')) renderBoost();
  if(document.getElementById('page-messages')?.classList.contains('active')) renderMessages();
  if(document.getElementById('page-calendrier')?.classList.contains('active')) renderCalendar();
  if(document.getElementById('page-depenses')?.classList.contains('active')) renderDepenses();
  if(document.getElementById('page-ventes')?.classList.contains('active')) renderReplay();
};

// Ajoute le filtre par compte à une requête Supabase déjà construite, si un
// compte précis est sélectionné (sinon la requête reste inchangée = agrégat
// de tous les comptes, comportement identique à avant le multicompte).
function applyAccountFilter(query){
  return selectedVintedAccountId ? query.eq('vinted_account_id', selectedVintedAccountId) : query;
}

// Querystring à ajouter aux appels backend qui doivent être scopés au compte
// sélectionné (réglages d'automatisation, historique de messages envoyés).
function accountQueryParam(){
  return selectedVintedAccountId ? `?vinted_account_id=${encodeURIComponent(selectedVintedAccountId)}` : '';
}

// ── NAV ──
window.goPage = (id, btn) => {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('topbarTitle').textContent=PAGE_TITLES[id]||'';
  if(id==='settings') { renderVintedConnectionStatus(); renderPrepStepsSettings(); renderAccountantLink(); renderSellerProfile(); }
  if(id==='ventes') renderReplay();
  if(id==='achats') renderAchats();
  if(id==='boost') renderBoost();
  if(id==='calendrier') renderCalendar();
  if(id==='favoris') renderFavoris();
  if(id==='republier') renderRepublier();
  if(id==='messages') renderMessages();
  if(id==='depenses') renderDepenses();
  if(id==='comptabilite') renderComptabilite();
  if(document.querySelector('.sidebar').classList.contains('open')) toggleSidebar();
};

window.toggleSidebar=()=>document.querySelector('.sidebar').classList.toggle('open');

// ── MENU D'ACTIONS COMPACT (regroupe les actions secondaires de la page
// Stock — resync, doublons, export, sélection — dans un seul bouton "⋯"
// plutôt que 4 boutons permanents, pour désencombrer la barre d'outils). ──
window.toggleActionsMenu=(btn)=>{
  const menu=btn.closest('.actions-menu');
  const wasOpen=menu.classList.contains('open');
  document.querySelectorAll('.actions-menu.open').forEach(m=>m.classList.remove('open'));
  if(!wasOpen) menu.classList.add('open');
};
window.closeActionsMenu=()=>document.querySelectorAll('.actions-menu.open').forEach(m=>m.classList.remove('open'));
document.addEventListener('click',(e)=>{
  if(!e.target.closest('.actions-menu')) closeActionsMenu();
});

// ── SECTIONS REPLIABLES DE LA SIDEBAR ──
window.toggleNavGroup=(header)=>{
  const body=header.nextElementSibling;
  const collapsed=body.classList.toggle('collapsed');
  header.classList.toggle('collapsed',collapsed);
  const closed=[...document.querySelectorAll('.nav-group-header.collapsed')].map(h=>h.textContent.trim());
  localStorage.setItem('navGroupsClosed_'+currentUser.id, JSON.stringify(closed));
};
function restoreNavGroupsState(){
  const closed=JSON.parse(localStorage.getItem('navGroupsClosed_'+currentUser.id)||'[]');
  document.querySelectorAll('.nav-group-header').forEach(header=>{
    if(closed.includes(header.textContent.trim())){
      header.classList.add('collapsed');
      header.nextElementSibling.classList.add('collapsed');
    }
  });
}

// ── SIDEBAR RÉORGANISABLE (glisser-déposer, comme chez Vinteer) ──
// L'ordre de chaque groupe est sauvegardé par utilisateur, séparément par
// groupe (on ne mélange pas Calendrier avec Statistiques par exemple — même
// découpage que les groupes repliables existants).
function restoreNavOrder(){
  document.querySelectorAll('.nav-group-body[id^="navGroup-"]').forEach(group=>{
    const saved=JSON.parse(localStorage.getItem('navOrder_'+group.id+'_'+currentUser.id)||'null');
    if(!saved) return;
    saved.forEach(page=>{
      const btn=group.querySelector(`.nav-btn[data-page="${page}"]`);
      if(btn) group.appendChild(btn);
    });
  });
}

function saveNavOrder(group){
  const order=[...group.querySelectorAll('.nav-btn')].map(b=>b.dataset.page);
  localStorage.setItem('navOrder_'+group.id+'_'+currentUser.id, JSON.stringify(order));
}

function initNavDragDrop(){
  document.querySelectorAll('.nav-group-body[id^="navGroup-"]').forEach(group=>{
    let dragged=null;
    group.querySelectorAll('.nav-btn').forEach(btn=>{
      btn.addEventListener('dragstart',()=>{ dragged=btn; btn.classList.add('nav-dragging'); });
      btn.addEventListener('dragend',()=>{
        btn.classList.remove('nav-dragging');
        group.querySelectorAll('.nav-drag-over').forEach(b=>b.classList.remove('nav-drag-over'));
        saveNavOrder(group);
      });
      btn.addEventListener('dragover',(e)=>{
        e.preventDefault();
        if(btn===dragged) return;
        btn.classList.add('nav-drag-over');
      });
      btn.addEventListener('dragleave',()=>btn.classList.remove('nav-drag-over'));
      btn.addEventListener('drop',(e)=>{
        e.preventDefault();
        btn.classList.remove('nav-drag-over');
        if(!dragged||btn===dragged) return;
        const all=[...group.querySelectorAll('.nav-btn')];
        const draggedIdx=all.indexOf(dragged), targetIdx=all.indexOf(btn);
        if(draggedIdx<targetIdx) btn.after(dragged); else btn.before(dragged);
      });
    });
  });
}

// ── DATES ──
window.toggleDates=()=>{
  const s=document.getElementById('mStatus').value;
  document.getElementById('sellDateField').style.display=!isPreSaleStatus(s)?'block':'none';
};
// today()/daysBetween() sont définies dans calc.js (chargé avant ce fichier).
function sellTimeLabel(a){
  if(isPreSaleStatus(a.status)) return '';
  const days=daysBetween(a.buy_date,a.sell_date||a.created_at?.split('T')[0]);
  if(days===null)return '';
  if(days===0)return 'Vendu le jour même';
  if(days===1)return 'Vendu en 1 jour';
  return `Vendu en ${days} jours`;
}

// ── HEATMAP ──
function heatmapColor(a) {
  if(!isPreSaleStatus(a.status)) return null;
  const days = daysBetween(a.buy_date || a.created_at?.split('T')[0], today());
  if(days===null) return null;
  if(days<=30) return {color:'#00e5a0', label:'🟢 Récent'};
  if(days<=90) return {color:'#f59e0b', label:'🟠 Moyen'};
  return {color:'#ef4444', label:'🔴 Ancien'};
}

// isTrending()/calcScore() sont définies dans calc.js (chargé avant ce fichier).

// ── PHOTOS (galerie multi-photos) ──
function renderPhotoGallery(){
  const el=document.getElementById('photoGallery');
  if(!el) return;
  const tiles=photoEntries.map((entry,i)=>`
    <div class="photo-gallery-item${i===0?' is-main':''}" onclick="setMainPhoto(${i})" title="${i===0?'Photo principale':'Cliquer pour en faire la principale'}">
      <img src="${entry.url||entry.previewUrl}" alt="">
      ${i===0?'<span class="photo-main-badge">Principale</span>':''}
      <button class="photo-remove-btn" onclick="event.stopPropagation();removePhotoEntry(${i})">✕</button>
    </div>`).join('');
  el.innerHTML=tiles+`<div class="photo-gallery-add" onclick="document.getElementById('mPhoto').click()">+</div>`;
}
window.addPhotos=(event)=>{
  const files=Array.from(event.target.files||[]);
  files.forEach(file=>photoEntries.push({file,previewUrl:URL.createObjectURL(file)}));
  event.target.value='';
  renderPhotoGallery();
};
window.setMainPhoto=(i)=>{
  if(i===0) return;
  const [item]=photoEntries.splice(i,1);
  photoEntries.unshift(item);
  renderPhotoGallery();
};
window.removePhotoEntry=(i)=>{
  photoEntries.splice(i,1);
  renderPhotoGallery();
};
// Chemin de stockage rendu unique par photo (uuid, pas juste l'id de
// l'article) : avant ce correctif, remplacer une photo réutilisait le même
// chemin (upsert sur "{articleId}.{ext}") et le CDN/cache navigateur pouvait
// continuer de servir l'ancienne image indéfiniment (signalé le 2026-07-15).
async function uploadPhoto(file,articleId){
  const ext=file.name.split('.').pop();
  const path=`${currentUser.id}/${articleId}-${crypto.randomUUID()}.${ext}`;
  const {error}=await sb.storage.from('photos').upload(path,file,{upsert:false});
  if(error)return null;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

// ── LOAD ──
let allPurchases=[];
let allExpenses=[];
let allUnmatchedSales=[];
let vintedWallet=null;
async function loadArticles(){
  renderAccountSwitcher();
  const {data}=await applyAccountFilter(sb.from('articles').select('*').eq('user_id',currentUser.id)).order('created_at',{ascending:false});
  allArticles=data||[];
  const {data:purchasesData}=await applyAccountFilter(sb.from('vinted_purchases').select('*').eq('user_id',currentUser.id)).order('purchase_date',{ascending:false});
  allPurchases=purchasesData||[];
  // Ventes que le backend n'a pas réussi à relier avec confiance à un article
  // existant (voir resolve_sku côté backend) — à réconcilier manuellement
  // plutôt que de laisser une fausse fiche de stock se créer toute seule.
  const {data:unmatchedData}=await applyAccountFilter(sb.from('unmatched_sales').select('*').eq('user_id',currentUser.id)).order('created_at',{ascending:false});
  allUnmatchedSales=unmatchedData||[];
  const {data:expensesData}=await sb.from('expenses').select('*').eq('user_id',currentUser.id).order('expense_date',{ascending:false});
  allExpenses=expensesData||[];
  // wallet_balance : pas de .single() possible dès qu'il y a 2+ comptes
  // connectés — on prend soit le compte sélectionné, soit la somme de tous
  // les comptes (les soldes Vinted s'additionnent naturellement).
  const {data:accountsData}=await sb.from('vinted_accounts').select('id,wallet_balance,wallet_pending_balance').eq('user_id',currentUser.id);
  const relevantAccounts = selectedVintedAccountId ? (accountsData||[]).filter(a=>a.id===selectedVintedAccountId) : (accountsData||[]);
  vintedWallet = accountsData?.length ? {
    wallet_balance: relevantAccounts.reduce((s,a)=>s+(parseFloat(a.wallet_balance)||0),0),
    wallet_pending_balance: relevantAccounts.reduce((s,a)=>s+(parseFloat(a.wallet_pending_balance)||0),0),
  } : null;
  renderAll();
  renderSyncBanner();
  updateMessagesBadge();
  updateRepublishBadge();
}

// ── MODAL ──
window.editArticle=(id)=>{ openModal(allArticles.find(a=>a.id===id)||null); };
window.openModal=(article=null)=>{
  // Une seule liste ordonnée (photos déjà enregistrées + nouvelles en attente
  // d'upload) : l'index 0 est toujours la photo "principale". Voir
  // renderPhotoGallery()/addPhotos()/setMainPhoto()/removePhotoEntry().
  photoEntries=(article?.photo_urls&&article.photo_urls.length)
    ?article.photo_urls.map(url=>({url}))
    :(article?.photo_url?[{url:article.photo_url}]:[]);
  document.getElementById('mPhoto').value='';
  renderPhotoGallery();
  document.getElementById('mId').value=article?.id||'';
  document.getElementById('mName').value=article?.name||'';
  document.getElementById('mBuy').value=article?.buy_price||'';
  document.getElementById('mSell').value=article?.sell_price||'';
  document.getElementById('mExtraCosts').value=article?.extra_costs||'';
  document.getElementById('mPlatform').value=article?.platform||'Vinted';
  const prepStepsForModal=getPrepSteps();
  document.getElementById('mStatus').innerHTML=prepStepsForModal.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')+`
    <option value="stock">📦 En stock</option>
    <option value="expedition">🚚 Vendu — à expédier</option>
    <option value="vendu">💰 Vendu — expédié</option>`;
  document.getElementById('mStatus').value=article?.status||(prepStepsForModal[0]?.key||'stock');
  document.getElementById('mBuyDate').value=article?.buy_date||today();
  document.getElementById('mSellDate').value=article?.sell_date||today();
  document.getElementById('mLocation').value=article?.location||'';
  document.getElementById('mSource').value=article?.source||'Vinted';
  document.getElementById('modalTitle').textContent=article?"Modifier l'article":'Ajouter un article';
  document.getElementById('btnSave').textContent=article?'Enregistrer':'Ajouter';
  // Quantité (créer N fiches identiques d'un coup, ex: revente en gros
  // AliExpress où le même article existe en plusieurs exemplaires) n'a de
  // sens qu'à la création — un article déjà en stock est une fiche unique.
  document.getElementById('mQuantityField').style.display=article?'none':'block';
  document.getElementById('mQuantity').value='1';
  toggleDates();
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
  const sell_date=!isPreSaleStatus(status)?(document.getElementById('mSellDate').value||today()):null;
  const location=document.getElementById('mLocation').value.trim();
  const source=document.getElementById('mSource').value;
  if(!name)return;

  const btn=document.getElementById('btnSave');
  btn.textContent='...'; btn.disabled=true;

  const existing=id?allArticles.find(a=>a.id===id):null;
  const articleId=id||crypto.randomUUID();
  // Uploade uniquement les entrées encore locales (.file) ; celles déjà
  // enregistrées (.url) restent telles quelles. L'ordre de photoEntries est
  // préservé : index 0 = principale.
  const photoUrls=[];
  for(const entry of photoEntries){
    if(entry.url){ photoUrls.push(entry.url); continue; }
    const uploaded=await uploadPhoto(entry.file,articleId);
    if(uploaded) photoUrls.push(uploaded);
  }
  // Date de mise en ligne réelle (distincte de buy_date) : ne se pose qu'une
  // fois, la première fois que l'article passe (ou est créé) au statut stock.
  const published_at=status==='stock'?(existing?.published_at||today()):(existing?.published_at||null);

  const payload={name,buy_price:buy,sell_price:sell,extra_costs,platform,status,buy_date,sell_date,photo_url:photoUrls[0]||null,photo_urls:photoUrls,location,source,published_at};

  let saveError=null;
  if(id){
    const {data,error}=await sb.from('articles').update(payload).eq('id',id).eq('user_id',currentUser.id).select();
    if(data){const idx=allArticles.findIndex(a=>a.id===id);if(idx>=0)allArticles[idx]=data[0];}
    saveError=error;
  } else {
    // Quantité > 1 : autant de fiches indépendantes que d'exemplaires
    // identiques (revente en gros, ex: AliExpress) — chacune a son propre id
    // + sku car elles seront publiées/vendues séparément sur Vinted, pas
    // comme un seul article avec un "stock" de N (signalé le 2026-07-16).
    const quantity=Math.max(1,parseInt(document.getElementById('mQuantity').value)||1);
    // sku : identifiant stable généré ici, comme pour un article importé
    // depuis un achat Vinted (voir resolve_sku côté backend) — colonne
    // NOT NULL depuis la migration SKU du 2026-07-15.
    const rows=Array.from({length:quantity},()=>({id:crypto.randomUUID(),user_id:currentUser.id,sku:crypto.randomUUID().replace(/-/g,'').slice(0,8),...payload}));
    const {data,error}=await sb.from('articles').insert(rows).select();
    if(data) allArticles.unshift(...data);
    saveError=error;
  }

  btn.textContent=id?'Enregistrer':'Ajouter'; btn.disabled=false;
  // Une erreur Supabase (ex: colonne manquante, contrainte violée) ne
  // déclenche pas d'exception JS — sans cette vérification explicite, la
  // fenêtre se fermait en silence en laissant croire que tout avait été
  // enregistré, alors que rien ne l'était (signalé le 2026-07-16).
  if(saveError){ alert("Échec de l'enregistrement : "+saveError.message); return; }
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
  // Passer à "vendu" ouvre une confirmation dédiée (prix de vente réel, qui
  // peut différer du prix visé si négocié) plutôt que de valider en silence.
  if(step==='vendu'){ openSellConfirm(id); return; }
  const sell_date=!isPreSaleStatus(step)?today():null;
  const patch={status:step,sell_date};
  if(step==='stock') patch.published_at=today();
  const {data}=await sb.from('articles').update(patch).eq('id',id).eq('user_id',currentUser.id).select();
  if(data){const idx=allArticles.findIndex(a=>a.id===id);if(idx>=0)allArticles[idx]=data[0];}
  renderAll();
};

// ── CONFIRMATION DE VENTE (prix réel, saisi au moment de la vente) ──
window.openSellConfirm=(id)=>{
  const a=allArticles.find(x=>x.id===id);
  if(!a) return;
  document.getElementById('scId').value=id;
  document.getElementById('scArticleName').textContent=a.name;
  document.getElementById('scSellPrice').value=a.sell_price||'';
  document.getElementById('scExtraCosts').value=a.extra_costs||'';
  document.getElementById('scSellDate').value=today();
  updateSellPreview();
  document.getElementById('sellConfirmBg').classList.add('open');
};
window.closeSellConfirm=()=>document.getElementById('sellConfirmBg').classList.remove('open');

window.updateSellPreview=()=>{
  const id=document.getElementById('scId').value;
  const a=allArticles.find(x=>x.id===id);
  const buy=parseFloat(a?.buy_price)||0;
  const sell=parseFloat(document.getElementById('scSellPrice').value)||0;
  const fees=parseFloat(document.getElementById('scExtraCosts').value)||0;
  const profit=sell-buy-fees;
  document.getElementById('scBuyPreview').textContent='-'+fmtPrice(buy);
  document.getElementById('scSellPreview').textContent='+'+fmtPrice(sell);
  const profitEl=document.getElementById('scProfitPreview');
  profitEl.textContent=(profit>=0?'+':'')+fmtPrice(profit);
  profitEl.className='detail-row-val '+(profit>=0?'profit-pos':'profit-neg');
};

window.submitSellConfirm=async()=>{
  const id=document.getElementById('scId').value;
  const patch={
    status:'vendu',
    sell_price:parseFloat(document.getElementById('scSellPrice').value)||0,
    extra_costs:parseFloat(document.getElementById('scExtraCosts').value)||0,
    sell_date:document.getElementById('scSellDate').value||today(),
  };
  const {data}=await sb.from('articles').update(patch).eq('id',id).eq('user_id',currentUser.id).select();
  if(data){const idx=allArticles.findIndex(a=>a.id===id);if(idx>=0)allArticles[idx]=data[0];}
  closeSellConfirm();
  renderAll();
};

// ── FILTERS ──
window.filterPlatform=(p,btn,section)=>{
  currentFilter[section]=p;
  if(btn){
    btn.closest('.page-filters').querySelectorAll('.pf-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }
  if(section==='stockall') renderStockAll();
  if(section==='replay') renderReplay();
};

// ── HELPERS ──
// calcProfit()/fmtPrice()/fmtDate() sont définies dans calc.js (chargé avant ce fichier).
function platformBadgeClass(p){return{Vinted:'badge-vinted',eBay:'badge-ebay',Leboncoin:'badge-leboncoin'}[p]||'badge-autre';}

function stepBadge(s){
  const step=getAllSteps().find(p=>p.key===s);
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
  const allSteps=getAllSteps();
  const nextStep=allSteps[allSteps.findIndex(p=>p.key===a.status)+1];
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
function renderAll(){renderDashboard();renderStockAll();renderAnalytics();renderObjectif();}

function renderDashboard(){
  const vendus=allArticles.filter(a=>a.status==='vendu');
  const stock=allArticles.filter(a=>isPreSaleStatus(a.status));
  const expedition=allArticles.filter(a=>a.status==='expedition');
  const totalProfit=vendus.reduce((s,a)=>s+calcProfit(a),0);
  const investi=stock.reduce((s,a)=>s+(parseFloat(a.buy_price)||0),0);
  const ca=vendus.reduce((s,a)=>s+calcCA(a),0);
  const coutVendus=vendus.reduce((s,a)=>s+(parseFloat(a.buy_price)||0),0);
  const roiGlobal=coutVendus>0?(totalProfit/coutVendus*100):0;
  const now=new Date();
  const profitMois=vendus.filter(a=>{const d=new Date(a.sell_date||a.created_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,a)=>s+calcProfit(a),0);
  const capitalBloque=allArticles.filter(a=>{
    if(!isPreSaleStatus(a.status))return false;
    const days=daysBetween(a.buy_date||a.created_at?.split('T')[0],today());
    return days!==null&&days>30;
  }).reduce((s,a)=>s+(parseFloat(a.buy_price)||0),0);
  const achatsMois=allPurchases.filter(p=>{
    const d=new Date(p.purchase_date||p.synced_at);
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  }).reduce((s,p)=>s+(p.transaction_status==='failed'?0:(parseFloat(p.price)||0)),0);
  const totalDepenses=allExpenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const profitNet=totalProfit-totalDepenses;

  const kpis=[
    {key:'kpi_profit_total', html:`<div class="kpi-card"><div class="kpi-label">Profit total</div><div class="kpi-val ${totalProfit>=0?'green':'red'}">${fmtPrice(totalProfit)}</div></div>`},
    {key:'kpi_profit_mois', html:`<div class="kpi-card"><div class="kpi-label">Profit ce mois</div><div class="kpi-val ${profitMois>=0?'green':'red'}">${fmtPrice(profitMois)}</div><div class="kpi-sub">Automatique</div></div>`},
    {key:'kpi_profit_net', html:`<div class="kpi-card"><div class="kpi-label">Profit net (après dépenses)</div><div class="kpi-val ${profitNet>=0?'green':'red'}">${fmtPrice(profitNet)}</div><div class="kpi-sub">-${fmtPrice(totalDepenses)} de dépenses</div></div>`},
    {key:'kpi_stock', html:`<div class="kpi-card"><div class="kpi-label">En stock</div><div class="kpi-val">${stock.length}</div><div class="kpi-sub">${fmtPrice(investi)} investis</div></div>`},
    {key:'kpi_expedition', html:`<div class="kpi-card"><div class="kpi-label">À expédier</div><div class="kpi-val" style="color:var(--warning)">${expedition.length}</div></div>`},
    {key:'kpi_vendus', html:`<div class="kpi-card"><div class="kpi-label">Vendus</div><div class="kpi-val">${vendus.length}</div></div>`},
    {key:'kpi_capital', html:`<div class="kpi-card"><div class="kpi-label">Capital bloqué +30j</div><div class="kpi-val red">${fmtPrice(capitalBloque)}</div></div>`},
    {key:'kpi_achats', html:`<div class="kpi-card"><div class="kpi-label">🛍️ Achats Vinted ce mois</div><div class="kpi-val red">-${fmtPrice(achatsMois)}</div><div class="kpi-sub">Automatique</div></div>`},
    {key:'kpi_ca', html:`<div class="kpi-card"><div class="kpi-label">Chiffre d'affaires</div><div class="kpi-val">${fmtPrice(ca)}</div></div>`},
    {key:'kpi_roi', html:`<div class="kpi-card kpi-clickable" onclick="showRoiInfo(${roiGlobal})"><div class="kpi-label">ROI global ⓘ</div><div class="kpi-val ${roiGlobal>=0?'green':'red'}">${roiGlobal.toFixed(0)}%</div></div>`},
  ];
  if(vintedWallet){
    kpis.push({key:'kpi_wallet', html:`<div class="kpi-card"><div class="kpi-label">💰 Solde Vinted</div><div class="kpi-val green">${fmtPrice(vintedWallet.wallet_balance)}</div>${vintedWallet.wallet_pending_balance>0?`<div class="kpi-sub">+${fmtPrice(vintedWallet.wallet_pending_balance)} en attente</div>`:''}</div>`});
  }
  const kpiPrefs=getDashboardWidgetPrefs();
  document.getElementById('kpiGrid').innerHTML=kpis.filter(k=>kpiPrefs[k.key]).map(k=>k.html).join('');

  // IA Coach
  const coach=generateCoach();
  document.getElementById('coachBox').innerHTML=coach;

  document.getElementById('recentList').innerHTML=allArticles.slice(0,4).length
    ?`<div class="article-list">${allArticles.slice(0,4).map(a=>articleHTML(a)).join('')}</div>`
    :emptyState('Aucun article encore.');
  renderMiniChart('dashChartBars','dashChartLabels');
  renderWeeklySummary();
  renderQuickCalc();
  renderAccountsBreakdown();
  applyDashboardWidgets();
}

// ── VUE CONSOLIDÉE MULTI-COMPTES ── (visible seulement en mode "Tous les
// comptes" avec 2+ comptes connectés — allArticles contient alors déjà les
// articles de tous les comptes, filtrés côté client par compte).
function renderAccountsBreakdown(){
  const el=document.getElementById('accountsBreakdown');
  if(!el) return;
  if(selectedVintedAccountId || vintedAccounts.length<2){ el.innerHTML=''; return; }
  const cards=vintedAccounts.map(acc=>{
    const arts=allArticles.filter(a=>a.vinted_account_id===acc.id);
    const vendus=arts.filter(a=>a.status==='vendu');
    const stock=arts.filter(a=>isPreSaleStatus(a.status));
    const profit=vendus.reduce((s,a)=>s+calcProfit(a),0);
    const ca=vendus.reduce((s,a)=>s+calcCA(a),0);
    return `
      <div class="account-breakdown-card" onclick="onAccountSwitch('${acc.id}')">
        <div class="account-breakdown-header">
          <span class="account-dot ${acc.connected?'account-dot-on':'account-dot-off'}"></span>
          <span class="account-breakdown-name">@${acc.vinted_login||'compte'}</span>
        </div>
        <div class="account-breakdown-stats">
          <div><div class="kpi-label">Profit</div><div class="kpi-val ${profit>=0?'green':'red'}">${fmtPrice(profit)}</div></div>
          <div><div class="kpi-label">CA</div><div class="kpi-val">${fmtPrice(ca)}</div></div>
          <div><div class="kpi-label">Stock</div><div class="kpi-val">${stock.length}</div></div>
          <div><div class="kpi-label">Vendus</div><div class="kpi-val">${vendus.length}</div></div>
        </div>
      </div>`;
  }).join('');
  el.innerHTML=`
    <div class="section-header" style="margin-top:4px;"><h2>Vos comptes</h2></div>
    <div class="accounts-breakdown">${cards}</div>
  `;
}

// ── PERSONNALISATION DU TABLEAU DE BORD ──
const DASH_WIDGETS=['kpi_profit_total','kpi_profit_mois','kpi_profit_net','kpi_stock','kpi_expedition','kpi_vendus','kpi_capital','kpi_achats','kpi_ca','kpi_roi','kpi_wallet','weekly','coach','calc','recent','chart'];
function getDashboardWidgetPrefs(){
  const stored=JSON.parse(localStorage.getItem('dashWidgets_'+currentUser.id)||'{}');
  const prefs={};
  DASH_WIDGETS.forEach(w=>{ prefs[w]=stored[w]!==false; });
  return prefs;
}
function applyDashboardWidgets(){
  const prefs=getDashboardWidgetPrefs();
  DASH_WIDGETS.forEach(w=>{
    const el=document.querySelector(`[data-widget="${w}"]`);
    if(el) el.style.display=prefs[w]?'':'none';
  });
}
window.showDashboardSettings=()=>{
  const prefs=getDashboardWidgetPrefs();
  DASH_WIDGETS.forEach(w=>{ document.getElementById('widget_'+w).checked=prefs[w]; });
  document.getElementById('dashWidgetsBg').classList.add('open');
};
window.closeDashboardSettings=()=>document.getElementById('dashWidgetsBg').classList.remove('open');
window.saveDashboardSettings=()=>{
  const prefs={};
  DASH_WIDGETS.forEach(w=>{ prefs[w]=document.getElementById('widget_'+w).checked; });
  localStorage.setItem('dashWidgets_'+currentUser.id, JSON.stringify(prefs));
  renderDashboard();
  closeDashboardSettings();
};

// ── CALCULATEUR DE MARGE RAPIDE ──
window.renderQuickCalc = () => {
  const el=document.getElementById('quickCalcResult');
  if(!el) return;
  const buy=parseFloat(document.getElementById('quickCalcBuy').value)||0;
  const sell=parseFloat(document.getElementById('quickCalcSell').value)||0;
  const profit=sell-buy;
  const margin=sell>0?(profit/sell*100):0;
  const roi=buy>0?(profit/buy*100):0;
  el.innerHTML=`
    <div class="quick-calc-stat"><div class="quick-calc-stat-label">Profit</div><div class="quick-calc-stat-val ${profit>=0?'profit-pos':'profit-neg'}">${profit>=0?'+':''}${fmtPrice(profit)}</div></div>
    <div class="quick-calc-stat"><div class="quick-calc-stat-label">Marge</div><div class="quick-calc-stat-val">${margin.toFixed(0)}%</div></div>
    <div class="quick-calc-stat"><div class="quick-calc-stat-label">ROI</div><div class="quick-calc-stat-val">${roi.toFixed(0)}%</div></div>
  `;
};

// ── CALCULATEUR PUBLIC (page vitrine, sans compte) ──
window.renderPublicCalc = () => {
  const el=document.getElementById('publicCalcResult');
  if(!el) return;
  const buy=parseFloat(document.getElementById('publicCalcBuy').value)||0;
  const sell=parseFloat(document.getElementById('publicCalcSell').value)||0;
  const profit=sell-buy;
  const margin=sell>0?(profit/sell*100):0;
  const roi=buy>0?(profit/buy*100):0;
  el.innerHTML=`
    <div class="quick-calc-stat"><div class="quick-calc-stat-label">Profit</div><div class="quick-calc-stat-val ${profit>=0?'profit-pos':'profit-neg'}">${profit>=0?'+':''}${fmtPrice(profit)}</div></div>
    <div class="quick-calc-stat"><div class="quick-calc-stat-label">Marge</div><div class="quick-calc-stat-val">${margin.toFixed(0)}%</div></div>
    <div class="quick-calc-stat"><div class="quick-calc-stat-label">ROI</div><div class="quick-calc-stat-val">${roi.toFixed(0)}%</div></div>
  `;
};

// ── FAQ (page vitrine) ──
window.toggleFaq = (btn) => {
  const item = btn.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  item.parentElement.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if(!wasOpen) item.classList.add('open');
};

// ── PRIX DU MARCHÉ (recherche publique Vinted) ──
window.checkMarketPrice = async () => {
  const query=document.getElementById('marketPriceQuery').value.trim();
  const el=document.getElementById('marketPriceResult');
  if(!query||query.length<2){ el.innerHTML=`<p style="font-size:12px;color:var(--danger);margin-top:10px;">Tapez au moins 2 caractères.</p>`; return; }
  el.innerHTML=`<p style="font-size:12px;color:var(--muted);margin-top:10px;">Recherche en cours...</p>`;
  try{
    const token=(await sb.auth.getSession()).data.session?.access_token;
    const r=await fetch(`${BACKEND}/api/vinted/market-price?query=${encodeURIComponent(query)}`,{
      headers:{ 'Authorization': `Bearer ${token}` },
    });
    const data=await r.json();
    if(!r.ok){ el.innerHTML=`<p style="font-size:12px;color:var(--danger);margin-top:10px;">${r.status===401?'Session expirée, reconnectez-vous.':'Erreur, réessayez.'}</p>`; return; }
    if(!data.count){ el.innerHTML=`<p style="font-size:12px;color:var(--muted);margin-top:10px;">Aucun résultat trouvé pour "${query}".</p>`; return; }
    el.innerHTML=`
      <p style="font-size:12px;color:var(--muted);margin-top:10px;">${data.count} annonce(s) similaire(s) trouvée(s) sur Vinted</p>
      <div class="market-price-stats">
        <div class="quick-calc-stat"><div class="quick-calc-stat-label">Moyenne</div><div class="quick-calc-stat-val">${fmtPrice(data.average)}</div></div>
        <div class="quick-calc-stat"><div class="quick-calc-stat-label">Médiane</div><div class="quick-calc-stat-val">${fmtPrice(data.median)}</div></div>
        <div class="quick-calc-stat"><div class="quick-calc-stat-label">Min</div><div class="quick-calc-stat-val">${fmtPrice(data.min)}</div></div>
        <div class="quick-calc-stat"><div class="quick-calc-stat-label">Max</div><div class="quick-calc-stat-val">${fmtPrice(data.max)}</div></div>
      </div>
    `;
  }catch(e){
    el.innerHTML=`<p style="font-size:12px;color:var(--danger);margin-top:10px;">Erreur de connexion au serveur.</p>`;
  }
};

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

window.exportMyData = () => {
  const payload={
    exported_at: new Date().toISOString(),
    articles: allArticles,
    achats: allPurchases,
    depenses: allExpenses,
  };
  const blob=new Blob([JSON.stringify(payload, null, 2)], {type:'application/json;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`vinted-manager-donnees-${today()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── ACCÈS COMPTABLE (lien de partage en lecture seule) ──
async function renderAccountantLink(){
  const el=document.getElementById('accountantLinkBox');
  if(!el) return;
  el.innerHTML='Chargement...';
  const {data}=await sb.from('accountant_links').select('token').eq('user_id',currentUser.id).eq('revoked',false).limit(1).maybeSingle();
  if(!data){
    el.innerHTML=`<button class="btn-confirm" onclick="generateAccountantLink()">🔗 Générer un lien comptable</button>`;
    return;
  }
  const url=`${location.origin}/comptable.html?token=${data.token}`;
  el.innerHTML=`
    <div class="expense-form-row">
      <input type="text" readonly value="${url}" style="flex:1;" onclick="this.select()" />
      <button class="btn-confirm" onclick="copyAccountantLink('${url}')">📋 Copier</button>
      <button class="btn-danger" onclick="revokeAccountantLink()">Révoquer</button>
    </div>
  `;
}
window.generateAccountantLink = async () => {
  const {error}=await sb.from('accountant_links').insert({user_id:currentUser.id});
  if(error){ alert('Erreur : '+error.message); return; }
  renderAccountantLink();
};
window.revokeAccountantLink = async () => {
  if(!confirm('Révoquer ce lien ? Votre comptable ne pourra plus y accéder.')) return;
  await sb.from('accountant_links').update({revoked:true}).eq('user_id',currentUser.id).eq('revoked',false);
  renderAccountantLink();
};
window.copyAccountantLink = (url) => {
  navigator.clipboard.writeText(url);
  const msg=document.getElementById('settingsMsg');
  if(msg){ msg.textContent='Lien copié !'; setTimeout(()=>msg.textContent='',2000); }
};

// ── PROFIL VENDEUR & FACTURES PDF ── (mentions indicatives, à vérifier avec un comptable)
async function renderSellerProfile(){
  const nameEl=document.getElementById('sellerBusinessName');
  if(!nameEl) return;
  const {data}=await sb.from('seller_profile').select('*').eq('user_id',currentUser.id).maybeSingle();
  nameEl.value=data?.business_name||'';
  document.getElementById('sellerSiret').value=data?.siret||'';
  document.getElementById('sellerAddress').value=data?.address||'';
  document.getElementById('sellerRegime').value=data?.regime||'micro_vente';
}
window.saveSellerProfile = async () => {
  const payload={
    user_id: currentUser.id,
    business_name: document.getElementById('sellerBusinessName').value.trim(),
    siret: document.getElementById('sellerSiret').value.trim(),
    address: document.getElementById('sellerAddress').value.trim(),
    regime: document.getElementById('sellerRegime').value,
    updated_at: new Date().toISOString(),
  };
  const {error}=await sb.from('seller_profile').upsert(payload);
  const msg=document.getElementById('sellerProfileMsg');
  msg.textContent = error ? 'Erreur : '+error.message : 'Enregistré !';
  if(!error) setTimeout(()=>{ if(msg.textContent==='Enregistré !') msg.textContent=''; },2500);
};

const REGIME_TVA_MENTIONS = {
  micro_vente: "TVA non applicable, art. 293 B du CGI",
  micro_service: "TVA non applicable, art. 293 B du CGI",
  tva_marge: "TVA sur la marge — régime particulier des biens d'occasion, article 297 A du CGI",
};

window.generateInvoicePDF = async (articleId) => {
  const article=allArticles.find(a=>a.id===articleId);
  if(!article){ alert('Article introuvable.'); return; }
  const {data:profile}=await sb.from('seller_profile').select('*').eq('user_id',currentUser.id).maybeSingle();
  if(!profile?.business_name){
    alert("Complétez d'abord votre profil vendeur dans Paramètres (nom, SIRET, adresse) avant de générer une facture.");
    return;
  }
  // Réutilise le numéro déjà attribué si la facture existe déjà pour cet
  // article, pour ne pas régénérer un nouveau numéro à chaque clic.
  const {data:existing}=await sb.from('invoices').select('invoice_number').eq('article_id',articleId).eq('invoice_type','facture').maybeSingle();
  let invoiceNumber=existing?.invoice_number;
  if(!invoiceNumber){
    const {data:num, error:numErr}=await sb.rpc('next_invoice_number');
    if(numErr){ alert('Erreur : '+numErr.message); return; }
    invoiceNumber=num;
    const {error:insErr}=await sb.from('invoices').insert({user_id:currentUser.id, article_id:articleId, invoice_number:invoiceNumber, invoice_type:'facture'});
    if(insErr){ alert('Erreur : '+insErr.message); return; }
  }
  buildInvoicePdf(article, profile, invoiceNumber);
};

function buildInvoicePdf(article, profile, invoiceNumber){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const price = calcCA(article);
  const numStr = String(invoiceNumber).padStart(4,'0');

  doc.setFontSize(18); doc.text('FACTURE', 14, 20);
  doc.setFontSize(10);
  doc.text(`N° ${numStr}`, 14, 28);
  doc.text(`Date : ${fmtDate(article.sell_date||article.created_at)}`, 14, 34);

  doc.setFontSize(11); doc.text('Vendeur', 14, 48);
  doc.setFontSize(10);
  doc.text(profile.business_name||'', 14, 54);
  if(profile.siret) doc.text(`SIRET : ${profile.siret}`, 14, 60);
  if(profile.address) doc.text(profile.address, 14, 66);

  doc.setFontSize(11); doc.text('Acheteur', 120, 48);
  doc.setFontSize(10);
  doc.text('Client Vinted', 120, 54);

  doc.setLineWidth(0.2); doc.line(14, 78, 196, 78);
  doc.setFontSize(10);
  doc.text('Désignation', 14, 86);
  doc.text('Prix', 170, 86);
  doc.line(14, 90, 196, 90);
  doc.text(article.name||'Article', 14, 98);
  doc.text(fmtPrice(price), 170, 98);
  doc.line(14, 106, 196, 106);

  doc.setFontSize(11); doc.text(`Total : ${fmtPrice(price)}`, 140, 116);

  doc.setFontSize(9);
  doc.text(REGIME_TVA_MENTIONS[profile.regime]||'', 14, 130);
  doc.setFontSize(8); doc.setTextColor(140);
  doc.text('Facture générée automatiquement par VintControl — à vérifier avec votre comptable.', 14, 285);

  doc.save(`facture-${numStr}.pdf`);
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
    if(!byYear[y]) byYear[y]={year:y,count:0,buy:0,sell:0,profit:0,expenses:0};
    byYear[y].count++;
    byYear[y].buy+=parseFloat(a.buy_price)||0;
    byYear[y].sell+=parseFloat(a.sell_price)||0;
    byYear[y].profit+=calcProfit(a);
  });
  allExpenses.forEach(e=>{
    const y=new Date(e.expense_date).getFullYear();
    if(!byYear[y]) byYear[y]={year:y,count:0,buy:0,sell:0,profit:0,expenses:0};
    byYear[y].expenses+=parseFloat(e.amount)||0;
  });
  const rows=Object.values(byYear).sort((a,b)=>a.year-b.year);
  if(!rows.length){ alert('Aucune vente enregistrée pour le moment.'); return; }
  const headers=[
    {label:'Année', get:r=>r.year},
    {label:'Nombre de ventes', get:r=>r.count},
    {label:'Total achats', get:r=>r.buy.toFixed(2)},
    {label:'Total ventes', get:r=>r.sell.toFixed(2)},
    {label:'Profit total', get:r=>r.profit.toFixed(2)},
    {label:'Dépenses générales', get:r=>r.expenses.toFixed(2)},
    {label:'Profit net', get:r=>(r.profit-r.expenses).toFixed(2)},
  ];
  downloadCSV(toCSV(rows, headers), `vinted-manager-recap-fiscal-${today()}.csv`);
};

// ── COMPTABILITÉ ── (marge réelle après charges, indicatif — pas un substitut à un comptable)
function comptaPeriodRange(period){
  const now=new Date();
  if(period==='month') return {start:new Date(now.getFullYear(),now.getMonth(),1), end:new Date(now.getFullYear(),now.getMonth()+1,1)};
  if(period==='lastmonth') return {start:new Date(now.getFullYear(),now.getMonth()-1,1), end:new Date(now.getFullYear(),now.getMonth(),1)};
  if(period==='year') return {start:new Date(now.getFullYear(),0,1), end:new Date(now.getFullYear()+1,0,1)};
  return {start:null, end:null};
}
function comptaVentesInPeriod(){
  const period=document.getElementById('comptaPeriod')?.value||'all';
  const {start,end}=comptaPeriodRange(period);
  return allArticles.filter(a=>{
    if(a.status!=='vendu') return false;
    if(!start) return true;
    const d=new Date(a.sell_date||a.created_at);
    return d>=start && d<end;
  });
}
function comptaDepensesInPeriod(){
  const period=document.getElementById('comptaPeriod')?.value||'all';
  const {start,end}=comptaPeriodRange(period);
  return allExpenses.filter(e=>{
    if(!start) return true;
    const d=new Date(e.expense_date);
    return d>=start && d<end;
  });
}
// Régimes fiscaux les plus courants chez les revendeurs Vinted — indicatif,
// ne remplace pas l'avis d'un comptable. URSSAF calculé sur le CA (régime
// micro-entrepreneur), TVA sur marge calculée sur la marge brute (le prix de
// vente inclut déjà la TVA, d'où la division par 1,2 pour l'extraire).
const COMPTA_REGIMES = {
  micro_vente:   { label:'URSSAF', rate:0.123, base:'ca' },
  micro_service: { label:'URSSAF', rate:0.212, base:'ca' },
  tva_marge:     { label:'TVA sur marge', rate:0.2/1.2, base:'marge' },
};
function comptaChargeInfo(){
  const regime=document.getElementById('comptaRegime')?.value||'micro_vente';
  if(regime==='custom'){
    const rate=(parseFloat(document.getElementById('comptaChargeRate')?.value)||0)/100;
    return {label:'Charges', rate, base:'ca'};
  }
  return COMPTA_REGIMES[regime]||COMPTA_REGIMES.micro_vente;
}
function comptaCharge(ca, margeBrute, info){
  const base = info.base==='marge' ? margeBrute : ca;
  return Math.max(0, base) * info.rate;
}
window.renderComptabilite = () => {
  const el=document.getElementById('comptaKpi');
  if(!el) return;
  const customWrap=document.getElementById('comptaCustomRateWrap');
  if(customWrap) customWrap.style.display = document.getElementById('comptaRegime')?.value==='custom' ? 'flex' : 'none';
  const info=comptaChargeInfo();
  const vendus=comptaVentesInPeriod();
  const depenses=comptaDepensesInPeriod();
  const ca=vendus.reduce((s,a)=>s+calcCA(a),0);
  const margeBrute=vendus.reduce((s,a)=>s+calcProfit(a),0);
  const charges=comptaCharge(ca, margeBrute, info);
  const totalDepenses=depenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const margeReelle=margeBrute-charges-totalDepenses;

  el.innerHTML=`
    <div class="kpi-card"><div class="kpi-label">Chiffre d'affaires</div><div class="kpi-val">${fmtPrice(ca)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Marge brute</div><div class="kpi-val">${fmtPrice(margeBrute)}</div></div>
    <div class="kpi-card"><div class="kpi-label">${info.label} (${(info.rate*100).toFixed(1)}%)</div><div class="kpi-val">${fmtPrice(charges)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Dépenses générales</div><div class="kpi-val">${fmtPrice(totalDepenses)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Marge réelle</div><div class="kpi-val ${margeReelle>=0?'green':'red'}">${fmtPrice(margeReelle)}</div></div>
  `;

  const listEl=document.getElementById('comptaList');
  if(listEl){
    const sorted=[...vendus].sort((a,b)=>new Date(b.sell_date||b.created_at)-new Date(a.sell_date||a.created_at));
    listEl.innerHTML = sorted.length ? sorted.map(a=>{
      const caA=calcCA(a), margeA_brute=calcProfit(a), chargeA=comptaCharge(caA, margeA_brute, info), margeA=margeA_brute-chargeA;
      return `<div class="article-card" onclick="showDetail('${a.id}')">
        ${photoEl(a)}
        <div class="article-info">
          <div class="article-name">${a.name||'Sans nom'}</div>
          <div class="article-sub">${fmtDate(a.sell_date||a.created_at)} · CA ${fmtPrice(caA)} · Charges ${fmtPrice(chargeA)}</div>
        </div>
        <button class="btn-edit" onclick="event.stopPropagation();generateInvoicePDF('${a.id}')" title="Générer la facture PDF">🧾 Facture</button>
        <div class="article-profit ${margeA>=0?'profit-pos':'profit-neg'}">${margeA>=0?'+':''}${fmtPrice(margeA)}</div>
      </div>`;
    }).join('') : '<p class="empty-state">Aucune vente sur cette période.</p>';
  }
};
function comptaExportRows(){
  const info=comptaChargeInfo();
  const vendus=comptaVentesInPeriod();
  return vendus.map(a=>{
    const caA=calcCA(a), margeA_brute=calcProfit(a), chargeA=comptaCharge(caA, margeA_brute, info);
    return {
      Nom: a.name||'',
      'Date vente': a.sell_date||a.created_at||'',
      CA: parseFloat(caA.toFixed(2)),
      'Marge brute': parseFloat(margeA_brute.toFixed(2)),
      [`${info.label} (${(info.rate*100).toFixed(1)}%)`]: parseFloat(chargeA.toFixed(2)),
      'Marge réelle': parseFloat((margeA_brute-chargeA).toFixed(2)),
    };
  });
}
window.exportComptabiliteCSV = () => {
  const rows=comptaExportRows();
  if(!rows.length){ alert('Aucune vente sur cette période.'); return; }
  const headers=Object.keys(rows[0]).map(k=>({label:k, get:r=>r[k]}));
  downloadCSV(toCSV(rows, headers), `vinted-manager-comptabilite-${today()}.csv`);
};
window.exportComptabiliteExcel = () => {
  const rows=comptaExportRows();
  if(!rows.length){ alert('Aucune vente sur cette période.'); return; }
  const sheet=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Comptabilité');
  XLSX.writeFile(wb, `vinted-manager-comptabilite-${today()}.xlsx`);
};

// ── RECHERCHE GLOBALE ──
function statusLabel(s){
  const step=getAllSteps().find(p=>p.key===s);
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
  const prepStepsForCoach=getPrepSteps();
  const lastPrepStep=prepStepsForCoach[prepStepsForCoach.length-1];
  const apublier=lastPrepStep?allArticles.filter(a=>a.status===lastPrepStep.key):[];
  if(apublier.length>0) msgs.push(`✍️ <strong>${apublier.length} articles</strong> sont prêts à être publiés sur Vinted.`);
  const anciens=allArticles.filter(a=>{
    if(!isPreSaleStatus(a.status))return false;
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

// ── STOCK UNIFIÉ (laver/photo/publier/stock/expédition/vendus en une page) ──
// Label + couleur du statut d'un article, pour le badge coloré des cartes
// (réutilise les mêmes couleurs que stepBadge()/getAllSteps()).
function statusMeta(status){
  return getAllSteps().find(p=>p.key===status) || {label:status, color:'#888'};
}

function articleTileHTML(a, opts={}){
  const allSteps=getAllSteps();
  const nextStep=allSteps[allSteps.findIndex(p=>p.key===a.status)+1];
  const heat=heatmapColor(a);
  const trending=isTrending(a);
  const profit=a.status==='vendu'?calcProfit(a):0;
  const checkbox=opts.selectSection&&selectMode[opts.selectSection]
    ?`<span class="tile-checkbox-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="tile-select-checkbox" ${selectedIds[opts.selectSection].has(a.id)?'checked':''} onchange="toggleArticleSelect('${opts.selectSection}','${a.id}',this.checked)" /></span>`:'';
  // Pas encore en stock (à laver/photographier/publier/...) : le prix affiché
  // est le prix d'ACHAT, donc une dépense — signe moins et couleur rouge pour
  // ne pas le confondre avec le prix de vente (positif) des autres sections.
  let priceLabel, priceClass='';
  if(a.status==='vendu'){ priceLabel=(profit>=0?'+':'')+fmtPrice(profit); priceClass=profit>=0?'profit-pos':'profit-neg'; }
  else if(['stock','expedition'].includes(a.status)) priceLabel=fmtPrice(a.sell_price);
  else { priceLabel='-'+fmtPrice(a.buy_price); priceClass='profit-neg'; }
  const status=statusMeta(a.status);
  // Un seul indicateur de statut par carte au lieu de deux (badge coloré sur
  // la photo + bouton coloré sous le prix, jugé too much le 2026-07-15) : un
  // simple point coloré discret sur la photo indique l'étape actuelle, et le
  // texte sous le prix sert à la fois d'étiquette et d'action (cliquer pour
  // passer à l'étape suivante) — plus léger visuellement.
  const statusDot=`<span class="tile-status-dot" style="background:${status.color}" title="${status.label}"></span>`;
  const actionBtn=opts.showMove&&nextStep
    ?`<button class="tile-action-link" style="color:${nextStep.color};" title="Passer à : ${nextStep.label}" onclick="event.stopPropagation();moveToStep('${a.id}','${nextStep.key}')">${status.label} → ${nextStep.label}</button>`
    :`<span class="tile-action-link" style="color:${status.color};">${status.label}</span>`;
  const days=a.status!=='vendu'?daysInStock(a):null;
  const ageBadge=(days!==null)?`<span class="tile-age${days>=30?' tile-age-warn':''}" title="En stock depuis ${days} jour${days>1?'s':''}">${days}j</span>`:'';

  // Carte grande & horizontale (photo à gauche, détails à droite), inspirée
  // d'une carte repérée chez Vinteer le 2026-07-15 — remplace l'ancienne
  // vignette carrée compacte en vue "grille".
  const margin=(parseFloat(a.sell_price)||0)-(parseFloat(a.buy_price)||0)-(parseFloat(a.extra_costs)||0);
  const statLabel=a.status==='vendu'?'Profit':'Marge potentielle';
  const statVal=a.status==='vendu'?profit:margin;
  const tileStatsBadge=a.vinted_item_id&&a.status==='stock'
    ?`<span class="tile-stats-badge">👁️ ${a.vinted_vues||0} · ❤️ ${a.vinted_favoris||0}</span>`:'';
  return `<div class="article-tile" onclick="showDetail('${a.id}')">
    ${tileStatsBadge}
    <div class="tile-big-top">
      <div class="tile-photo">
        ${a.photo_url?`<img src="${a.photo_url}" alt="${a.name.replace(/"/g,'&quot;')}">`:'📦'}
        ${checkbox}
        ${heat?`<span class="tile-dot" style="background:${heat.color}" title="${heat.label}"></span>`:''}
        ${trending?`<span class="tile-trend" title="Tendance">🔥</span>`:''}
        ${ageBadge}
        ${statusDot}
      </div>
      <div class="tile-big-info">
        <div class="tile-big-name">${a.name}${a.vinted_boosted?' <span class="badge badge-vinted" title="Boost Vinted payant actif">🚀 Boosté</span>':''}</div>
        <div class="tile-big-tags"><span class="badge ${platformBadgeClass(a.platform)}">${a.platform}</span>${a.location?`<span class="tile-big-loc">📍 ${a.location}</span>`:''}</div>
        <div class="tile-big-date">📅 ${fmtDate(a.buy_date||a.created_at)}</div>
      </div>
    </div>
    <div class="tile-big-divider"></div>
    <div class="tile-big-stats">
      <div class="tile-big-stat"><span class="tile-big-stat-label">Prix d'achat</span><span class="tile-big-stat-val">${fmtPrice(a.buy_price)}</span></div>
      <div class="tile-big-stat"><span class="tile-big-stat-label">Prix de vente</span><span class="tile-big-stat-val">${fmtPrice(a.sell_price)}</span></div>
      <div class="tile-big-stat"><span class="tile-big-stat-label">${statLabel}</span><span class="tile-big-stat-val ${statVal>=0?'profit-pos':'profit-neg'}">${statVal>=0?'+':''}${fmtPrice(statVal)}</span></div>
    </div>
    ${actionBtn}
  </div>`;
}

// Rendu "vue liste" (compact, une ligne par article) — bascule avec la vue
// grille via setStockView(). Réutilise statusMeta() pour le même badge coloré.
function articleListRowHTML(a){
  const profit=a.status==='vendu'?calcProfit(a):0;
  let priceLabel, priceClass='';
  if(a.status==='vendu'){ priceLabel=(profit>=0?'+':'')+fmtPrice(profit); priceClass=profit>=0?'profit-pos':'profit-neg'; }
  else if(['stock','expedition'].includes(a.status)) priceLabel=fmtPrice(a.sell_price);
  else { priceLabel='-'+fmtPrice(a.buy_price); priceClass='profit-neg'; }
  const status=statusMeta(a.status);
  const days=a.status!=='vendu'?daysInStock(a):null;
  const ageLabel=(days!==null)?`<span class="tile-list-age${days>=30?' tile-age-warn':''}">${days}j</span>`:'';
  return `<div class="tile-list-row" onclick="showDetail('${a.id}')">
    <div class="tile-list-photo">${a.photo_url?`<img src="${a.photo_url}" alt="${a.name.replace(/"/g,'&quot;')}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`:'📦'}</div>
    <div class="tile-list-name">${a.name}</div>
    <span class="tile-list-status" style="background:${status.color}">${status.label}</span>
    ${ageLabel}
    <div class="tile-list-price ${priceClass}">${priceLabel}</div>
  </div>`;
}

// Catégorie sélectionnée sur la page Stock (chips) : "Tous" ou une clé de statut.
let stockCategoryFilter='Tous';
let stockQualityFilter=null; // null, 'no_photo' ou 'no_buy_price'
let stockSearchTerm='';
let stockViewMode='grid'; // 'grid' ou 'list', persisté par utilisateur
let stockSortMode='recent';

window.filterStockQuality=(key,btn)=>{
  stockQualityFilter=stockQualityFilter===key?null:key;
  renderStockAll();
};

window.onStockSearch=(value)=>{
  stockSearchTerm=value.trim().toLowerCase();
  renderStockAll();
};

window.onStockSort=(value)=>{
  stockSortMode=value;
  renderStockAll();
};

// Nombre de jours écoulés depuis l'entrée en stock de l'article (mise en
// ligne réelle si connue, sinon date d'achat, sinon date de création).
function daysInStock(a){
  return daysBetween(a.published_at||a.buy_date||a.created_at?.split('T')[0], today());
}

function sortStockArticles(arts){
  const copy=[...arts];
  if(stockSortMode==='oldest') copy.sort((a,b)=>(daysInStock(b)||0)-(daysInStock(a)||0));
  else if(stockSortMode==='price_desc') copy.sort((a,b)=>(parseFloat(b.sell_price)||0)-(parseFloat(a.sell_price)||0));
  else if(stockSortMode==='price_asc') copy.sort((a,b)=>(parseFloat(a.sell_price)||0)-(parseFloat(b.sell_price)||0));
  else copy.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  return copy;
}

// ── VENTES À RÉCONCILIER ──
// Une vente que le backend n'a pas pu relier avec confiance à un article
// existant (voir resolve_sku côté backend) atterrit dans unmatched_sales
// plutôt que de fabriquer une fausse fiche de stock (ancienne source des
// "Lot N articles" fantômes, signalé le 2026-07-15). L'utilisateur choisit
// ici, une fois, à quel article ça correspond — ou crée un nouvel article.
function renderUnmatchedSales(){
  const wrap=document.getElementById('unmatchedSalesWrap');
  if(!wrap) return;
  if(!allUnmatchedSales.length){ wrap.innerHTML=''; return; }
  // Inclut aussi les articles déjà "vendu" : une resynchro d'une vente déjà
  // traitée (mais sans lien enregistré, ex: articles antérieurs à la
  // migration SKU) doit pouvoir se relier à sa fiche existante plutôt que de
  // forcer la création d'un doublon (signalé le 2026-07-15).
  const options=`<option value="">— Choisir un article —</option>` +
    allArticles.map(a=>`<option value="${a.id}">${a.name} (${fmtPrice(a.buy_price||a.sell_price)})${a.status==='vendu'?' — déjà vendu':''}</option>`).join('');
  wrap.innerHTML=`
    <div class="info-banner" style="background:var(--warning-dim);color:var(--warning);margin-bottom:16px;">
      🔗 ${allUnmatchedSales.length} vente${allUnmatchedSales.length>1?'s':''} Vinted détectée${allUnmatchedSales.length>1?'s':''} sans article correspondant clair — reliez-les à un article existant ou créez-en un nouveau.
    </div>
    <div class="checklist-card" style="margin-bottom:16px;">
      ${allUnmatchedSales.map(u=>`
        <div class="checklist-item" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span>${u.photo_url?`<img src="${u.photo_url}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:8px;">`:''}<strong>${u.name||'(sans nom)'}</strong> — ${fmtPrice(u.sell_price)} — ${fmtDate(u.sell_date)}${u.vinted_shipping_status?' — '+u.vinted_shipping_status:''}</span>
          <span style="display:flex;gap:6px;align-items:center;">
            <select id="unmatchedSelect-${u.id}" class="stock-sort-select">${options}</select>
            <button class="pf-btn" onclick="linkUnmatchedSale('${u.id}')">Lier</button>
            <button class="pf-btn" onclick="createFromUnmatchedSale('${u.id}')">+ Nouvel article</button>
          </span>
        </div>`).join('')}
    </div>
  `;
}

// Relie une vente en attente à un article de stock déjà existant : met à
// jour l'article (statut/prix/date de vente) et enregistre le lien pour que
// les prochaines synchros retrouvent directement cet article.
window.linkUnmatchedSale=async(unmatchedId)=>{
  const select=document.getElementById('unmatchedSelect-'+unmatchedId);
  const articleId=select?.value;
  if(!articleId){ alert('Choisissez un article dans la liste.'); return; }
  const u=allUnmatchedSales.find(x=>x.id===unmatchedId);
  const article=allArticles.find(a=>a.id===articleId);
  if(!u||!article) return;
  const status=(u.vinted_transaction_status||'').toLowerCase()==='completed'?'vendu':'expedition';
  await sb.from('articles').update({
    status, sell_price:u.sell_price, sell_date:u.sell_date,
    vinted_shipping_status:u.vinted_shipping_status, vinted_transaction_status:u.vinted_transaction_status,
  }).eq('id',articleId).eq('user_id',currentUser.id);
  await sb.from('vinted_links').upsert({sku:article.sku, context:'order_sale', vinted_id:u.vinted_order_id}, {onConflict:'context,vinted_id'});
  await sb.from('unmatched_sales').delete().eq('id',unmatchedId).eq('user_id',currentUser.id);
  await loadArticles();
  renderAll();
};

// Aucun article existant ne correspond : crée-en un nouveau directement
// depuis la vente (avec un sku frais) plutôt que de laisser la vente en
// attente indéfiniment.
window.createFromUnmatchedSale=async(unmatchedId)=>{
  const u=allUnmatchedSales.find(x=>x.id===unmatchedId);
  if(!u) return;
  const sku=(crypto.randomUUID?crypto.randomUUID():String(Math.random())).replace(/-/g,'').slice(0,8);
  const status=(u.vinted_transaction_status||'').toLowerCase()==='completed'?'vendu':'expedition';
  const {data}=await sb.from('articles').insert([{
    user_id:currentUser.id, vinted_account_id:u.vinted_account_id, sku,
    name:u.name, sell_price:u.sell_price, sell_date:u.sell_date, platform:'Vinted', status,
    photo_url:u.photo_url, source:'Vinted', synced_at:today(),
    vinted_shipping_status:u.vinted_shipping_status, vinted_transaction_status:u.vinted_transaction_status,
  }]).select();
  if(data) await sb.from('vinted_links').insert({sku, context:'order_sale', vinted_id:u.vinted_order_id});
  await sb.from('unmatched_sales').delete().eq('id',unmatchedId).eq('user_id',currentUser.id);
  await loadArticles();
  renderAll();
};

window.setStockView=(mode)=>{
  stockViewMode=mode;
  localStorage.setItem('stockViewMode_'+currentUser.id, mode);
  renderStockAll();
};

function renderStockAll(){
  // Restaure la vue grille/liste choisie par l'utilisateur (lu une seule fois,
  // au premier rendu — stockViewMode reste ensuite en mémoire).
  if(!renderStockAll._viewRestored){
    const storedView=localStorage.getItem('stockViewMode_'+currentUser.id);
    if(storedView==='list') stockViewMode='list';
    renderStockAll._viewRestored=true;
  }

  renderUnmatchedSales();

  const platformFilter=currentFilter.stockall;
  const byPlatform=arts=>platformFilter==='Tous'?arts:arts.filter(a=>a.platform===platformFilter);
  const prepSteps=getPrepSteps();
  const categories=[...prepSteps, {key:'stock',label:'📦 En stock'}, {key:'expedition',label:'🚚 À expédier'}];

  const activeArts=byPlatform(allArticles.filter(a=>isPreSaleStatus(a.status)||a.status==='expedition'));
  const vendus=byPlatform(allArticles.filter(a=>a.status==='vendu'));
  const ca=vendus.reduce((s,a)=>s+calcCA(a),0);
  // Délai moyen d'expédition : depuis combien de temps, en moyenne, les
  // articles "à expédier" actuels attendent d'être envoyés (basé sur
  // sell_date) — signale un retard d'envoi qui traîne, pas juste un total.
  const expWaiting=byPlatform(allArticles.filter(a=>a.status==='expedition'&&a.sell_date));
  const avgDelay=expWaiting.length
    ?Math.round(expWaiting.reduce((s,a)=>s+(daysBetween(a.sell_date,today())||0),0)/expWaiting.length)
    :null;
  // Taux de rotation : part du stock (actif + déjà vendu) qui a effectivement
  // été vendue — indique si le stock "tourne" ou s'accumule sans se vendre.
  const rotationBase=activeArts.length+vendus.length;
  const rotationRate=rotationBase?Math.round(vendus.length/rotationBase*100):null;
  document.getElementById('stockMinistats').innerHTML=`
    <div class="ministat"><div class="ministat-label">Articles</div><div class="ministat-val">${activeArts.length}</div></div>
    <div class="ministat"><div class="ministat-label">Vendus</div><div class="ministat-val">${vendus.length}</div></div>
    <div class="ministat"><div class="ministat-label">CA</div><div class="ministat-val">${fmtPrice(ca)}</div></div>
    <div class="ministat"><div class="ministat-label">Délai d'envoi moyen</div><div class="ministat-val">${avgDelay===null?'—':avgDelay+'j'}</div></div>
    <div class="ministat"><div class="ministat-label">Taux de rotation</div><div class="ministat-val">${rotationRate===null?'—':rotationRate+'%'}</div></div>
  `;

  if(!categories.some(c=>c.key===stockCategoryFilter)) stockCategoryFilter='Tous';
  const chips=[{key:'Tous',label:'Tous'}, ...categories];
  const categoryChipsHTML=chips.map(c=>{
    const count=c.key==='Tous'?activeArts.length:byPlatform(allArticles.filter(a=>a.status===c.key)).length;
    return `<button class="pf-btn stock-chip${stockCategoryFilter===c.key?' active':''}" onclick="filterStockCategory('${c.key}',this)">${c.label} (${count})</button>`;
  }).join('');

  // Filtres "qualité de fiche" : repèrent les fiches incomplètes (pas de
  // photo, pas de prix d'achat renseigné) plutôt qu'un statut d'avancement —
  // inspiré des chips "sans SKU"/"non liés" vues chez un concurrent. Fusionnées
  // avec les chips de catégorie dans une seule ligne (au lieu de deux) pour
  // désencombrer la page.
  const noPhotoCount=activeArts.filter(a=>!a.photo_url).length;
  const noBuyPriceCount=activeArts.filter(a=>!a.buy_price).length;
  const qualityChipsHTML=`
    <span class="stock-chip-sep"></span>
    <button class="pf-btn stock-chip${stockQualityFilter==='no_photo'?' active':''}" onclick="filterStockQuality('no_photo',this)">🖼️ Sans photo (${noPhotoCount})</button>
    <button class="pf-btn stock-chip${stockQualityFilter==='no_buy_price'?' active':''}" onclick="filterStockQuality('no_buy_price',this)">💸 Sans prix d'achat (${noBuyPriceCount})</button>
  `;
  document.getElementById('stockCategoryChips').innerHTML=categoryChipsHTML+qualityChipsHTML;

  const dupCount=findDuplicateArticles().length;
  const dupBtn=document.getElementById('duplicatesBtn');
  if(dupBtn) dupBtn.textContent=dupCount?`🧬 Doublons (${dupCount})`:'🧬 Doublons';

  const bulkTarget=document.getElementById('bulkTarget-stockall');
  if(bulkTarget) bulkTarget.innerHTML=getAllSteps().map(s=>`<option value="${s.key}">${s.label}</option>`).join('');

  document.querySelectorAll('#stockViewToggle .view-toggle-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===stockViewMode));
  const sortSelect=document.getElementById('stockSortSelect');
  if(sortSelect) sortSelect.value=stockSortMode;
  const platformSelect=document.getElementById('stockPlatformSelect');
  if(platformSelect) platformSelect.value=platformFilter;

  let shown=stockCategoryFilter==='Tous'?activeArts:byPlatform(allArticles.filter(a=>a.status===stockCategoryFilter));
  if(stockQualityFilter==='no_photo') shown=shown.filter(a=>!a.photo_url);
  else if(stockQualityFilter==='no_buy_price') shown=shown.filter(a=>!a.buy_price);
  if(stockSearchTerm) shown=shown.filter(a=>a.name.toLowerCase().includes(stockSearchTerm));
  shown=sortStockArticles(shown);
  const gridEl=document.getElementById('stockallGrid');
  gridEl.classList.toggle('view-list', stockViewMode==='list');
  gridEl.innerHTML=shown.length
    ?(stockViewMode==='list'
        ?shown.map(a=>articleListRowHTML(a)).join('')
        :shown.map(a=>articleTileHTML(a,{showMove:true,selectSection:'stockall'})).join(''))
    :`<p class="stockall-empty">Aucun article.</p>`;

  // Checklist expédition : visible seulement quand ce filtre est actif.
  const expArts=byPlatform(allArticles.filter(a=>a.status==='expedition'));
  const storedChk=JSON.parse(localStorage.getItem('checklist_'+currentUser.id)||'{}');
  document.getElementById('checklistWrap').innerHTML=(stockCategoryFilter==='expedition'&&expArts.length)?`
    <div class="checklist-card">
      <div class="checklist-title">✅ Checklist d'expédition</div>
      ${expArts.map(a=>`
        <div class="checklist-item">
          <input type="checkbox" id="chk_${a.id}" ${storedChk[a.id]?'checked':''} onchange="toggleCheck('${a.id}',this)" />
          <label for="chk_${a.id}" class="${storedChk[a.id]?'done':''}">${a.name}${a.location?' — 📍 '+a.location:''} — ${a.platform}</label>
        </div>`).join('')}
    </div>`:'';
}

// ── DÉTECTEUR DE DOUBLONS ──
// Regroupe les articles par nom normalisé (espaces/casse ignorés) : un même
// nom présent plusieurs fois est probablement le même article dupliqué par
// une synchro (ex: bug d'identifiant Vinted signalé le 2026-07-15), pas une
// vraie coïncidence — les revendeurs ne postent presque jamais deux fiches
// avec l'intitulé strictement identique.
function findDuplicateArticles(){
  const groups={};
  allArticles.forEach(a=>{
    const key=(a.name||'').trim().toLowerCase().replace(/\s+/g,' ');
    if(!key) return;
    (groups[key]=groups[key]||[]).push(a);
  });
  return Object.values(groups).filter(g=>g.length>1);
}

window.openDuplicates=()=>{
  const groups=findDuplicateArticles();
  const body=document.getElementById('duplicatesBody');
  body.innerHTML=groups.length?groups.map(g=>`
    <div class="checklist-card" style="margin-bottom:10px;">
      <div class="checklist-title">${g[0].name}</div>
      ${g.map(a=>{
        const status=statusMeta(a.status);
        return `<div class="checklist-item" style="justify-content:space-between;">
          <span>${a.photo_url?`<img src="${a.photo_url}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px;">`:''}<span class="tile-status-pill" style="position:static;display:inline-block;background:${status.color};margin-right:6px;">${status.label}</span>${fmtPrice(a.status==='vendu'?a.sell_price:(a.buy_price||a.sell_price))} — ${fmtDate(a.created_at)}</span>
          <button class="pf-btn" onclick="confirmDelete('${a.id}');setTimeout(openDuplicates,300)">🗑 Supprimer</button>
        </div>`;
      }).join('')}
    </div>
  `).join(''):`<p class="stockall-empty">Aucun doublon probable détecté 👍</p>`;
  document.getElementById('duplicatesBg').classList.add('open');
};
window.closeDuplicates=()=>document.getElementById('duplicatesBg').classList.remove('open');

window.filterStockCategory=(key,btn)=>{
  stockCategoryFilter=key;
  btn.closest('.stock-chips').querySelectorAll('.pf-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderStockAll();
};

// ── SÉLECTION MULTIPLE / ACTIONS GROUPÉES ──
window.toggleSelectMode = (section) => {
  selectMode[section] = !selectMode[section];
  selectedIds[section].clear();
  document.getElementById('selectModeBtn-'+section).textContent = selectMode[section] ? '✕ Annuler la sélection' : '☑ Sélection multiple';
  document.getElementById('bulkBar-'+section).style.display = 'none';
  renderStockAll();
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
  const sell_date = !isPreSaleStatus(target) ? today() : null;
  const patch = {status:target, sell_date};
  if(target==='stock') patch.published_at = today();
  const {data} = await sb.from('articles').update(patch).in('id', ids).eq('user_id', currentUser.id).select();
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

window.toggleCheck=(id,el)=>{
  const stored=JSON.parse(localStorage.getItem('checklist_'+currentUser.id)||'{}');
  stored[id]=el.checked;
  localStorage.setItem('checklist_'+currentUser.id,JSON.stringify(stored));
  el.nextElementSibling?.classList.toggle('done',el.checked);
};

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
  // Une vente avant l'achat est une erreur de données (dates mal synchronisées côté
  // Vinted), pas un vrai délai — on l'exclut plutôt que de fausser la moyenne.
  const avecDates=vendus.filter(a=>a.buy_date&&a.sell_date&&daysBetween(a.buy_date,a.sell_date)>=0);
  const avgDays=avecDates.length?Math.round(avecDates.reduce((s,a)=>s+daysBetween(a.buy_date,a.sell_date),0)/avecDates.length):null;
  const avgScore=vendus.length?Math.round(vendus.reduce((s,a)=>s+calcScore(a),0)/vendus.length):null;
  const caTotal=vendus.reduce((s,a)=>s+calcCA(a),0);
  const panierMoyen=vendus.length?caTotal/vendus.length:0;

  document.getElementById('analyticsKpi').innerHTML=`
    <div class="kpi-card"><div class="kpi-label">Chiffre d'affaires</div><div class="kpi-val">${fmtPrice(caTotal)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Articles vendus</div><div class="kpi-val">${vendus.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Panier moyen</div><div class="kpi-val">${fmtPrice(panierMoyen)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Ce mois</div><div class="kpi-val green">${fmtPrice(profitMois)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Meilleur mois</div><div class="kpi-val green">${fmtPrice(bestMonth)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Profit moyen par vente</div><div class="kpi-val">${fmtPrice(avgP)}</div></div>
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
  renderHallOfFame();
}

// ── HALL OF FAME ──
function renderHallOfFame(){
  const el=document.getElementById('hallOfFameList');
  if(!el) return;
  const medals=['🥇','🥈','🥉','🏅','🏅'];
  const top=allArticles.filter(a=>a.status==='vendu'&&calcProfit(a)>0).sort((a,b)=>calcProfit(b)-calcProfit(a)).slice(0,5);
  el.innerHTML=top.length ? top.map((a,i)=>`
    <div class="article-card" onclick="showDetail('${a.id}')">
      <div class="hof-rank">${medals[i]||'🏅'}</div>
      ${photoEl(a)}
      <div class="article-info">
        <div class="article-name">${a.name}</div>
        <div class="article-meta">${a.platform}${a.sell_date?' · '+a.sell_date:''}</div>
      </div>
      <div class="article-right">
        <div class="article-profit profit-pos">+${fmtPrice(calcProfit(a))}</div>
      </div>
    </div>`).join('') : emptyState('Vendez un article avec profit pour apparaître ici !');
}

let ventesSearchTerm='';
window.onVentesSearch=(value)=>{ ventesSearchTerm=value.trim().toLowerCase(); renderReplay(); };

function renderReplay(){
  let arts=allArticles.filter(a=>a.status==='vendu');
  if(currentFilter.replay!=='Tous') arts=arts.filter(a=>a.platform===currentFilter.replay);
  if(ventesSearchTerm) arts=arts.filter(a=>a.name.toLowerCase().includes(ventesSearchTerm));
  const sortMode=document.getElementById('vendusSort')?.value||'recent';
  arts=[...arts].sort((a,b)=>{
    if(sortMode==='fastest'){
      const da=daysBetween(a.buy_date,a.sell_date), db=daysBetween(b.buy_date,b.sell_date);
      if(da===null) return 1;
      if(db===null) return -1;
      return da-db;
    }
    if(sortMode==='profit') return calcProfit(b)-calcProfit(a);
    if(sortMode==='margin'){
      const ma=a.sell_price>0?calcProfit(a)/a.sell_price:-Infinity;
      const mb=b.sell_price>0?calcProfit(b)/b.sell_price:-Infinity;
      return mb-ma;
    }
    return new Date(b.sell_date||b.created_at)-new Date(a.sell_date||a.created_at);
  });

  // Ministats, même format que la page Achats.
  const isToday=d=>d===today();
  const isThisMonth=d=>d&&d.slice(0,7)===today().slice(0,7);
  const allVentes=allArticles.filter(a=>a.status==='vendu');
  const totalToday=allVentes.filter(a=>isToday(a.sell_date)).reduce((s,a)=>s+calcProfit(a),0);
  const totalMonth=allVentes.filter(a=>isThisMonth(a.sell_date)).reduce((s,a)=>s+calcProfit(a),0);
  const totalProfit=allVentes.reduce((s,a)=>s+calcProfit(a),0);
  const ministatsEl=document.getElementById('ventesMinistats');
  if(ministatsEl) ministatsEl.innerHTML=`
    <div class="ministat"><div class="ministat-label">Profit aujourd'hui</div><div class="ministat-val">${fmtPrice(totalToday)}</div></div>
    <div class="ministat"><div class="ministat-label">Profit ce mois-ci</div><div class="ministat-val">${fmtPrice(totalMonth)}</div></div>
    <div class="ministat"><div class="ministat-label">Profit total</div><div class="ministat-val">${fmtPrice(totalProfit)}</div></div>
    <div class="ministat"><div class="ministat-label">Nombre de ventes</div><div class="ministat-val">${allVentes.length}</div></div>
  `;
  const platformSelect=document.getElementById('ventesPlatformSelect');
  if(platformSelect) platformSelect.value=currentFilter.replay;

  const container=document.getElementById('replayList');
  if(!arts.length){container.innerHTML=emptyState('Aucun article vendu encore.');return;}
  // Liste compacte (comme la page Achats) : le détail du parcours achat →
  // vente s'ouvre au clic dans une fenêtre dédiée, plutôt que d'être étalé
  // en permanence sur chaque ligne.
  container.innerHTML=arts.map(a=>{
    const profit=calcProfit(a);
    return `<div class="tile-list-row" onclick="openReplayDetail('${a.id}')">
      <div class="tile-list-photo">${a.photo_url?`<img src="${a.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`:'📦'}</div>
      <div class="tile-list-name">${a.name}</div>
      <span class="tile-list-status" style="background:#60a5fa;">${fmtDate(a.sell_date)}</span>
      <div class="tile-list-price ${profit>=0?'profit-pos':'profit-neg'}">${profit>=0?'+':''}${fmtPrice(profit)}</div>
    </div>`;
  }).join('');
}

// ── Détail d'une vente (parcours achat → vente), ouvert au clic depuis la
// liste compacte — reprend le contenu de l'ancienne carte "replay" en place. ──
window.openReplayDetail=(id)=>{
  const a=allArticles.find(x=>x.id===id);
  if(!a) return;
  const isRefunded=a.vinted_transaction_status==='failed';
  const profit=calcProfit(a);
  const days=daysBetween(a.buy_date,a.sell_date);
  const score=calcScore(a);
  document.getElementById('replayDetailBody').innerHTML=`
    <div class="replay-card" style="cursor:default;">
      <div class="replay-header">
        ${a.photo_url?`<img src="${a.photo_url}" class="replay-photo" />`:'<div class="replay-photo">📦</div>'}
        <div class="replay-headinfo">
          <div class="replay-name">${a.name}</div>
          <div class="replay-meta">${a.platform}${days!==null&&!isRefunded?' · Vendu en '+days+'j':''} · Score ${score}/100</div>
        </div>
        <div class="replay-profit ${profit>=0?'profit-pos':'profit-neg'}">${profit>=0?'+':''}${fmtPrice(profit)}</div>
        <button class="btn-edit" onclick="event.stopPropagation();openSaleCard('${a.id}')" title="Partager cette vente">📤</button>
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
    </div>
    <button class="pf-btn" style="margin-top:12px;width:100%;" onclick="closeReplayDetail();showDetail('${a.id}')">Voir la fiche complète de l'article</button>
  `;
  document.getElementById('replayDetailBg').classList.add('open');
};
window.closeReplayDetail=()=>document.getElementById('replayDetailBg').classList.remove('open');

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

// ── APPELS BACKEND (extension.railway.app) ──
async function backendFetch(path, options={}) {
  const token=(await sb.auth.getSession()).data.session?.access_token;
  const r=await fetch(`${BACKEND}${path}`, {
    ...options,
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}`, ...(options.headers||{}) },
  });
  if(!r.ok) return null;
  return r.json();
}

// Affiche un avertissement quand l'utilisateur augmente le nombre d'actions
// par cycle au-dessus de 1 (moins discret vis-à-vis de Vinted).
window.toggleBatchWarning = (inputId, warningId) => {
  const input = document.getElementById(inputId);
  const warn = document.getElementById(warningId);
  if(!input || !warn) return;
  warn.style.display = (parseInt(input.value)||1) > 1 ? 'block' : 'none';
};

// ── MESSAGES FAVORIS ──
window.saveFavMessage = async () => {
  const savedEl = document.getElementById('favMsgSaved');
  // L'automatisation est par compte Vinted : avec 2+ comptes connectés, il
  // faut en sélectionner un précis (pas "Tous les comptes") pour savoir
  // lequel configurer.
  if (!selectedVintedAccountId && vintedAccounts.length > 1) {
    savedEl.textContent = '✕ Sélectionnez un compte Vinted précis (en haut de la sidebar) pour configurer l\'automatisation.';
    return;
  }
  localStorage.setItem('favMessage_'+currentUser.id, document.getElementById('favMessage').value);
  const payload = {
    enabled: document.getElementById('autoMsgEnabled').checked,
    template: document.getElementById('favMessage').value,
    delay_min_sec: parseInt(document.getElementById('autoMsgDelayMin').value)||60,
    delay_max_sec: parseInt(document.getElementById('autoMsgDelayMax').value)||180,
    daily_limit: parseInt(document.getElementById('autoMsgDailyLimit').value)||0,
    batch_size: parseInt(document.getElementById('autoMsgBatchSize').value)||1,
    vinted_account_id: selectedVintedAccountId || '',
  };
  const res = await backendFetch('/api/settings/automessage', {method:'POST', body:JSON.stringify(payload)});
  savedEl.textContent = res ? '✓ Modèle et réglages enregistrés !' : '✕ Erreur, réessayez.';
  renderAutoMsgStatus();
};

async function renderAutoMsgStatus() {
  const config = await backendFetch('/api/extension/automessage-config'+accountQueryParam());
  const el = document.getElementById('autoMsgStatus');
  if(!config){ el.textContent=''; return; }
  el.textContent = `${config.sent_today}/${config.daily_limit} message(s) envoyé(s) automatiquement aujourd'hui.`;
  const historyData = await backendFetch('/api/extension/sent-messages'+accountQueryParam());
  const history = historyData?.messages || [];
  document.getElementById('autoMsgHistory').innerHTML = history.length ? history.map(m=>`
    <div class="article-card">
      <div class="article-photo">💌</div>
      <div class="article-info">
        <div class="article-name">${m.recipient_login||'Utilisateur'}${m.item_title?' — '+m.item_title:''}</div>
        <div class="article-meta">${fmtDate(m.sent_at)}</div>
      </div>
    </div>`).join('') : emptyState('Aucun message auto-envoyé pour le moment.');
}

async function renderFavoris() {
  const saved = localStorage.getItem('favMessage_'+currentUser.id) || '';
  document.getElementById('favMessage').value = saved;

  const el = document.getElementById('favorisAccountWarning');
  if(el) el.style.display = (!selectedVintedAccountId && vintedAccounts.length > 1) ? 'block' : 'none';

  const config = await backendFetch('/api/extension/automessage-config'+accountQueryParam());
  if(config){
    document.getElementById('favMessage').value = config.template || saved;
    document.getElementById('autoMsgEnabled').checked = !!config.enabled;
    document.getElementById('autoMsgDailyLimit').value = config.daily_limit;
    document.getElementById('autoMsgDelayMin').value = config.delay_min_sec;
    document.getElementById('autoMsgDelayMax').value = config.delay_max_sec;
    document.getElementById('autoMsgBatchSize').value = config.batch_size || 1;
    toggleBatchWarning('autoMsgBatchSize','autoMsgBatchWarning');
  }
  renderAutoMsgStatus();
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
  const {data,error}=await applyAccountFilter(sb.from('vinted_conversations')
    .select('*').eq('user_id',currentUser.id)).order('updated_at',{ascending:false});
  if(error||!data||!data.length){
    container.innerHTML=emptyState('Aucun message Vinted synchronisé pour le moment. Gardez un onglet vinted.fr ouvert pour que l\'extension synchronise votre messagerie.');
    return;
  }
  container.innerHTML=data.map(m=>`
    <div class="msg-card ${m.non_lu?'unread':''} ${m.est_offre?'offer':''}" style="cursor:pointer" onclick="window.open('https://www.vinted.fr/inbox/${m.id}','_blank')" title="Voir la conversation complète sur Vinted">
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

// ── DÉPENSES GÉNÉRALES ──
function renderDepenses(){
  const el=document.getElementById('expensesList');
  if(!el) return;
  const total=allExpenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  document.getElementById('expensesCount').textContent=allExpenses.length+' dépense(s) · '+fmtPrice(total)+' au total';
  el.innerHTML=allExpenses.length ? allExpenses.map(e=>`
    <div class="article-card">
      <div class="article-photo">🧾</div>
      <div class="article-info">
        <div class="article-name">${e.label}</div>
        <div class="article-meta">${fmtDate(e.expense_date)}</div>
      </div>
      <div class="article-right">
        <div class="article-profit profit-neg">-${fmtPrice(e.amount)}</div>
        <div class="article-actions">
          <button class="btn-edit" style="color:var(--danger);border-color:var(--danger);" onclick="deleteExpense('${e.id}')">✕</button>
        </div>
      </div>
    </div>`).join('') : emptyState('Aucune dépense enregistrée pour le moment.');
}

window.addExpense = async () => {
  const label=document.getElementById('expenseLabel').value.trim();
  const amount=parseFloat(document.getElementById('expenseAmount').value)||0;
  const expense_date=document.getElementById('expenseDate').value||today();
  if(!label||amount<=0) return;
  const {data}=await sb.from('expenses').insert([{user_id:currentUser.id,label,amount,expense_date}]).select();
  if(data){
    allExpenses.unshift(data[0]);
    allExpenses.sort((a,b)=>new Date(b.expense_date)-new Date(a.expense_date));
    document.getElementById('expenseLabel').value='';
    document.getElementById('expenseAmount').value='';
    document.getElementById('expenseDate').value='';
    renderDepenses();
    renderDashboard();
  }
};

window.deleteExpense = async (id) => {
  await sb.from('expenses').delete().eq('id',id).eq('user_id',currentUser.id);
  allExpenses=allExpenses.filter(e=>e.id!==id);
  renderDepenses();
  renderDashboard();
};

// ── ACHATS (page dédiée, séparée du Stock — comme "Achats" chez Vinteer) ──
let achatsSearchTerm='';
window.onAchatsSearch=(value)=>{ achatsSearchTerm=value.trim().toLowerCase(); renderAchats(); };

function renderAchats(){
  const list=document.getElementById('achatsList');
  if(!list) return;
  const arts=selectedVintedAccountId?allPurchases.filter(p=>p.vinted_account_id===selectedVintedAccountId):allPurchases;
  const isToday=d=>d===today();
  const isThisMonth=d=>d&&d.slice(0,7)===today().slice(0,7);
  const totalToday=arts.filter(p=>isToday(p.purchase_date)).reduce((s,p)=>s+(parseFloat(p.price)||0),0);
  const totalMonth=arts.filter(p=>isThisMonth(p.purchase_date)).reduce((s,p)=>s+(parseFloat(p.price)||0),0);
  const totalAll=arts.reduce((s,p)=>s+(parseFloat(p.price)||0),0);
  document.getElementById('achatsMinistats').innerHTML=`
    <div class="ministat"><div class="ministat-label">Achats aujourd'hui</div><div class="ministat-val">${fmtPrice(totalToday)}</div></div>
    <div class="ministat"><div class="ministat-label">Achats ce mois-ci</div><div class="ministat-val">${fmtPrice(totalMonth)}</div></div>
    <div class="ministat"><div class="ministat-label">Total achats</div><div class="ministat-val">${fmtPrice(totalAll)}</div></div>
    <div class="ministat"><div class="ministat-label">Nombre d'achats</div><div class="ministat-val">${arts.length}</div></div>
  `;

  // "Colis à récupérer" : Vinted décrit déjà ça en texte dans le statut de
  // la commande ("colis déposé en bureau de Poste ou point relais") — pas
  // besoin d'un champ structuré séparé, un simple mot-clé suffit. Inspiré
  // d'une carte équivalente repérée chez Vinteer le 2026-07-16.
  const toPickup=arts.filter(p=>/point relais|bureau de poste|point de retrait/i.test(p.status||''));
  const pickupWrap=document.getElementById('achatsPickupWrap');
  if(pickupWrap){
    // pickup_since : date d'arrivée réelle au point relais (donnée fiable).
    // La date limite en revanche n'existe nulle part chez Vinted (vérifié le
    // 2026-07-16, jusque dans son suivi de colis le plus détaillé) — on
    // ESTIME donc un délai à partir des durées habituelles par transporteur
    // (connaissance générale, pas une donnée Vinted), toujours annoncée
    // comme approximative pour ne jamais faire rater un vrai colis.
    const CARRIER_HOLD_DAYS={CHRONOPOST:10,MONDIAL_RELAY:10,COLISSIMO:15,UPS:7,DPD:7,GLS:7};
    const CARRIER_LABELS={CHRONOPOST:'Chronopost',MONDIAL_RELAY:'Mondial Relay',COLISSIMO:'Colissimo',UPS:'UPS',DPD:'DPD',GLS:'GLS'};
    // p.pickup_location est la phrase Vinted complète ("Ton colis a été
    // livré dans le Point Relais X, ADRESSE. Tu peux dès maintenant...") —
    // on n'en garde que le nom + l'adresse, plus lisible sur une carte.
    const shortLocation=loc=>{
      const m=(loc||'').match(/(?:Point Relais|Bureau de Poste|point de retrait)[^.]*/i);
      return m?m[0].trim():loc;
    };
    const pickupRow=p=>{
      const since=p.pickup_since?daysBetween(p.pickup_since,today()):null;
      // "Arrivé il y a" (écoulé) et "jours restants" (calculé à partir de la
      // MÊME date limite estimée) plutôt que deux badges indépendants — pour
      // que les deux nombres se recoupent sans ambiguïté (confusion signalée
      // le 2026-07-16 : "6 jours d'attente" lu comme "6 jours restants").
      const waitBadge=since!==null?`<span class="pickup-badge">📦 Arrivé il y a ${since} jour${since>1?'s':''}</span>`:'';
      let estBadge='';
      if(p.pickup_since&&p.pickup_carrier&&CARRIER_HOLD_DAYS[p.pickup_carrier]){
        const deadline=new Date(p.pickup_since);
        deadline.setDate(deadline.getDate()+CARRIER_HOLD_DAYS[p.pickup_carrier]);
        const remaining=daysBetween(today(),deadline);
        const remainingLabel=remaining!==null?(remaining>0?`≈ ${remaining} jour${remaining>1?'s':''} restant${remaining>1?'s':''}`:'≈ délai probablement dépassé'):'';
        estBadge=`<span class="pickup-badge pickup-badge-est" title="Estimation basée sur le délai habituel de ${CARRIER_LABELS[p.pickup_carrier]||p.pickup_carrier} — à vérifier, Vinted ne communique aucune date officielle.">${remainingLabel} (jusqu'au ${fmtDate(deadline)})</span>`;
      }
      const location=shortLocation(p.pickup_location)||p.status;
      return `<div class="pickup-item">
        ${p.photo_url?`<img class="pickup-photo" src="${p.photo_url}">`:'<div class="pickup-photo">🛍️</div>'}
        <div class="pickup-info">
          <div class="pickup-title">${p.title||'(sans titre)'}</div>
          <div class="pickup-location" title="${location.replace(/"/g,'&quot;')}">📍 ${location}</div>
          <div class="pickup-badges">${waitBadge}${estBadge}</div>
        </div>
      </div>`;
    };
    pickupWrap.innerHTML=`
      <div class="checklist-card" style="margin-bottom:16px;">
        <div class="checklist-title">📍 Colis à récupérer — ${toPickup.length}</div>
        <div class="pickup-list">${toPickup.length?toPickup.map(pickupRow).join(''):'<p class="setting-sub">Aucun colis à récupérer pour le moment.</p>'}</div>
      </div>`;
  }

  let shown=achatsSearchTerm?arts.filter(p=>(p.title||'').toLowerCase().includes(achatsSearchTerm)):arts;
  shown=[...shown].sort((a,b)=>new Date(b.purchase_date||0)-new Date(a.purchase_date||0));
  list.innerHTML=shown.length?shown.map(p=>`
    <div class="tile-list-row" onclick="window.open('https://www.vinted.fr','_blank')" title="${(p.status||'').replace(/"/g,'&quot;')}">
      <div class="tile-list-photo">${p.photo_url?`<img src="${p.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`:'🛍️'}</div>
      <div class="tile-list-name">${p.title||'(sans titre)'}</div>
      <span class="tile-list-status" style="background:#60a5fa;">${fmtDate(p.purchase_date)}</span>
      <div class="tile-list-price">${fmtPrice(p.price)}</div>
    </div>
  `).join(''):emptyState('Aucun achat pour le moment.');
}

// ── BOOST (articles avec un Boost Vinted payant actif — comme "Achats"/
// "Ventes", présentation dédiée plutôt qu'un simple badge perdu dans Stock).
// Affichage seul : VintControl n'achète jamais de Boost automatiquement,
// c'est un service payant Vinted (voir bouton "Booster" sur l'annonce).
let boostSearchTerm='';
window.onBoostSearch=(value)=>{ boostSearchTerm=value.trim().toLowerCase(); renderBoost(); };

function renderBoost(){
  const list=document.getElementById('boostList');
  if(!list) return;
  const base=selectedVintedAccountId?allArticles.filter(a=>a.vinted_account_id===selectedVintedAccountId):allArticles;
  const boosted=base.filter(a=>a.vinted_boosted);
  document.getElementById('boostMinistats').innerHTML=`
    <div class="ministat"><div class="ministat-label">Articles boostés</div><div class="ministat-val">${boosted.length}</div></div>
    <div class="ministat"><div class="ministat-label">Valeur du stock boosté</div><div class="ministat-val">${fmtPrice(boosted.reduce((s,a)=>s+(parseFloat(a.sell_price)||0),0))}</div></div>
  `;
  let shown=boostSearchTerm?boosted.filter(a=>a.name.toLowerCase().includes(boostSearchTerm)):boosted;
  shown=[...shown].sort((a,b)=>new Date(b.synced_at||0)-new Date(a.synced_at||0));
  list.innerHTML=shown.length?shown.map(a=>`
    <div class="tile-list-row" onclick="${a.vinted_item_id?`window.open('https://www.vinted.fr/items/${a.vinted_item_id}','_blank')`:`showDetail('${a.id}')`}">
      <div class="tile-list-photo">${a.photo_url?`<img src="${a.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`:'📦'}</div>
      <div class="tile-list-name">${a.name}</div>
      <span class="tile-list-status" style="background:#f97316;">🚀 Boosté</span>
      <div class="tile-list-price">${fmtPrice(a.sell_price)}</div>
    </div>
  `).join(''):emptyState('Aucun article boosté pour le moment — active un Boost depuis Vinted, il apparaîtra ici au prochain cycle de synchro.');
}

window.exportAchatsCSV=()=>{
  const headers=[
    {label:'Titre', get:p=>p.title},
    {label:'Prix', get:p=>p.price||0},
    {label:'Date achat', get:p=>p.purchase_date||''},
    {label:'Statut', get:p=>p.status||''},
  ];
  downloadCSV(toCSV(allPurchases, headers), `vintcontrol-achats-${today()}.csv`);
};

async function updateMessagesBadge(){
  const badge=document.getElementById('navMsgBadge');
  if(!badge)return;
  // Un HEAD+count=exact déclenché juste après les autres appels du chargement
  // initial échoue quasi systématiquement (503) sur cette table précise dans
  // une vraie navigation — mais réussit à coup sûr rejoué depuis la console
  // une fois la page stabilisée (retry immédiat inutile, voir historique de
  // debug 2026-07-14). On décale l'appel de 3s pour sortir de la rafale
  // initiale, et on passe en GET + comptage côté client (évite le HEAD).
  setTimeout(async ()=>{
    const {data,error}=await applyAccountFilter(sb.from('vinted_conversations')
      .select('id').eq('user_id',currentUser.id).eq('non_lu',true));
    if(!error && data && data.length>0){ badge.textContent=data.length; badge.style.display='inline-block'; }
    else { badge.style.display='none'; }
  }, 3000);
}

// ── BANDEAU DE SYNCHRONISATION (dashboard) ──
async function renderSyncBanner(){
  const el=document.getElementById('dashSyncBanner');
  if(!el)return;
  const {data:accounts}=await sb.from('vinted_accounts').select('*').eq('user_id',currentUser.id);
  // Compte à afficher : celui sélectionné dans le switcher, ou — en vue
  // agrégée — le plus en retard de synchro (pire cas, pour ne rater aucune
  // alerte "extension déconnectée" quand plusieurs comptes sont connectés).
  const data = selectedVintedAccountId
    ? (accounts||[]).find(a=>a.id===selectedVintedAccountId)
    : (accounts||[]).slice().sort((a,b)=>(a.last_sync||'').localeCompare(b.last_sync||''))[0];
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
window.saveRepublishDays = async () => {
  const v = parseInt(document.getElementById('republishDays').value);
  if (isNaN(v) || v <= 0) return;
  if (!selectedVintedAccountId && vintedAccounts.length > 1) {
    document.getElementById('republishSaved').textContent = '✕ Sélectionnez un compte Vinted précis (en haut de la sidebar) pour configurer l\'automatisation.';
    return;
  }
  localStorage.setItem('republishDays_'+currentUser.id, v);
  const payload = {
    enabled: document.getElementById('autoRepublishEnabled').checked,
    frequency_days: v,
    daily_limit: parseInt(document.getElementById('autoRepublishDailyLimit').value)||0,
    batch_size: parseInt(document.getElementById('autoRepublishBatchSize').value)||1,
    vinted_account_id: selectedVintedAccountId || '',
  };
  const res = await backendFetch('/api/settings/republish', {method:'POST', body:JSON.stringify(payload)});
  document.getElementById('republishSaved').textContent = res ? '✓ Réglages enregistrés !' : '✕ Erreur, réessayez.';
  renderAutoRepublishStatus();
  renderRepublier();
};

async function renderAutoRepublishStatus(){
  const config = await backendFetch('/api/extension/republish-config'+accountQueryParam());
  const el = document.getElementById('autoRepublishStatus');
  if(!config){ el.textContent=''; return; }
  el.textContent = `${config.republished_today}/${config.daily_limit} article(s) republié(s) automatiquement aujourd'hui.`;
}

function getArticlesToRepublish(){
  const days = parseInt(localStorage.getItem('republishDays_'+currentUser.id) || '3');
  const stock = allArticles.filter(a => a.status==='stock' && a.platform==='Vinted');
  return stock.filter(a => {
    // published_at (date de mise en ligne réelle) prime sur buy_date : un
    // article resté plusieurs jours en laver/photo avant d'être publié ne
    // doit pas apparaître comme "à republier" dès sa mise en stock.
    const d = daysBetween(a.published_at || a.buy_date || a.created_at?.split('T')[0], today());
    return d !== null && d >= days;
  });
}

function republishDoneKey(){ return 'republish_done_'+currentUser.id+'_'+today(); }

// Marque un article pour republication prioritaire : l'extension l'exécute
// au tout prochain cycle de synchro (≤5 min, alarme chrome.alarms), qu'elle
// soit connectée au compte Vinted correspondant à ce moment-là.
window.republishNow = async (vintedItemId, btn) => {
  if (!selectedVintedAccountId && vintedAccounts.length > 1) {
    alert('Sélectionnez un compte Vinted précis (en haut de la sidebar) avant de republier.');
    return;
  }
  const original = btn.textContent;
  btn.textContent = '...'; btn.disabled = true;
  // Sans try/catch, un simple accroc réseau (perte de connexion, token à
  // rafraîchir...) laissait le bouton bloqué sur "..." indéfiniment, sans
  // aucun message — impossible de savoir si ça avait marché ou pas
  // (signalé le 2026-07-16, même défaut que saveArticle()).
  let res=null;
  try{ res = await backendFetch('/api/settings/republish-now', {
    method: 'POST',
    body: JSON.stringify({ vinted_item_id: vintedItemId, vinted_account_id: selectedVintedAccountId || '' }),
  }); }catch(e){ res=null; }
  btn.textContent = res ? '✓ Programmé (≤5 min)' : '✕ Erreur, réessayez';
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
};

async function renderRepublier() {
  const warnEl = document.getElementById('republierAccountWarning');
  if(warnEl) warnEl.style.display = (!selectedVintedAccountId && vintedAccounts.length > 1) ? 'block' : 'none';
  const days = parseInt(localStorage.getItem('republishDays_'+currentUser.id) || '3');
  document.getElementById('republishDays').value = days;
  const toRepublish = getArticlesToRepublish();
  const doneToday = JSON.parse(localStorage.getItem(republishDoneKey())||'[]');
  document.getElementById('republierList').innerHTML = toRepublish.length
    ? `<div class="checklist-card"><div class="checklist-title">✅ À republier aujourd'hui</div>${toRepublish.map(a=>{
        const since=daysBetween(a.published_at||a.buy_date||a.created_at?.split('T')[0],today());
        const overdue=since!==null?Math.max(0,since-days):0;
        return `
      <div class="checklist-item">
        <input type="checkbox" id="rep_${a.id}" ${doneToday.includes(a.id)?'checked':''} onchange="toggleRepublishDone('${a.id}',this)" />
        <label for="rep_${a.id}" class="${doneToday.includes(a.id)?'done':''}">${a.name}</label>
        <span class="badge" style="background:var(--warning-dim);color:var(--warning);flex-shrink:0;" title="Éligible depuis ${since}j, ${days}j visés">${overdue>0?`⏱ en retard de ${overdue}j`:'⏱ éligible aujourd\'hui'}</span>
        ${a.vinted_item_id?`<button class="btn-edit" style="flex-shrink:0;" onclick="republishNow('${a.vinted_item_id}',this)">🔄 Republier maintenant</button>`:''}
        ${a.vinted_item_id?`<a href="https://www.vinted.fr/items/${a.vinted_item_id}" target="_blank" rel="noopener" class="btn-edit" style="text-decoration:none;flex-shrink:0;">Voir sur Vinted →</a>`:''}
      </div>`;
      }).join('')}</div>`
    : emptyState('Aucun article à republier pour le moment.');

  const config = await backendFetch('/api/extension/republish-config'+accountQueryParam());
  if(config){
    document.getElementById('autoRepublishEnabled').checked = !!config.enabled;
    document.getElementById('autoRepublishDailyLimit').value = config.daily_limit;
    document.getElementById('autoRepublishBatchSize').value = config.batch_size || 1;
    toggleBatchWarning('autoRepublishBatchSize','autoRepublishBatchWarning');
  }
  renderAutoRepublishStatus();
  updateRepublishBadge();
}

window.toggleRepublishDone = (id, el) => {
  const key = republishDoneKey();
  const done = new Set(JSON.parse(localStorage.getItem(key)||'[]'));
  if(el.checked) done.add(id); else done.delete(id);
  localStorage.setItem(key, JSON.stringify([...done]));
  el.nextElementSibling?.classList.toggle('done', el.checked);
  updateRepublishBadge();
};

function updateRepublishBadge(){
  const badge=document.getElementById('navRepublishBadge');
  if(!badge || !currentUser) return;
  const doneToday = JSON.parse(localStorage.getItem(republishDoneKey())||'[]');
  const remaining = getArticlesToRepublish().filter(a=>!doneToday.includes(a.id));
  if(remaining.length>0){ badge.textContent=remaining.length; badge.style.display='inline-block'; }
  else { badge.style.display='none'; }
}

function renderExtensionInstallBtn() {
  const el = document.getElementById('extensionInstallBtn');
  if (!el) return;
  el.innerHTML = EXTENSION_PUBLISHED
    ? `<a href="${EXTENSION_STORE_URL}" target="_blank" style="display:block;margin-top:14px;padding:10px;background:var(--accent);color:#000;border-radius:var(--radius);text-align:center;font-weight:700;text-decoration:none;font-size:13px;">⚡ Installer l'extension Chrome</a>`
    : `<div style="margin-top:14px;padding:10px;background:var(--warning-dim);color:var(--warning);border-radius:var(--radius);text-align:center;font-weight:700;font-size:13px;">⏳ Extension en cours de validation par Google — bientôt disponible</div>`;
}

// ── ÉTAPES DE PRÉPARATION PERSONNALISABLES ──
function renderPrepStepsSettings(){
  const el=document.getElementById('prepStepsList');
  if(!el) return;
  const steps=getPrepSteps();
  el.innerHTML=steps.length?steps.map(s=>{
    const count=allArticles.filter(a=>a.status===s.key).length;
    return `<div class="setting-row">
      <div class="setting-label">${s.label}${count?` <span style="color:var(--muted);font-weight:400;">(${count} article${count>1?'s':''})</span>`:''}</div>
      <button class="btn-edit" style="color:var(--danger);border-color:var(--danger);" onclick="removePrepStep('${s.key}')">✕ Supprimer</button>
    </div>`;
  }).join(''):`<p class="setting-sub">Aucune étape de préparation — les articles passent directement en stock.</p>`;
}

window.addPrepStep=()=>{
  const input=document.getElementById('newPrepStepLabel');
  const label=input.value.trim();
  if(!label) return;
  const steps=getPrepSteps();
  const slug=label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const key='custom_'+(slug||Date.now());
  if(steps.some(s=>s.key===key)){ alert('Cette étape existe déjà.'); return; }
  const colors=['#60a5fa','#a78bfa','#f59e0b','#f472b6','#38bdf8','#facc15','#4ade80'];
  steps.push({key, label:'📝 '+label, color:colors[steps.length%colors.length]});
  localStorage.setItem('prepSteps_'+currentUser.id, JSON.stringify(steps));
  input.value='';
  renderPrepStepsSettings();
  renderStockAll();
};

window.removePrepStep=(key)=>{
  const count=allArticles.filter(a=>a.status===key).length;
  if(count>0){ alert(`Déplacez d'abord ${count===1?"l'article":'les '+count+' articles'} de cette étape ailleurs avant de la supprimer.`); return; }
  const steps=getPrepSteps().filter(s=>s.key!==key);
  localStorage.setItem('prepSteps_'+currentUser.id, JSON.stringify(steps));
  renderPrepStepsSettings();
  renderStockAll();
};

// Chaque compte Vinted connecté a sa propre carte (login, statut, réputation,
// bouton déconnecter) — un utilisateur peut en avoir plusieurs en parallèle.
async function renderVintedConnectionStatus() {
  renderExtensionInstallBtn();
  const listEl = document.getElementById('vintedAccountsList');
  if (!listEl) return;

  try {
    const { data } = await sb.from('vinted_accounts')
      .select('*').eq('user_id', currentUser.id).order('last_sync', { ascending: false });
    vintedAccounts = data || [];
    renderAccountSwitcher();

    if (!vintedAccounts.length) {
      listEl.innerHTML = `<div class="setting-row" style="margin-bottom:16px;">
        <div><div class="setting-label">Statut</div><div class="setting-sub">Aucun compte connecté</div></div>
        <div style="font-size:13px;font-weight:700;"><span style="color:#ef4444;">● Déconnecté</span></div>
      </div>`;
      return;
    }

    listEl.innerHTML = vintedAccounts.map(acc => {
      const daysSinceSync = acc.last_sync ? daysBetween(acc.last_sync, today()) : null;
      const isStale = daysSinceSync !== null && daysSinceSync >= 3;
      const statusText = !acc.connected ? 'Compte enregistré mais extension inactive'
        : (isStale ? `Aucune synchro depuis ${daysSinceSync} jours` : 'Extension Chrome active');
      const badgeHtml = !acc.connected ? '<span style="color:#f59e0b;">● Inactif</span>'
        : (isStale ? '<span style="color:#f59e0b;">● Synchro en panne</span>' : '<span style="color:#00e5a0;">● Connecté</span>');
      return `<div class="setting-row" style="margin-bottom:8px;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="setting-label">@${acc.vinted_login || '—'}</div>
          <div class="setting-sub">${statusText} · dernière synchro ${acc.last_sync ? new Date(acc.last_sync).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:13px;font-weight:700;">${badgeHtml}</div>
          <button class="btn-edit" style="color:var(--danger);border-color:var(--danger);" onclick="disconnectVintedAccount('${acc.id}')">Déconnecter</button>
        </div>
      </div>
      ${reputationGridHtml(acc)}`;
    }).join('<hr style="border:none;border-top:1px solid var(--border);margin:14px 0;">');
  } catch(e) {
    listEl.innerHTML = '<p class="setting-sub">Erreur de chargement.</p>';
  }
}

window.disconnectVintedAccount = async (accountId) => {
  if(!confirm('Déconnecter ce compte Vinted ? Ses données restent conservées, seule la synchro automatique s\'arrête.')) return;
  await backendFetch(`/api/extension/accounts/${accountId}/disconnect`, { method: 'POST' });
  await loadVintedAccounts();
  renderVintedConnectionStatus();
};

function reputationGridHtml(data){
  const hasAny = (data.review_count||data.followers_count||data.vinted_item_count);
  if(!hasAny) return '';
  return `<div class="reputation-grid" style="display:grid">
    <div class="reputation-stat"><div class="reputation-val">${((data.feedback_reputation||0)*5).toFixed(1)}/5</div><div class="reputation-label">⭐ Note moyenne</div></div>
    <div class="reputation-stat"><div class="reputation-val">${data.review_count||0}</div><div class="reputation-label">💬 Avis</div></div>
    <div class="reputation-stat"><div class="reputation-val">${data.followers_count||0}</div><div class="reputation-label">👥 Abonnés</div></div>
  </div>`;
}

// ── HISTORIQUE VUES/FAVORIS ──
window.showHistory = async (itemId, itemName) => {
  document.getElementById('historyTitle').textContent = `Évolution — ${itemName}`;
  document.getElementById('historyBody').innerHTML = emptyState('Chargement...');
  document.getElementById('historyBg').classList.add('open');
  const { data, error } = await applyAccountFilter(sb.from('vinted_stats_history')
    .select('*').eq('user_id', currentUser.id).eq('vinted_item_id', itemId)).order('stat_date', { ascending: true });
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
  const photos=(a.photo_urls&&a.photo_urls.length)?a.photo_urls:(a.photo_url?[a.photo_url]:[]);
  const photosHTML=photos.length?`
    <div class="detail-photos">
      <img class="detail-photo-main" id="detailMainPhoto" src="${photos[0]}" alt="">
      ${photos.length>1?`<div class="detail-photo-thumbs">${photos.map((url,i)=>`<img class="detail-photo-thumb${i===0?' active':''}" src="${url}" onclick="swapDetailPhoto('${url.replace(/'/g,"\\'")}',this)">`).join('')}</div>`:''}
    </div>`:'';
  document.getElementById('detailBody').innerHTML=`
    <div class="detail-layout">
      ${photosHTML}
      <div class="detail-info">
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
        ${a.vinted_item_id&&a.status==='stock'?detailRow('🚀 Boost', a.vinted_boosted?'Actif (payant, acheté sur Vinted)':'Aucun'):''}
        ${a.vinted_shipping_status?detailRow('📦 Statut Vinted', a.vinted_shipping_status):''}
        ${a.source?detailRow('🔗 Source', a.source):''}
        ${a.vinted_item_id?`<p style="font-size:11.5px;color:var(--muted);margin-top:10px;line-height:1.5;">⚠️ Lié à Vinted — un changement manuel (statut, prix...) peut diverger de l'état réel de l'annonce tant qu'une synchro n'a pas eu lieu. Utilisez "Réinitialiser depuis Vinted" pour forcer la reprise du vrai statut au prochain cycle.</p>`:''}
      </div>
    </div>
  `;
  document.getElementById('detailEditBtn').style.display='inline-block';
  document.getElementById('detailEditBtn').onclick=()=>{ closeDetail(); editArticle(id); };
  document.getElementById('detailDeleteBtn').onclick=()=>{ closeDetail(); confirmDelete(id); };
  const resyncBtn=document.getElementById('detailResyncBtn');
  resyncBtn.style.display=a.vinted_item_id?'inline-block':'none';
  resyncBtn.onclick=()=>resyncFromVinted(id,resyncBtn);
  document.getElementById('detailBg').classList.add('open');
};
window.closeDetail = () => document.getElementById('detailBg').classList.remove('open');
window.swapDetailPhoto = (url, thumbEl) => {
  document.getElementById('detailMainPhoto').src = url;
  thumbEl.parentElement.querySelectorAll('.detail-photo-thumb').forEach(t=>t.classList.remove('active'));
  thumbEl.classList.add('active');
};

// Force la reprise du vrai statut Vinted au prochain cycle de synchro
// (≤5 min), en passant devant le garde-fou anti-régression normal —
// utile quand un changement manuel a fait diverger VintControl de la
// vraie annonce sur Vinted.
window.resyncFromVinted = async (id, btn) => {
  if (!selectedVintedAccountId && vintedAccounts.length > 1) {
    alert('Sélectionnez un compte Vinted précis (en haut de la sidebar) avant de réinitialiser.');
    return;
  }
  const original = btn.textContent;
  btn.textContent = '...'; btn.disabled = true;
  const res = await backendFetch('/api/settings/resync-article', {
    method: 'POST',
    body: JSON.stringify({ id, vinted_account_id: selectedVintedAccountId || '' }),
  });
  btn.textContent = res ? '✓ Programmé (≤5 min)' : '✕ Erreur, réessayez';
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
};

// Même principe que resyncFromVinted() mais pour tout le stock Vinted du
// compte sélectionné (ou de tous les comptes si "Tous les comptes").
window.resyncAllFromVinted = async (btn) => {
  if (!confirm('Forcer TOUS vos articles Vinted à reprendre leur vrai statut au prochain cycle de synchro (≤5 min) ? Toute modification manuelle récente sera écrasée par l\'état réel sur Vinted.')) return;
  const original = btn.textContent;
  btn.textContent = '...'; btn.disabled = true;
  const res = await backendFetch('/api/settings/resync-all', {
    method: 'POST',
    body: JSON.stringify({ vinted_account_id: selectedVintedAccountId || '' }),
  });
  btn.textContent = res ? `✓ ${res.count} article(s) programmé(s)` : '✕ Erreur, réessayez';
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 4000);
};

// ── CARTE DE VENTE PARTAGEABLE (Ventes) ──
window.openSaleCard = (id) => {
  const a=allArticles.find(x=>x.id===id);
  if(!a) return;
  const profit=calcProfit(a);
  const roi=a.buy_price>0?(profit/a.buy_price*100):0;
  const margin=a.sell_price>0?(profit/a.sell_price*100):0;
  document.getElementById('scName').textContent=a.name;
  document.getElementById('scPhotoWrap').innerHTML=a.photo_url?`<img src="${a.photo_url}" alt="">`:'';
  document.getElementById('scPhotoWrap').style.display=a.photo_url?'block':'none';
  document.getElementById('scCardBuy').textContent='-'+fmtPrice(a.buy_price);
  document.getElementById('scCardSell').textContent='+'+fmtPrice(a.sell_price);
  document.getElementById('scCardProfit').textContent=(profit>=0?'+':'')+fmtPrice(profit);
  document.getElementById('scCardRoi').textContent='ROI x'+(a.buy_price>0?(profit/a.buy_price+1).toFixed(1):'—');
  document.getElementById('scCardMargin').textContent='Marge '+margin.toFixed(1)+'%';
  const logo=document.querySelector('#saleCardContent .sale-card-logo');
  if(logo) logo.src=document.querySelector('.app-logo')?.src||'';
  document.getElementById('saleCardBg').classList.add('open');
};
window.closeSaleCard = () => document.getElementById('saleCardBg').classList.remove('open');
window.downloadSaleCard = () => {
  if(typeof html2canvas==='undefined'){ alert('Erreur de chargement, réessayez.'); return; }
  html2canvas(document.getElementById('saleCardContent'), {backgroundColor:'#ffffff', scale:2}).then(canvas=>{
    const link=document.createElement('a');
    link.download='vintcontrol-vente-'+today()+'.png';
    link.href=canvas.toDataURL('image/png');
    link.click();
  });
};

// ── INFO GÉNÉRIQUE (explication des badges) ──
window.showInfo = (title, bodyHtml) => {
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoBody').innerHTML = bodyHtml;
  document.getElementById('infoBg').classList.add('open');
};
window.closeInfo = () => document.getElementById('infoBg').classList.remove('open');

function infoLine(text){return `<p style="font-size:13px;color:var(--text);text-align:left;margin:8px 0;">${text}</p>`;}

window.showScoreInfo = (score, profit, roi, days) => {
  showInfo('⭐ Score de qualité de la vente', `
    <p style="font-size:13px;color:var(--muted);text-align:left;margin-bottom:8px;">Note sur 100 qui résume à quel point cette vente a été rentable, calculée à partir de 3 critères :</p>
    ${infoLine(`💰 Profit réalisé : <strong>${fmtPrice(profit)}</strong> ${profit>50?'(bonus)':profit>20?'(petit bonus)':profit<0?'(malus, vente à perte)':''}`)}
    ${infoLine(`📈 ROI (profit / prix d'achat) : <strong>${roi.toFixed(0)}%</strong> ${roi>100?'(bonus)':roi>50?'(petit bonus)':roi<0?'(malus)':''}`)}
    ${infoLine(`⏱ ${days!==null?'Vendu en '+days+' jour(s)':'Délai de vente inconnu'} ${days!==null&&days<=7?'(bonus rapidité)':days!==null&&days>90?'(malus, vente lente)':''}`)}
    <p style="font-size:12px;color:var(--muted);text-align:left;margin-top:8px;">Base de 50/100, ajustée par ces critères. Purement indicatif — utile pour repérer vos meilleures affaires d'un coup d'œil.</p>
  `);
};

window.showHeatInfo = () => {
  showInfo('🕐 Ancienneté du stock', `
    <p style="font-size:13px;color:var(--muted);text-align:left;margin-bottom:8px;">Indique depuis combien de temps l'article est en stock sans être vendu :</p>
    ${infoLine('🟢 Récent : acheté il y a moins de 30 jours')}
    ${infoLine('🟠 Moyen : entre 30 et 90 jours')}
    ${infoLine('🔴 Ancien : plus de 90 jours — pensez à baisser le prix ou relancer l\'annonce')}
  `);
};

window.showRoiInfo = (roi) => {
  showInfo('📈 ROI global (retour sur investissement)', `
    <p style="font-size:13px;color:var(--muted);text-align:left;margin-bottom:8px;">Compare votre profit total à ce que vous avez dépensé pour acheter les articles que vous avez vendus :</p>
    ${infoLine(`ROI = Profit total ÷ Prix d'achat des articles vendus × 100`)}
    ${infoLine(`Ici : <strong>${roi.toFixed(0)}%</strong> ${roi>100?'— chaque euro investi en a rapporté plus de deux (très bonne rentabilité).':roi>50?'— bonne rentabilité.':roi>=0?'— rentabilité correcte, à surveiller.':'— vous perdez de l\'argent sur vos ventes en moyenne.'}`)}
    <p style="font-size:12px;color:var(--muted);text-align:left;margin-top:8px;">Contrairement au profit (en €), le ROI (en %) permet de comparer la rentabilité de votre activité peu importe le montant investi.</p>
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
    { title: 'Bienvenue sur VintControl 👋', body: 'Ce petit guide vous montre les bases en quelques étapes rapides.' },
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
document.getElementById('heroBadgeLogo').src = LOGO_DARK;
sb.auth.onAuthStateChange((event,session)=>{if(session?.user)loginAs(session.user);});
