/**
 * Servidor sencillo para la interfaz de prueba del scraper
 */

const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configuración para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta test
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal - Sirve el HTML de la interfaz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para obtener la lista de configuraciones disponibles
app.get('/api/configs', (req, res) => {
    try {
        const rootDir = path.join(__dirname, '..');
        const files = fs.readdirSync(rootDir);
        const configFiles = files.filter(file => 
            file.startsWith('config') && 
            file.endsWith('.js') && 
            fs.statSync(path.join(rootDir, file)).isFile()
        );
        
        res.json({ success: true, configs: configFiles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener la lista de resultados disponibles
app.get('/api/results', (req, res) => {
    try {
        const rootDir = path.join(__dirname, '..');
        const files = fs.readdirSync(rootDir);
        const resultFiles = files.filter(file => 
            file.endsWith('.json') && 
            !file.includes('package') && 
            fs.statSync(path.join(rootDir, file)).isFile()
        );
        
        res.json({ success: true, results: resultFiles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para crear una configuración temporal
app.post('/api/create-config', async (req, res) => {
    try {
        const { searchTerm, city, maxPages } = req.body;
        
        if (!searchTerm) {
            return res.status(400).json({ success: false, error: 'Se requiere un término de búsqueda' });
        }
        
        // Generar un nombre único para la configuración temporal
        const timestamp = Date.now();
        const configName = `config-temp-${searchTerm.replace(/\s+/g, '-')}-${timestamp}.js`;
        const configPath = path.join(__dirname, '..', configName);
        
        // Crear archivo de configuración
        const outputFileName = `resultados-${searchTerm}${city !== 'all-ci' ? '-' + city : ''}-${timestamp}`;
        const configContent = `/**
 * Configuración temporal generada desde la interfaz web
 * Fecha: ${new Date().toISOString()}
 */

const config = {
    // Término de búsqueda
    searchTerm: "${searchTerm}",
    
    // Ciudad
    city: "${city}",
    
    // Número máximo de páginas a scrapear
    maxPages: ${maxPages},
    
    // Nombre del archivo de salida
    outputFile: "${outputFileName}"
};

module.exports = config;`;
        
        await fs.promises.writeFile(configPath, configContent);
        
        res.json({ 
            success: true, 
            configFile: configName,
            message: `Configuración temporal creada con éxito: ${configName}`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para iniciar un scraping con una configuración específica
app.post('/api/scrape', (req, res) => {
    const { configFile } = req.body;
    
    if (!configFile) {
        return res.status(400).json({ success: false, error: 'Se requiere un archivo de configuración' });
    }
    
    const scriptPath = path.join(__dirname, '..', 'run-search.js');
    const command = `node "${scriptPath}" ${configFile}`;
    
    // Crear un ID único para esta ejecución
    const processId = Date.now().toString();
    
    // Asegurarse de que la carpeta de logs existe
    if (!fs.existsSync(path.join(__dirname, 'logs'))) {
        fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
    }
    
    // Crear archivo de log para este proceso
    const logFile = path.join(__dirname, 'logs', `scrape-${processId}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // Responder inmediatamente para no bloquear
    res.json({ 
        success: true, 
        processId: processId,
        message: `Iniciando scraping con la configuración ${configFile}. Este proceso puede tardar varios minutos.` 
    });
    
    // Ejecutar el comando en segundo plano
    const child = exec(command, { cwd: path.join(__dirname, '..') });
    
    // Capturar la salida del proceso y guardarla en el archivo de log
    child.stdout.on('data', (data) => {
        logStream.write(data);
    });
    
    child.stderr.on('data', (data) => {
        logStream.write(data);
    });
    
    child.on('close', (code) => {
        logStream.write(`\nProceso de scraping finalizado con código ${code}`);
        logStream.end();
        console.log(`Proceso de scraping ${processId} finalizado con código ${code}`);
    });
});

// Endpoint para obtener los logs de un proceso en curso
app.get('/api/process-logs/:processId', (req, res) => {
    try {
        const { processId } = req.params;
        const logFile = path.join(__dirname, 'logs', `scrape-${processId}.log`);
        
        if (!fs.existsSync(logFile)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Archivo de log no encontrado' 
            });
        }
        
        const content = fs.readFileSync(logFile, 'utf-8');
        res.json({ 
            success: true, 
            logs: content 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para obtener el contenido de un archivo de resultados
app.get('/api/result/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '..', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        
        try {
            const jsonContent = JSON.parse(content);
            res.json({ success: true, content: jsonContent });
        } catch (e) {
            res.json({ success: true, content });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Limpiar configuraciones temporales periódicamente (cada hora)
setInterval(() => {
    try {
        const rootDir = path.join(__dirname, '..');
        const files = fs.readdirSync(rootDir);
        const tempConfigFiles = files.filter(file => 
            file.includes('config-temp-') && 
            file.endsWith('.js') && 
            fs.statSync(path.join(rootDir, file)).isFile()
        );
        
        // Obtener la fecha de hace 1 día
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        tempConfigFiles.forEach(file => {
            const filePath = path.join(rootDir, file);
            const stats = fs.statSync(filePath);
            
            // Eliminar si es más antiguo que 1 día
            if (stats.mtimeMs < oneDayAgo) {
                fs.unlinkSync(filePath);
                console.log(`Configuración temporal eliminada: ${file}`);
            }
        });
    } catch (error) {
        console.error('Error al limpiar configuraciones temporales:', error);
    }
}, 60 * 60 * 1000); // 1 hora

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});