/**
 * Sistema de internacionalización (i18n)
 * Maneja cambio de idioma y actualización de la UI
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'nisidocss_lang';
  const DEFAULT_LANG = 'en'; // Inglés por defecto para monetización US/Canada

  // Detectar idioma inicial
  function getInitialLanguage() {
    // 1. Verificar localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'es')) {
      return saved;
    }
    
    // 2. Usar idioma por defecto (inglés)
    return DEFAULT_LANG;
  }

  // Guardar idioma seleccionado
  function saveLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    window.__CURRENT_LANG__ = lang;
  }

  // Obtener idioma actual
  function getCurrentLanguage() {
    return window.__CURRENT_LANG__ || getInitialLanguage();
  }

  // Obtener código de idioma para Tesseract (eng o spa)
  function getTesseractLanguage() {
    const lang = getCurrentLanguage();
    return lang === 'es' ? 'spa' : 'eng';
  }

  // Actualizar el atributo lang del HTML
  function updateHtmlLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    // También actualizar el atributo data-lang para CSS
    document.documentElement.setAttribute('data-lang', lang);
  }
  
  // Ocultar/mostrar secciones específicas de idioma
  function updateLangSpecificSections(lang) {
    // Ocultar secciones que solo deben mostrarse en español
    const esOnlySections = document.querySelectorAll('[data-lang-only="es"]');
    esOnlySections.forEach(function(section) {
      if (lang === 'es') {
        section.style.display = '';
      } else {
        section.style.display = 'none';
      }
    });
    
    // Ocultar secciones que solo deben mostrarse en inglés
    const enOnlySections = document.querySelectorAll('[data-lang-only="en"]');
    enOnlySections.forEach(function(section) {
      if (lang === 'en') {
        section.style.display = '';
      } else {
        section.style.display = 'none';
      }
    });
  }

  // Actualizar título y meta description
  function updateMetaTags(lang) {
    const title = t('title');
    const description = t('description');
    
    document.title = title;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }
  }

  // Actualizar todos los textos de la UI
  function updateUITexts() {
    console.log('[i18n] Actualizando textos de UI al idioma:', getCurrentLanguage());
    
    let updatedCount = 0;
    
    // Navegación
    updatedCount += updateTextContent('[data-i18n="nav_how"]', 'nav_how');
    updatedCount += updateTextContent('[data-i18n="nav_why"]', 'nav_why');
    updatedCount += updateTextContent('[data-i18n="nav_faq"]', 'nav_faq');

    // Hero
    updatedCount += updateTextContent('[data-i18n="hero_eyebrow"]', 'hero_eyebrow');
    updatedCount += updateTextContent('[data-i18n="hero_title"]', 'hero_title');
    updatedCount += updateTextContent('[data-i18n="hero_title_accent"]', 'hero_title_accent');
    updatedCount += updateTextContent('[data-i18n="hero_subtitle"]', 'hero_subtitle');

    // Dropzone
    updatedCount += updateHTML('[data-i18n="dropzone_text"]', 'dropzone_text');
    updatedCount += updateTextContent('[data-i18n="dropzone_hint"]', 'dropzone_hint');
    updatedCount += updateTextContent('[data-i18n="btn_camera"]', 'btn_camera');

    // Status
    updatedCount += updateTextContent('[data-i18n="status_engine"]', 'status_engine');
    updatedCount += updateTextContent('[data-i18n="status_engine_hint"]', 'status_engine_hint');
    updatedCount += updateTextContent('[data-i18n="status_work"]', 'status_work');

    // Results
    updatedCount += updateTextContent('[data-i18n="preview_original"]', 'preview_original');
    updatedCount += updateTextContent('[data-i18n="preview_editor"]', 'preview_editor');
    updatedCount += updateTextContent('[data-i18n="preview_editor_hint"]', 'preview_editor_hint');
    updatedCount += updateTextContent('[data-i18n="btn_copy"]', 'btn_copy');
    updatedCount += updateTextContent('[data-i18n="btn_download_word"]', 'btn_download_word');
    updatedCount += updateTextContent('[data-i18n="btn_download_pdf"]', 'btn_download_pdf');
    updatedCount += updateTextContent('[data-i18n="btn_download_txt"]', 'btn_download_txt');
    updatedCount += updateTextContent('[data-i18n="btn_reset"]', 'btn_reset');
    updatedCount += updateTextContent('[data-i18n="btn_retry"]', 'btn_retry');

    // Privacy
    updatedCount += updateTextContent('[data-i18n="privacy_title"]', 'privacy_title');
    updatedCount += updateTextContent('[data-i18n="privacy_text"]', 'privacy_text');

    // How it works
    updatedCount += updateTextContent('[data-i18n="how_title"]', 'how_title');
    updatedCount += updateTextContent('[data-i18n="step1_title"]', 'step1_title');
    updatedCount += updateTextContent('[data-i18n="step1_text"]', 'step1_text');
    updatedCount += updateTextContent('[data-i18n="step2_title"]', 'step2_title');
    updatedCount += updateTextContent('[data-i18n="step2_text"]', 'step2_text');
    updatedCount += updateTextContent('[data-i18n="step3_title"]', 'step3_title');
    updatedCount += updateTextContent('[data-i18n="step3_text"]', 'step3_text');

    // Why section
    updatedCount += updateTextContent('[data-i18n="why_title"]', 'why_title');
    updatedCount += updateTextContent('[data-i18n="why_bad_label"]', 'why_bad_label');
    updatedCount += updateTextContent('[data-i18n="why_good_label"]', 'why_good_label');
    updatedCount += updateTextContent('[data-i18n="why_bad_note"]', 'why_bad_note');
    updatedCount += updateTextContent('[data-i18n="why_good_note"]', 'why_good_note');

    // Features
    updatedCount += updateTextContent('[data-i18n="feature1_title"]', 'feature1_title');
    updatedCount += updateTextContent('[data-i18n="feature1_text"]', 'feature1_text');
    updatedCount += updateTextContent('[data-i18n="feature2_title"]', 'feature2_title');
    updatedCount += updateTextContent('[data-i18n="feature2_text"]', 'feature2_text');
    updatedCount += updateTextContent('[data-i18n="feature3_title"]', 'feature3_title');
    updatedCount += updateTextContent('[data-i18n="feature3_text"]', 'feature3_text');
    updatedCount += updateTextContent('[data-i18n="feature4_title"]', 'feature4_title');
    updatedCount += updateTextContent('[data-i18n="feature4_text"]', 'feature4_text');

    // FAQ
    updatedCount += updateTextContent('[data-i18n="faq_title"]', 'faq_title');
    for (let i = 1; i <= 11; i++) {
      updatedCount += updateTextContent(`[data-i18n="faq${i}_q"]`, `faq${i}_q`);
      updatedCount += updateTextContent(`[data-i18n="faq${i}_a"]`, `faq${i}_a`);
    }

    // Footer
    updatedCount += updateTextContent('[data-i18n="footer_legal"]', 'footer_legal');
    updatedCount += updateTextContent('[data-i18n="footer_privacy"]', 'footer_privacy');
    updatedCount += updateTextContent('[data-i18n="footer_cookies"]', 'footer_cookies');
    updatedCount += updateTextContent('[data-i18n="footer_contact"]', 'footer_contact');
    updatedCount += updateTextContent('[data-i18n="footer_text"]', 'footer_text');
    
    // Disclaimer note
    updatedCount += updateHTML('[data-i18n-html="disclaimer_note"]', 'disclaimer_note');
    
    // SEO sections
    updatedCount += updateTextContent('[data-i18n="seo_section_title"]', 'seo_section_title');
    updatedCount += updateHTML('[data-i18n="seo_section_p1"]', 'seo_section_p1');
    updatedCount += updateTextContent('[data-i18n="seo_section_p2"]', 'seo_section_p2');
    updatedCount += updateTextContent('[data-i18n="seo_section_p3"]', 'seo_section_p3');
    updatedCount += updateHTML('[data-i18n="seo_section_p4"]', 'seo_section_p4');
    updatedCount += updateTextContent('[data-i18n="seo_section_p5"]', 'seo_section_p5');
    
    updatedCount += updateTextContent('[data-i18n="seo_why_title"]', 'seo_why_title');
    updatedCount += updateTextContent('[data-i18n="seo_why_feature1_title"]', 'seo_why_feature1_title');
    updatedCount += updateTextContent('[data-i18n="seo_why_feature1_text"]', 'seo_why_feature1_text');
    updatedCount += updateTextContent('[data-i18n="seo_why_feature2_title"]', 'seo_why_feature2_title');
    updatedCount += updateTextContent('[data-i18n="seo_why_feature2_text"]', 'seo_why_feature2_text');
    updatedCount += updateTextContent('[data-i18n="seo_why_feature3_title"]', 'seo_why_feature3_title');
    updatedCount += updateTextContent('[data-i18n="seo_why_feature3_text"]', 'seo_why_feature3_text');
    updatedCount += updateTextContent('[data-i18n="seo_why_feature4_title"]', 'seo_why_feature4_title');
    updatedCount += updateTextContent('[data-i18n="seo_why_feature4_text"]', 'seo_why_feature4_text');
    
    updatedCount += updateTextContent('[data-i18n="seo_usecases_title"]', 'seo_usecases_title');
    updatedCount += updateTextContent('[data-i18n="seo_usecase1_title"]', 'seo_usecase1_title');
    updatedCount += updateTextContent('[data-i18n="seo_usecase1_text"]', 'seo_usecase1_text');
    updatedCount += updateTextContent('[data-i18n="seo_usecase2_title"]', 'seo_usecase2_title');
    updatedCount += updateTextContent('[data-i18n="seo_usecase2_text"]', 'seo_usecase2_text');
    updatedCount += updateTextContent('[data-i18n="seo_usecase3_title"]', 'seo_usecase3_title');
    updatedCount += updateTextContent('[data-i18n="seo_usecase3_text"]', 'seo_usecase3_text');
    updatedCount += updateTextContent('[data-i18n="seo_usecase4_title"]', 'seo_usecase4_title');
    updatedCount += updateTextContent('[data-i18n="seo_usecase4_text"]', 'seo_usecase4_text');
    
    console.log('[i18n] Total de elementos actualizados:', updatedCount);
  }

  // Helper para actualizar textContent
  function updateTextContent(selector, key) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.textContent = t(key);
    });
    return elements.length;
  }

  // Helper para actualizar innerHTML (para textos con HTML como <strong>)
  function updateHTML(selector, key) {
    const elements = document.querySelectorAll(selector);
    console.log('[i18n] updateHTML - selector:', selector, 'key:', key, 'found:', elements.length);
    elements.forEach(el => {
      const translatedHTML = t(key);
      console.log('[i18n] updateHTML - Inserting HTML for key:', key, 'length:', translatedHTML.length);
      el.innerHTML = translatedHTML;
      // Después de insertar HTML, actualizar elementos hijos con data-i18n
      const childElements = el.querySelectorAll('[data-i18n]');
      console.log('[i18n] updateHTML - Found child elements with data-i18n:', childElements.length);
      childElements.forEach(child => {
        const childKey = child.getAttribute('data-i18n');
        if (childKey && t(childKey)) {
          console.log('[i18n] updateHTML - Updating child:', childKey);
          child.textContent = t(childKey);
        }
      });
    });
    return elements.length;
  }

  // Cambiar idioma
  function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'es') {
      console.warn('Idioma no soportado:', lang);
      return;
    }

    console.log('[i18n] Cambiando idioma de', getCurrentLanguage(), 'a', lang);
    
    saveLanguage(lang);
    updateHtmlLang(lang);
    updateLangSpecificSections(lang);
    updateMetaTags(lang);
    updateUITexts();
    updateLanguageSwitcher(lang);

    // Disparar evento personalizado para que main.js sepa del cambio
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: lang } }));
    
    console.log('[i18n] Idioma cambiado exitosamente a:', lang);
    console.log('[i18n] Verificación - title actual:', document.title);
    console.log('[i18n] Verificación - hero_title:', t('hero_title'));
  }

  // Actualizar el selector de idioma
  function updateLanguageSwitcher(lang) {
    const buttons = document.querySelectorAll('[data-lang]');
    buttons.forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      if (btnLang === lang) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    });
  }

  // Inicializar sistema i18n
  function initI18n() {
    const initialLang = getInitialLanguage();
    window.__CURRENT_LANG__ = initialLang;
    
    updateHtmlLang(initialLang);
    updateLangSpecificSections(initialLang);
    updateMetaTags(initialLang);
    updateUITexts();
    updateLanguageSwitcher(initialLang);

    // Configurar event listeners para botones de idioma
    document.addEventListener('click', function(e) {
      const langBtn = e.target.closest('[data-lang]');
      if (langBtn) {
        e.preventDefault();
        const newLang = langBtn.getAttribute('data-lang');
        setLanguage(newLang);
      }
    });

    console.log('i18n inicializado. Idioma:', initialLang);
  }

  // Exportar funciones globales
  window.i18n = {
    init: initI18n,
    setLanguage: setLanguage,
    getCurrentLanguage: getCurrentLanguage,
    getTesseractLanguage: getTesseractLanguage
  };

  // Auto-inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();
