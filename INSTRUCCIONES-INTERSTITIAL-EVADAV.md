# 🎯 Instrucciones: Agregar Interstitial de Evadav

## ✅ Lo que ya está hecho:

1. ✅ **Banner 300x250 de Adsterra** agregado (espacio inline)
2. ✅ **Banner 728x90 de Adsterra** agregado (espacio leaderboard)
3. ✅ **Native Ad de Adsterra** funcionando (automático)
4. ✅ **Código preparado** en `main.js` para mostrar interstitial al descargar

---

## ⏳ Lo que falta:

**Obtener el código de Interstitial de Evadav** y agregarlo al sitio.

---

## 📋 Cómo obtener el código de Interstitial:

### **Paso 1: Login en Evadav**
```
https://evadav.com/
```

### **Paso 2: Ir a obtener código**
```
Dashboard → Websites → [Tu sitio] → Add code
o
Tools → Get code
```

### **Paso 3: Seleccionar formato**
```
Busca una de estas opciones:
- "Interstitial"
- "Fullscreen"
- "Overlay"
- "In-Page"
```

**Características del formato:**
- Se muestra en pantalla completa
- Usuario puede cerrar después de 3-5 segundos
- Aparece al hacer clic en descargar
- Alto CPM ($3-8)

### **Paso 4: Copiar el código**

Te darán algo como:

**Opción A: Script directo**
```html
<script>
(function(d,z,s){
  s=d.createElement('script');
  s.type='text/javascript';
  s.async=true;
  s.src='https://xxxxx.com/xxxxx.js';
  d.body.appendChild(s);
})(document);
</script>
```

**Opción B: onClick event**
```html
<script>
function showEvadavAd() {
  // código aquí
}
</script>
```

---

## 🔧 Cómo agregar el código:

### **Una vez que tengas el código de Evadav:**

1. **Cópialo** (Ctrl+C)

2. **Pégalo aquí en el chat** y yo lo integraré en el sitio

3. **Reemplazaré** esta sección en `index.html`:

**ACTUAL (placeholder):**
```html
<script>
  window.evadavShowInterstitial = function() {
    // TODO: Reemplaza esto con el código de interstitial de Evadav
    console.log('Interstitial de Evadav: Agrega el código aquí');
  };
</script>
```

**DESPUÉS (con tu código):**
```html
<script>
  window.evadavShowInterstitial = function() {
    // Tu código de Evadav aquí
    // Se ejecutará al hacer clic en "Descargar Word" o "Descargar TXT"
  };
</script>
```

---

## 🎯 Cómo funcionará:

### **Flujo del usuario:**

```
Usuario usa la herramienta OCR
↓
Extrae el texto
↓
Hace clic en "Descargar Word con formato"
↓
🎬 APARECE INTERSTITIAL DE EVADAV (pantalla completa)
↓
Usuario espera 3-5 segundos
↓
Usuario hace clic en "Cerrar" o "X"
↓
✅ El documento se descarga automáticamente
```

---

## 💰 Ventajas del Interstitial:

### **Monetización:**
```
✅ CPM Alto: $3-8 (vs $1-3 de banners)
✅ Imposible ignorar (pantalla completa)
✅ Se muestra solo al descargar (no molesta mientras usan la herramienta)
```

### **Experiencia de usuario:**
```
✅ Solo aparece AL FINAL (después de usar la herramienta)
✅ Descarga automática después de cerrar
✅ Usuario obtiene valor ANTES del anuncio
```

---

## ⚠️ Alternativa: Pop-under de Adsterra

Si Evadav no tiene interstitial disponible, puedes usar Pop-under de Adsterra:

### **Obtener Pop-under de Adsterra:**

1. Ve a: https://publishers.adsterra.com/
2. Sites → [Tu sitio] → Add Placement
3. Selecciona: **"Popunder"**
4. Copia el código
5. Pégalo en el `<head>` de index.html

**Ventajas:**
- ✅ Más alto CPM ($5-15)
- ✅ Se abre solo una vez por sesión
- ✅ Fácil de implementar

**Desventajas:**
- ⚠️ Más intrusivo (abre ventana nueva)
- ⚠️ Usuarios pueden molestarse

---

## 📊 Configuración actual de anuncios:

### **Activos ahora:**
```
1. Native Ad de Adsterra (automático, arriba)
2. Banner 300x250 de Adsterra (después del texto)
3. Banner 728x90 de Adsterra (después de la herramienta)
4. Native Ad de Evadav (automático, si hay inventario)
```

### **Pendiente:**
```
5. Interstitial de Evadav (al descargar) ← FALTA CÓDIGO
```

---

## 🎯 Total de anuncios proyectado:

```
Página principal:
- 1 Native Ad (Adsterra) automático
- 1 Native Ad (Evadav) automático
- 1 Banner 300x250 (Adsterra)
- 1 Banner 728x90 (Adsterra)

Al descargar:
- 1 Interstitial (Evadav) pantalla completa

TOTAL: 5 puntos de monetización
```

**Balance:** 4 anuncios discretos + 1 interstitial al final = Buen equilibrio UX/monetización

---

## 📈 Proyección de ingresos con esta configuración:

### **Con 100 visitas/día:**
```
Native Ads: $0.50-1/día
Banners 300x250 + 728x90: $1-2/día
Interstitial (20 descargas): $0.60-1.60/día

TOTAL: $2-4.60/día = $60-138/mes
```

### **Con 500 visitas/día:**
```
Native Ads: $2.50-5/día
Banners: $5-10/día
Interstitial (100 descargas): $3-8/día

TOTAL: $10.50-23/día = $315-690/mes
```

### **Con 1,000 visitas/día:**
```
Native Ads: $5-10/día
Banners: $10-20/día
Interstitial (200 descargas): $6-16/día

TOTAL: $21-46/día = $630-1,380/mes 💰💰💰
```

---

## 🚀 Próximos pasos:

### **AHORA (5 minutos):**
1. Ve a Evadav dashboard
2. Busca código de "Interstitial" o "In-Page"
3. Cópialo y pégalo aquí
4. Yo lo integro en el sitio
5. Subo cambios a GitHub

### **En 2-5 minutos:**
6. GitHub Pages actualiza tu sitio
7. ✅ Monetización completa activa

### **DESPUÉS (esta semana):**
8. ✅ ENFÓCATE EN TRÁFICO (TikTok, Reddit)
9. ✅ Meta: 100 visitas/día
10. ✅ Primeros $50-100/mes

---

## 💡 Tips adicionales:

### **Optimización de conversión a descarga:**

**Más descargas = Más interstitials = Más dinero**

Ideas para aumentar descargas:
1. Agrega banner: "¿Listo? Descarga tu documento"
2. Resalta el botón de descarga (color llamativo)
3. Muestra preview del documento antes de descargar
4. Agrega contador: "Descargas hoy: 1,234"

---

## ❓ FAQ:

**P: ¿El interstitial molesta a los usuarios?**
R: Menos de lo que parece. Se muestra DESPUÉS de obtener valor (documento extraído). Es aceptable.

**P: ¿Puedo desactivar el interstitial después?**
R: Sí, solo comenta o elimina el código. O agregar un switch condicional.

**P: ¿Cuántos interstitials se mostrarán por sesión?**
R: Depende de la configuración de Evadav. Usualmente 1-2 por sesión.

**P: ¿Afecta la velocidad del sitio?**
R: Mínimamente. El interstitial solo se carga al hacer clic en descargar.

---

¿Listo para agregar el código? Ve a Evadav, copia el código de Interstitial y pégalo aquí.
