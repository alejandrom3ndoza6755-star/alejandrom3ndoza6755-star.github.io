# Mejoras v3 - Detección de Tablas Grid (Multi-columna)

## 🎯 Nuevo Tipo de Tabla Soportado

Ahora el sistema detecta **dos tipos de tablas**:

### 1. Tablas de Formulario (existente)
**Formato:** `Etiqueta: Valor`

```
Nombre: Juan Pérez
Email: juan@example.com
Teléfono: 555-1234
```

→ Se convierte en tabla de 2 columnas

### 2. Tablas Grid (NUEVO) ✨
**Formato:** Múltiples columnas alineadas espacialmente

```
FECHA      ENTRADA  SALIDA  ACTIVIDADES
25/06/25   8:00 AM  4:00 PM Clasificación de archivos
26/06/25   8:00 AM  4:00 PM Limpieza en laboratorio
```

→ Se convierte en tabla de N columnas

## 🔍 Cómo Funciona la Detección Grid

### Algoritmo `detectGridTable()`

1. **Agrupa líneas por altura vertical**
   - Líneas en la misma fila están a ±0.6x altura de línea

2. **Identifica filas multi-columna**
   - Busca filas con 2+ fragmentos de texto separados horizontalmente

3. **Detecta columnas**
   - Analiza las posiciones X de todos los textos
   - Agrupa posiciones similares (±40px) como columnas

4. **Requisitos mínimos**
   - Al menos 2 filas con múltiples columnas
   - Al menos 2 columnas distintas

### Ejemplo con Tu Documento (Bitácora)

**Estructura detectada:**

| Columna 1 | Columna 2 | Columna 3 | Columna 4 | Columna 5 |
|-----------|-----------|-----------|-----------|-----------|
| FECHA | ENTRADA | SALIDA | FIRMA | ACTIVIDADES |
| 25/06/25 | 8:00 AM | 4:00 PM | ✓ | Clasificación... |
| 26/06/25 | 8:00 AM | 4:00 PM | ✓ | Revisión... |

## 📊 Renderizado

### En el Preview (HTML)
```html
<table class="doc-table doc-table--grid">
  <tr>
    <td>FECHA</td>
    <td>ENTRADA</td>
    <td>SALIDA</td>
    ...
  </tr>
  <tr>
    <td>25/06/25</td>
    <td>8:00 AM</td>
    <td>4:00 PM</td>
    ...
  </tr>
</table>
```

**Estilos CSS:**
- Primera fila: fondo destacado (encabezado)
- Resto de filas: fondo blanco
- Todas las celdas tienen bordes
- Responsive en móviles

### En Word (DOCX)
- Tabla real de Word con N columnas
- Ancho automático distribuido equitativamente
- Bordes en todas las celdas
- Fuente Calibri tamaño 20 (más pequeña que tablas form)

## 🎨 Características Visuales

### Tabla Form (2 columnas)
```css
.doc-table td.table-label {
  width: 35%;
  background: teal-soft;
  font-weight: 600;
}

.doc-table td.table-value {
  width: 65%;
  background: white;
}
```

### Tabla Grid (N columnas)
```css
.doc-table--grid tr:first-child td {
  background: teal-soft;
  font-weight: 600;
  color: teal-dark;
}

.doc-table--grid td {
  font-size: 0.88rem;
  padding: 0.5rem 0.7rem;
}
```

## 🧪 Casos de Uso

### ✅ Detecta Correctamente

1. **Horarios y bitácoras**
   - Columnas: Fecha, Hora entrada, Hora salida, Actividades
   
2. **Tablas de datos**
   - Múltiples campos alineados horizontalmente
   
3. **Formularios complejos**
   - Tablas con más de 2 columnas
   
4. **Encabezados de tabla**
   - Primera fila se destaca automáticamente

### ⚠️ Limitaciones

1. **No detecta tablas sin alineación clara**
   - Si las columnas no están alineadas verticalmente
   
2. **Mínimo 2 columnas x 2 filas**
   - Tablas muy pequeñas se ignoran
   
3. **Prioridad a tablas grid**
   - Si detecta grid, no busca tablas form en ese rango
   
