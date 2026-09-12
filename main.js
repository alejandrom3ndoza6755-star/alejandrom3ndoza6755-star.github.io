(function () {
  "use strict";

  const data = window.__BRAND__ || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  
  // Debug mode: Add ?debug=1 to URL to enable console logs
  const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1';
  function debugLog() {
    if (DEBUG) console.log.apply(console, arguments);
  }

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const escHTML = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  const MAX_BYTES = 16 * 1024 * 1024;
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

  function isFileProtocol() {
    return location.protocol === "file:";
  }

  function humanError(error) {
    if (isFileProtocol()) {
      return "No abras el HTML a doble clic: el navegador bloquea el lector. Abre http://127.0.0.1:8137/ y prueba ahí.";
    }
    const msg = String((error && error.message) || error || "");
    if (/Failed to fetch|NetworkError|Load failed|404|worker/i.test(msg)) {
      return "No se pudo cargar el motor de lectura. La primera vez necesita internet para bajar los idiomas. Revisa la conexión e inténtalo otra vez.";
    }
    return "No se pudo leer el documento. Usa una foto nítida, de una página y con buena luz.";
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
    try {
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
    } catch (_) {
      return src;
    }
  }

  function enhanceContrast(src) {
    try {
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
    } catch (_) {
      return src;
    }
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
      workerPath: new URL("lib/vendor/tesseract/worker.min.js", document.baseURI).href,
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

  function realWordCount(text) {
    return String(text || "").split(/\s+/).filter(function (w) {
      return w.length >= 3 && /[aeiouáéíóúü]/i.test(w);
    }).length;
  }

  function isGarbage(text) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    if (!t || t.length <= 2) return true;
    if (/^[A-Z]{2,4}:$/.test(t)) return true;
    const letters = (t.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;
    if (letters < 3) return true;
    const compact = t.replace(/\s/g, "");
    if (compact.length && letters / compact.length < 0.45 && t.length < 28) return true;
    if (/^[\s\\|\/_\-–—=xXvViIl()[\]{}~`'":.,;]+$/.test(t)) return true;
    const specials = (t.match(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,;:°ºª'"()\-]/g) || []).length;
    if (specials >= 2 && t.length < 40) return true;
    if (!looksLikeBullet(t) && realWordCount(t) < 2 && t.length < 24 && !/presente/i.test(t)) return true;
    return false;
  }

  function looksLikeBullet(text) {
    const t = (text || "").trim();
    if (/^[✓✔✗✘☑☒☐■□●○•◦‣⁃∙·◆◇▪▫▸▹►]\s*\S/.test(t)) return true;
    if (/^[\-\–—\*]\s+\S/.test(t) && t.length < 90) return true;
    if (/^\d{1,2}[\.\)]\s+\S/.test(t) && t.length < 90) return true;
    if (/^[YVyv]\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t) && t.length < 58) return true;
    if (/^[a-zA-Z][\.\)]\s+\S/.test(t) && t.length < 90) return true;
    return false;
  }

  function stripBullet(text) {
    return text
      .replace(/^[✓✔✗✘☑☒☐■□●○•◦‣⁃∙·◆◇▪▫▸▹►]\s*/, "")
      .replace(/^[YVyv]\s+/, "")
      .replace(/^[\-\–—\*]\s+/, "")
      .replace(/^\d{1,2}[\.\)]\s+/, "")
      .replace(/^[a-zA-Z][\.\)]\s+/, "")
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

  function lineWidthRatio(line, col) {
    const width = col.right - col.left || 1;
    return (line.bbox.x1 - line.bbox.x0) / width;
  }

  function shouldWrap(prev, next, col, spacing, lineH) {
    if (!prev || !next) return false;
    if (spacing > lineH * 1.55) return false;
    if (looksLikeBullet(prev.text) || looksLikeBullet(next.text)) return false;
    
    // Don't wrap if either line looks like a table field
    if (/:/.test(prev.text) && prev.text.length < 90) return false;
    if (/:/.test(next.text) && next.text.length < 90) return false;
    
    if (/[:]$/.test(prev.text.trim())) return false;
    // Enhanced: Detect more title patterns that shouldn't wrap
    if (/^(I+\.|Ing\.|Licd|Lic\.|Dr\.|Dra\.|Jefe|Universidad|Presente|Asamblea|INTRODUCCIÓN|CONCLUSIÓN|Nombre|Apellido)/i.test(prev.text.trim())) return false;
    if (/^(I+\.|Ing\.|Licd|Lic\.|Dr\.|Dra\.|Jefe|Universidad|Presente|Asamblea|INTRODUCCIÓN|CONCLUSIÓN|Nombre|Apellido)/i.test(next.text.trim())) return false;
    // Don't wrap if text looks like a heading (all caps, short)
    const prevTrim = prev.text.trim();
    const nextTrim = next.text.trim();
    if (prevTrim === prevTrim.toUpperCase() && prevTrim.length < 50 && /^[A-ZÁÉÍÓÚÑ\s\-:.]+$/.test(prevTrim)) return false;
    if (nextTrim === nextTrim.toUpperCase() && nextTrim.length < 50 && /^[A-ZÁÉÍÓÚÑ\s\-:.]+$/.test(nextTrim)) return false;
    const prevW = lineWidthRatio(prev, col);
    const nextW = lineWidthRatio(next, col);
    if (prevW < 0.75 || prev.text.trim().length < 78) return false;
    if (nextW < 0.42 && next.text.trim().length < 48) return false;
    return spacing < lineH * 1.2;
  }

  function detectPipeSeparatedTable(lines) {
    // Detect tables where cells are separated by | within the same line
    // Example: "FECHA | ENTRADA | SALIDA | ACTIVIDADES"
    const pipeLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const pipeCount = (line.text.match(/\|/g) || []).length;
      
      if (pipeCount >= 1) {  // At least 1 pipe = 2 columns
        pipeLines.push({ index: i, line: line, pipeCount: pipeCount });
      }
    }
    
    if (pipeLines.length < 2) {
      debugLog('Pipe detection: solo', pipeLines.length, 'líneas con pipes, no es tabla');
      return [];
    }
    
    debugLog('Pipe detection: encontradas', pipeLines.length, 'líneas con pipes (|)');
    
    // Check if they are consecutive or close together - split into multiple groups
    const lineH = median(lines.map(function(l) { return l.bbox.y1 - l.bbox.y0; })) || 16;
    let allGroups = [];
    let currentGroup = [pipeLines[0]];
    
    for (let i = 1; i < pipeLines.length; i++) {
      const prev = pipeLines[i - 1];
      const curr = pipeLines[i];
      const spacing = curr.line.bbox.y0 - prev.line.bbox.y1;
      
      // Tighter grouping - allow only 2 lines gap max
      if (curr.index - prev.index <= 2 && spacing < lineH * 3) {
        currentGroup.push(curr);
      } else {
        if (currentGroup.length >= 2) {
          allGroups.push(currentGroup);
        }
        currentGroup = [curr];
      }
    }
    if (currentGroup.length >= 2) {
      allGroups.push(currentGroup);
    }
    
    if (allGroups.length === 0) {
      debugLog('Pipe detection: no hay grupos consecutivos');
      return [];
    }
    
    debugLog('Pipe detection:', allGroups.length, 'grupos encontrados');
    
    // Convert each group to a table
    const tables = allGroups.map(function(group, groupIdx) {
      // Parse each line into cells
      const tableRows = group.map(function(item) {
        const parts = item.line.text.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
        return {
          cells: parts.map(function(text) {
            return { text: text };
          }),
          originalIndex: item.index
        };
      });
      
      // Verify consistent column count
      const colCounts = tableRows.map(function(row) { return row.cells.length; });
      const avgCols = Math.round(colCounts.reduce(function(a, b) { return a + b; }, 0) / colCounts.length);
      
      debugLog('Pipe detection: grupo', groupIdx, 'con', group.length, 'filas y', avgCols, 'columnas promedio');
      
      if (avgCols < 2) {
        return null;
      }
      
      return {
        type: 'pipe',
        rows: tableRows,
        start: group[0].index,
        end: group[group.length - 1].index
      };
    }).filter(Boolean);
    
    return tables;
  }

  function detectGridTable(lines) {
    // Detect table by analyzing vertical alignment of text
    // This detects multi-column tables like schedules, forms with grids, etc.
    if (lines.length < 3) return null;
    
    const lineH = median(lines.map(function(l) { return l.bbox.y1 - l.bbox.y0; })) || 16;
    
    // Group lines by vertical position (rows)
    const rows = [];
    let currentRow = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cy = (line.bbox.y0 + line.bbox.y1) / 2;
      
      // More aggressive grouping - same row if within lineHeight
      if (!currentRow || Math.abs(cy - currentRow.cy) > lineH * 0.75) {
        if (currentRow) rows.push(currentRow);
        currentRow = { cy: cy, lines: [line], minY: line.bbox.y0, maxY: line.bbox.y1 };
      } else {
        currentRow.lines.push(line);
        currentRow.cy = (currentRow.cy * (currentRow.lines.length - 1) + cy) / currentRow.lines.length;
        currentRow.minY = Math.min(currentRow.minY, line.bbox.y0);
        currentRow.maxY = Math.max(currentRow.maxY, line.bbox.y1);
      }
    }
    if (currentRow) rows.push(currentRow);
    
    debugLog('Grid detection: agrupadas', rows.length, 'filas');
    
    // Check if this looks like a grid table
    // Requirements: multiple rows with 2+ columns each
    const multiColumnRows = rows.filter(function(row) {
      return row.lines.length >= 2;
    });
    
    debugLog('Grid detection: filas multi-columna:', multiColumnRows.length);
    
    if (multiColumnRows.length < 3) {
      debugLog('Grid detection: menos de 3 filas multi-columna, no es tabla grid');
      return null;
    }
    
    // Analyze column positions
    const allX0 = [];
    multiColumnRows.forEach(function(row) {
      row.lines.forEach(function(line) {
        allX0.push(line.bbox.x0);
      });
    });
    
    // Find column boundaries
    allX0.sort(function(a, b) { return a - b; });
    const columns = [];
    let lastX = allX0[0];
    columns.push(lastX);
    
    for (let i = 1; i < allX0.length; i++) {
      if (allX0[i] - lastX > 35) {  // Reduced from 40 to 35 for tighter columns
        columns.push(allX0[i]);
        lastX = allX0[i];
      }
    }
    
    debugLog('Grid detection: detectadas', columns.length, 'columnas');
    
    if (columns.length < 2) {
      debugLog('Grid detection: menos de 2 columnas, no es tabla grid');
      return null;
    }
    
    // Build table structure - assign each text to closest column
    const tableRows = rows.map(function(row) {
      // Sort cells by X position
      const sortedCells = row.lines.slice().sort(function(a, b) {
        return a.bbox.x0 - b.bbox.x0;
      });
      
      return {
        cells: sortedCells.map(function(line) {
          return {
            text: line.text.trim(),
            x: line.bbox.x0
          };
        }),
        y: row.minY
      };
    });
    
    debugLog('Grid detection: tabla construida con', tableRows.length, 'filas');
    
    return {
      type: 'grid',
      columns: columns,
      rows: tableRows
    };
  }

  function detectTableRows(lines) {
    const tables = [];
    
    // First, try to detect pipe-separated tables (cells separated by |)
    const pipeTables = detectPipeSeparatedTable(lines);
    if (pipeTables && pipeTables.length > 0) {
      debugLog('Detectadas', pipeTables.length, 'tablas tipo pipe');
      
      pipeTables.forEach(function(pipeTable) {
        tables.push({
          start: pipeTable.start,
          end: pipeTable.end,
          type: 'grid',
          gridData: { rows: pipeTable.rows, columns: [] }
        });
      });
      
      return tables;
    }
    
    // Second, try to detect grid-style tables (multi-column spatial)
    const gridTable = detectGridTable(lines);
    if (gridTable && gridTable.rows.length >= 4) {
      debugLog('Detectada tabla tipo grid con', gridTable.rows.length, 'filas y', gridTable.columns.length, 'columnas');
      tables.push({
        start: 0,
        end: lines.length - 1,
        type: 'grid',
        gridData: gridTable
      });
      return tables;
    } else if (gridTable) {
      debugLog('Tabla grid descartada: solo', gridTable.rows.length, 'filas (mínimo 4)');
    }
    
    debugLog('No se detectaron tablas grid/pipe, buscando tablas form...');
    
    // If no grid/pipe table, detect form-style tables (label: value)
    return detectFormTables(lines);
  }
  
  function detectFormTables(lines) {
    const tables = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      // Detect table-like patterns: lines with colons or field labels
      const hasColon = line.text.includes(':');
      const looksLikeField = /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s°ºª#]+:/.test(line.text.trim());
      
      if (looksLikeField || (hasColon && line.text.length < 110)) {
        const tableStart = i;
        const tableRows = [];
        const lineH = line.bbox.y1 - line.bbox.y0;
        const avgX0 = [];
        let lastWasEmpty = false;
        let consecutiveNonTable = 0;
        
        // Collect consecutive table rows
        while (i < lines.length) {
          const currentLine = lines[i];
          const spacing = i > tableStart ? (currentLine.bbox.y0 - lines[i-1].bbox.y1) : 0;
          
          // Check if this could be a table row
          const currentHasColon = currentLine.text.includes(':');
          const isShort = currentLine.text.length < 110;
          const isClose = spacing < lineH * 2.6;
          
          // Check horizontal alignment with previous rows
          const isAligned = avgX0.length === 0 || 
            avgX0.some(function(x) { return Math.abs(currentLine.bbox.x0 - x) < 40; });
          
          // More lenient for continuation lines
          const couldBeContinuation = tableRows.length > 0 && isClose && isAligned && !looksLikeBullet(currentLine.text);
          
          if ((currentHasColon || couldBeContinuation) && spacing < lineH * 3.5) {
            avgX0.push(currentLine.bbox.x0);
            consecutiveNonTable = 0;
            
            // Try to split into label:value pairs
            const parts = currentLine.text.split(':');
            if (parts.length >= 2) {
              const label = parts[0].trim();
              let value = parts.slice(1).join(':').trim();
              
              // Check if this looks like a real field label
              const labelWords = label.split(/\s+/).length;
              if (labelWords <= 8 || label.length < 65) {
                // Check if the next line might be the value continuation
                if (!value && i + 1 < lines.length) {
                  const nextLine = lines[i + 1];
                  const nextSpacing = nextLine.bbox.y0 - currentLine.bbox.y1;
                  const nextIsClose = nextSpacing < lineH * 1.8;
                  const nextNoColon = !nextLine.text.includes(':');
                  const nextAligned = Math.abs(nextLine.bbox.x0 - currentLine.bbox.x0) < 50;
                  
                  if (nextIsClose && nextNoColon && nextLine.text.length < 100 && (nextAligned || nextLine.text.length < 70)) {
                    value = nextLine.text.trim();
                    i++; // Skip next line as we consumed it
                  }
                }
                
                tableRows.push({
                  label: label,
                  value: value,
                  bbox: currentLine.bbox,
                  fullText: currentLine.text
                });
                lastWasEmpty = !value;
                i++;
                continue;
              }
            } else if (tableRows.length > 0 && isShort && isClose && !currentHasColon) {
              // Continuation line - append to previous row's value
              const prevRow = tableRows[tableRows.length - 1];
              
              // If previous row had empty value, this is probably the value
              if (!prevRow.value || lastWasEmpty) {
                prevRow.value = currentLine.text.trim();
                lastWasEmpty = false;
              } else if (prevRow.value.length < 80) {
                // Append to existing value if it's not too long
                prevRow.value += ' ' + currentLine.text.trim();
              } else {
                // Check if this could be a new field without colon
                const nextHasColon = i + 1 < lines.length && lines[i + 1].text.includes(':');
                if (nextHasColon) {
                  // This is likely standalone text, not a continuation
                  consecutiveNonTable++;
                  if (consecutiveNonTable >= 2) break;
                } else {
                  // Create new row for orphan text
                  tableRows.push({
                    label: currentLine.text.trim(),
                    value: '',
                    bbox: currentLine.bbox,
                    fullText: currentLine.text
                  });
                }
              }
              i++;
              continue;
            }
          }
          
          // Check if we should stop (too much spacing or different pattern)
          if (tableRows.length >= 2) {
            if (spacing > lineH * 3.5 || looksLikeBullet(currentLine.text)) {
              break;
            }
            // Allow one line gap for table continuation
            if (spacing > lineH * 2.0 && !currentHasColon) {
              consecutiveNonTable++;
              if (consecutiveNonTable >= 1) break;
            }
          }
          
          break;
        }
        
        if (tableRows.length >= 2) {
          // Filter out false positives
          const validRows = tableRows.filter(function(row) {
            return row.label.length > 0 && row.label.length < 70;
          });
          
          if (validRows.length >= 2) {
            tables.push({
              start: tableStart,
              end: i - 1,
              type: 'form',
              rows: validRows
            });
          }
        }
      } else {
        i++;
      }
    }
    
    return tables;
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

    debugLog('=== LÍNEAS DETECTADAS ===', visual.length);
    if (DEBUG) {
      visual.forEach(function(line, i) {
        debugLog(i + ':', line.text);
      });
    }

    const col = {
      left: percentile(visual.map(function (l) { return l.bbox.x0; }), 0.12),
      right: percentile(visual.map(function (l) { return l.bbox.x1; }), 0.88)
    };
    const lineH = median(visual.map(function (l) { return l.bbox.y1 - l.bbox.y0; })) || 16;

    // Detect tables first
    const tables = detectTableRows(visual);
    
    debugLog('=== TABLAS DETECTADAS ===', tables.length);
    if (DEBUG) {
      tables.forEach(function(table, idx) {
        debugLog('Tabla ' + idx + ' tipo: ' + table.type + ' (líneas ' + table.start + '-' + table.end + ')');
        if (table.type === 'grid' && table.gridData) {
          const colCount = table.gridData.columns ? table.gridData.columns.length : 'auto';
          debugLog('  Grid con ' + table.gridData.rows.length + ' filas y ' + colCount + ' columnas');
        } else if (table.type === 'form' && table.rows) {
          table.rows.forEach(function(row) {
            debugLog('  ' + row.label + ' | ' + row.value);
          });
        }
      });
    }
    
    const tableIndexes = new Set();
    tables.forEach(function(table) {
      for (let i = table.start; i <= table.end; i++) {
        tableIndexes.add(i);
      }
    });

    const paragraphs = [];
    let current = null;
    let lastVisual = null;
    let lastBottom = 0;

    for (let i = 0; i < visual.length; i++) {
      // If this line is part of a table, add the table structure
      if (tableIndexes.has(i)) {
        if (current) {
          paragraphs.push(current);
          current = null;
        }
        
        const table = tables.find(function(t) { return t.start === i; });
        if (table) {
          if (table.type === 'grid') {
            // Grid table
            paragraphs.push({
              type: 'table',
              gridData: table.gridData,
              spacing: lastBottom > 0 ? (visual[i].bbox ? visual[i].bbox.y0 - lastBottom : 0) : 0
            });
          } else if (table.type === 'form') {
            // Form table
            paragraphs.push({
              type: 'table',
              rows: table.rows,
              spacing: lastBottom > 0 ? (visual[i].bbox ? visual[i].bbox.y0 - lastBottom : 0) : 0
            });
          }
          
          // Update lastBottom - handle case where visual[table.end] might not have bbox
          if (visual[table.end] && visual[table.end].bbox) {
            lastBottom = visual[table.end].bbox.y1;
          }
          i = table.end;
          lastVisual = null;
        }
        continue;
      }

      const line = visual[i];
      const raw = line.text.replace(/\s+/g, " ").trim();
      const isBullet = looksLikeBullet(raw);
      const alignment = detectAlignment(line, col);
      
      // Preserve original symbol instead of stripping completely
      let clean = raw;
      let bulletSymbol = null;
      if (isBullet) {
        bulletSymbol = extractBulletSymbol(raw);
        clean = stripBullet(raw);
      }
      
      if (!clean) continue;
      const spacing = lastBottom > 0 ? (line.bbox.y0 - lastBottom) : 0;
      
      // Don't wrap lines that look like table fields
      const looksLikeTableField = /:/.test(raw) && raw.length < 90;
      
      const wrap = !looksLikeTableField && !isBullet && current && !current.isBullet &&
        current.alignment === alignment &&
        shouldWrap(lastVisual, line, col, spacing, lineH);

      if (!current || current.isBullet || isBullet || current.alignment !== alignment || !wrap || looksLikeTableField) {
        if (current) paragraphs.push(current);
        current = { 
          type: 'paragraph',
          lines: [clean], 
          alignment: alignment, 
          isBullet: isBullet, 
          bulletSymbol: bulletSymbol,
          spacing: spacing 
        };
      } else {
        current.lines.push(clean);
      }
      lastVisual = line;
      lastBottom = line.bbox.y1;
    }
    if (current) paragraphs.push(current);
    
    const result = dropStampNoise(paragraphs);
    
    debugLog('=== ESTRUCTURA FINAL ===', result.length);
    if (DEBUG) {
      result.forEach(function(para, i) {
        if (para.type === 'table') {
          let rowCount = 0;
          if (para.gridData && para.gridData.rows) {
            rowCount = para.gridData.rows.length;
          } else if (para.rows) {
            rowCount = para.rows.length;
          }
          debugLog(i + ': TABLE con ' + rowCount + ' filas');
        } else {
          const text = para.lines ? para.lines.join(' ') : '';
          debugLog(i + ': ' + (para.isBullet ? 'BULLET' : 'PARA') + ' - ' + text.substring(0, 50));
        }
      });
    }
    
    return result;
  }
  
  function extractBulletSymbol(text) {
    const t = (text || "").trim();
    // Extract the actual symbol used
    const match = t.match(/^([✓✔✗✘☑☒☐■□●○•◦‣⁃∙·◆◇▪▫▸▹►<>]|[\-\–—\*]|\d{1,2}[\.\)]|[a-zA-Z][\.\)])/);
    return match ? match[1] : "•";
  }

  function looksLikeSignature(text) {
    return /(Licd|Lic\.|Jefa|Jefe|Asamblea|Legislativa|Juárez|Juarez|Jacobo)/i.test(text);
  }

  function dropStampNoise(paragraphs) {
    const out = [];
    let seenClose = false;
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      
      // Tables always pass through
      if (para.type === 'table') {
        out.push(para);
        continue;
      }
      
      const t = (para.lines || []).join(" ");
      if (/extiende|sella la presente|dos mil veintiséis|veintiseis/i.test(t) && t.length > 50) {
        seenClose = true;
        out.push(para);
        continue;
      }
      if (seenClose && !para.isBullet) {
        if (looksLikeSignature(t) || /ASAMBLEA/i.test(t)) {
          out.push(para);
          continue;
        }
        if (t.length < 42 && (isGarbage(t) || realWordCount(t) < 3)) continue;
      }
      out.push(para);
    }
    return out;
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
      if (para.type === 'table') {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        const extra = para.spacing > 22 ? " class=\"is-spaced\"" : "";
        
        // Check if it's a grid table (multi-column)
        if (para.gridData) {
          html += "<table class=\"doc-table doc-table--grid\"" + extra + " data-type=\"grid\">";
          para.gridData.rows.forEach(function(row) {
            html += "<tr>";
            row.cells.forEach(function(cell) {
              html += "<td>" + escHTML(cell.text) + "</td>";
            });
            html += "</tr>";
          });
          html += "</table>";
        } else {
          // Form-style table (label: value)
          html += "<table class=\"doc-table\"" + extra + " data-type=\"table\">";
          para.rows.forEach(function(row) {
            html += "<tr>";
            html += "<td class=\"table-label\">" + escHTML(row.label) + "</td>";
            html += "<td class=\"table-value\">" + escHTML(row.value) + "</td>";
            html += "</tr>";
          });
          html += "</table>";
        }
      } else if (para.isBullet) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        // Use original bullet symbol or default to •
        const symbol = para.bulletSymbol || "•";
        html += "<li data-symbol=\"" + escHTML(symbol) + "\">" + escHTML(para.lines.join(" ")) + "</li>";
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
      
      if (tag === "TABLE") {
        const tableType = node.getAttribute("data-type");
        const spacing = node.classList && node.classList.contains("is-spaced") ? 28 : 0;
        
        if (tableType === "grid") {
          // Grid table - extract all cells from all rows
          const rows = [];
          Array.from(node.querySelectorAll('tr')).forEach(function(tr) {
            const cells = Array.from(tr.querySelectorAll('td')).map(function(td) {
              return { text: (td.innerText || "").trim() };
            });
            if (cells.length > 0) {
              rows.push({ cells: cells });
            }
          });
          
          if (rows.length > 0) {
            out.push({
              type: 'table',
              gridData: { rows: rows },
              spacing: spacing
            });
          }
        } else {
          // Form table - label:value pairs
          const rows = [];
          Array.from(node.querySelectorAll('tr')).forEach(function(tr) {
            const cells = Array.from(tr.querySelectorAll('td'));
            if (cells.length >= 2) {
              rows.push({
                label: (cells[0].innerText || "").trim(),
                value: (cells[1].innerText || "").trim()
              });
            } else if (cells.length === 1) {
              rows.push({
                label: (cells[0].innerText || "").trim(),
                value: ""
              });
            }
          });
          if (rows.length > 0) {
            out.push({
              type: 'table',
              rows: rows,
              spacing: spacing
            });
          }
        }
        return;
      }
      
      if (tag === "UL" || tag === "OL") {
        Array.from(node.children).forEach(function (li) {
          const t = (li.innerText || "").trim();
          const symbol = li.getAttribute("data-symbol") || "•";
          if (t) out.push({ 
            type: 'paragraph',
            lines: [t], 
            alignment: "left", 
            isBullet: true, 
            bulletSymbol: symbol,
            spacing: 0 
          });
        });
        return;
      }
      const t = (node.innerText || "").trim();
      if (!t) return;
      const align = node.getAttribute("data-align") || node.style.textAlign || "left";
      const spacing = node.classList && node.classList.contains("is-spaced") ? 28 : 0;
      out.push({
        type: 'paragraph',
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

    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, convertInchesToTwip } = window.docx;
    const alignMap = {
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT
    };

    const children = paragraphs.map(function (para) {
      if (para.type === 'table') {
        // Check if it's a grid table (multi-column)
        if (para.gridData && para.gridData.rows) {
          const gridRows = para.gridData.rows.map(function(row) {
            const cells = row.cells.map(function(cell) {
              return new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: cell.text || " ", font: "Calibri", size: 20 })],
                  spacing: { after: 0, before: 0 }
                })],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" }
                }
              });
            });
            
            return new TableRow({ children: cells });
          });
          
          return new Table({
            rows: gridRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: {
              top: para.spacing > 22 ? 200 : 100,
              bottom: 100,
              left: 70,
              right: 70
            }
          });
        }
        
        // Form-style table (label: value)
        const tableRows = para.rows.map(function(row) {
          return new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: row.label, font: "Calibri", size: 22 })],
                  spacing: { after: 0, before: 0 }
                })],
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" }
                }
              }),
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: row.value || " ", font: "Calibri", size: 22 })],
                  spacing: { after: 0, before: 0 }
                })],
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" }
                }
              })
            ]
          });
        });
        
        return new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: {
            top: para.spacing > 22 ? 200 : 100,
            bottom: 100,
            left: 100,
            right: 100
          }
        });
      }
      
      const text = (para.lines || []).join(" ").trim();
      const shortLine = !para.isBullet && text.length < 78 && (para.lines || []).length === 1;
      const opts = {
        children: [new TextRun({ text: text || " ", font: "Calibri", size: 22 })],
        spacing: {
          after: para.isBullet ? 60 : (shortLine ? 80 : 200),
          before: para.spacing > 22 ? 200 : 0,
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
      if (isFileProtocol()) {
        showError(humanError());
        return;
      }
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
      showError(humanError(error));
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
    if (isFileProtocol() && card) {
      const note = document.createElement("p");
      note.className = "noscript";
      note.textContent = "Para que el lector funcione, no abras este archivo a doble clic. Entra a http://127.0.0.1:8137/";
      card.insertBefore(note, card.firstChild);
    }
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
