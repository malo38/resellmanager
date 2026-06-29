const SUPABASE_URL = 'https://iprrnmrndjfdlozxjbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcnJubXJuZGpmZGxvenhqYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjUxOTksImV4cCI6MjA5ODA0MTE5OX0.JAteIwydCEoOe6S3z-Isq6-TwRLBdGpU8akn_1FvQb0';

const LOGO_DARK = 'https://iprrnmrndjfdlozxjbsu.supabase.co/storage/v1/object/public/assets/6de8d09a-13c6-416f-a564-bfc9ab4ca62e.png';
const LOGO_LIGHT = 'https://iprrnmrndjfdlozxjbsu.supabase.co/storage/v1/object/public/assets/ChatGPT%20Image%2028%20juin%202026,%2016_31_42.png';

const { créerClient } = supabase;
const sb = créerClient(SUPABASE_URL, SUPABASE_ANON_KEY);

soit currentUser = null ;
soit tous les articles = [];
let currentFilter = { stock : 'Tous', vendu : 'Tous' };
let selectedPhotoFile = null;
laisser deleteTargetId = null ;
const PAGE_TITLES = { tableau de bord : 'Tableau de bord', stock : 'Stock', expédition : 'À expédier', vendu : 'Vendus', analytique : 'Statistiques', objectif : 'Objectifs', settings : 'Paramètres' };

// ── THÈME ──
fonction setTheme(theme) {
  document.documentElement.setAttribute('data-theme', thème);
  localStorage.setItem('theme', thème);
  const isDark = thème === 'sombre';
  const logo = estSombre ? LOGO_SOMBRE : LOGO_CLAIR;
  document.querySelectorAll('#authLogo, #sidebarLogo').forEach(el => { if(el) el.src = logo; });
  document.getElementById('btnDark')?.classList.toggle('active', isDark);
  document.getElementById('btnLight')?.classList.toggle('active', !isDark);
}

fenêtre.setTheme = setTheme;

fonction initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  définirThème(enregistré);
}

// ── AUTH ──
fenêtre.switchTab = (tab) => {
  ['loginForm','registerForm','forgotForm'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById(tab + 'Form').style.display = 'block';
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', (tab==='login'&&i===0)||(tab==='register'&&i===1)));
  document.getElementById('authError').textContent = '';
  document.getElementById('authSuccess').textContent = '';
};

window.doLogin = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPwd').value;
  if (!email || !password) { showError('Remplissez tous les champs.'); retour; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { showError('Email ou mot de passe incorrect.'); retour; }
  se connecter en tant que (données.utilisateur);
};

window.doRegister = async () => {
  const nom = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const mot de passe = document.getElementById('regPwd').value;
  if (!name || !email || !password) { showError('Remplissez tous les champs.'); retour; }
  if (password.length < 6) { showError('Mot de passe trop court (6 car. min).'); return; }
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
  if (error) { showError(error.message); return; }
  se connecter en tant que (données.utilisateur);
};

window.doForgot = async () => {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) { showError('Entrez votre email.'); retour; }
  const { erreur } = await sb.auth.resetPasswordForEmail(email, {
    redirection vers : window.location.origin
  });
  if (error) { showError(error.message); return; }
  document.getElementById('authSuccess').textContent = ' ✓ Email envoyé ! Vérifiez votre boîte mail.';
  document.getElementById('authError').textContent = '';
};

window.sendResetEmail = async () => {
  const { erreur } = await sb.auth.resetPasswordForEmail(currentUser.email, {
    redirection vers : window.location.origin
  });
  const msg = document.getElementById('settingsMsg');
  msg.textContent = erreur ? 'Erreur : ' + error.message : ' ✓ Email de réinitialisation envoyé !';
};

window.doLogout = async () => {
  attendre sb.auth.signOut();
  Utilisateur actuel = null; tous les articles = [];
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
};

function showError(msg) { document.getElementById('authError').textContent = msg; }

fonction loginAs(utilisateur) {
  Utilisateur actuel = utilisateur ;
  const nom = utilisateur.user_metadata?.nom || utilisateur.email.split('@')[0];
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  document.getElementById('userName').textContent = nom;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
  const thème = localStorage.getItem('theme') || 'dark';
  document.getElementById('btnDark')?.classList.toggle('active', theme === 'dark');
  document.getElementById('btnLight')?.classList.toggle('active', theme === 'light');
  chargerArticles();
}

// ── NAVIGATION ──
fenêtre.goPage = (id, btn) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[id] || '';
  if (document.querySelector('.sidebar').classList.contains('open')) toggleSidebar();
};
window.toggleSidebar = () => document.querySelector('.sidebar').classList.toggle('open');

