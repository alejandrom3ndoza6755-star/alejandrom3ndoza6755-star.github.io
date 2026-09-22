# Instrucciones para agregar códigos de Adsterra

## ✅ Anuncios actuales configurados:

### 1. **Banner Superior (728x90)** - Después del hero
- **Ubicación**: Línea ~209 en `index.html`
- **Código actual**: Ya configurado
- **Estado**: ✅ Funcionando

### 2. **Banner Medio (300x250)** - Entre secciones
- **Ubicación**: Línea ~325 en `index.html`  
- **Código actual**: Ya configurado
- **Estado**: ✅ Funcionando

### 3. **Banner Sidebar (300x250)** - Nueva ubicación
- **Ubicación**: Línea ~464 en `index.html`
- **Código**: Busca `TU_KEY_ADSTERRA_SIDEBAR`
- **Estado**: ⚠️ PENDIENTE - Reemplazar con tu código de Adsterra

### 4. **Banner Pre-Footer (300x250)** - Nueva ubicación
- **Ubicación**: Línea ~458 en `index.html`
- **Código**: Busca `TU_KEY_ADSTERRA_PREFOOTER`
- **Estado**: ⚠️ PENDIENTE - Reemplazar con tu código de Adsterra

---

## 📝 Cómo obtener los códigos en Adsterra:

1. Inicia sesión en tu cuenta de Adsterra
2. Ve a **"Add Zone"** o **"Añadir zona"**
3. Selecciona formato **"Banner"** → **300x250**
4. Copia el código que te dan (incluye el `key`)
5. Reemplaza `TU_KEY_ADSTERRA_SIDEBAR` y `TU_KEY_ADSTERRA_PREFOOTER` con tus keys reales

---

## 🔄 Formato del código de Adsterra:

```html
<script type="text/javascript">
  atOptions = {
    'key' : 'abc123def456',  ← Tu key real aquí
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script type="text/javascript" src="//www.topcreativeformat.com/abc123def456/invoke.js"></script>
```

---

## 📊 Distribución de anuncios en el sitio:

```
┌─────────────────────────────────┐
│ Header + Hero                   │
├─────────────────────────────────┤
│ 🟦 Banner Superior (728x90)     │ ← Ya configurado
├─────────────────────────────────┤
│ Cómo funciona                   │
│ Comparación OCR                 │
├─────────────────────────────────┤
│ 🟦 Banner Medio (300x250)       │ ← Ya configurado
├─────────────────────────────────┤
│ Sección SEO                     │
│ Ideas de uso                    │
│ FAQ                             │
├─────────────────────────────────┤
│ 🟦 Banner Pre-Footer (300x250)  │ ← NUEVO - Pendiente
├─────────────────────────────────┤
│ Footer                          │
└─────────────────────────────────┘

SIDEBAR (derecha):
┌─────────────────┐
│ 🟦 Banner       │ ← NUEVO - Pendiente
│   Sidebar       │
│   (300x250)     │
└─────────────────┘
```

---

## ⚠️ Notas importantes:

1. **No agregues interstitial de EvaDav** ya que no fue aprobado
2. **Espera aprobación de Adsterra** antes de que los anuncios se muestren (24-48h)
3. Los espacios están listos, solo falta pegar los códigos reales
4. Después de agregar los códigos, haz commit y push:

```bash
git add index.html
git commit -m "Add Adsterra ad codes for sidebar and pre-footer"
git push origin main
```

---

## 🎯 Ventajas de estas ubicaciones:

- **Sidebar**: Visible durante todo el scroll (desktop)
- **Pre-Footer**: Alta visibilidad antes de salir del sitio
- **No invasivo**: No interrumpe la experiencia del usuario
- **Buena distribución**: Espaciado natural entre anuncios
