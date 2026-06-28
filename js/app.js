const SUPABASE_URL = 'https://iprrnmrndjfdlozxjbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcnJubXJuZGpmZGxvenhqYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjUxOTksImV4cCI6MjA5ODA0MTE5OX0.JAteIwydCEoOe6S3z-Isq6-TwRLBdGpU8akn_1FvQb0';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let allArticles = [];
let currentFilter = { stock: 'Tous', vendus: 'Tous' };
let selectedPhotoFile = null;
let deleteTargetId = null;
const PAGE_TITLES = { dashboard: 'Tableau de bord', stock: 'Stock', expedition: 'À expédier', vendus: 'Vendus', analytics: 'Statistiques', objectif: 'Objectifs' };

// ── AUTH ──
window.switchTab = (tab) => {
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', (tab==='login'&&i===0)||(tab==='register'&&i===1)));
  document.getElementById('authError').textContent = '';
};

window.doLogin = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPwd').value;
  if (!email || !password) { showError('Remplissez tous les champs.'); return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { showError('Email ou mot de passe incorrect.'); return; }
  loginAs(data.user);
};

window.doRegister = async () => {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPwd').value;
  if (!name || !email || !password) { showError('Remplissez tous les champs.'); return; }
  if (password.length < 6) { showError('Mot de passe trop court (6 car. min).'); return; }
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
  if (error) { showError(error.message); return; }
  loginAs(data.user);
};

window.doLogout = async () => {
  await sb.auth.signOut();
  currentUser = null; allArticles = [];
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
};

function showError(msg) { document.getElementById('authError').textContent = msg; }

function loginAs(user) {
  currentUser = user;
  const name = user.user_metadata?.name || user.email.split('@')[0];
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  document.getElementById('userName').textContent = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
  loadArticles();
}

// ── NAVIGATION ──
window.goPage = (id, btn) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[id] || '';
  if (document.querySelector('.sidebar').classList.contains('open')) toggleSidebar();
};
window.toggleSidebar = () => document.querySelector('.sidebar').classList.toggle('open');

// ── DATES ──
window.toggleDates = () => {
  const status = document.getElementById('mStatus').value;
  const sellField = document.getElementById('sellDateField');
  sellField.style.display = (status === 'expedition' || status === 'vendu') ? 'block' : 'none';
};

function today() { return new Date().toISOString().split('T')[0]; }

function daysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  const diff = new Date(d2) - new Date(d1);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function sellTimeLabel(a) {
  if (a.status === 'stock') return '';
  const days = daysBetween(a.buy_date, a.sell_date || a.created_at?.split('T')[0]);
  if (days === null) return '';
  if (days === 0) return 'Vendu le jour même';
  if (days === 1) return 'Vendu en 1 jour';
  return `Vendu en ${days} jours`;
}

// ── PHOTO ──
window.previewPhoto = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  selectedPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('photoPreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('photoPlaceholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
};