// ── DATES ──
fenêtre.toggleDates = () => {
  const status = document.getElementById('mStatus').value;
  document.getElementById('sellDateField').style.display = (status !== 'stock') ? 'block' : 'none';
};

fonction aujourd'hui() { return new Date().toISOString().split('T')[0]; }
fonction joursEntre(d1, d2) {
  si (!d1 || !d2) retourner null ;
  retourner Math.round((new Date(d2) - new Date(d1)) / 86400000);
}
fonction sellTimeLabel(a) {
  si (a.status === 'stock') retourner '';
  const jours = joursEntre(a.date_achat, a.date_vente || a.créé_à?.split('T')[0]);
  si (jours === null) retourner '';
  if (days === 0) return 'Vendu le jour même';
  if (days === 1) return 'Vendu en 1 jour';
  return `Vendu en ${days} jours`;
}

// ── PHOTO ──
fenêtre.previewPhoto = (événement) => {
  const fichier = événement.cible.fichiers[0];
  si (!fichier) retourner;
  FichierPhoto sélectionné = fichier ;
  const lecteur = new FileReader();
  lecteur.onload = (e) => {
    document.getElementById('photoPreview').src = e.target.result;
    document.getElementById('photoPreview').style.display = 'block';
    document.getElementById('photoPlaceholder').style.display = 'none';
  };
  lecteur.lireCommeURLDeDonnées(fichier);
};

