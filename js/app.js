const SUPABASE_URL = 'https://iprrnmrndjfdlozxjbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcnJubXJuZGpmZGxvenhqYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjUxOTksImV4cCI6MjA5ODA0MTE5OX0.JAteIwydCEoOe6S3z-Isq6-TwRLBdGpU8akn_1FvQb0';
const LOGO_LIGHT = 'img/logo-light.png';
const LOGO_DARK  = 'img/logo-dark.png';
const BACKEND = 'https://web-production-662dc1.up.railway.app';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null, allArticles = [], selectedPhotoFile = null, deleteTargetId = null;
let currentFilter = { stock: 'Tous', vendus: 'Tous', preparation: 'all' };

const PREP_STEPS = [
  { key: 'laver',      label: '🧺 À laver',       color: '#60a5fa' },
  { key: 'photo',      label: '📸 À photographier', color: '#a78bfa' },
  { key: 'publier',    label: '✍️ À publier',       color: '#f59e0b' },
  { key: 'stock',      label: '📦 En stock',        color: '#00e5a0' },
  { key: 'expedition', label: '🚚 À expédier',      color: '#fb923c' },
  { key: 'vendu',      label: '💰 Vendu',           color: '#34d399' },
];

const PAGE_TITLES = { dashboard:'Tableau de bord', preparation:'Mode préparation', stock:'Stock', expedition:'À expédier', vendus:'Vendus', messages:'Messages Vinted', analytics:'Statistiques', objectif:'Objectifs', replay:'Resell Replay', settings:'Paramètres' };

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
function initTheme() { setTheme(localStorage.getItem('theme') || 'light'); }

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

  const payload={name,buy_price:buy,sell_price:sell,platform,status,buy_date,sell_date,photo_url:photoUrl,location,source};

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
function calcProfit(a){return(parseFloat(a.sell_price)||0)-(parseFloat(a.buy_price)||0);}
function fmtPrice(v){return parseFloat(v||0).toFixed(2).replace('.',',')+' €';}
function platformBadgeClass(p){return{Vinted:'badge-vinted',eBay:'badge-ebay',Leboncoin:'badge-leboncoin'}[p]||'badge-autre';}

function stepBadge(s){
  const step=PREP_STEPS.find(p=>p.key===s);
  if(!step) return '';
  return `<span class="badge" style="background:${step.color}22;color:${step.color}">${step.label}</span>`;
}

