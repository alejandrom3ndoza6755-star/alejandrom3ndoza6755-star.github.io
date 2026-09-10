(function () {
  "use strict";

  const data = window.__BRAND__ || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const escHTML = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  const MAX_BYTES = 10 * 1024 * 1024;
  const MAX_EDGE = 2200;
  const JPEG_TYPE = "image/" + "jpeg";

  let currentImageURL = null;
  let tesseractWorker = null;
  let lastParagraphs = [];

  const card = $(".tool-card");
  const fileInput = $("#file-input");
  const cameraInput = $("#camera-input");
  const dropzone = $(".dropzone");
  const btnReset = $("#btn-reset");
  const btnRetry = $("#btn-retry");
  const btnCopy = $("#btn-copy");
  const btnDownloadWord = $("#btn-download-word");
  const btnDownloadTxt = $("#btn-download-txt");
  const previewOriginal = $("#preview-original");
  const previewEditor = $("#preview-editor");
  const statusEngine = $("#status-engine");
  const statusWork = $("#status-work");
  const progressFill = $("#progress-fill");
  const errorText = $("#error-text");

  function setState(state) {
    if (card) card.setAttribute("data-state", state);
  }

  function setProgress(percent) {
    if (progressFill) progressFill.style.width = Math.max(0, Math.min(100, percent)) + "%";
  }

  function setStatus(message) {
    if (statusWork) statusWork.textContent = message;
  }

  function setEngineStatus(message) {
    if (statusEngine) statusEngine.textContent = message;
  }

  function showError(message) {
    if (errorText) errorText.textContent = message;
    setState("error");
  }

  function canRunEngine() {
    return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
  }

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[data-lib="' + src + '"]');
      if (existing) {
        if (existing.getAttribute("data-ready") === "1") return resolve();
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", function () { reject(new Error("No se pudo cargar el motor")); });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.setAttribute("data-lib", src);
      script.onload = function () {
        script.setAttribute("data-ready", "1");
        resolve();
      };
      script.onerror = function () { reject(new Error("No se pudo cargar el motor")); };
      document.head.appendChild(script);
    });
  }

  function isHeicFile(file) {
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    return type.indexOf("heic") !== -1 || type.indexOf("heif") !== -1 || /\.(heic|heif)$/.test(name);
  }

  function isAllowedImage(file) {
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    if (type.indexOf("image/") === 0) return true;
    return /\.(jpe?g|png|heic|heif|webp)$/.test(name);
  }

  async function convertHeicIfNeeded(file) {
    if (!isHeicFile(file)) return file;
    setStatus("Convirtiendo foto de iPhone…");
    await loadScriptOnce("lib/vendor/heic-to.js");
    if (typeof HeicTo !== "function") {
      throw new Error("No se pudo preparar el lector de HEIC");
    }
    const blob = await HeicTo({ blob: file, type: JPEG_TYPE, quality: 0.86 });
    return blob;
  }

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("No se pudo leer la imagen")); };
      img.src = url;
    });
  }

  async function toOcrCanvas(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) throw new Error("Imagen vacía");
      const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function getOCRWorker() {
    if (tesseractWorker) return tesseractWorker;

    setEngineStatus("Descargando el motor de lectura…");
    setState("loading-engine");
    await loadScriptOnce("lib/vendor/tesseract/tesseract.min.js");
    if (!window.Tesseract) throw new Error("El motor de lectura no está disponible");

    setEngineStatus("Preparando idiomas (español e inglés)… solo la primera vez");

    tesseractWorker = await Tesseract.createWorker("spa+eng", 1, {
      workerPath: "lib/vendor/tesseract/worker.min.js",
      logger: function (m) {
        if (!m) return;
        if (m.status === "loading language traineddata") {
          setEngineStatus("Descargando idiomas… " + Math.round((m.progress || 0) * 100) + " %");
        } else if (m.status === "initializing tesseract") {
          setEngineStatus("Inicializando el motor…");
        } else if (m.status === "recognizing text") {
          const pct = Math.round((m.progress || 0) * 100);
          setProgress(pct);
          setStatus("Leyendo el documento… " + pct + " %");
        }
      }
    });
    try {
      await tesseractWorker.setParameters({ tessedit_pageseg_mode: "4" });
    } catch (_) {}
    return tesseractWorker;
  }

  function median(values) {
    if (!values.length) return 0;
    const s = values.slice().sort(function (a, b) { return a - b; });
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function detectAlignment(line, pageWidth) {
    const x0 = line.bbox.x0;
    const x1 = line.bbox.x1;
    const mid = ((x0 + x1) / 2) / pageWidth;
    const width = (x1 - x0) / pageWidth;
    if (width < 0.72 && mid > 0.36 && mid < 0.64) return "center";
    if (mid > 0.68 && width < 0.55) return "right";
    return "left";
  }

  function detectBullet(text) {
    return /^[✓✔✗✘☑☒☐■□●○•◦‣⁃●∙·\-–—*]\s+/.test(text) ||
      /^[vV]\s+/.test(text) ||
      /^\d+[\.\)]\s+/.test(text);
  }

  function stripBullet(text) {
    return text
      .replace(/^[✓✔✗✘☑☒☐■□●○•◦‣⁃●∙·\-–—*]\s+/, "")
      .replace(/^[vV]\s+/, "")
      .replace(/^\d+[\.\)]\s+/, "")
      .trim();
  }

  function collectLines(ocrData) {
    if (!ocrData) return [];
    if (ocrData.lines && ocrData.lines.length) return ocrData.lines;
    const lines = [];
    const blocks = ocrData.blocks || ocrData.layoutBlocks || [];
    for (let b = 0; b < blocks.length; b++) {
      const paras = (blocks[b] && blocks[b].paragraphs) || [];
      for (let p = 0; p < paras.length; p++) {
        const paraLines = (paras[p] && paras[p].lines) || [];
        for (let i = 0; i < paraLines.length; i++) lines.push(paraLines[i]);
      }
    }
    return lines;
  }

  function analyzeLayout(ocrData) {
    const lines = collectLines(ocrData);
    if (!lines.length) {
      const fallback = ((ocrData && ocrData.text) || "").split(/\n+/).map(function (t) { return t.trim(); }).filter(Boolean);
      return fallback.map(function (text) {
        return {
          lines: [detectBullet(text) ? stripBullet(text) : text],
          alignment: "left",
          isBullet: detectBullet(text),
          spacing: 0
        };
      });
    }

    let pageWidth = ocrData.imageWidth || ocrData.width || 0;
    if (!pageWidth) {
      lines.forEach(function (line) {
        if (line.bbox && line.bbox.x1 > pageWidth) pageWidth = line.bbox.x1;
      });
    }
    pageWidth = pageWidth || 1000;

    const heights = [];
    lines.forEach(function (line) {
      if (!line.bbox) return;
      const h = line.bbox.y1 - line.bbox.y0;
      if (h > 0) heights.push(h);
    });
    const lineH = median(heights) || 16;
    const paraGap = Math.max(14, lineH * 1.35);

    const paragraphs = [];
    let current = { lines: [], alignment: "left", isBullet: false, spacing: 0 };
    let lastBottom = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const text = (line.text || "").replace(/\s+/g, " ").trim();
      if (!text || !line.bbox) continue;

      const spacing = lastBottom > 0 ? (line.bbox.y0 - lastBottom) : 0;
      const isBullet = detectBullet(text);
      const alignment = detectAlignment(line, pageWidth);
      const clean = isBullet ? stripBullet(text) : text;
      if (!clean) {
        lastBottom = line.bbox.y1;
        continue;
      }

      const needsNew = current.lines.length > 0 && (
        current.isBullet !== isBullet ||
        current.alignment !== alignment ||
        spacing > paraGap
      );

      if (needsNew) {
        paragraphs.push(current);
        current = { lines: [clean], alignment: alignment, isBullet: isBullet, spacing: spacing };
      } else {
        current.lines.push(clean);
        current.alignment = alignment;
        current.isBullet = isBullet;
      }
      lastBottom = line.bbox.y1;
    }

    if (current.lines.length) paragraphs.push(current);
    return paragraphs;
  }

  function renderEditor(paragraphs) {
    if (!previewEditor) return;
    if (!paragraphs.length) {
      previewEditor.innerHTML = "<p>No se detectó texto. Prueba con una foto más nítida y de frente.</p>";
      return;
    }
    let html = "";
    let inList = false;
    paragraphs.forEach(function (para) {
      if (para.isBullet) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += "<li>" + escHTML(para.lines.join(" ")) + "</li>";
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        const align = para.alignment === "center" || para.alignment === "right" ? para.alignment : "left";
        const extra = para.spacing > 22 ? " class=\"is-spaced\"" : "";
        html += "<p data-align=\"" + align + "\" style=\"text-align:" + align + "\"" + extra + ">" +
          escHTML(para.lines.join(" ")) + "</p>";
      }
    });
    if (inList) html += "</ul>";
    previewEditor.innerHTML = html;
  }

  function paragraphsFromEditor() {
    if (!previewEditor) return lastParagraphs.slice();
    const out = [];
    const nodes = Array.from(previewEditor.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (tag === "UL" || tag === "OL") {
        Array.from(node.children).forEach(function (li) {
          const t = (li.innerText || "").trim();
          if (t) out.push({ lines: [t], alignment: "left", isBullet: true, spacing: 0 });
        });
        return;
      }
      const t = (node.innerText || "").trim();
      if (!t) return;
      const align = node.getAttribute("data-align") || node.style.textAlign || "left";
      const spacing = node.classList && node.classList.contains("is-spaced") ? 28 : 0;
      out.push({
        lines: t.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean),
        alignment: align === "center" || align === "right" ? align : "left",
        isBullet: false,
        spacing: spacing
      });
    });
    return out.length ? out : lastParagraphs.slice();
  }

  function editorPlainText() {
    if (!previewEditor) return "";
    return (previewEditor.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  async function createWordDocument(paragraphs) {
    await loadScriptOnce("lib/vendor/docx.umd.js");
    if (!window.docx) throw new Error("No se pudo preparar el documento Word");

    const { Document, Paragraph, TextRun, AlignmentType, convertInchesToTwip } = window.docx;
    const alignMap = {
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT
    };

    const children = paragraphs.map(function (para) {
      const text = (para.lines || []).join(" ").trim();
      const opts = {
        children: [new TextRun({ text: text || " ", font: "Calibri", size: 22 })],
        spacing: {
          after: para.isBullet ? 80 : 200,
          before: para.spacing > 22 ? 240 : 0,
          line: 276
        },
        alignment: alignMap[para.alignment] || AlignmentType.LEFT
      };
      if (para.isBullet) opts.bullet = { level: 0 };
      return new Paragraph(opts);
    });

    if (!children.length) {
      children.push(new Paragraph({ children: [new TextRun("")] }));
    }

    return new Document({
      styles: {
        default: {
          document: {
            run: { font: "Calibri", size: 22 }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1)
            }
          }
        },
        children: children
      }]
    });
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  async function processImage(file) {
    try {
      if (!canRunEngine()) {
        showError("Tu navegador no puede ejecutar el motor de lectura. Prueba con Chrome, Edge o Firefox actualizado.");
        return;
      }

      setState("working");
      setProgress(4);
      setStatus("Preparando la imagen…");

      const usable = await convertHeicIfNeeded(file);
      const canvas = await toOcrCanvas(usable);

      if (currentImageURL) URL.revokeObjectURL(currentImageURL);
      currentImageURL = canvas.toDataURL(JPEG_TYPE, 0.82);
      if (previewOriginal) previewOriginal.src = currentImageURL;

      const worker = await getOCRWorker();
      setState("working");
      setProgress(8);
      setStatus("Analizando el documento…");

      const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
      const ocrData = result && result.data ? result.data : {};

      setProgress(88);
      setStatus("Reconstruyendo el formato…");

      lastParagraphs = analyzeLayout(ocrData);
      renderEditor(lastParagraphs);

      setProgress(100);
      setState("done");
    } catch (error) {
      console.error("OCR error:", error);
      showError("No se pudo leer el documento. Usa una foto nítida, de una página y con buena luz.");
    }
  }

  async function copyToClipboard() {
    try {
      const text = editorPlainText();
      await navigator.clipboard.writeText(text);
      const original = btnCopy.innerHTML;
      btnCopy.innerHTML = "Copiado";
      btnCopy.classList.add("is-ok");
      setTimeout(function () {
        btnCopy.innerHTML = original;
        btnCopy.classList.remove("is-ok");
      }, 1800);
    } catch (error) {
      showError("No se pudo copiar. Selecciona el texto a la derecha y cópialo a mano.");
    }
  }

  async function downloadWord() {
    try {
      const paragraphs = paragraphsFromEditor();
      const doc = await createWordDocument(paragraphs);
      const blob = await window.docx.Packer.toBlob(doc);
      saveBlob(blob, "documento.docx");
    } catch (error) {
      console.error("Download Word error:", error);
      showError("No se pudo crear el Word. Revisa el texto extraído e inténtalo otra vez.");
    }
  }

  function downloadTxt() {
    try {
      const text = editorPlainText();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      saveBlob(blob, "documento.txt");
    } catch (error) {
      showError("No se pudo descargar el TXT.");
    }
  }

  function reset() {
    lastParagraphs = [];
    if (currentImageURL && currentImageURL.indexOf("blob:") === 0) {
      URL.revokeObjectURL(currentImageURL);
    }
    currentImageURL = null;
    if (previewEditor) previewEditor.innerHTML = "";
    if (previewOriginal) previewOriginal.removeAttribute("src");
    if (fileInput) fileInput.value = "";
    if (cameraInput) cameraInput.value = "";
    setProgress(0);
    setState("idle");
  }

  function handleFileSelect(file) {
    if (!file) return;
    if (!isAllowedImage(file)) {
      showError("Formato no válido. Sube una imagen JPG, PNG o HEIC.");
      return;
    }
    if (file.size > MAX_BYTES) {
      showError("El archivo es demasiado grande. El límite es de unos 10 MB.");
      return;
    }
    processImage(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dropzone) dropzone.classList.add("is-dragover");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dropzone) dropzone.classList.remove("is-dragover");
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dropzone) dropzone.classList.remove("is-dragover");
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) handleFileSelect(files[0]);
  }

  function handlePaste(e) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        handleFileSelect(file);
        break;
      }
    }
  }

  function init() {
    if (fileInput) {
      fileInput.addEventListener("change", function (e) {
        if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
      });
    }
    if (cameraInput) {
      cameraInput.addEventListener("change", function (e) {
        if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
      });
    }
    if (dropzone) {
      dropzone.addEventListener("dragover", handleDragOver);
      dropzone.addEventListener("dragleave", handleDragLeave);
      dropzone.addEventListener("drop", handleDrop);
    }
    document.addEventListener("paste", handlePaste);
    if (btnReset) btnReset.addEventListener("click", reset);
    if (btnRetry) btnRetry.addEventListener("click", reset);
    if (btnCopy) btnCopy.addEventListener("click", copyToClipboard);
    if (btnDownloadWord) btnDownloadWord.addEventListener("click", downloadWord);
    if (btnDownloadTxt) btnDownloadTxt.addEventListener("click", downloadTxt);
  }

  function boot() {
    void data;
    void reduced;
    void fineHover;
    safe(init, "init");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
