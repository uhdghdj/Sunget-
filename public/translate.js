  const LANGS =[
    { code: 'ar', name: 'العربية',    flag: '🇸🇦', rtl: true  },
    { code: 'en', name: 'English',    flag: '🇬🇧', rtl: false },
    { code: 'fr', name: 'Français',   flag: '🇫🇷', rtl: false },
    { code: 'de', name: 'Deutsch',    flag: '🇩🇪', rtl: false },
    { code: 'es', name: 'Español',    flag: '🇪🇸', rtl: false },
    { code: 'it', name: 'Italiano',   flag: '🇮🇹', rtl: false },
    { code: 'pt', name: 'Português',  flag: '🇵🇹', rtl: false },
    { code: 'ru', name: 'Русский',    flag: '🇷🇺', rtl: false },
    { code: 'tr', name: 'Türkçe',     flag: '🇹🇷', rtl: false },
    { code: 'zh-CN', name: '中文',     flag: '🇨🇳', rtl: false },
    { code: 'ja', name: '日本語',      flag: '🇯🇵', rtl: false },
    { code: 'ko', name: '한국어',      flag: '🇰🇷', rtl: false },
    { code: 'hi', name: 'हिन्दी',     flag: '🇮🇳', rtl: false },
    { code: 'ur', name: 'اردو',       flag: '🇵🇰', rtl: true  },
    { code: 'fa', name: 'فارسی',      flag: '🇮🇷', rtl: true  },
  ];


function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'ar',
    includedLanguages: LANGS.map(l => l.code).join(','),
    autoDisplay: false,
  }, 'google_translate_element');
}

// حفظ اللغة
function setLang(code) {
  localStorage.setItem('lang', code);
  document.cookie = `googtrans=/ar/${code};path=/`;
  location.reload();
}

// تطبيق اللغة عند التحميل
(function () {
  const current = localStorage.getItem('lang') || 'ar';
  const lang = LANGS.find(l => l.code === current) || LANGS[0];

  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.rtl ? 'rtl' : 'ltr';

  document.cookie = `googtrans=/ar/${lang.code};path=/`;
})();
