# 🎨 Guía: Configurar anuncios personalizados por red

## 📍 Tu estructura actual:

### **Anuncios automáticos (ya funcionan):**
```
✅ Native Ads de Adsterra (en <head>)
✅ Native Ads de Evadav (en <head>)
```
**Estos aparecen solos** donde las redes decidan (probablemente el anuncio que ves)

### **Espacios vacíos (necesitan códigos):**
```
❌ Espacio 1: .ad-slot--inline (después del texto explicativo)
❌ Espacio 2: .ad-slot--leaderboard (después de la herramienta)
❌ Espacio 3: .ad-slot--sidebar (barra lateral)
```

---

## 🎯 Estrategia recomendada de distribución:

### **Opción A: Mix balanceado (RECOMENDADA)**
```
Native Ads automáticos (arriba) → Ambas redes compiten
Espacio inline → Banner 300x250 de Adsterra
Espacio leaderboard → Banner 728x90 de Evadav
Espacio sidebar → Banner 300x250 de Adsterra

TOTAL: 2 Adsterra + 2 Evadav
```

### **Opción B: Solo la que pague más**
```
Después de 1 semana, compara dashboards:
Si Adsterra paga más → Solo Adsterra en todos los espacios
Si Evadav paga más → Solo Evadav en todos los espacios
```

### **Opción C: Dejar solo natives (menos intrusivo)**
```
Native Ads automáticos → Ambas redes
Espacios vacíos → Dejarlos vacíos o eliminarlos

PROS: Mejor UX, sitio más limpio
CONTRAS: 50-70% menos ingresos
```

---

## 🛠️ Cómo obtener códigos específicos:

### **ADSTERRA - Display Banners:**

#### **Paso 1: Login**
```
https://publishers.adsterra.com/
```

#### **Paso 2: Crear placement**
```
Sites → [Tu sitio] → Placements → Add Placement
```

#### **Paso 3: Seleccionar formato**

**Para espacio inline (después del texto):**
```
Formato: Banner 300x250 (Medium Rectangle)
o
Formato: Social Bar (más discreto)
```

**Para espacio leaderboard (horizontal grande):**
```
Formato: Banner 728x90 (Leaderboard)
```

**Para sidebar:**
```
Formato: Banner 160x600 (Wide Skyscraper)
o
Formato: Banner 300x250 (Medium Rectangle)
```

#### **Paso 4: Configuración**
```
Ad Type: JavaScript
Capping: Por página (para no saturar)
```

#### **Paso 5: Copiar código**
```
Te darán algo como:

<script type="text/javascript">
	atOptions = {
		'key' : 'xxxxxxxxxxxxx',
		'format' : 'iframe',
		'height' : 250,
		'width' : 300,
		'params' : {}
	};
</script>
<script type="text/javascript" src="//www.topcreativeformat.com/xxxxx/invoke.js"></script>
```

---

### **EVADAV - Display Banners:**

#### **Paso 1: Login**
```
https://evadav.com/
```

#### **Paso 2: Ir a códigos**
```
Websites → [Tu sitio] → Add code
o
Tools → Get code
```

#### **Paso 3: Seleccionar formato**

**Native Banner (recomendado):**
```
Tipo: Native Ads
Tamaño: Adaptable
```

**Banner estándar:**
```
Tipo: Display Banner
Tamaño: 300x250 o 728x90
```

**Push Notifications (opcional):**
```
Tipo: In-Page Push
Más ingresos pero más intrusivo
```

#### **Paso 4: Copiar código**
```
Te darán algo como:

<div id="evadav-native"></div>
<script>
(function(w,q){w[q]=w[q]||[];w[q].push(["_mgc.load"])})(window,"_mgc");
</script>
<script src="https://jsc.mgid.com/..."></script>
```

---

## 📝 Dónde pegar los códigos:

### **En tu archivo index.html:**

**Ubicación en el código:**
```
Línea ~189: Espacio leaderboard
Línea ~295: Espacio inline
Línea ~406: Espacio sidebar
```

### **Estructura actual:**

**Espacio 1: Inline (línea ~295)**
```html
<div class="ad-slot ad-slot--inline">
  <span class="ad-slot__label">ANUNCIO</span>
  <!-- REEMPLAZA ESTE COMENTARIO CON CÓDIGO DE ADSTERRA 300x250 -->
</div>
```

**Espacio 2: Leaderboard (línea ~189)**
```html
<div class="ad-slot ad-slot--leaderboard">
  <span class="ad-slot__label">ANUNCIO</span>
  <!-- REEMPLAZA ESTE COMENTARIO CON CÓDIGO DE EVADAV 728x90 -->
</div>
```

**Espacio 3: Sidebar (línea ~406)**
```html
<div class="ad-slot ad-slot--sidebar">
  <span class="ad-slot__label">ANUNCIO</span>
  <!-- REEMPLAZA ESTE COMENTARIO CON CÓDIGO DE ADSTERRA 300x250 o 160x600 -->
</div>
```

---

## 🎯 Ejemplo completo:

