const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const config = require('./config');

// Función de espera usando setTimeout y Promise
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeProducts() {
    // Validar configuración
    if (!config.searchTerm) {
        throw new Error('El término de búsqueda (searchTerm) es obligatorio en la configuración');
    }
    
    // Ajustar valores predeterminados si no están definidos
    const searchTerm = config.searchTerm;
    const city = config.city || 'all-ci';
    const maxPages = config.maxPages || 10;
    const outputFile = (config.outputFile || 'resultados') + '.json';
    
    // Construir URL base según la configuración
    let URL_BASE;
    if (city === 'all-ci') {
        URL_BASE = `https://www.paginasamarillas.es/search/${searchTerm}/all-ma/all-pr/all-is/all-ci/all-ba/all-pu/all-nc/1`;
    } else {
        URL_BASE = `https://www.paginasamarillas.es/search/${searchTerm}/all-ma/all-pr/all-is/${city}/all-ba/all-pu/all-nc/1`;
    }
    
    console.log(`Iniciando el proceso de scraping para "${searchTerm}" en "${city === 'all-ci' ? 'todas las ciudades' : city}"...`);
    console.log(`URL base: ${URL_BASE}`);
    
    // Iniciar el navegador
    const browser = await puppeteer.launch({
        headless: 'new', // Usar el nuevo modo headless
        defaultViewport: null,
        args: ['--window-size=1920,1080', '--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Configurar headers para evitar detección de bot
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        // Array para almacenar todos los negocios
        const allBusinesses = [];
        
        // Ir a la primera página
        console.log('Navegando a la página principal...');
        await page.goto(URL_BASE, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Para debugging, guardar una captura de la página inicial
        await page.screenshot({ path: 'debug-pagina-inicial.png' });
        
        // Función para cerrar modales o popups de cookies que puedan aparecer
        const closeModals = async () => {
            try {
                // Esperar un poco para que aparezcan los modales
                await wait(2000);
                
                // Comprobar modal de cookies y cerrarlo si existe
                const cookieAcceptButton = await page.$('#onetrust-accept-btn-handler');
                if (cookieAcceptButton) {
                    await cookieAcceptButton.click();
                    console.log('Modal de cookies cerrado');
                    await wait(1000);
                }
                
                // Intentar cerrar otros modales
                const otherModalCloseButtons = await page.$$('.modal-close, .close-modal, .btn-close');
                for (const button of otherModalCloseButtons) {
                    // Verificar si el botón es visible usando JavaScript
                    const isVisible = await page.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && 
                               style.visibility !== 'hidden' && 
                               style.opacity !== '0' &&
                               el.offsetWidth > 0 &&
                               el.offsetHeight > 0;
                    }, button);
                    
                    if (isVisible) {
                        try {
                            await button.click();
                            console.log('Otro modal cerrado');
                            await wait(1000);
                        } catch (clickError) {
                            console.log('Error al hacer clic en el botón:', clickError.message);
                        }
                    }
                }
            } catch (error) {
                console.log('No se encontró ningún modal o hubo un error al cerrarlo:', error.message);
            }
        };
        
        // Cerrar modales al inicio
        await closeModals();
        
        let pageNumber = 1;
        
        while (pageNumber <= maxPages) {
            console.log(`Scrapeando página ${pageNumber}...`);
            
            // Esperar a que la página cargue completamente
            await wait(3000);
            
            // Intentar varios selectores posibles para los resultados
            const selectors = [
                '.listado-item', 
                '.item-list', 
                '.business-listing',
                '.result-item',
                '.comercial-item',
                '.card-item',
                '.listado',
                'article'
            ];
            
            let foundSelector = null;
            for (const selector of selectors) {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    foundSelector = selector;
                    console.log(`Encontrado selector válido: ${selector} (${elements.length} elementos)`);
                    break;
                }
            }
            
            if (!foundSelector) {
                console.log('No se encontraron elementos con los selectores probados');
                // Guarda la página para inspección
                const htmlContent = await page.content();
                await fs.writeFile(`pagina_${pageNumber}_sin_resultados.html`, htmlContent);
                console.log(`Se ha guardado la página ${pageNumber} para inspección`);
                break;
            }
            
            // Extraer datos de la página actual con el selector encontrado
            const businessesOnPage = await page.evaluate((selector) => {
                const elements = document.querySelectorAll(selector);
                const results = [];
                
                elements.forEach(item => {
                    // Intentar diferentes selectores para el nombre
                    const nameSelectors = ['.lnk-nombre', 'h2', '.nombre', '.title', '.business-name', 'a[data-omniclick]'];
                    let name = 'Sin nombre';
                    
                    for (const nameSelector of nameSelectors) {
                        const nameElement = item.querySelector(nameSelector);
                        if (nameElement) {
                            name = nameElement.innerText.trim();
                            break;
                        }
                    }
                    
                    // Intentar diferentes selectores para la dirección
                    const addressSelectors = ['.direccion', '.address', '.location', '.street-address'];
                    let address = 'Sin dirección';
                    
                    for (const addressSelector of addressSelectors) {
                        const addressElement = item.querySelector(addressSelector);
                        if (addressElement) {
                            address = addressElement.innerText.trim();
                            break;
                        }
                    }
                    
                    // Intentar diferentes selectores para el teléfono
                    const phoneSelectors = ['.telf', '.telefono', '.phone', '.tel', '[data-omniclick-phone]', '.tlf'];
                    let phone = 'Sin teléfono';
                    
                    for (const phoneSelector of phoneSelectors) {
                        const phoneElement = item.querySelector(phoneSelector);
                        if (phoneElement) {
                            phone = phoneElement.innerText.trim();
                            break;
                        }
                    }
                    
                    // Añadir el elemento solo si tiene al menos nombre o dirección
                    if (name !== 'Sin nombre' || address !== 'Sin dirección') {
                        results.push({
                            nombre: name,
                            direccion: address,
                            telefono: phone
                        });
                    }
                });
                
                return results;
            }, foundSelector);
            
            console.log(`Se encontraron ${businessesOnPage.length} negocios en la página ${pageNumber}`);
            
            // Añadir negocios de esta página al array principal
            allBusinesses.push(...businessesOnPage);
            
            // Verificar si hay más páginas
            if (pageNumber >= maxPages) {
                console.log(`Se ha alcanzado el límite máximo de páginas (${maxPages}). Terminando el scraping.`);
                break;
            }
            
            // Construir la URL de la siguiente página basada en el patrón observado
            pageNumber++;
            let nextPageUrl;
            if (city === 'all-ci') {
                nextPageUrl = `https://www.paginasamarillas.es/search/${searchTerm}/all-ma/all-pr/all-is/all-ci/all-ba/all-pu/all-nc/${pageNumber}?what=${searchTerm}`;
            } else {
                nextPageUrl = `https://www.paginasamarillas.es/search/${searchTerm}/all-ma/all-pr/all-is/${city}/all-ba/all-pu/all-nc/${pageNumber}?what=${searchTerm}`;
            }
            
            console.log(`Navegando a la página ${pageNumber}...`);
            console.log(`URL: ${nextPageUrl}`);
            
            await page.goto(nextPageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            await wait(3000);
            await closeModals();
        }
        
        console.log(`Scraping completado. Se han extraído ${allBusinesses.length} negocios en total.`);
        
        // Guardar los negocios en un archivo JSON
        await fs.writeFile(outputFile, JSON.stringify(allBusinesses, null, 2));
        console.log(`Los datos han sido guardados en ${outputFile}`);
        
        return {
            totalBusinesses: allBusinesses.length,
            pagesScraped: pageNumber,
            outputFile
        };
        
    } catch (error) {
        console.error('Error durante el scraping:', error);
        throw error;
    } finally {
        // Cerrar el navegador
        await browser.close();
        console.log('Navegador cerrado');
    }
}

// Exportar la función para uso en otros archivos
module.exports = { scrapeProducts };

// Si se ejecuta directamente este archivo
if (require.main === module) {
    scrapeProducts()
        .then(result => console.log(`Proceso finalizado exitosamente. Se extrajeron ${result.totalBusinesses} negocios en ${result.pagesScraped} páginas`))
        .catch(error => console.error('Error en el proceso principal:', error));
}