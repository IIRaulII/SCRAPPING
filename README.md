# Scraper Genérico para Páginas Amarillas

Este proyecto es un scraper genérico que permite extraer información básica de negocios desde Páginas Amarillas. Está diseñado para ser fácilmente configurable para diferentes tipos de búsquedas y ciudades.

## Características

- ✅ Web scraping efectivo con Puppeteer
- ✅ Extracción de información básica: nombre, dirección y teléfono
- ✅ Búsqueda configurable por tipo de negocio y ciudad
- ✅ Navegación automática a través de múltiples páginas
- ✅ Sistema de configuración mediante archivos externos
- ✅ Manejo inteligente de elementos dinámicos y modales
- ✅ Guardado de resultados en formato JSON
- ✅ Interfaz web de prueba para facilitar la ejecución y visualización
- ✅ Visualización en tiempo real del progreso del scraping
- ✅ Descarga directa de archivos de resultados

## Datos extraídos de cada negocio

- Nombre del establecimiento
- Dirección completa
- Número de teléfono

## Requisitos previos

- Node.js 14.0 o superior
- npm o yarn

## Instalación

```bash
# Clonar el repositorio (si estás usando control de versiones)
git clone <url-del-repositorio>
cd <nombre-del-repositorio>

# Instalar dependencias
npm install
```

## Uso

### Configuración

El scraper utiliza archivos de configuración para definir los parámetros de búsqueda. Puedes ver un ejemplo en el archivo `config.js`:

```javascript
const config = {
    // Término de búsqueda (obligatorio)
    searchTerm: "bares",
    
    // Ciudad (opcional, usar "all-ci" para buscar en todas)
    city: "all-ci",
    
    // Número máximo de páginas a scrapear
    maxPages: 10,
    
    // Nombre del archivo de salida (sin extensión)
    outputFile: "resultados"
};
```

### Ejecución desde línea de comandos

Hay varias formas de ejecutar el scraper:

1. **Usando la configuración predeterminada**:
```bash
npm run scrape
```

2. **Buscando bares (configuración por defecto)**:
```bash
npm run scrape:bares
```

3. **Buscando restaurantes en Madrid**:
```bash
npm run scrape:restaurantes
```

4. **Usando un archivo de configuración personalizado**:
```bash
npm run search config-personalizado.js
```

También puedes ejecutar directamente:
```bash
node run-search.js config-personalizado.js
```

### Interfaz de prueba

El proyecto incluye una interfaz web sencilla para facilitar las pruebas y visualización de resultados:

1. **Iniciar el servidor**:
```bash
npm run test-server
```

2. **Acceder a la interfaz**:
Abre tu navegador y ve a http://localhost:3000

3. **Funcionalidades de la interfaz**:
   - Ejecutar scraping usando configuraciones existentes
   - Crear configuraciones rápidas para búsquedas específicas
   - Ver y navegar por los resultados obtenidos
   - Refrescar la lista de resultados
   - Visualizar en tiempo real el progreso del scraping con mensajes de consola
   - Descargar archivos JSON de resultados completos

### Monitoreo del progreso en tiempo real

La interfaz web incluye una sección de "Progreso del scraping" que muestra en tiempo real los mensajes del proceso:

- Mensajes de inicialización
- Progreso del scraping página a página
- Errores y advertencias
- Confirmación de finalización

### Descarga de resultados

Puedes descargar los archivos JSON de resultados directamente desde la interfaz web:

1. Selecciona un archivo de resultados de la lista
2. Haz clic en el botón "Descargar JSON"
3. El archivo se descargará automáticamente con el mismo nombre

## Crear configuraciones personalizadas

Puedes crear tus propios archivos de configuración para diferentes búsquedas:

1. Crea un nuevo archivo (por ejemplo `config-farmacias-barcelona.js`)
2. Define el objeto de configuración:
```javascript
const config = {
    searchTerm: "farmacias",
    city: "barcelona",
    maxPages: 5,
    outputFile: "farmacias-barcelona"
};

module.exports = config;
```
3. Ejecuta el scraper con tu configuración:
```bash
node run-search.js config-farmacias-barcelona.js
```

## Estructura del proyecto

- `index_paginas_amarillas.js`: Archivo principal del scraper
- `run-search.js`: Script para ejecutar búsquedas con configuraciones personalizadas
- `config.js`: Configuración predeterminada 
- `config-restaurantes-madrid.js`: Ejemplo de configuración alternativa
- `resultados-bares.json`: Archivo de salida con los resultados de la búsqueda predeterminada
- `test/`: Carpeta con la interfaz web de prueba
  - `server.js`: Servidor Express para la interfaz
  - `public/`: Archivos estáticos de la interfaz
    - `index.html`: Página principal
    - `css/styles.css`: Estilos CSS
    - `js/app.js`: Lógica JavaScript
  - `logs/`: Carpeta donde se almacenan los logs de cada proceso de scraping

## Estructura de los datos

El archivo de resultados tendrá la siguiente estructura:

```json
[
  {
    "nombre": "Bar Ejemplo",
    "direccion": "Calle Gran Vía, 25, 28013, Madrid",
    "telefono": "912 345 678"
  },
  {
    "nombre": "Restaurante Muestra",
    "direccion": "Plaza Mayor, 5, 08002, Barcelona",
    "telefono": "934 567 890"
  }
]
```

## Solución de problemas

- Si el scraper no encuentra resultados, se guardará el HTML de la página para inspección en archivos con nombre `pagina_X_sin_resultados.html`
- Para depuración, el scraper guarda capturas de pantalla de la página inicial en `debug-pagina-inicial.png`
- El script siempre muestra mensajes de progreso detallados en la consola
- La interfaz de prueba guarda logs de ejecución en `test/logs/` que se pueden consultar en tiempo real
- Si después de iniciar un proceso no aparecen mensajes en la sección de logs, verifica que el servidor esté ejecutándose correctamente

## Consideraciones legales

- Este scraper está diseñado para fines educativos y personales
- Asegúrate de revisar los términos de servicio de Páginas Amarillas antes de utilizarlo
- El uso excesivo puede resultar en el bloqueo de tu IP
- Los datos extraídos deben utilizarse de acuerdo con las leyes de protección de datos aplicables

## Licencia

[MIT](LICENSE) 