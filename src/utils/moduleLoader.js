/**
 * Cargador centralizado de módulos de conversión
 * Mantiene TheImage.js limpio de múltiples imports
 */

// Módulos de conversión existentes
const JpgToPng = require('../modules/JpgToPng');
const PngToJpg = require('../modules/PngToJpg');
const WebpToJpg = require('../modules/WebpToJpg');

// Nuevos módulos de conversión
const JpgToWebp = require('../modules/JpgToWebp');
const PngToWebp = require('../modules/PngToWebp');
const WebpToPng = require('../modules/WebpToPng');
const AvifToJpg = require('../modules/AvifToJpg');
const JpgToAvif = require('../modules/JpgToAvif');
const PngToAvif = require('../modules/PngToAvif');

/**
 * Configuración centralizada de todas las conversiones
 * @type {Object} - Mapeo de conversiones con sus procesadores y opciones
 */
const CONVERSION_MODULES = {
    // Conversiones existentes
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
    },

    // Nuevas conversiones WEBP
    'jpg-to-webp': {
        processor: JpgToWebp.processJpgToWebp,
        outputFormat: 'webp',
        conversionOptions: {
            webpOptions: {
                quality: 80,
                lossless: false,
                effort: 4,
                smartSubsample: true 
            }
        }
    },
    'png-to-webp': {
        processor: PngToWebp.processPngToWebp,
        outputFormat: 'webp',
        conversionOptions: {
            webpOptions: {
                quality: 80,
                lossless: false,
                effort: 4,
                smartSubsample: true,
                nearLossless: false
            }
        }
    },
    'webp-to-png': {
        processor: WebpToPng.processWebpToPng,
        outputFormat: 'png',
        conversionOptions: {
            pngOptions: {
                quality: 90,
                compressionLevel: 6,
                progressive: false,
                palette: false
            }
        }
    },

    // Nuevas conversiones AVIF
    'avif-to-jpg': {
        processor: AvifToJpg.processAvifToJpg,
        outputFormat: 'jpg',
        conversionOptions: {
            jpgOptions: {
                quality: 90,
                progressive: false,
                mozjpeg: true,
                background: { r: 255, g: 255, b: 255 }
            }
        }
    },
    'jpg-to-avif': {
        processor: JpgToAvif.processJpgToAvif,
        outputFormat: 'avif',
        conversionOptions: {
            avifOptions: {
                quality: 50,
                lossless: false,
                effort: 4,
                chromaSubsampling: '4:4:4'
            }
        }
    },
    'png-to-avif': {
        processor: PngToAvif.processPngToAvif,
        outputFormat: 'avif',
        conversionOptions: {
            avifOptions: {
                quality: 50,
                lossless: false,
                effort: 4,
                chromaSubsampling: '4:4:4'
            }
        }
    }
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

/**
 * Obtiene conversiones disponibles por formato de entrada
 * @param {string} inputFormat - Formato de entrada (jpg, png, webp, avif)
 * @returns {Array<string>} - Array de conversiones disponibles
 */
const getConversionsByInputFormat = (inputFormat) => {
    const lowerFormat = inputFormat.toLowerCase();
    return Object.keys(CONVERSION_MODULES).filter(key => 
        key.startsWith(lowerFormat + '-to-')
    );
};

/**
 * Obtiene conversiones disponibles por formato de salida
 * @param {string} outputFormat - Formato de salida (jpg, png, webp, avif)
 * @returns {Array<string>} - Array de conversiones disponibles
 */
const getConversionsByOutputFormat = (outputFormat) => {
    const lowerFormat = outputFormat.toLowerCase();
    return Object.keys(CONVERSION_MODULES).filter(key => 
        key.endsWith('-to-' + lowerFormat)
    );
};

module.exports = {
    CONVERSION_MODULES,
    getConversionConfig,
    getSupportedConversions,
    isConversionSupported,
    getConversionsByInputFormat,
    getConversionsByOutputFormat
};