### **Espacio inline CON código de Adsterra:**

**ANTES:**
```html
<div class="ad-slot ad-slot--inline">
  <span class="ad-slot__label">ANUNCIO</span>
  <!-- PEGA AQUÍ TU CÓDIGO DE ADSENSE -->
</div>
```

**DESPUÉS:**
```html
<div class="ad-slot ad-slot--inline">
  <span class="ad-slot__label">ANUNCIO</span>
  
  <!-- Adsterra Banner 300x250 -->
  <script type="text/javascript">
  atOptions = {
    'key' : 'tu-key-aqui',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
  </script>
  <script type="text/javascript" src="//www.topcreativeformat.com/xxxxx/invoke.js"></script>
</div>
```

---

## 🔍 Cómo identificar de qué red es un anuncio:

### **Método 1: Inspeccionar elemento (F12)**

1. Clic derecho sobre el anuncio
2. "Inspeccionar" o "Inspect"
3. Busca en el HTML:

**Si ves:**
```html
<iframe src="...profitableratecpmnetwork.com...">
→ Es de ADSTERRA ✅

<iframe src="...avases.com..." o "...feldot.com...">
→ Es de EVADAV ✅
```

### **Método 2: Hover sobre el anuncio**

Pasa el mouse sobre el anuncio (sin hacer clic) y mira la URL en la esquina inferior izquierda:

```
feldot.com → Evadav
avases.com → Evadav
profitableratecpmnetwork.com → Adsterra
topcreativeformat.com → Adsterra
```

### **Método 3: Revisar dashboards**

**Adsterra:**
```
Dashboard → Statistics → Today → "Impressions"
Si hay impresiones = Adsterra está activo
```

**Evadav:**
```
Dashboard → Reports → "Views" o "Impressions"
Si hay views = Evadav está activo
```

---

## 🎨 Personalización avanzada:

### **Desactivar una red específica:**

**Para DESACTIVAR Adsterra:**
```html
<!-- En index.html, comenta o elimina: -->

<!-- Adsterra Native Banner -->
<!-- <script src="https://pl31359340.profitableratecpmnetwork.com/66/48/aa/6648aa152a09188af46bc2c6449670c9.js"></script> -->
```

**Para DESACTIVAR Evadav:**
```html
<!-- En index.html, comenta o elimina: -->

<!-- Evadav Native Ads -->
<!-- <script>(function(d){let s=d.createElement('script');...})(document);</script> -->

<!-- Y también elimina el Service Worker registration al final del body -->
```

### **Dejar solo natives automáticos (sin banners):**

Simplemente **NO agregues códigos** en los espacios vacíos. Los natives seguirán funcionando automáticamente.

---

## 💡 Tips de optimización:

### **1. No satures con anuncios**
```
✅ 2-3 anuncios por página = Óptimo
⚠️ 4-5 anuncios = Aceptable
❌ 6+ anuncios = Malo (usuarios se van)
```

### **2. Prueba y compara**

**Semana 1:**
```
Solo native ads (automáticos)
Anota ingresos
```

**Semana 2:**
```
Agrega 1 banner 300x250
Compara ingresos vs Semana 1
```

**Semana 3:**
```
Agrega más banners si Semana 2 fue mejor
```

### **3. Prioriza UX sobre ingresos**
```
Usuarios molestos = Se van = Menos visitas = Menos dinero

Mejor: Pocos anuncios + buenos ingresos + usuarios contentos
```

---

## 🚀 Próximos pasos:

### **Paso 1: Identificar anuncio actual**
```
F12 → Inspeccionar el anuncio que ves
Ver si es de Adsterra o Evadav
```

### **Paso 2: Decidir estrategia**
```
¿Quieres agregar más anuncios?
→ SÍ: Obtén códigos de banners
→ NO: Deja solo los natives (más limpio)
```

### **Paso 3: Obtener códigos**
```
Ve a Adsterra/Evadav dashboards
Crea placements
Copia códigos
```

### **Paso 4: Pégame los códigos aquí**
```
Yo los integro en los espacios correctos
Subo cambios a GitHub
Tu sitio se actualiza automáticamente
```

---

## ❓ FAQ:

**P: ¿Puedo usar solo Adsterra en todos los espacios?**
R: Sí, solo obtén 3 códigos diferentes de Adsterra y pégalos en los 3 espacios.

**P: ¿Es mejor tener muchos anuncios o pocos?**
R: Pocos pero bien ubicados. Calidad > Cantidad.

**P: ¿Los anuncios nativos cuentan como uno de los espacios?**
R: No, los natives aparecen automáticamente ADEMÁS de los espacios manuales.

**P: ¿Cuánto tiempo tarda en aparecer un banner nuevo?**
R: Inmediatamente después de subir el código (2-5 minutos).

**P: ¿Puedo cambiar los códigos después?**
R: Sí, solo reemplaza el código antiguo por el nuevo y haz commit/push.

---

¿Listo para agregar banners? Dame los códigos cuando los tengas y los integro en 5 minutos.