fonction asynchrone uploadPhoto(file, articleId) {
  const ext = file.name.split('.').pop();
  const path = `${currentUser.id}/${articleId}.${ext}` ;
  const { erreur } = await sb.storage.from('photos').upload(path, file, { upsert: true });
  si (erreur) retourner null ;
  renvoie sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

// ── CHARGER ──
fonction asynchrone chargerArticles() {
  const { data } = await sb.from('articles').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  tous les articles = données || [];
  renderAll();
}

// ── MODAL ──
fenêtre.openModal = (article = null) => {
  FichierPhoto sélectionné = null ;
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
  basculerDates();
  si (article?.photo_url) {
    document.getElementById('photoPreview').src = article.photo_url;
    document.getElementById('photoPreview').style.display = 'block';
    document.getElementById('photoPlaceholder').style.display = 'none';
  }
  document.getElementById('modalBg').classList.add('open');
};

window.closeModal = () => document.getElementById('modalBg').classList.remove('open');
window.handleModalBgClick = (e) => { if (e.target === document.getElementById('modalBg')) closeModal(); };

window.saveArticle = async () => {
  const id = document.getElementById('mId').value;
  const nom = document.getElementById('mName').value.trim();
  const buy = parseFloat(document.getElementById('mBuy').value.replace(',', '.')) || 0;
  const sell = parseFloat(document.getElementById('mSell').value.replace(',', '.')) || 0;
  const platform = document.getElementById('mPlatform').value;
  const status = document.getElementById('mStatus').value;
  const buy_date = document.getElementById('mBuyDate').value || today();
  const sell_date = status !== 'stock' ? (document.getElementById('mSellDate').value || today()) : null;
  si (!nom) retourner;

  const btn = document.getElementById('btnSave');
  btn.textContent = '...'; btn.disabled = true;

  let photoUrl = id ? allArticles.find(a => a.id === id)?.photo_url : null;
  const articleId = identifiant || crypto.randomUUID();
  si (fichierPhotoSélectionné) photoUrl = await uploadPhoto(fichierPhotoSélectionné, articleId);

  const payload = { nom, prix_achat: achat, prix_vente: vente, plateforme, statut, date_achat, date_vente, url_photo: photoUrl };

  si (id) {
    const { data } = await sb.from('articles').update(payload).eq('id', id).eq('user_id', currentUser.id).select();
    if (data) { const idx = allArticles.findIndex(a => a.id === id); if (idx >= 0) allArticles[idx] = data[0]; }
  } autre {
    const { data } = await sb.from('articles').insert([{ id: articleId, user_id: currentUser.id, ...payload }]).select();
    si (données) tousArticles.décaler(données[0]);
  }

  btn.textContent = identifiant ? 'Enregistrer' : 'Ajouter'; btn.disabled = faux ;
  fermerModal();
  renderAll();
};

// ── SUPPRIMER ──
fenêtre.confirmDelete = (id) => {
  supprimerIDCible = id ;
  document.getElementById('confirmBg').classList.add('open');
  document.getElementById('btnConfirmDelete').onclick = async () => {
    await sb.from('articles').delete().eq('id', deleteTargetId).eq('user_id', currentUser.id);
    tousArticles = tousArticles.filter(a => a.id !== deleteTargetId);
    fermerConfirmer();
    renderAll();
  };
};
window.closeConfirm = () => { document.getElementById('confirmBg').classList.remove('open'); deleteTargetId = null; };

// ── FILTRES ──
fenêtre.filterPlatform = (p, btn, section) => {
  filtre_actuel[section] = p;
  btn.closest('.page-filters').querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  si (section === 'stock') afficherStock();
  if (section === 'vendus') renderVendus();
};

// ── AIDE ──
fonction calcProfit(a) { return (parseFloat(a.sell_price) || 0) - (parseFloat(a.buy_price) || 0); }
fonction fmtPrice(v) { return parseFloat(v || 0).toFixed(2).replace('.', ',') + '€'; }
function platformBadgeClass(p) { return { Vinted: 'badge-vinted', eBay: 'badge-ebay', Leboncoin: 'badge-leboncoin' }[p] || 'badge-autre'; }
fonction statusBadge(s) {
  si (s === 'stock') retourner '<span class="badge badge-stock">En stock</span>';
  if (s === 'expedition') return '<span class="badge badge-expedition">À expédier</span>';
  return '<span class="badge badge-vendu">Expédié</span>';
}
fonction photoEl(a) {
  if (a.photo_url) return `<div class="article-photo"><img src="${a.photo_url}" alt="${a.name}" /></div>`;
  return `<div class="article-photo">📦</div>`;
}

fonction articleHTML(a) {
  const profit = calcProfit(a);
  const sellTime = sellTimeLabel(a);
  retourner `<div class="article-card">
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
      <div class="article-actions">
        <button class="btn-edit" onclick='openModal(${JSON.stringify(a)})'>✎</button>
        <button class="btn-edit" style="color:var(--danger);border-color:var(--danger);" onclick="confirmDelete('${a.id}')">✕</button>
      </div>
    </div>
  </div>`;
}

function emptyState(msg) { return `<div class="empty-state"><div class="empty-icon">📭</div>${msg}</div>`; }

// ── RENDU ──
function renderAll() { renderDashboard(); renderStock(); renderExpedition(); renderVendus(); renderAnalytics(); renderObjectif(); }

fonction renderDashboard() {
  const vendu = allArticles.filter(a => a.status === 'vendu');
  const stock = allArticles.filter(a => a.status === 'stock');
  const expédition = tous les articles.filter(a => a.status === 'expédition');
  const totalProfit = Vendu.reduce((s, a) => s + calcProfit(a), 0);
  const investi = stock.reduce((s, a) => s + (parseFloat(a.buy_price) || 0), 0);
  const roi = investir > 0 ? (totalProfit / investi * 100) : 0;
  const maintenant = nouvelle Date();
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
  document.getElementById('recentList').innerHTML = allArticles.slice(0,4).length
    ? `<div class="article-list">${allArticles.slice(0,4).map(articleHTML).join('')}</div>`
    : emptyState('Aucun article encore.');
  renderMiniChart('dashChartBars', 'dashChartLabels');
}

fonction renderStock() {
  let arts = allArticles.filter(a => a.status === 'stock');
  if (currentFilter.stock !== 'Tous') arts = arts.filter(a => a.platform === currentFilter.stock);
  document.getElementById('stockCount').textContent = arts.length + ' article(s) en stock';
  document.getElementById('stockList').innerHTML = arts.length
    ? `<div class="article-list">${arts.map(articleHTML).join('')}</div>`
    : emptyState('Aucun article en stock.');
}

fonction renderExpedition() {
  const arts = allArticles.filter(a => a.status === 'expedition');
  document.getElementById('expeditionCount').textContent = arts.length + ' article(s) à expédier';
  const stored = JSON.parse(localStorage.getItem('checklist_' + currentUser.id) || '{}');
  document.getElementById('checklistWrap').innerHTML = arts.length ? `
    <div class="checklist-card">
      <div class="checklist-title">✅ Checklist d'expédition</div>
      ${arts.map(a => `
        <div class="checklist-item">
          <input type="checkbox" id="chk_${a.id}" ${stored[a.id] ? 'checked' : ''} onchange="toggleCheck('${a.id}', this)" />
          <label for="chk_${a.id}" class="${stored[a.id] ? 'done' : ''}">${a.name} — ${a.platform}</label>
        </div>`).join('')}
    </div>` : '';
  document.getElementById('expeditionList').innerHTML = arts.length
    ? `<div class="article-list">${arts.map(articleHTML).join('')}</div>`
    : emptyState('Aucun article en attente 🎉');
}

fenêtre.toggleCheck = (id, el) => {
  const stored = JSON.parse(localStorage.getItem('checklist_' + currentUser.id) || '{}');
  stocké[id] = el.checked;
  localStorage.setItem('checklist_' + currentUser.id, JSON.stringify(stored));
  el.nextElementSibling?.classList.toggle('done', el.checked);
};

fonction renderVendus() {
  let arts = allArticles.filter(a => a.status === 'vendu');
  if (currentFilter.vendus !== 'Tous') arts = arts.filter(a => a.platform === currentFilter.vendus);
  document.getElementById('vendusCount').textContent = arts.length + 'article(s) vendu(s)';
  document.getElementById('vendusList').innerHTML = arts.length
    ? `<div class="article-list">${arts.map(articleHTML).join('')}</div>`
    : emptyState('Aucun article vendu encore.');
}

fonction getMonths() {
  const maintenant = nouvelle Date();
  return Array.from({ longueur: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString('fr', { month: 'short' }), profit: 0, month: d.getMonth(), year: d.getFullYear() };
  });
}

