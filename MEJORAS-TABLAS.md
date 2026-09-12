# Mejoras para Detección de Tablas

## Cambios Realizados

### 1. Detección Automática de Tablas
Se agregó la función `detectTableRows()` que:
- Detecta líneas con formato "Etiqueta: Valor"
- Agrupa líneas consecutivas que forman una tabla
- Identifica patrones de tabla basándose en la proximidad y formato

### 2. Nuevo Tipo de Elemento: `table`
Los párrafos ahora pueden ser de tres tipos:
- `paragraph` - Texto normal
- Viñetas (marcadas con `isBullet: true`)
- `table` - Estructuras tabulares con filas de etiqueta:valor

### 3. Renderizado de Tablas en el Editor
- Las tablas se muestran con formato visual en el preview
- Dos columnas: etiqueta (35%) y valor (65%)
- Bordes y colores para distinguir las celdas
- Diseño responsivo

### 4. Exportación a Word con Tablas Reales
- Las tablas se exportan como `Table` de Word (no texto plano)
- Bordes, márgenes y formato profesional
- Mantiene la estructura original del documento

## Cómo Funciona

### Detección
El sistema busca patrones como:
```
Apellidos: Linares Mendoza
Nombres: Miguel Alejandro
N° de carné: Lm23040
```

Y los convierte en una tabla con dos columnas.

### Criterios de Detección
1. Línea contiene dos puntos (`:`)
2. Líneas consecutivas están espaciadas uniformemente
3. El texto es corto (< 80 caracteres por línea)
4. Al menos 2 filas consecutivas forman la tabla

## Estilos CSS Añadidos

Se agregaron estilos para `table.doc-table` con:
- Bordes sutiles
- Fondo diferenciado para etiquetas
- Diseño responsive para móviles
- Espaciado consistente

## Prueba

Para probar los cambios:
1. Abre el proyecto en un servidor local
2. Sube una imagen con campos tipo formulario (Nombre:, Apellido:, etc.)
3. Verifica que aparezca como tabla en el preview
4. Descarga el Word y confirma que la tabla se ve correctamente

## Ejemplo de Documento que Detecta Tablas

```
CONSTANCIA DE APROBACIÓN

El suscrito Tutor del Servicio Social hace constar:

Apellidos: Linares Mendoza
Nombres: Miguel Alejandro
N° de carné: Lm23040
Matriculado en la carrera:
Ingeniería en Desarrollo de Software

Ha cumplido satisfactoriamente...
```

La sección con "Apellidos:", "Nombres:", etc. será detectada como tabla.
