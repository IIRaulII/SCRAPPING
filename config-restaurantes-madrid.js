/**
 * Configuración para buscar restaurantes en Madrid
 */

const config = {
    // Término de búsqueda
    searchTerm: "restaurantes",
    
    // Ciudad (Madrid)
    city: "madrid",
    
    // Número máximo de páginas a scrapear
    maxPages: 2,
    
    // Nombre del archivo de salida (sin extensión)
    outputFile: "restaurantes-madrid"
};

module.exports = config; 