fonction renderMiniChart(barsId, labelsId) {
  const mois = obtenirMois();
  allArticles.filter(a => a.status === 'vendu').forEach(a => {
    const d = new Date(a.sell_date || a.created_at);
    const m = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    si (m) m.profit += calcProfit(a);
  });
  const maxP = Math.max(...mois.map(m => Math.abs(m.profit)), 1);
  document.getElementById(barsId).innerHTML = months.map(m => {
    const h = Math.max(4, Math.abs(m.profit) / maxP * 110);
    return `<div class="bar-wrap"><div class="bar ${m.profit < 0 ? 'negative' : ''}" style="height:${h}px;"></div></div>`;
  }).rejoindre('');
  document.getElementById(labelsId).innerHTML = months.map(m =>
    `<div class="chart-label">${m.label}<strong>${m.profit >= 0 ? '+' : ''}${fmtPrice(m.profit)}</strong></div>`
  ).rejoindre('');
}

fonction renderAnalytics() {
  const mois = obtenirMois();
  allArticles.filter(a => a.status === 'vendu').forEach(a => {
    const d = new Date(a.sell_date || a.created_at);
    const m = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    si (m) m.profit += calcProfit(a);
  });
  const vendu = allArticles.filter(a => a.status === 'vendu');
  const totalP = Vendu.reduce((s, a) => s + calcProfit(a), 0);
  const avgP = Sold.length ? totalP / Sold.length : 0;
  const meilleurMois = Math.max(0, ...mois.map(m => m.profit));
  const maintenant = nouvelle Date();
  const profitMois = months.find(m => m.month === now.getMonth() && m.year === now.getFullYear())?.profit || 0;
  const avecDates = Vendu.filter(a => a.buy_date && a.sell_date);
  const avgDays = avecDates.length ? Math.round(avecDates.reduce((s, a) => s + daysBetween(a.buy_date, a.sell_date), 0) / avecDates.length) : null;

  document.getElementById('analyticsKpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Ce mois</div><div class="kpi-val green">${fmtPrice(profitMois)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Meilleur mois</div><div class="kpi-val green">${fmtPrice(bestMonth)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Marge moyenne</div><div class="kpi-val">${fmtPrice(avgP)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Temps vente moy.</div><div class="kpi-val">${avgDays !== null ? avgDays + 'j' : '—'}</div></div>
  `;
  const maxP = Math.max(...mois.map(m => Math.abs(m.profit)), 1);
  document.getElementById('chartBars').innerHTML = mois.map(m => {
    const h = Math.max(4, Math.abs(m.profit) / maxP * 110);
    return `<div class="bar-wrap"><div class="bar ${m.profit < 0 ? 'negative' : ''}" style="height:${h}px;"></div></div>`;
  }).rejoindre('');
  document.getElementById('chartLabels').innerHTML = months.map(m =>
    `<div class="chart-label">${m.label}<strong>${m.profit >= 0 ? '+' : ''}${fmtPrice(m.profit)}</strong></div>`
  ).rejoindre('');
}

fonction renderObjectif() {
  const goal = parseFloat(localStorage.getItem('goal_' + currentUser.id) || '500');
  const maintenant = nouvelle Date();
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
  document.getElementById('goalInput').value = objectif;
}

fenêtre.saveGoal = () => {
  const v = parseFloat(document.getElementById('goalInput').value);
  if (isNaN(v) || v <= 0) return;
  localStorage.setItem('goal_' + currentUser.id, v);
  renderObjectif();
};

// ── INIT ──
initTheme();
sb.auth.onAuthStateChange((event, session) => {
  si (session?.user) se connecter en tant que(session.user);
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

// ── INIT ──
initTheme();
sb.auth.onAuthStateChange((event, session) => {
  if (session?.user) loginAs(session.user);
});
  const avgP = vendus.length ? totalP / vendus.length : 0;
  const bestMonth = Math.max(0, ...months.map(m => m.profit));
  const now = new Date();
  const profitMois = months.find(m => m.month === now.getMonth() && m.year === now.getFullYear())?.profit || 0;
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

// ── INIT ──
initTheme();
sb.auth.onAuthStateChange((event, session) => {
  if (session?.user) loginAs(session.user);
});