async function uploadPhoto(file, articleId) {
  const ext = file.name.split('.').pop();
  const path = `${currentUser.id}/${articleId}.${ext}`;
  const { error } = await sb.storage.from('photos').upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = sb.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

// ── LOAD ──
async function loadArticles() {
  const { data } = await sb.from('articles').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  allArticles = data || [];
  renderAll();
}

// ── MODAL ──
window.openModal = (article = null) => {
  selectedPhotoFile = null;
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('photoPlaceholder').style.display = 'flex';
  document.getElementById('mPhoto').value = '';
  document.getElementById('mId').value = article?.id || '';
  document.getElementById('mName').value = article?.name || '';
  document.getElementById('mBuy').value = article?.buy_price || '';
  document.getElementById('mSell').value = article?.sell_price || '';
  document.getElementById('mPlatform').value = article?.platform || 'Vinted';
  document.getElementById('mStatus').value = article?.status || 'stock';
  document.getElementById('mBuyDate').value = article?.buy_date || today();
  document.getElementById('mSellDate').value = article?.sell_date || today();
  document.getElementById('modalTitle').textContent = article ? "Modifier l'article" : 'Ajouter un article';
  document.getElementById('btnSave').textContent = article ? 'Enregistrer' : 'Ajouter';
  toggleDates();
  if (article?.photo_url) {
    const preview = document.getElementById('photoPreview');
    preview.src = article.photo_url;
    preview.style.display = 'block';
    document.getElementById('photoPlaceholder').style.display = 'none';
  }
  document.getElementById('modalBg').classList.add('open');
};

window.closeModal = () => document.getElementById('modalBg').classList.remove('open');
window.handleModalBgClick = (e) => { if (e.target === document.getElementById('modalBg')) closeModal(); };

window.saveArticle = async () => {
  const id = document.getElementById('mId').value;
  const name = document.getElementById('mName').value.trim();
  const buy = parseFloat(document.getElementById('mBuy').value.replace(',', '.')) || 0;
  const sell = parseFloat(document.getElementById('mSell').value.replace(',', '.')) || 0;
  const platform = document.getElementById('mPlatform').value;
  const status = document.getElementById('mStatus').value;
  const buy_date = document.getElementById('mBuyDate').value || today();
  const sell_date = (status !== 'stock') ? (document.getElementById('mSellDate').value || today()) : null;
  if (!name) return;

  const btn = document.getElementById('btnSave');
  btn.textContent = '...'; btn.disabled = true;

  let photoUrl = id ? allArticles.find(a => a.id === id)?.photo_url : null;
  const articleId = id || crypto.randomUUID();
  if (selectedPhotoFile) photoUrl = await uploadPhoto(selectedPhotoFile, articleId);

  const payload = { name, buy_price: buy, sell_price: sell, platform, status, buy_date, sell_date, photo_url: photoUrl };

  if (id) {
    const { data } = await sb.from('articles').update(payload).eq('id', id).eq('user_id', currentUser.id).select();
    if (data) { const idx = allArticles.findIndex(a => a.id === id); if (idx >= 0) allArticles[idx] = data[0]; }
  } else {
    const { data } = await sb.from('articles').insert([{ id: articleId, user_id: currentUser.id, ...payload }]).select();
    if (data) allArticles.unshift(data[0]);
  }

  btn.textContent = id ? 'Enregistrer' : 'Ajouter'; btn.disabled = false;
  closeModal();
  renderAll();
};

// ── DELETE ──
window.confirmDelete = (id) => {
  deleteTargetId = id;
  document.getElementById('confirmBg').classList.add('open');
  document.getElementById('btnConfirmDelete').onclick = async () => {
    await sb.from('articles').delete().eq('id', deleteTargetId).eq('user_id', currentUser.id);
    allArticles = allArticles.filter(a => a.id !== deleteTargetId);
    closeConfirm();
    renderAll();
  };
};
window.closeConfirm = () => { document.getElementById('confirmBg').classList.remove('open'); deleteTargetId = null; };

// ── FILTERS ──
window.filterPlatform = (p, btn, section) => {
  currentFilter[section] = p;
  btn.closest('.page-filters').querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (section === 'stock') renderStock();
  if (section === 'vendus') renderVendus();
};

// ── HELPERS ──
function calcProfit(a) { return (parseFloat(a.sell_price) || 0) - (parseFloat(a.buy_price) || 0); }
function fmtPrice(v) { return parseFloat(v || 0).toFixed(2).replace('.', ',') + '€'; }
function platformBadgeClass(p) { return { Vinted: 'badge-vinted', eBay: 'badge-ebay', Leboncoin: 'badge-leboncoin' }[p] || 'badge-autre'; }
function statusBadge(s) {
  if (s === 'stock') return '<span class="badge badge-stock">En stock</span>';
  if (s === 'expedition') return '<span class="badge badge-expedition">À expédier</span>';
  return '<span class="badge badge-vendu">Expédié</span>';
}
function photoEl(a) {
  if (a.photo_url) return `<div class="article-photo"><img src="${a.photo_url}" alt="${a.name}" /></div>`;
  return `<div class="article-photo">📦</div>`;
}

function articleHTML(a, opts = {}) {
  const profit = calcProfit(a);
  const sellTime = sellTimeLabel(a);
  const editBtn = `<button class="btn-edit" onclick='openModal(${JSON.stringify(a)})'>✎</button>`;
  const deleteBtn = opts.showDelete ? `<button class="btn-edit" style="color:var(--danger);border-color:var(--danger);" onclick="confirmDelete('${a.id}')">✕</button>` : '';
  return `<div class="article-card">
    ${photoEl(a)}
    <div class="article-info">
      <div class="article-name">${a.name}</div>
      <div class="article-meta">Achat ${fmtPrice(a.buy_price)} · Vente ${fmtPrice(a.sell_price)}</div>
      ${sellTime ? `<div class="sell-time">${sellTime}</div>` : ''}
      <div class="article-badges">
        <span class="badge ${platformBadgeClass(a.platform)}">${a.platform}</span>
        ${statusBadge(a.status)}
      </div>
    </div>
    <div class="article-right">
      <div class="article-profit ${profit >= 0 ? 'profit-pos' : 'profit-neg'}">${profit >= 0 ? '+' : ''}${fmtPrice(profit)}</div>
      <div class="article-actions">${editBtn}${deleteBtn}</div>
    </div>
  </div>`;
}

function emptyState(msg) { return `<div class="empty-state"><div class="empty-icon">📭</div>${msg}</div>`; }

// ── RENDER ALL ──
function renderAll() { renderDashboard(); renderStock(); renderExpedition(); renderVendus(); renderAnalytics(); renderObjectif(); }

function renderDashboard() {
  const vendus = allArticles.filter(a => a.status === 'vendu');
  const stock = allArticles.filter(a => a.status === 'stock');
  const expedition = allArticles.filter(a => a.status === 'expedition');
  const totalProfit = vendus.reduce((s, a) => s + calcProfit(a), 0);
  const investi = stock.reduce((s, a) => s + (parseFloat(a.buy_price) || 0), 0);
  const roi = investi > 0 ? (totalProfit / investi * 100) : 0;
  const now = new Date();
  const profitMois = allArticles.filter(a => a.status === 'vendu').filter(a => {
    const d = new Date(a.sell_date || a.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, a) => s + calcProfit(a), 0);

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Profit total</div><div class="kpi-val ${totalProfit>=0?'green':'red'}">${fmtPrice(totalProfit)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Profit ce mois</div><div class="kpi-val ${profitMois>=0?'green':'red'}">${fmtPrice(profitMois)}</div><div class="kpi-sub">Automatique</div></div>
    <div class="kpi-card"><div class="kpi-label">En stock</div><div class="kpi-val">${stock.length}</div><div class="kpi-sub">${fmtPrice(investi)} investis</div></div>
    <div class="kpi-card"><div class="kpi-label">À expédier</div><div class="kpi-val" style="color:var(--warning)">${expedition.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Vendus</div><div class="kpi-val">${vendus.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">ROI</div><div class="kpi-val ${roi>=0?'green':'red'}">${roi.toFixed(0)}%</div></div>
  `;
  const recent = allArticles.slice(0, 4);
  document.getElementById('recentList').innerHTML = recent.length
    ? `<div class="article-list">${recent.map(a => articleHTML(a)).join('')}</div>`
    : emptyState('Aucun article encore.');
  renderMiniChart('dashChartBars', 'dashChartLabels');
}

function renderStock() {
  let arts = allArticles.filter(a => a.status === 'stock');
  if (currentFilter.stock !== 'Tous') arts = arts.filter(a => a.platform === currentFilter.stock);
  document.getElementById('stockCount').textContent = arts.length + ' article(s) en stock';
  document.getElementById('stockList').innerHTML = arts.length
    ? `<div class="article-list">${arts.map(a => articleHTML(a, { showDelete: true })).join('')}</div>`
    : emptyState('Aucun article en stock.');
}

function renderExpedition() {
  const arts = allArticles.filter(a => a.status === 'expedition');
  document.getElementById('expeditionCount').textContent = arts.length + ' article(s) à expédier';

  // Checklist
  const stored = JSON.parse(localStorage.getItem('checklist_' + currentUser.id) || '{}');
  const checklistHTML = arts.length ? `
    <div class="checklist-card">
      <div class="checklist-title">✅ Checklist d'expédition</div>
      ${arts.map(a => `
        <div class="checklist-item">
          <input type="checkbox" id="chk_${a.id}" ${stored[a.id] ? 'checked' : ''} onchange="toggleCheck('${a.id}', this)" />
          <label for="chk_${a.id}" class="${stored[a.id] ? 'done' : ''}">${a.name} — ${a.platform}</label>
        </div>
      `).join('')}
    </div>` : '';
  document.getElementById('checklistWrap').innerHTML = checklistHTML;
  document.getElementById('expeditionList').innerHTML = arts.length
    ? `<div class="article-list">${arts.map(a => articleHTML(a)).join('')}</div>`
    : emptyState('Aucun article en attente d\'expédition 🎉');
}

window.toggleCheck = (id, el) => {
  const stored = JSON.parse(localStorage.getItem('checklist_' + currentUser.id) || '{}');
  stored[id] = el.checked;
  localStorage.setItem('checklist_' + currentUser.id, JSON.stringify(stored));
  const label = el.nextElementSibling;
  if (label) label.classList.toggle('done', el.checked);
};

function renderVendus() {
  let arts = allArticles.filter(a => a.status === 'vendu');
  if (currentFilter.vendus !== 'Tous') arts = arts.filter(a => a.platform === currentFilter.vendus);
  document.getElementById('vendusCount').textContent = arts.length + ' article(s) vendu(s)';
  document.getElementById('vendusList').innerHTML = arts.length
    ? `<div class="article-list">${arts.map(a => articleHTML(a)).join('')}</div>`
    : emptyState('Aucun article vendu encore.');
}

function getMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString('fr', { month: 'short' }), profit: 0, month: d.getMonth(), year: d.getFullYear() };
  });
}

function renderMiniChart(barsId, labelsId) {
  const months = getMonths();
  allArticles.filter(a => a.status === 'vendu').forEach(a => {
    const d = new Date(a.sell_date || a.created_at);
    const m = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    if (m) m.profit += calcProfit(a);
  });
  const maxP = Math.max(...months.map(m => Math.abs(m.profit)), 1);
  document.getElementById(barsId).innerHTML = months.map(m => {
    const h = Math.max(4, Math.abs(m.profit) / maxP * 110);
    return `<div class="bar-wrap"><div class="bar ${m.profit < 0 ? 'negative' : ''}" style="height:${h}px;"></div></div>`;
  }).join('');
  document.getElementById(labelsId).innerHTML = months.map(m =>
    `<div class="chart-label">${m.label}<strong>${m.profit >= 0 ? '+' : ''}${fmtPrice(m.profit)}</strong></div>`
  ).join('');
}

function renderAnalytics() {
  const months = getMonths();
  allArticles.filter(a => a.status === 'vendu').forEach(a => {
    const d = new Date(a.sell_date || a.created_at);
    const m = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    if (m) m.profit += calcProfit(a);
  });
  const vendus = allArticles.filter(a => a.status === 'vendu');
  const totalP = vendus.reduce((s, a) => s + calcProfit(a), 0);
  const avgP = vendus.length ? totalP / vendus.length : 0;
  const bestMonth = Math.max(0, ...months.map(m => m.profit));
  const now = new Date();
  const profitMois = months.find(m => m.month === now.getMonth() && m.year === now.getFullYear())?.profit || 0;

  // Temps moyen de vente
  const avecDates = vendus.filter(a => a.buy_date && a.sell_date);
  const avgDays = avecDates.length ? Math.round(avecDates.reduce((s, a) => s + daysBetween(a.buy_date, a.sell_date), 0) / avecDates.length) : null;

  document.getElementById('analyticsKpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Ce mois</div><div class="kpi-val green">${fmtPrice(profitMois)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Meilleur mois</div><div class="kpi-val green">${fmtPrice(bestMonth)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Marge moyenne</div><div class="kpi-val">${fmtPrice(avgP)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Temps vente moy.</div><div class="kpi-val">${avgDays !== null ? avgDays + 'j' : '—'}</div></div>
  `;
  const maxP = Math.max(...months.map(m => Math.abs(m.profit)), 1);
  document.getElementById('chartBars').innerHTML = months.map(m => {
    const h = Math.max(4, Math.abs(m.profit) / maxP * 110);
    return `<div class="bar-wrap"><div class="bar ${m.profit < 0 ? 'negative' : ''}" style="height:${h}px;"></div></div>`;
  }).join('');
  document.getElementById('chartLabels').innerHTML = months.map(m =>
    `<div class="chart-label">${m.label}<strong>${m.profit >= 0 ? '+' : ''}${fmtPrice(m.profit)}</strong></div>`
  ).join('');
}

function renderObjectif() {
  const goal = parseFloat(localStorage.getItem('goal_' + currentUser.id) || '500');
  const now = new Date();
  const profitMois = allArticles.filter(a => a.status === 'vendu').filter(a => {
    const d = new Date(a.sell_date || a.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, a) => s + calcProfit(a), 0);
  const pct = Math.min(100, goal > 0 ? profitMois / goal * 100 : 0);
  document.getElementById('goalHero').innerHTML = `
    <div class="kpi-label">Profit ce mois · Calculé automatiquement</div>
    <div class="goal-big">${fmtPrice(profitMois)}</div>
    <div class="goal-label">sur ${fmtPrice(goal)} d'objectif — ${pct.toFixed(0)}% atteint</div>
    <div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div>
    <div class="goal-limits"><span>0€</span><span>${fmtPrice(goal)}</span></div>
  `;
  document.getElementById('goalInput').value = goal;
}

window.saveGoal = () => {
  const v = parseFloat(document.getElementById('goalInput').value);
  if (isNaN(v) || v <= 0) return;
  localStorage.setItem('goal_' + currentUser.id, v);
  renderObjectif();
};

sb.auth.onAuthStateChange((event, session) => {
  if (session?.user) loginAs(session.user);
});
