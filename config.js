/**
 * Configuración para el scraper de Páginas Amarillas
 * 
 * Parámetros disponibles:
 * - searchTerm: El término de búsqueda (ej: "bares", "restaurantes", "farmacias")
 * - city: La ciudad donde buscar. Usar "all-ci" para buscar en todas las ciudades
 * - maxPages: Número máximo de páginas a scrapear (por defecto: 10)
 */

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

// Actualizar el nombre del archivo si se desea una nomenclatura específica
config.outputFile = `resultados-${config.searchTerm}${config.city !== 'all-ci' ? '-' + config.city : ''}`;

module.exports = config; 