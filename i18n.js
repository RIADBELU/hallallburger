(function () {
  'use strict';

  const SUPPORTED = ['sq', 'en', 'sr'];
  const cache = {};
  let currentLang = 'sq';
  let fallbackStrings = null;

  function resolveLang() {
    const param = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED.includes(param)) return param;
    const stored = localStorage.getItem('lang');
    if (SUPPORTED.includes(stored)) return stored;
    const browser = (navigator.language || 'sq').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(browser)) return browser;
    return 'sq';
  }

  function getNested(obj, key) {
    return key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
  }

  function t(key, lang) {
    const locale = lang || currentLang;
    const val = getNested(cache[locale], key);
    if (val != null) return val;
    if (locale !== 'sq' && fallbackStrings) {
      const fb = getNested(fallbackStrings, key);
      if (fb != null) {
        console.warn('[i18n] Missing key "' + key + '" in ' + locale + ', using Albanian fallback');
        return fb;
      }
    }
    console.warn('[i18n] Missing key: ' + key);
    return key;
  }

  async function loadLocale(lang) {
    if (cache[lang]) return cache[lang];
    const res = await fetch('locales/' + lang + '.json');
    if (!res.ok) throw new Error('Failed to load locale: ' + lang);
    const data = await res.json();
    cache[lang] = data;
    if (lang === 'sq') fallbackStrings = data;
    return data;
  }

  function applyToDOM() {
    document.documentElement.lang = currentLang;

    const title = t('meta.title');
    if (title && title !== 'meta.title') document.title = title;

    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        const parts = pair.trim().split(':');
        if (parts.length === 2) el.setAttribute(parts[0].trim(), t(parts[1].trim()));
      });
    });

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      const active = btn.dataset.lang === currentLang;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('active', active);
    });

    document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: currentLang } }));
  }

  function updateURL(lang) {
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  async function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) return;
    await loadLocale('sq');
    if (lang !== 'sq') await loadLocale(lang);
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateURL(lang);
    applyToDOM();
  }

  async function initI18n() {
    await loadLocale('sq');
    const lang = resolveLang();
    if (lang !== 'sq') await loadLocale(lang);
    currentLang = lang;
    localStorage.setItem('lang', lang);
    if (!new URLSearchParams(location.search).get('lang')) updateURL(lang);
    applyToDOM();

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLanguage(btn.dataset.lang);
      });
    });
  }

  window.i18n = { initI18n: initI18n, setLanguage: setLanguage, t: t, getLang: function () { return currentLang; } };
})();
