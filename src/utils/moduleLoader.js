/**
 * Cargador centralizado de módulos de conversión
 * Mantiene TheImage.js limpio de múltiples imports
 */

// Módulos de conversión
const JpgToPng = require('../modules/JpgToPng');
const PngToJpg = require('../modules/PngToJpg');
const WebpToJpg = require('../modules/WebpToJpg');

// Aquí irán los futuros módulos:
// const WebpToPng = require('../modules/WebpToPng');
// const JpgToWebp = require('../modules/JpgToWebp');
// const PngToWebp = require('../modules/PngToWebp');
// const AvifToJpg = require('../modules/AvifToJpg');
// const HeicToJpg = require('../modules/HeicToJpg');

/**
 * Configuración centralizada de todas las conversiones
 * @type {Object} - Mapeo de conversiones con sus procesadores y opciones
 */
const CONVERSION_MODULES = {
    'jpg-to-png': {
        processor: JpgToPng.processJpgToPng,
        outputFormat: 'png',
        conversionOptions: { 
            pngOptions: { 
                quality: 90, 
                compressionLevel: 6, 
                progressive: false 
            } 
        }
    },
    'png-to-jpg': {
        processor: PngToJpg.processPngToJpg,
        outputFormat: 'jpg',
        conversionOptions: { 
            jpgOptions: { 
                quality: 90, 
                progressive: false, 
                mozjpeg: true 
            } 
        }
    },
    'webp-to-jpg': {
        processor: WebpToJpg.processWebpToJpg,
        outputFormat: 'jpg',
        conversionOptions: { 
            jpgOptions: { 
                quality: 90, 
                progressive: false, 
                mozjpeg: true 
            } 
        }
    }
    
    // Futuras conversiones se agregarán aquí:
    // 'webp-to-png': {
    //     processor: WebpToPng.processWebpToPng,
    //     outputFormat: 'png',
    //     conversionOptions: { pngOptions: { ... } }
    // },
    // 'jpg-to-webp': {
    //     processor: JpgToWebp.processJpgToWebp,
    //     outputFormat: 'webp',
    //     conversionOptions: { webpOptions: { ... } }
    // }
};

/**
 * Obtiene la configuración de conversión para un tipo específico
 * @param {string} conversionType - Tipo de conversión (ej: 'jpg-to-png')
 * @returns {Object|null} - Configuración de conversión o null si no existe
 */
const getConversionConfig = (conversionType) => {
    return CONVERSION_MODULES[conversionType] || null;
};

/**
 * Obtiene lista de todas las conversiones soportadas
 * @returns {Array<string>} - Array de tipos de conversión soportados
 */
const getSupportedConversions = () => {
    return Object.keys(CONVERSION_MODULES);
};

/**
 * Verifica si una conversión está soportada
 * @param {string} conversionType - Tipo de conversión a verificar
 * @returns {boolean} - true si está soportada
 */
const isConversionSupported = (conversionType) => {
    return conversionType in CONVERSION_MODULES;
};

module.exports = {
    CONVERSION_MODULES,
    getConversionConfig,
    getSupportedConversions,
    isConversionSupported
};