4. **No combina celdas**
   - Cada celda es independiente (sin merge)

## 🔧 Parámetros Ajustables

En `detectGridTable()`:

| Parámetro | Ubicación | Valor | Función |
|-----------|-----------|-------|---------|
| `Math.abs(cy - currentRow.cy) > lineH * 0.6` | ~444 | 0.6 | Tolerancia altura para misma fila |
| `multiColumnRows.length < 2` | ~459 | 2 | Mínimo filas multi-columna |
| `allX0[i] - lastX > 40` | ~472 | 40px | Separación mínima entre columnas |
| `columns.length < 2` | ~478 | 2 | Mínimo número de columnas |

## 📝 Flujo de Detección

```
detectTableRows()
  ↓
  1. Intentar detectar tabla grid
     - detectGridTable(lines)
     - Si detecta ≥3 filas → return grid table
  ↓
  2. Si no hay grid, buscar tablas form
     - Buscar líneas con ":"
     - Agrupar en tablas de 2 columnas
  ↓
  3. Return array de tablas detectadas
```

## 🐛 Debug

### Ver detección en consola

Con `?debug=1` verás:

```
=== TABLAS DETECTADAS === 1
Tabla 0 tipo: grid (líneas 0-15)
  Grid con 6 filas y 4 columnas
```

### Verificar en el preview

- ¿Se ve una tabla con múltiples columnas?
- ¿La primera fila tiene fondo destacado?
- ¿Todas las celdas tienen bordes?

### Verificar en Word

- ¿Es una tabla real de Word?
- ¿Tiene todas las columnas?
- ¿Puedes editarla como tabla normal?

## 🎯 Próximas Mejoras Posibles

### Detección de celdas combinadas
```
┌──────────┬──────────┐
│ Título que abarca    │
│ dos columnas         │
├──────────┼──────────┤
│ Celda 1  │ Celda 2  │
└──────────┴──────────┘
```

### Análisis de bordes visuales
- Detectar líneas horizontales/verticales en la imagen
- Usar para delimitar celdas con mayor precisión

### Smart column width
- Calcular anchos basados en contenido
- Columnas más anchas para texto largo

### Header detection
- Detectar automáticamente si primera fila es encabezado
- Incluso si no tiene formato especial

## 📦 Archivos Modificados

- ✅ `main.js`
  - Nueva función: `detectGridTable()`
  - Modificada: `detectTableRows()` - Prioriza grid
  - Modificada: `renderEditor()` - Renderiza grid tables
  - Modificada: `paragraphsFromEditor()` - Extrae grid tables
  - Modificada: `createWordDocument()` - Genera grid tables en Word
  - Modificada: `analyzeLayout()` - Maneja ambos tipos

- ✅ `styles.css`
  - Nueva clase: `.doc-table--grid`
  - Estilos diferenciados para grid vs form tables
  - Responsive mejorado

## 🧪 Prueba Específica para Tu Bitácora

1. Abre: `http://127.0.0.1:8137/ocr-word-formato/?debug=1`
2. Sube la imagen de la bitácora
3. Verifica en consola:
   ```
   Detectada tabla tipo grid con X filas y Y columnas
   ```
4. En el preview deberías ver:
   - Tabla con columnas: FECHA, ENTRADA, SALIDA, etc.
   - Primera fila con fondo destacado
   - Todas las filas de datos con fondo blanco

5. Descarga el Word y verifica:
   - Tabla con N columnas
   - Editable como tabla normal
   - Bordes en todas las celdas

## 💡 Tips

### Si no detecta todas las columnas
- Verifica que estén separadas por >40px
- Aumenta la tolerancia en línea ~472

### Si detecta demasiadas filas como tabla
- Aumenta el mínimo de filas en línea ~459
- O ajusta la tolerancia de altura en línea ~444

### Si no detecta como grid
- Verifica que haya ≥2 filas con ≥2 columnas
- Revisa los logs para ver qué detectó

## 🎉 Resultado Esperado

Tu bitácora que antes se veía así:
```
FECHA 25/06/25 ENTRADA 8:00 AM SALIDA 4:00 PM ...
```

Ahora se verá como una tabla profesional en Word con todas las columnas correctamente separadas y editables.