function heatBadge(a){
  const h=heatmapColor(a);
  return h?`<span class="badge" style="background:${h.color}22;color:${h.color};font-size:10px;">${h.label}</span>`:'';
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
  const scoreBadge=scoreVal!==null?`<span class="badge" style="background:${scoreVal>=70?'#00e5a022':'#f59e0b22'};color:${scoreVal>=70?'#00e5a0':'#f59e0b'}">⭐ ${scoreVal}/100</span>`:'';
  const vintedStatsBadge=a.vinted_item_id&&a.status==='stock'
    ?`<span class="badge badge-vinted">👁️ ${a.vinted_vues||0} · ❤️ ${a.vinted_favoris||0}</span>`:'';
  const nextStep=PREP_STEPS[PREP_STEPS.findIndex(p=>p.key===a.status)+1];
  const moveBtn=opts.showMove&&nextStep?`<button class="btn-edit" style="font-size:10px;" onclick="moveToStep('${a.id}','${nextStep.key}')">→ ${nextStep.label}</button>`:'';
  return `<div class="article-card" style="${heatmapColor(a)?'border-left:3px solid '+heatmapColor(a).color:''}">
    ${photoEl(a)}
    <div class="article-info">
      <div class="article-name">${a.name}</div>
      <div class="article-meta">Achat ${fmtPrice(a.buy_price)} · Vente ${fmtPrice(a.sell_price)}</div>
      ${sellTime?`<div class="sell-time">${sellTime}</div>`:''}
      <div class="article-badges">
        <span class="badge ${platformBadgeClass(a.platform)}">${a.platform}</span>
        ${stepBadge(a.status)}
        ${heat}${locBadge}${scoreBadge}${vintedStatsBadge}
      </div>
    </div>
    <div class="article-right">
      <div class="article-profit ${profit>=0?'profit-pos':'profit-neg'}">${profit>=0?'+':''}${fmtPrice(profit)}</div>
      <div class="article-actions">
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
  }).reduce((s,p)=>s+(parseFloat(p.price)||0),0);

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
}

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
  container.innerHTML=`<div class="article-list">${arts.map(a=>articleHTML(a,{showMove:true})).join('')}</div>`;
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
    ?`<div class="article-list">${arts.map(a=>articleHTML(a)).join('')}</div>`
    :emptyState('Aucun article en stock.');
}

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
    const steps=[
      {label:'Acheté',date:a.buy_date,val:fmtPrice(a.buy_price),done:true},
      {label:'En préparation',date:'',val:'',done:true},
      {label:'Publié',date:'',val:'',done:true},
      {label:'Vendu',date:a.sell_date,val:fmtPrice(a.sell_price),done:true},
      {label:'Expédié',date:a.sell_date,val:'',done:true},
    ];
    const profit=calcProfit(a);
    const days=daysBetween(a.buy_date,a.sell_date);
    const score=calcScore(a);
    return `<div class="replay-card">
      <div class="replay-header">
        ${a.photo_url?`<img src="${a.photo_url}" class="replay-photo" />`:'<div class="replay-photo">📦</div>'}
        <div>
          <div class="replay-name">${a.name}</div>
          <div class="replay-meta">${a.platform} · ${days!==null?'Vendu en '+days+'j':''}  · Score ${score}/100</div>
          <div class="replay-profit ${profit>=0?'profit-pos':'profit-neg'}">${profit>=0?'+':''}${fmtPrice(profit)}</div>
        </div>
      </div>
      <div class="replay-timeline">
        ${steps.map((s,i)=>`
          <div class="replay-step">
            <div class="replay-dot ${s.done?'done':''}"></div>
            ${i<steps.length-1?'<div class="replay-line"></div>':''}
            <div class="replay-step-info">
              <div class="replay-step-label">${s.label}</div>
              ${s.date?`<div class="replay-step-date">${s.date}</div>`:''}
              ${s.val?`<div class="replay-step-val">${s.val}</div>`:''}
            </div>
          </div>`).join('')}
      </div>
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
  const msg = document.getElementById('favMessage').value;
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
      <button class="fav-copy-btn" onclick="copyFavMessage(this)">📋 Copier le message</button>
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
    <div class="msg-card ${m.non_lu?'unread':''}">
      <div class="msg-avatar">${(m.interlocuteur||'?').charAt(0).toUpperCase()}</div>
      <div class="msg-info">
        <div class="msg-name">${m.interlocuteur||'Utilisateur'} ${m.non_lu?'<span class="msg-dot"></span>':''}</div>
        <div class="msg-preview">${m.dernier_message||''}</div>
      </div>
      <div class="msg-time">${timeAgo(m.updated_at)}</div>
    </div>`).join('');
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

// ── CONNEXION VINTED ──

window.saveVintedCookie = async () => {
  const cookie = document.getElementById('vintedCookieInput').value.trim();
  const msgEl = document.getElementById('cookieMsg');
  if (!cookie || cookie.length < 50) {
    msgEl.style.color = '#ef4444';
    msgEl.textContent = '⚠️ Cookie invalide ou trop court.';
    return;
  }
  msgEl.style.color = 'var(--muted)';
  msgEl.textContent = '⏳ Connexion à Vinted en cours...';

  try {
    const token = (await sb.auth.getSession()).data.session?.access_token;
    const r = await fetch(`${BACKEND}/api/vinted/sync-cookie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ cookie }),
    });
    const data = await r.json();
    if (r.ok && data.ok) {
      msgEl.style.color = '#00e5a0';
      msgEl.textContent = `✓ ${data.message}`;
      document.getElementById('vintedCookieInput').value = '';
      await loadArticles();
      renderVintedConnectionStatus();
    } else {
      msgEl.style.color = '#ef4444';
      msgEl.textContent = `✗ ${data.detail || 'Erreur — vérifiez votre cookie.'}`;
    }
  } catch(e) {
    msgEl.style.color = '#ef4444';
    msgEl.textContent = '✗ Erreur de connexion au serveur.';
  }
};

async function renderVintedConnectionStatus() {
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
    } else {
      statusEl.textContent = 'Compte enregistré mais extension inactive';
      badgeEl.innerHTML = '<span style="color:#f59e0b;">● Inactif</span>';
    }
  } catch(e) {
    if (statusEl) statusEl.textContent = 'Erreur de chargement';
  }
}

// ── INIT ──
initTheme();
document.getElementById('landingLogo').src = LOGO_LIGHT;
sb.auth.onAuthStateChange((event,session)=>{if(session?.user)loginAs(session.user);});
