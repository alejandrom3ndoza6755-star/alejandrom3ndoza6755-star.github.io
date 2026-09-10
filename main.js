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
  const MAX_EDGE = 2800;
  const TARGET_EDGE = 2400;
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

  function makeCanvas(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return { canvas: canvas, ctx: ctx };
  }

  function cropToPaper(src) {
    const w = src.width;
    const h = src.height;
    const ctx = src.getContext("2d", { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, w, h).data;
    const step = Math.max(1, Math.floor(Math.min(w, h) / 360));
    let minX = w, minY = h, maxX = 0, maxY = 0, hits = 0;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum > 158) {
          hits += 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const cw = maxX - minX;
    const ch = maxY - minY;
    if (hits < 40 || cw < w * 0.45 || ch < h * 0.45) return src;
    const pad = Math.round(Math.min(cw, ch) * 0.02);
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad);
    maxY = Math.min(h, maxY + pad);
    const outW = maxX - minX;
    const outH = maxY - minY;
    const out = makeCanvas(outW, outH);
    out.ctx.drawImage(src, minX, minY, outW, outH, 0, 0, outW, outH);
    return out.canvas;
  }

  function enhanceContrast(src) {
    const ctx = src.getContext("2d", { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, src.width, src.height);
    const d = img.data;
    const factor = 1.28;
    for (let i = 0; i < d.length; i += 4) {
      let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      y = (y - 128) * factor + 136;
      if (y < 0) y = 0;
      if (y > 255) y = 255;
      d[i] = d[i + 1] = d[i + 2] = y;
    }
    ctx.putImageData(img, 0, 0);
    return src;
  }

  function scaleCanvas(src, scale) {
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    const out = makeCanvas(w, h);
    out.ctx.imageSmoothingEnabled = true;
    out.ctx.imageSmoothingQuality = "high";
    out.ctx.drawImage(src, 0, 0, w, h);
    return out.canvas;
  }

  async function toOcrCanvas(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) throw new Error("Imagen vacía");
      let first = makeCanvas(w, h);
      first.ctx.drawImage(img, 0, 0, w, h);
      let canvas = cropToPaper(first.canvas);
      const longEdge = Math.max(canvas.width, canvas.height);
      if (longEdge < TARGET_EDGE) {
        canvas = scaleCanvas(canvas, TARGET_EDGE / longEdge);
      } else if (longEdge > MAX_EDGE) {
        canvas = scaleCanvas(canvas, MAX_EDGE / longEdge);
      }
      return enhanceContrast(canvas);
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
      await tesseractWorker.setParameters({ tessedit_pageseg_mode: "6" });
    } catch (_) {}
    return tesseractWorker;
  }

  function median(values) {
    if (!values.length) return 0;
    const s = values.slice().sort(function (a, b) { return a - b; });
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function percentile(values, p) {
    if (!values.length) return 0;
    const s = values.slice().sort(function (a, b) { return a - b; });
    const i = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)));
    return s[i];
  }

  function isGarbage(text) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    if (!t || t.length <= 2) return true;
    if (/^[A-Z]{2,4}:$/.test(t)) return true;
    const letters = (t.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;
    if (letters < 3) return true;
    const compact = t.replace(/\s/g, "");
    if (compact.length && letters / compact.length < 0.4 && t.length < 24) return true;
    if (/^[\s\\|\/_\-–—=xXvViIl()[\]{}~`'":.,;]+$/.test(t)) return true;
    return false;
  }

  function looksLikeBullet(text) {
    const t = (text || "").trim();
    if (/^[✓✔✗✘☑☒☐■□●○•◦‣⁃∙·]\s*\S/.test(t)) return true;
    if (/^[\-\–—\*]\s+\S/.test(t) && t.length < 90) return true;
    if (/^\d{1,2}[\.\)]\s+\S/.test(t) && t.length < 90) return true;
    if (/^[YVyv]\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t) && t.length < 58) return true;
    return false;
  }

  function stripBullet(text) {
    return text
      .replace(/^[✓✔✗✘☑☒☐■□●○•◦‣⁃∙·]\s*/, "")
      .replace(/^[YVyv]\s+/, "")
      .replace(/^[\-\–—\*]\s+/, "")
      .replace(/^\d{1,2}[\.\)]\s+/, "")
      .trim();
  }

  function collectWords(ocrData) {
    const words = [];
    const blocks = (ocrData && (ocrData.blocks || ocrData.layoutBlocks)) || [];
    for (let b = 0; b < blocks.length; b++) {
      const paras = (blocks[b] && blocks[b].paragraphs) || [];
      for (let p = 0; p < paras.length; p++) {
        const paraLines = (paras[p] && paras[p].lines) || [];
        for (let i = 0; i < paraLines.length; i++) {
          const line = paraLines[i];
          const lineWords = (line && line.words) || [];
          if (lineWords.length) {
            for (let w = 0; w < lineWords.length; w++) {
              const word = lineWords[w];
              const t = (word.text || "").replace(/\s+/g, " ").trim();
              if (!t || !word.bbox) continue;
              const conf = word.confidence == null ? 80 : word.confidence;
              if (conf < 32 && t.length < 3) continue;
              words.push({
                text: t,
                bbox: word.bbox,
                conf: conf,
                h: word.bbox.y1 - word.bbox.y0
              });
            }
          } else if (line && line.bbox && line.text) {
            const t = line.text.replace(/\s+/g, " ").trim();
            if (t) {
              words.push({
                text: t,
                bbox: line.bbox,
                conf: line.confidence == null ? 80 : line.confidence,
                h: line.bbox.y1 - line.bbox.y0
              });
            }
          }
        }
      }
    }
    return words;
  }

  function linesFromWords(words) {
    if (!words.length) return [];
    const mh = median(words.map(function (w) { return w.h; })) || 16;
    const sorted = words.slice().sort(function (a, b) {
      return (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2;
    });
    const rows = [];
    for (let i = 0; i < sorted.length; i++) {
      const w = sorted[i];
      const cy = (w.bbox.y0 + w.bbox.y1) / 2;
      const last = rows[rows.length - 1];
      if (last && Math.abs(cy - last.cy) < mh * 0.55) {
        last.words.push(w);
        last.cy = (last.cy * (last.words.length - 1) + cy) / last.words.length;
      } else {
        rows.push({ cy: cy, words: [w] });
      }
    }
    return rows.map(function (row) {
      row.words.sort(function (a, b) { return a.bbox.x0 - b.bbox.x0; });
      const text = row.words.map(function (w) { return w.text; }).join(" ").replace(/\s+/g, " ").trim();
      const xs0 = row.words.map(function (w) { return w.bbox.x0; });
      const xs1 = row.words.map(function (w) { return w.bbox.x1; });
      const ys0 = row.words.map(function (w) { return w.bbox.y0; });
      const ys1 = row.words.map(function (w) { return w.bbox.y1; });
      return {
        text: text,
        bbox: {
          x0: Math.min.apply(null, xs0),
          y0: Math.min.apply(null, ys0),
          x1: Math.max.apply(null, xs1),
          y1: Math.max.apply(null, ys1)
        }
      };
    }).filter(function (line) { return line.text && !isGarbage(line.text); });
  }

  function detectAlignment(line, col) {
    const width = col.right - col.left || 1;
    const leftGap = (line.bbox.x0 - col.left) / width;
    const rightGap = (col.right - line.bbox.x1) / width;
    const lineW = (line.bbox.x1 - line.bbox.x0) / width;
    if (lineW < 0.58 && leftGap > 0.32 && rightGap < 0.2) return "right";
    if (lineW < 0.64 && leftGap > 0.16 && rightGap > 0.16 && Math.abs(leftGap - rightGap) < 0.18) return "center";
    return "left";
  }

  function analyzeLayout(ocrData) {
    let visual = linesFromWords(collectWords(ocrData));
    if (!visual.length) {
      const fallback = ((ocrData && ocrData.text) || "").split(/\n+/).map(function (t) { return t.trim(); }).filter(Boolean);
      visual = fallback.filter(function (t) { return !isGarbage(t); }).map(function (text, i) {
        return { text: text, bbox: { x0: 0, y0: i * 20, x1: 800, y1: i * 20 + 18 } };
      });
    }
    if (!visual.length) return [];

    const col = {
      left: percentile(visual.map(function (l) { return l.bbox.x0; }), 0.12),
      right: percentile(visual.map(function (l) { return l.bbox.x1; }), 0.88)
    };
    const lineH = median(visual.map(function (l) { return l.bbox.y1 - l.bbox.y0; })) || 16;
    const wrapGap = lineH * 0.85;
    const paraGap = Math.max(16, lineH * 1.45);

    const paragraphs = [];
    let current = null;
    let lastBottom = 0;

    for (let i = 0; i < visual.length; i++) {
      const line = visual[i];
      const raw = line.text.replace(/\s+/g, " ").trim();
      const isBullet = looksLikeBullet(raw);
      const alignment = detectAlignment(line, col);
      const clean = isBullet ? stripBullet(raw) : raw;
      if (!clean) continue;
      const spacing = lastBottom > 0 ? (line.bbox.y0 - lastBottom) : 0;

      const startNew = !current ||
        current.isBullet ||
        isBullet ||
        current.alignment !== alignment ||
        spacing > (current.alignment === "left" && alignment === "left" ? paraGap : wrapGap);

      if (startNew) {
        if (current) paragraphs.push(current);
        current = { lines: [clean], alignment: alignment, isBullet: isBullet, spacing: spacing };
      } else {
        current.lines.push(clean);
      }
      lastBottom = line.bbox.y1;
    }
    if (current) paragraphs.push(current);
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
      setStatus("Mejorando la foto…");

      const usable = await convertHeicIfNeeded(file);
      if (currentImageURL) URL.revokeObjectURL(currentImageURL);
      currentImageURL = URL.createObjectURL(usable);
      if (previewOriginal) previewOriginal.src = currentImageURL;

      const canvas = await toOcrCanvas(usable);

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
