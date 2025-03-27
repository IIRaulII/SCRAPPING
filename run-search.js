/**
 * Script para ejecutar el scraper con una configuración específica
 * 
 * Uso: node run-search.js [archivo-config]
 * Ejemplo: node run-search.js config-restaurantes-madrid.js
 */

const path = require('path');
const fs = require('fs');
const { scrapeProducts } = require('./index_paginas_amarillas');

async function main() {
    try {
        // Obtener el archivo de configuración de los argumentos
        const configArg = process.argv[2];
        const configFile = configArg || 'config.js';
        
        // Comprobar si el archivo existe
        const fullPath = path.resolve(process.cwd(), configFile);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`El archivo de configuración '${configFile}' no existe en ${process.cwd()}`);
        }
        
        console.log(`Cargando configuración desde: ${fullPath}`);
        
        // Modificar temporalmente la configuración global
        const originalConfig = require('./config');
        const customConfig = require(`./${configFile}`);
        
        // Reemplazar propiedades en el objeto de configuración global
        Object.keys(customConfig).forEach(key => {
            require('./config')[key] = customConfig[key];
        });
        
        console.log('================================');
        console.log('Configuración cargada:');
        console.log(`- Término de búsqueda: ${require('./config').searchTerm}`);
        console.log(`- Ciudad: ${require('./config').city || 'Todas las ciudades'}`);
        console.log(`- Máximo de páginas: ${require('./config').maxPages || 10}`);
        console.log(`- Archivo de salida: ${(require('./config').outputFile || 'resultados') + '.json'}`);
        console.log('================================');
        
        // Ejecutar el scraper
        console.log('Iniciando proceso de scraping...');
        const result = await scrapeProducts();
        
        console.log('================================');
        console.log('Resultados del scraping:');
        console.log(`- Negocios extraídos: ${result.totalBusinesses}`);
        console.log(`- Páginas procesadas: ${result.pagesScraped}`);
        console.log(`- Archivo de resultados: ${result.outputFile}`);
        console.log('================================');
        
        // Restaurar la configuración original si es necesario
        if (configArg) {
            Object.keys(originalConfig).forEach(key => {
                require('./config')[key] = originalConfig[key];
            });
        }
        
    } catch (error) {
        console.error('Error durante la ejecución:', error.message);
        process.exit(1);
    }
}

// Ejecutar la función principal
main(); 