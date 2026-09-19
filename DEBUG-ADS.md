# 🔍 Debug de Anuncios - Guía

## Cómo verificar si los anuncios están cargando

### **Método 1: Consola del navegador**

1. Abre tu sitio: https://alejandrom3ndoza6755-star.github.io/
2. Presiona **F12** (o clic derecho → Inspeccionar)
3. Ve a la pestaña **Console**
4. Busca mensajes como:
   ```
   ✅ "Evadav SW registered" 
   ✅ Scripts de Adsterra cargados
   ❌ Errores 404 o CORS
   ```

---

### **Método 2: Network tab**

1. Abre DevTools (F12)
2. Ve a **Network**
3. Recarga la página (Ctrl+R)
4. Busca requests a:
   - `profitableratecpmnetwork.com` (Adsterra)
   - `avases.com` o `feldot.com` (Evadav)

**Si ves estas peticiones = Los scripts funcionan ✅**

---

### **Método 3: Ver elementos en el DOM**

1. F12 → Elements (o Inspector)
2. Busca en el código HTML:
   - `<iframe>` con dominios de Adsterra/Evadav
   - Elementos `<ins>` con clases de anuncios

**Si hay iframes = Anuncios cargando ✅**

---

## ⏱️ Tiempos normales de carga:

### **Anuncios nativos (Native Ads):**
```
Primera visita: 30-60 segundos
Visitas siguientes: Instantáneo
Pero: Pueden NO aparecer si no hay inventario disponible
```

### **Display Banners:**
```
Cargan inmediatamente si tienes el código
Pero: Necesitas agregarlos manualmente (ver abajo)
```

---

## 🛠️ Cómo agregar más anuncios

### **Necesitas obtener códigos de:**

**Adsterra Dashboard:**
```
1. Login en: https://publishers.adsterra.com/
2. Ir a: Sites → [Tu sitio] → Placements
3. Click en "Add Placement"
4. Seleccionar formato:
   - Banner 728x90 (Leaderboard)
   - Banner 300x250 (Medium Rectangle)
   - Banner 160x600 (Skyscraper)
   - Social Bar
   - PopUnder (más ingresos)
5. Copiar el código generado
```

**Evadav Dashboard:**
```
1. Login en: https://evadav.com/
2. Ir a: Websites → [Tu sitio] → Add code
3. Seleccionar formato:
   - Native Ads
   - Push Notifications
   - In-Page Push
4. Copiar código
```

---

## 📍 Dónde pegar los códigos:

### **En index.html, reemplaza estos comentarios:**

**1. Espacio inline (después del texto explicativo):**
```html
<div class="ad-slot ad-slot--inline">
  <span class="ad-slot__label">ANUNCIO</span>
  <!-- PEGA CÓDIGO DE BANNER 300x250 AQUÍ -->
</div>
```

**2. Espacio leaderboard (después de la herramienta):**
```html
<div class="ad-slot ad-slot--leaderboard">
  <span class="ad-slot__label">ANUNCIO</span>
  <!-- PEGA CÓDIGO DE BANNER 728x90 AQUÍ -->
</div>
```

**3. Sidebar (barra lateral):**
```html
<div class="ad-slot ad-slot--sidebar">
  <span class="ad-slot__label">ANUNCIO</span>
  <!-- PEGA CÓDIGO DE BANNER 160x600 o 300x250 AQUÍ -->
</div>
```

---

## 🎯 Cantidad recomendada de anuncios:

### **Balance óptimo:**
```
✅ 2-3 anuncios por página = Bueno
⚠️ 4-5 anuncios por página = Aceptable
❌ 6+ anuncios por página = Malo (usuarios se van)
```

### **Mi recomendación:**
```
1 Native ad arriba (automático - ya lo tienes)
1 Banner 300x250 después del texto
1 Banner 728x90 después de usar la herramienta
1 Banner 300x250 en sidebar

TOTAL: 4 anuncios = Balance perfecto UX/monetización
```

---

## ⚠️ Troubleshooting común:

### **"No veo ningún anuncio"**
- ✅ Espera 24-48h después de activar
- ✅ Limpia cache del navegador (Ctrl+Shift+R)
- ✅ Prueba desde incógnito
- ✅ Prueba desde otro dispositivo/red
- ⚠️ Adblock activado? Desactívalo

### **"Solo veo 1 anuncio"**
- ✅ Normal con solo native ads
- ✅ Necesitas agregar códigos de display banners
- ✅ Obtén códigos desde los dashboards

### **"Los anuncios no son relevantes"**
- ✅ Normal al inicio (poco tráfico)
- ✅ Con más tráfico, mejoran los anuncios
- ✅ Con más datos, mejor targeting

### **"Los espacios dicen ANUNCIO pero vacíos"**
- ✅ Es correcto, necesitas agregar código ahí
- ✅ Son placeholders para cuando agregues banners
- ✅ Sigue las instrucciones arriba

---

## 📊 Verificar ingresos:

### **Adsterra:**
```
Dashboard → Statistics → Today
Mira: Impressions, Clicks, Earnings
```

### **Evadav:**
```
Dashboard → Reports → Statistics
Mira: Views, eCPM, Revenue
```

**⏱️ Los ingresos pueden tardar 24-48h en aparecer**

---

## 🚀 Próximos pasos:

1. ✅ Verifica que los scripts cargan (F12 → Console)
2. ⏳ Espera 24-48h para que los anuncios se activen
3. 📊 Obtén códigos de display banners desde dashboards
4. 💰 Agrega los códigos a los espacios vacíos
5. 🎯 ENFÓCATE EN TRÁFICO (TikTok, Reddit)

---

**Recuerda:** Con 10-20 visitas/día, los ingresos son mínimos ($0.10-0.50/día). Necesitas 100-500+ visitas/día para ver dinero real.
