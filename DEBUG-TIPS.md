# Tips de Debug para Detección de Tablas

## Cómo ver qué está detectando el OCR

### 1. Abrir la Consola del Navegador

1. Abre el proyecto: http://127.0.0.1:8137/
2. Presiona **F12** o **Ctrl+Shift+I** para abrir DevTools
3. Ve a la pestaña **Console**
4. Sube tu imagen

### 2. Ver las líneas detectadas

Agrega este código temporal en `main.js` dentro de la función `analyzeLayout`, justo después de obtener `visual`:

```javascript
// DEBUG: Ver todas las líneas detectadas
console.log('=== LÍNEAS DETECTADAS ===');
visual.forEach(function(line, i) {
  console.log(i + ':', line.text);
});
```

### 3. Ver qué tablas se detectaron

Agrega después de `detectTableRows`:

```javascript
// DEBUG: Ver tablas detectadas
console.log('=== TABLAS DETECTADAS ===', tables.length);
tables.forEach(function(table, idx) {
  console.log('Tabla ' + idx + ' (líneas ' + table.start + '-' + table.end + '):');
  table.rows.forEach(function(row) {
    console.log('  ' + row.label + ' | ' + row.value);
  });
});
```

### 4. Ver el resultado final

Agrega al final de `analyzeLayout`:

```javascript
// DEBUG: Ver estructura final
console.log('=== ESTRUCTURA FINAL ===');
paragraphs.forEach(function(para, i) {
  if (para.type === 'table') {
    console.log(i + ': TABLE con ' + para.rows.length + ' filas');
  } else {
    console.log(i + ': ' + (para.isBullet ? 'BULLET' : 'PARA') + ' - ' + para.lines.join(' ').substring(0, 50));
  }
});
```

## Problemas Comunes y Soluciones

### Problema 1: No detecta toda la tabla

**Síntoma**: Solo detecta 2-3 filas cuando hay más

**Posibles causas**:
1. Espaciado muy grande entre filas
2. Cambio de alineación horizontal
3. Una línea sin `:` interrumpe la detección

**Solución**:
- Aumenta `spacing < lineH * 3.5` a un valor mayor (ej: 4.0)
- Aumenta `Math.abs(currentLine.bbox.x0 - x) < 40` a 50 o 60

### Problema 2: Detecta cosas que no son tabla

**Síntoma**: Párrafos normales aparecen como tabla

**Posibles causas**:
1. El texto tiene `:` pero no es un campo
2. Líneas muy largas se detectan como tabla

**Solución**:
- Reduce el límite de longitud: `line.text.length < 110` a 90
- Aumenta el mínimo de filas: `tableRows.length >= 2` a 3

### Problema 3: Valores en línea siguiente no se unen

**Síntoma**: 
```
Etiqueta: | 
          | valor en otra línea
```

**Posibles causas**:
1. La línea siguiente está muy abajo
2. No se alinea horizontalmente

**Solución**:
- Aumenta `nextSpacing < lineH * 1.8` a 2.2
- Aumenta `Math.abs(nextLine.bbox.x0 - currentLine.bbox.x0) < 50` a 80

## Ajustes Rápidos

### Para documentos con espaciado amplio
Cambia estos valores en `detectTableRows`:

```javascript
const isClose = spacing < lineH * 3.5;  // Cambiar a 4.5
// ...
if ((currentHasColon || couldBeContinuation) && spacing < lineH * 4.5) {
```

### Para documentos con campos muy largos
```javascript
const isShort = currentLine.text.length < 150;  // Aumentar de 110
// ...
if (labelWords <= 10 || label.length < 80) {  // Aumentar límites
```

### Para mejor detección de valores multi-línea
```javascript
if (nextIsClose && nextNoColon && nextLine.text.length < 150 && (nextAligned || nextLine.text.length < 90)) {
  // Aumentar los límites
}
```

## Mejoras Futuras Sugeridas

### 1. Detección Visual de Bordes
Analizar los píxeles para detectar líneas horizontales/verticales que indiquen bordes de tabla.

### 2. Análisis de Columnas
Detectar columnas basándose en la posición X de las palabras, no solo en los dos puntos.

### 3. Machine Learning
Entrenar un modelo para detectar tablas en imágenes de documentos.

### 4. Heurística de Densidad
Medir la densidad de texto en regiones para identificar áreas tabulares.

## Comandos Útiles

### Recargar sin caché
```
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

### Limpiar localStorage (por si el OCR se cacheó mal)
En la consola:
```javascript
localStorage.clear();
location.reload();
```

### Ver el objeto completo de OCR
```javascript
// En processImage(), después de recognize:
console.log('OCR Data completo:', JSON.stringify(ocrData, null, 2));
```

## Parámetros Actuales (Referencia)

| Parámetro | Valor Actual | Descripción |
|-----------|--------------|-------------|
| Máx. longitud línea tabla | 110 chars | Líneas más largas no se consideran tabla |
| Máx. longitud etiqueta | 70 chars | Etiquetas más largas se descartan |
| Tolerancia alineación | 40px | Desviación horizontal permitida |
| Espaciado máximo filas | 3.5x lineH | Espacio máximo entre filas de tabla |
| Espaciado valor siguiente | 1.8x lineH | Espacio máx para valor en línea siguiente |
| Mínimo filas tabla | 2 | Filas mínimas para considerar tabla |

## Exportar Data para Análisis

Si quieres compartir el resultado del OCR para debug:

```javascript
// En processImage(), después de analyzeLayout:
const dataStr = JSON.stringify({
  lines: visual.map(l => ({ text: l.text, bbox: l.bbox })),
  tables: tables,
  paragraphs: lastParagraphs
}, null, 2);

console.log('Datos para debug:', dataStr);
// Puedes copiar esto y pegarlo en un archivo JSON
```
