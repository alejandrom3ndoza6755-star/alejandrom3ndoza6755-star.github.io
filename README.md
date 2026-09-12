# DocFormato

Convierte una foto de un documento en Word editable, conservando **párrafos, viñetas, alineación y tablas**. Todo ocurre en el navegador.

## Características

- ✅ **Detección de tablas**: Identifica automáticamente campos tipo formulario (Nombre:, Apellido:, etc.) y los convierte en tablas de Word
- ✅ **Preserva estructura**: Mantiene párrafos, listas con viñetas y alineación del texto
- ✅ **100% local**: Todo el procesamiento ocurre en tu navegador, tus documentos no se envían a ningún servidor
- ✅ **Editable**: Revisa y corrige el texto antes de descargar
- ✅ **Múltiples formatos**: Soporta JPG, PNG y HEIC (fotos de iPhone)

## Cómo usar

Abrir `index.html` desde un servidor local (no como archivo suelto) para que el motor de lectura funcione.

### Servidor local rápido

**Python:**
```bash
python -m http.server 8137
```

**Node.js:**
```bash
npx http-server -p 8137
```

Luego abre: http://127.0.0.1:8137/

## Nuevas mejoras

### Detección de tablas

El sistema ahora detecta automáticamente estructuras de tabla en documentos, como:

```
Apellidos: Linares Mendoza
Nombres: Miguel Alejandro
N° de carné: Lm23040
Matriculado en la carrera:
Ingeniería en Desarrollo de Software
```

Y las convierte en tablas reales de Word con:
- Dos columnas (etiqueta y valor)
- Bordes y formato profesional
- Estructura editable en Word

### Criterios de detección

Una tabla se detecta cuando hay:
1. 2 o más líneas consecutivas con formato "Etiqueta: Valor"
2. Etiquetas cortas (menos de 60 caracteres)
3. Espaciado uniforme entre líneas
4. Alineación horizontal consistente

## Estructura del proyecto

```
ocr-word-formato/
├── index.html          # Página principal
├── main.js             # Lógica de OCR y detección de tablas
├── styles.css          # Estilos incluyendo tablas
├── lib/
│   ├── manifest.js     # Configuración de vendors
│   └── vendor/         # Bibliotecas externas (Tesseract, docx, etc.)
└── README.md           # Este archivo
```

## Tecnologías

- **Tesseract.js**: Motor de OCR en JavaScript
- **docx.js**: Generación de documentos Word
- **heic-to.js**: Conversión de imágenes HEIC a JPEG
- Vanilla JavaScript (sin frameworks)
