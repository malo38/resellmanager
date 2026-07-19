/**
 * Système de traduction FR/EN — phase 1 : page vitrine, connexion, menu
 * latéral, tableau de bord. Le reste de l'app reste en français pour
 * l'instant (voir data-i18n non couvert = texte affiché tel quel).
 *
 * Usage : data-i18n="cle" sur un élément remplace son textContent ;
 * data-i18n-placeholder="cle" remplace l'attribut placeholder d'un input.
 * t('cle') est utilisable directement dans le JS pour du texte généré.
 */
const TRANSLATIONS = {
  fr: {
    'landing.login': 'Se connecter',
    'landing.signup': 'Commencer gratuitement',
    'landing.hero.title1': 'Ton business',
    'landing.hero.titleAccent': 'automatisé.',
    'landing.hero.sub': "Ventes, stock, messages : tout se synchronise automatiquement.<br />Concentre-toi sur tes ventes, VintControl s'occupe du reste.",
    'landing.hero.card1.title': 'Messages à vos favoris',
    'landing.hero.card1.desc': 'Relance automatique des personnes qui ont mis vos articles en favoris.',
    'landing.hero.card2.title': 'Republication automatique',
    'landing.hero.card2.desc': 'Vos annonces remontent toutes seules, sans y penser.',
    'landing.hero.card3.title': 'Gestion de stock',
    'landing.hero.card3.desc': 'Achat, préparation, expédition — chaque article suivi de bout en bout.',
    'landing.hero.card4.title': 'Synchronisation auto',
    'landing.hero.card4.desc': 'Ventes, stock et messages à jour tout seuls.',
    'landing.hero.cta': 'Commencer gratuitement',
    'landing.hero.ctaGhost': "J'ai déjà un compte",
    'landing.compare.before': 'Avant',
    'landing.compare.beforeItem1': 'Ressaisir chaque vente à la main',
    'landing.compare.beforeItem2': 'Chercher où est rangé un article',
    'landing.compare.beforeItem3': 'Oublier de republier ses annonces',
    'landing.compare.after': 'Avec VintControl',
    'landing.compare.afterItem1': 'Ventes, stock et messages synchronisés tout seuls',
    'landing.compare.afterItem2': 'Chaque article retrouvé en un clic',
    'landing.compare.afterItem3': 'Rappels automatiques pour republier, laver, expédier',
    'landing.features.f1.title': 'Synchronisation automatique',
    'landing.features.f1.desc': "Vos ventes, annonces, photos, vues et favoris se mettent à jour tout seuls grâce à l'extension Chrome — plus de ressaisie manuelle.",
    'landing.features.f2.title': 'Stock & préparation',
    'landing.features.f2.desc': "Suivez chaque article de l'achat à l'expédition, avec des relances automatiques pour laver, photographier, publier.",
    'landing.features.f3.title': 'Messages à vos favoris',
    'landing.features.f3.desc': 'VintControl relance automatiquement les personnes qui ont mis vos articles en favoris, pour déclencher plus de ventes sans y penser.',
    'landing.features.f4.title': 'Republication automatique',
    'landing.features.f4.desc': 'Vos annonces remontent régulièrement en tête des résultats Vinted, sans que vous ayez à y penser.',
    'landing.features.f5.title': 'Statistiques & objectifs',
    'landing.features.f5.desc': 'Profit réel, ROI, temps de vente moyen, capital immobilisé — pilotez votre activité comme un vrai business.',
    'landing.features.f6.title': 'Resell Replay',
    'landing.features.f6.desc': "Revivez le parcours complet de chaque article vendu, de l'achat jusqu'au profit final.",
    'landing.calc.title': 'Testez tout de suite, sans compte',
    'landing.calc.sub': "Calculez la marge et le ROI d'un article avant même de vous inscrire.",
    'landing.calc.buy': "Prix d'achat",
    'landing.calc.sell': 'Prix de vente',
    'landing.faq.title': 'Questions fréquentes',
    'landing.faq.q1': "C'est gratuit ?",
    'landing.faq.a1': 'Oui, la création de compte et la synchronisation de base sont gratuites. Vous pouvez commencer à utiliser VintControl sans rien payer.',
    'landing.faq.q2': 'Est-ce que c\'est autorisé par Vinted ?',
    'landing.faq.a2': "L'extension utilise votre propre session Vinted, exactement comme si vous naviguiez normalement sur le site — elle ne fait rien que vous ne pourriez faire vous-même. Les automatisations (messages, republication) respectent un rythme volontairement lent pour rester discrètes.",
    'landing.faq.q3': 'Mes données sont-elles en sécurité ?',
    'landing.faq.a3': 'Vos données sont stockées de façon sécurisée et ne sont jamais partagées. VintControl ne demande jamais votre mot de passe Vinted — la connexion se fait via votre navigateur, comme d\'habitude.',
    'landing.faq.q4': 'Il faut installer quoi exactement ?',
    'landing.faq.a4': "Juste une extension Chrome gratuite. Une fois installée et connectée à votre compte Vinted, elle synchronise vos données automatiquement toutes les 5 minutes, tant qu'un onglet vinted.fr est ouvert.",
    'landing.faq.q5': 'Ça marche avec plusieurs comptes Vinted ?',
    'landing.faq.a5': 'Oui, vous pouvez connecter plusieurs comptes Vinted à un seul compte VintControl et basculer entre eux depuis la barre latérale.',
    'landing.steps.title': 'Comment ça marche',
    'landing.steps.s1.title': 'Créez votre compte',
    'landing.steps.s1.desc': "Gratuit, en moins d'une minute.",
    'landing.steps.s2.title': "Installez l'extension Chrome",
    'landing.steps.s2.desc': 'Connectez votre compte Vinted en un clic.',
    'landing.steps.s3.title': 'Laissez faire',
    'landing.steps.s3.desc': 'Tout se synchronise automatiquement, en continu.',
    'landing.footer.privacy': 'Politique de confidentialité',

    'auth.side.title': 'Tout votre business Vinted, au même endroit.',
    'auth.side.sub': "Ventes, stock, messages et statistiques synchronisés automatiquement — vous n'avez plus qu'à vendre.",
    'auth.side.item1': 'Synchro automatique toutes les 5 minutes',
    'auth.side.item2': 'Stock et préparation sans oubli',
    'auth.side.item3': 'Profit, ROI et capital immobilisé en direct',
    'auth.side.item4': 'Messagerie centralisée, réponses automatiques',
    'auth.back': "← Retour à l'accueil",
    'auth.brandSub': 'Gérez votre business de resell',
    'auth.tabLogin': 'Connexion',
    'auth.tabRegister': 'Créer un compte',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.loginBtn': 'Se connecter',
    'auth.forgot': 'Mot de passe oublié ?',
    'auth.firstName': 'Prénom',
    'auth.registerBtn': 'Créer mon compte',
    'auth.forgotIntro': 'Entrez votre email pour recevoir un lien de réinitialisation.',
    'auth.sendLink': 'Envoyer le lien',
    'auth.back2': '← Retour',

    'nav.dashboard': 'Tableau de bord',
    'nav.groupActivite': 'ACTIVITÉ',
    'nav.calendrier': 'Calendrier',
    'nav.achats': 'Achats',
    'nav.boost': 'Boost',
    'nav.stock': 'Stock',
    'nav.ventes': 'Ventes',
    'nav.messages': 'Messages Vinted',
    'nav.favoris': 'Messages favoris',
    'nav.republier': 'Republication',
    'nav.groupFinance': 'FINANCE & ANALYSE',
    'nav.analytics': 'Statistiques',
    'nav.comptabilite': 'Comptabilité',
    'nav.objectif': 'Objectifs',
    'nav.depenses': 'Dépenses',
    'nav.groupOutils': 'OUTILS & SUPPORT',
    'nav.delegation': 'Délégation',
    'nav.settings': 'Paramètres',
    'nav.aide': 'Aide & Support',

    'dashboard.editBtn': '✎ Modifier le tableau de bord',
    'dashboard.kpi.profitTotal': 'Profit total',
    'dashboard.kpi.profitMois': 'Profit ce mois',
    'dashboard.kpi.profitNet': 'Profit net (après dépenses)',
    'dashboard.kpi.stock': 'En stock',
    'dashboard.kpi.expedition': 'À expédier',
    'dashboard.kpi.vendus': 'Vendus',
    'dashboard.kpi.capital': 'Capital bloqué +30j',
    'dashboard.kpi.achats': '🛍️ Achats Vinted ce mois',
    'dashboard.kpi.ca': "Chiffre d'affaires",
    'dashboard.kpi.roi': 'ROI global',
    'dashboard.kpi.wallet': '💰 Solde Vinted',
    'dashboard.accountsTitle': 'Vos comptes',
    'dashboard.automatic': 'Automatique',
  },
  en: {
    'landing.login': 'Log in',
    'landing.signup': 'Start for free',
    'landing.hero.title1': 'Your business,',
    'landing.hero.titleAccent': 'automated.',
    'landing.hero.sub': "Sales, stock, messages: everything syncs automatically.<br />Focus on selling, VintControl handles the rest.",
    'landing.hero.card1.title': 'Messages to your likes',
    'landing.hero.card1.desc': 'Automatically follow up with people who liked your items.',
    'landing.hero.card2.title': 'Automatic relisting',
    'landing.hero.card2.desc': 'Your listings bump themselves back up, no effort needed.',
    'landing.hero.card3.title': 'Stock management',
    'landing.hero.card3.desc': 'Purchase, prep, shipping — every item tracked end to end.',
    'landing.hero.card4.title': 'Auto sync',
    'landing.hero.card4.desc': 'Sales, stock and messages always up to date.',
    'landing.hero.cta': 'Start for free',
    'landing.hero.ctaGhost': 'I already have an account',
    'landing.compare.before': 'Before',
    'landing.compare.beforeItem1': 'Re-typing every sale by hand',
    'landing.compare.beforeItem2': 'Searching where an item is stored',
    'landing.compare.beforeItem3': 'Forgetting to relist your items',
    'landing.compare.after': 'With VintControl',
    'landing.compare.afterItem1': 'Sales, stock and messages sync themselves',
    'landing.compare.afterItem2': 'Every item found in one click',
    'landing.compare.afterItem3': 'Automatic reminders to relist, wash, ship',
    'landing.features.f1.title': 'Automatic synchronization',
    'landing.features.f1.desc': 'Your sales, listings, photos, views and likes update on their own via the Chrome extension — no more manual entry.',
    'landing.features.f2.title': 'Stock & prep',
    'landing.features.f2.desc': 'Track every item from purchase to shipping, with automatic reminders to wash, photograph, and publish.',
    'landing.features.f3.title': 'Messages to your likes',
    'landing.features.f3.desc': 'VintControl automatically follows up with people who liked your items, driving more sales without you lifting a finger.',
    'landing.features.f4.title': 'Automatic relisting',
    'landing.features.f4.desc': 'Your listings regularly resurface at the top of Vinted search results, without you thinking about it.',
    'landing.features.f5.title': 'Stats & goals',
    'landing.features.f5.desc': 'Real profit, ROI, average time to sell, tied-up capital — run your business like a real one.',
    'landing.features.f6.title': 'Resell Replay',
    'landing.features.f6.desc': 'Relive the full journey of every item sold, from purchase to final profit.',
    'landing.calc.title': 'Try it now, no account needed',
    'landing.calc.sub': 'Calculate the margin and ROI of an item before you even sign up.',
    'landing.calc.buy': 'Buy price',
    'landing.calc.sell': 'Sell price',
    'landing.faq.title': 'Frequently asked questions',
    'landing.faq.q1': 'Is it free?',
    'landing.faq.a1': 'Yes, creating an account and basic sync are free. You can start using VintControl without paying anything.',
    'landing.faq.q2': 'Is this allowed by Vinted?',
    'landing.faq.a2': "The extension uses your own Vinted session, exactly as if you were browsing the site normally — it never does anything you couldn't do yourself. Automations (messages, relisting) run at a deliberately slow pace to stay discreet.",
    'landing.faq.q3': 'Is my data safe?',
    'landing.faq.a3': 'Your data is stored securely and never shared. VintControl never asks for your Vinted password — login happens through your own browser, as usual.',
    'landing.faq.q4': 'What exactly do I need to install?',
    'landing.faq.a4': 'Just a free Chrome extension. Once installed and connected to your Vinted account, it syncs your data automatically every 5 minutes, as long as a vinted.fr tab is open.',
    'landing.faq.q5': 'Does it work with multiple Vinted accounts?',
    'landing.faq.a5': 'Yes, you can connect several Vinted accounts to a single VintControl account and switch between them from the sidebar.',
    'landing.steps.title': 'How it works',
    'landing.steps.s1.title': 'Create your account',
    'landing.steps.s1.desc': 'Free, in under a minute.',
    'landing.steps.s2.title': 'Install the Chrome extension',
    'landing.steps.s2.desc': 'Connect your Vinted account in one click.',
    'landing.steps.s3.title': 'Let it run',
    'landing.steps.s3.desc': 'Everything syncs automatically, continuously.',
    'landing.footer.privacy': 'Privacy policy',

    'auth.side.title': 'Your whole Vinted business, in one place.',
    'auth.side.sub': 'Sales, stock, messages and stats synced automatically — all you have to do is sell.',
    'auth.side.item1': 'Auto sync every 5 minutes',
    'auth.side.item2': 'Stock and prep, nothing forgotten',
    'auth.side.item3': 'Profit, ROI and tied-up capital, live',
    'auth.side.item4': 'Centralized inbox, automatic replies',
    'auth.back': '← Back to home',
    'auth.brandSub': 'Manage your resell business',
    'auth.tabLogin': 'Log in',
    'auth.tabRegister': 'Create account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.loginBtn': 'Log in',
    'auth.forgot': 'Forgot password?',
    'auth.firstName': 'First name',
    'auth.registerBtn': 'Create my account',
    'auth.forgotIntro': 'Enter your email to receive a reset link.',
    'auth.sendLink': 'Send link',
    'auth.back2': '← Back',

    'nav.dashboard': 'Dashboard',
    'nav.groupActivite': 'ACTIVITY',
    'nav.calendrier': 'Calendar',
    'nav.achats': 'Purchases',
    'nav.boost': 'Boost',
    'nav.stock': 'Stock',
    'nav.ventes': 'Sales',
    'nav.messages': 'Vinted messages',
    'nav.favoris': 'Favorite messages',
    'nav.republier': 'Relisting',
    'nav.groupFinance': 'FINANCE & ANALYTICS',
    'nav.analytics': 'Statistics',
    'nav.comptabilite': 'Accounting',
    'nav.objectif': 'Goals',
    'nav.depenses': 'Expenses',
    'nav.groupOutils': 'TOOLS & SUPPORT',
    'nav.delegation': 'Delegation',
    'nav.settings': 'Settings',
    'nav.aide': 'Help & Support',

    'dashboard.editBtn': '✎ Edit dashboard',
    'dashboard.kpi.profitTotal': 'Total profit',
    'dashboard.kpi.profitMois': 'Profit this month',
    'dashboard.kpi.profitNet': 'Net profit (after expenses)',
    'dashboard.kpi.stock': 'In stock',
    'dashboard.kpi.expedition': 'To ship',
    'dashboard.kpi.vendus': 'Sold',
    'dashboard.kpi.capital': 'Tied-up capital +30d',
    'dashboard.kpi.achats': '🛍️ Vinted purchases this month',
    'dashboard.kpi.ca': 'Revenue',
    'dashboard.kpi.roi': 'Overall ROI',
    'dashboard.kpi.wallet': '💰 Vinted balance',
    'dashboard.accountsTitle': 'Your accounts',
    'dashboard.automatic': 'Automatic',
  },
};

function getLang() {
  return localStorage.getItem('lang') || 'fr';
}
window.getLang = getLang;

function t(key) {
  const lang = getLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.fr[key] || key;
}
window.t = t;

function applyTranslations() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerHTML = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
}
window.applyTranslations = applyTranslations;

window.setLang = (lang) => {
  localStorage.setItem('lang', lang);
  applyTranslations();
  if (typeof renderDashboard === 'function' && document.getElementById('mainApp')?.style.display !== 'none') {
    renderDashboard();
  }
};

document.addEventListener('DOMContentLoaded', applyTranslations);
