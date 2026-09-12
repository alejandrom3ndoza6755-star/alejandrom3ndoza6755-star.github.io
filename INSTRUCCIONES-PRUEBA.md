# Instrucciones para Probar la Detección de Tablas

## Modo Debug Activado

Para ver logs detallados en la consola, abre:
```
http://127.0.0.1:8137/?debug=1
```

Esto mostrará en la consola del navegador (F12):
- Todas las líneas detectadas por el OCR
- Qué tablas se identificaron
- La estructura final del documento

## Pasos para Probar

### 1. Iniciar Servidor Local

Como estás en Windows, abre PowerShell en la carpeta del proyecto y ejecuta:

**Opción A - Python:**
```powershell
python -m http.server 8137
```

**Opción B - Node.js (si tienes npm):**
```powershell
npx http-server -p 8137
```

### 2. Abrir en el Navegador

Abre tu navegador y ve a:
```
http://127.0.0.1:8137/
```

⚠️ **IMPORTANTE**: NO abras `index.html` haciendo doble clic. Debe ejecutarse desde un servidor.

### 3. Subir la Imagen

1. Click en **"Sube desde la galería"** o arrastra la imagen
2. Usa la imagen del documento que tienes (la que mostraste en WhatsApp)
3. Espera a que se procese (primera vez tarda más porque descarga el motor)

### 4. Verificar la Detección

Revisa el panel derecho **"Texto extraído con formato"**:

✅ **Lo que deberías ver:**
- Una **tabla** con filas como:
  - Apellidos | Linares Mendoza
  - Nombres | Miguel Alejandro
  - N° de carné | Lm23040
  - Matriculado en la carrera | (vacío o texto)
  - Ingeniería en Desarrollo de Software | (si está en la siguiente línea)

✅ **Cómo se ve:**
- Bordes alrededor de la tabla
- Fondo diferente en la columna de etiquetas (color teal/verde claro)
- Dos columnas bien separadas

### 5. Editar si es Necesario

- Puedes hacer click en las celdas y editarlas
- Corrige cualquier error de OCR
- Ajusta valores si algo se leyó mal

### 6. Descargar Word

1. Click en **"Descargar Word con formato"**
2. Se descargará `documento.docx`
3. Abre el archivo en Microsoft Word o LibreOffice Writer

### 7. Verificar el Word

✅ **Lo que deberías ver en Word:**
- Una **tabla real de Word** (no texto plano)
- Dos columnas con bordes
- Puedes hacer click en la tabla y editarla como cualquier tabla de Word
- Puedes agregar filas, cambiar el formato, etc.

## Comparación Antes/Después

### ❌ Antes (sin detección de tablas)
```
Apellidos: Linares Mendoza
Nombres: Miguel Alejandro
N° de carné: Lm23040
Matriculado en la carrera:
Ingeniería en Desarrollo de Software
```
Todo en párrafos separados, sin estructura

### ✅ Después (con detección de tablas)
```
┌─────────────────────────────┬──────────────────────────────────────┐
│ Apellidos                   │ Linares Mendoza                      │
├─────────────────────────────┼──────────────────────────────────────┤
│ Nombres                     │ Miguel Alejandro                     │
├─────────────────────────────┼──────────────────────────────────────┤
│ N° de carné                 │ Lm23040                              │
├─────────────────────────────┼──────────────────────────────────────┤
│ Matriculado en la carrera   │                                      │
├─────────────────────────────┼──────────────────────────────────────┤
│                             │ Ingeniería en Desarrollo de Software │
└─────────────────────────────┴──────────────────────────────────────┘
```

## Solución de Problemas

### La tabla no se detecta
**Posibles causas:**
1. Las líneas están muy separadas (> 3x la altura de línea)
2. Las etiquetas son muy largas (> 60 caracteres)
3. No hay suficientes filas consecutivas (mínimo 2)
4. El OCR no detectó los dos puntos `:` correctamente

**Solución:**
- Edita manualmente el texto en el preview
- O ajusta los parámetros en `detectTableRows()` si es sistemático

### El servidor no inicia
**Error: "command not found"**
- Verifica que tengas Python instalado: `python --version`
- O instala Node.js y usa: `npx http-server -p 8137`

**Error: "puerto en uso"**
- Cambia el puerto: `python -m http.server 8138`
- Y abre: http://127.0.0.1:8138/

### El OCR no funciona
**Error: "No se pudo cargar el motor"**
- Asegúrate de tener conexión a internet (primera vez)
- Verifica que el servidor esté corriendo
- Intenta con otro navegador (Chrome, Firefox, Edge)

## Pruebas Adicionales

### Prueba 1: Tabla Simple
Sube una imagen con campos simples:
```
Nombre: Juan Pérez
Email: juan@example.com
Teléfono: 555-1234
```

### Prueba 2: Tabla con Valores Vacíos
```
Nombre: María García
Dirección:
Ciudad: San Salvador
```

### Prueba 3: Documento Mixto
Un documento con:
- Título centrado
- Párrafo normal
- Tabla de campos
- Lista con viñetas
- Otro párrafo

Todo debería exportarse correctamente a Word.

## Archivos de Referencia

- `MEJORAS-TABLAS.md` - Detalles técnicos
- `CHANGELOG-TABLAS.md` - Resumen de cambios
- `README.md` - Documentación del proyecto

## Siguiente Paso

Una vez que confirmes que funciona correctamente:
1. Haz commit de los cambios
2. Actualiza la versión en producción
3. Prueba con usuarios reales para feedback

## Preguntas Frecuentes

**P: ¿Funciona con tablas de más de 2 columnas?**
R: No, actualmente solo detecta formato "Etiqueta: Valor" (2 columnas)

**P: ¿Puedo ajustar el ancho de las columnas?**
R: Sí, edita los valores `WidthType.PERCENTAGE` en `createWordDocument()`

**P: ¿Detecta tablas con bordes visuales?**
R: No, solo detecta por formato de texto. Los bordes son decorativos.

**P: ¿Funciona en móviles?**
R: Sí, el diseño es responsive. Usa el botón "Tomar foto" en móviles.
