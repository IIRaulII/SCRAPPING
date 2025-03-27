/**
 * Script principal para la interfaz de prueba del scraper
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const configSelect = document.getElementById('config-select');
    const scrapeForm = document.getElementById('scrape-form');
    const statusMessage = document.getElementById('status-message');
    const quickConfigForm = document.getElementById('quick-config-form');
    const searchTermInput = document.getElementById('searchTerm');
    const cityInput = document.getElementById('city');
    const maxPagesInput = document.getElementById('maxPages');
    const resultsSelect = document.getElementById('results-select');
    const refreshResultsBtn = document.getElementById('refresh-results');
    const resultPreview = document.getElementById('result-preview');
    const resultCount = document.getElementById('result-count');
    
    // Crear botón de descargar
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'download-result';
    downloadBtn.className = 'btn small';
    downloadBtn.textContent = 'Descargar JSON';
    downloadBtn.disabled = true; // Inicialmente deshabilitado hasta que se seleccione un resultado
    document.querySelector('.results-actions').appendChild(downloadBtn);
    
    // Agregar un elemento DOM para mostrar los logs
    let logsContainer = document.getElementById('logs-container');
    if (!logsContainer) {
        logsContainer = document.createElement('div');
        logsContainer.id = 'logs-container';
        logsContainer.className = 'logs-container';
        document.querySelector('.results-card').insertAdjacentElement('beforebegin', logsContainer);
        
        // Agregar encabezado para la sección de logs
        const logsHeader = document.createElement('h3');
        logsHeader.textContent = 'Progreso del scraping';
        logsContainer.appendChild(logsHeader);
        
        // Agregar contenedor para los logs
        const logsContent = document.createElement('pre');
        logsContent.id = 'logs-content';
        logsContent.className = 'logs-content';
        logsContent.textContent = 'No hay proceso de scraping en ejecución';
        logsContainer.appendChild(logsContent);
    }
    
    const logsContent = document.getElementById('logs-content');
    
    // Variable para almacenar el ID del proceso actual
    let currentProcessId = null;
    // Variable para controlar el intervalo de actualización de logs
    let logsUpdateInterval = null;
    // Variable para controlar el intervalo de verificación de resultados
    let checkResultsInterval = null;

    // Cargar las configuraciones al inicio
    loadConfigurations();
    // Cargar los resultados al inicio
    loadResults();

    // Event Listeners
    scrapeForm.addEventListener('submit', startScraping);
    quickConfigForm.addEventListener('submit', createAndRunConfig);
    refreshResultsBtn.addEventListener('click', loadResults);
    resultsSelect.addEventListener('change', loadResultPreview);
    downloadBtn.addEventListener('click', downloadSelectedResult);

    // Funciones
    async function loadConfigurations() {
        try {
            const response = await fetch('/api/configs');
            const data = await response.json();
            
            if (data.success) {
                configSelect.innerHTML = '<option value="">Seleccionar configuración</option>';
                
                data.configs.forEach(config => {
                    const option = document.createElement('option');
                    option.value = config;
                    option.textContent = config;
                    configSelect.appendChild(option);
                });
            } else {
                showStatusMessage('Error al cargar configuraciones: ' + data.error, 'error');
            }
        } catch (error) {
            showStatusMessage('Error de conexión: ' + error.message, 'error');
        }
    }

    async function loadResults() {
        try {
            const response = await fetch('/api/results');
            const data = await response.json();
            
            if (data.success) {
                resultsSelect.innerHTML = '';
                
                if (data.results.length === 0) {
                    const option = document.createElement('option');
                    option.textContent = 'No hay resultados disponibles';
                    option.disabled = true;
                    resultsSelect.appendChild(option);
                } else {
                    data.results.forEach(result => {
                        const option = document.createElement('option');
                        option.value = result;
                        option.textContent = result;
                        resultsSelect.appendChild(option);
                    });
                }
            } else {
                showStatusMessage('Error al cargar resultados: ' + data.error, 'error');
            }
        } catch (error) {
            showStatusMessage('Error de conexión: ' + error.message, 'error');
        }
    }

    // Función principal para iniciar el proceso de scraping
    async function startScrapingProcess(configFile, initialMessage) {
        try {
            showStatusMessage(initialMessage, 'success');
            logsContent.textContent = 'Iniciando proceso...';
            
            // Limpiar intervalos anteriores si existen
            clearAllIntervals();
            
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ configFile })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showStatusMessage(data.message, 'success');
                
                // Guardar el ID del proceso para consultar los logs
                currentProcessId = data.processId;
                
                // Actualizar logs inmediatamente
                await updateProcessLogs();
                
                // Configurar la actualización periódica de logs
                logsUpdateInterval = setInterval(updateProcessLogs, 3000);
                
                // Programar la actualización de resultados después de un tiempo
                setTimeout(() => {
                    showStatusMessage('Esperando finalización del scraping...', 'success');
                }, 5000);
                
                // Verificar resultados periódicamente
                checkResultsInterval = setInterval(async () => {
                    await loadResults();
                    showStatusMessage('Verificando si el scraping ha finalizado...', 'success');
                }, 10000);
                
                // Detener la verificación después de cierto tiempo máximo
                setTimeout(() => {
                    clearAllIntervals();
                    showStatusMessage('El tiempo máximo de seguimiento ha expirado. El proceso podría seguir ejecutándose. Actualiza los resultados manualmente.', 'warning');
                }, 300000); // 5 minutos
                
                return true;
            } else {
                showStatusMessage('Error: ' + data.error, 'error');
                logsContent.textContent = 'Error al iniciar el proceso: ' + data.error;
                return false;
            }
        } catch (error) {
            showStatusMessage('Error de conexión: ' + error.message, 'error');
            logsContent.textContent = 'Error de conexión: ' + error.message;
            return false;
        }
    }
    
    // Función para limpiar todos los intervalos
    function clearAllIntervals() {
        if (logsUpdateInterval) {
            clearInterval(logsUpdateInterval);
            logsUpdateInterval = null;
        }
        if (checkResultsInterval) {
            clearInterval(checkResultsInterval);
            checkResultsInterval = null;
        }
    }

    async function startScraping(event) {
        event.preventDefault();
        
        const configFile = configSelect.value;
        
        if (!configFile) {
            showStatusMessage('Por favor, selecciona una configuración', 'error');
            return;
        }
        
        await startScrapingProcess(configFile, 'Iniciando proceso de scraping...');
    }

    async function createAndRunConfig(event) {
        event.preventDefault();
        
        const searchTerm = searchTermInput.value.trim();
        const city = cityInput.value.trim() || 'all-ci';
        const maxPages = maxPagesInput.value;
        
        if (!searchTerm) {
            showStatusMessage('El término de búsqueda es obligatorio', 'error');
            return;
        }
        
        try {
            showStatusMessage(`Creando configuración para buscar "${searchTerm}" en "${city === 'all-ci' ? 'todas las ciudades' : city}" (${maxPages} páginas)`, 'success');
            logsContent.textContent = 'Creando configuración y preparando proceso...';
            
            // Limpiar intervalos anteriores
            clearAllIntervals();
            
            // Crear una configuración temporal en el servidor
            const createResponse = await fetch('/api/create-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ searchTerm, city, maxPages })
            });
            
            const createData = await createResponse.json();
            
            if (createData.success) {
                showStatusMessage(`Configuración creada: ${createData.configFile}. Iniciando scraping...`, 'success');
                
                // Iniciar el scraping con la configuración recién creada
                const success = await startScrapingProcess(createData.configFile, `Iniciando scraping con la configuración para "${searchTerm}"...`);
                
                if (success) {
                    // Actualizar la lista de configuraciones
                    loadConfigurations();
                }
            } else {
                showStatusMessage('Error al crear la configuración: ' + createData.error, 'error');
                logsContent.textContent = 'Error al crear la configuración: ' + createData.error;
            }
        } catch (error) {
            showStatusMessage('Error: ' + error.message, 'error');
            logsContent.textContent = 'Error: ' + error.message;
        }
    }
    
    // Nueva función para actualizar los logs del proceso
    async function updateProcessLogs() {
        if (!currentProcessId) {
            return;
        }
        
        try {
            const response = await fetch(`/api/process-logs/${currentProcessId}`);
            const data = await response.json();
            
            if (data.success) {
                logsContent.textContent = data.logs || 'El proceso ha iniciado, esperando mensajes...';
                
                // Auto-scroll al final de los logs
                logsContent.scrollTop = logsContent.scrollHeight;
                
                // Si los logs mencionan que el proceso ha terminado, detener la actualización
                if (data.logs.includes('Proceso de scraping finalizado')) {
                    clearAllIntervals();
                    
                    // Actualizar el mensaje de estado para indicar la finalización
                    showStatusMessage('¡Proceso de scraping finalizado! Ya puedes revisar los resultados.', 'success');
                    
                    // Cargar los resultados disponibles después de finalizar
                    await loadResults();
                    
                    // Si hay resultados disponibles, seleccionar el más reciente
                    if (resultsSelect.options.length > 0 && !resultsSelect.options[0].disabled) {
                        resultsSelect.selectedIndex = 0; // Seleccionar el primer resultado (más reciente)
                        await loadResultPreview(); // Cargar la vista previa del resultado seleccionado
                    }
                }
            } else if (response.status === 404) {
                // Si el archivo de logs no existe, puede ser que el proceso no haya iniciado correctamente
                logsContent.textContent = 'No se encontraron logs para este proceso. Es posible que haya terminado o no haya iniciado correctamente.';
                
                clearAllIntervals();
                
                // Actualizar el mensaje de estado
                showStatusMessage('No se pudo seguir el progreso del proceso. Por favor, revisa manualmente los resultados.', 'error');
            } else {
                logsContent.textContent = 'Error al cargar logs: ' + data.error;
            }
        } catch (error) {
            logsContent.textContent = 'Error de conexión al actualizar logs: ' + error.message;
        }
    }

    async function loadResultPreview() {
        const selectedResult = resultsSelect.value;
        
        if (!selectedResult) {
            resultPreview.textContent = 'Selecciona un archivo de resultados para ver su contenido';
            resultCount.textContent = 'Total: 0 registros';
            downloadBtn.disabled = true; // Deshabilitar botón si no hay selección
            return;
        }
        
        // Habilitar botón de descarga si hay una selección
        downloadBtn.disabled = false;
        
        try {
            const response = await fetch(`/api/result/${selectedResult}`);
            const data = await response.json();
            
            if (data.success) {
                if (Array.isArray(data.content)) {
                    // Si es un array, como esperamos, mostramos solo los primeros 10 elementos
                    resultCount.textContent = `Total: ${data.content.length} registros`;
                    
                    const previewContent = data.content.slice(0, 10);
                    resultPreview.textContent = JSON.stringify(previewContent, null, 2) + 
                        (data.content.length > 10 ? '\n\n... (mostrando 10 de ' + data.content.length + ' registros)' : '');
                } else {
                    // Si no es un array, mostramos como está
                    resultCount.textContent = 'Total: desconocido';
                    resultPreview.textContent = JSON.stringify(data.content, null, 2);
                }
            } else {
                resultPreview.textContent = 'Error al cargar el archivo: ' + data.error;
                downloadBtn.disabled = true; // Deshabilitar botón en caso de error
            }
        } catch (error) {
            resultPreview.textContent = 'Error de conexión: ' + error.message;
            downloadBtn.disabled = true; // Deshabilitar botón en caso de error
        }
    }
    
    // Función para descargar el resultado seleccionado
    async function downloadSelectedResult() {
        const selectedResult = resultsSelect.value;
        
        if (!selectedResult) {
            showStatusMessage('Selecciona un archivo de resultados para descargar', 'error');
            return;
        }
        
        try {
            // Mostrar mensaje de carga
            showStatusMessage('Preparando archivo para descarga...', 'success');
            
            // Obtener el contenido completo del resultado
            const response = await fetch(`/api/result/${selectedResult}`);
            const data = await response.json();
            
            if (data.success) {
                // Crear un objeto Blob con el contenido JSON
                const jsonContent = JSON.stringify(data.content, null, 2);
                const blob = new Blob([jsonContent], { type: 'application/json' });
                
                // Crear un enlace temporal para la descarga
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = selectedResult; // Usar el nombre del archivo como nombre de descarga
                
                // Añadir el enlace al DOM, hacer clic y luego eliminarlo
                document.body.appendChild(a);
                a.click();
                
                // Limpiar después de la descarga
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showStatusMessage('Archivo descargado correctamente', 'success');
                }, 100);
            } else {
                showStatusMessage('Error al preparar el archivo: ' + data.error, 'error');
            }
        } catch (error) {
            showStatusMessage('Error de conexión: ' + error.message, 'error');
        }
    }

    function showStatusMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
    }
}); 