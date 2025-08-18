/**
 * Cargador centralizado de módulos de conversión
 * Mantiene TheImage.js limpio de múltiples imports
 */

// Módulos de conversión existentes
const JpgToPng = require('../modules/JpgToPng');
const PngToJpg = require('../modules/PngToJpg');
const WebpToJpg = require('../modules/WebpToJpg');

// Módulos de conversión WebP
const JpgToWebp = require('../modules/JpgToWebp');
const PngToWebp = require('../modules/PngToWebp');
const WebpToPng = require('../modules/WebpToPng');

// Módulos de conversión AVIF
const AvifToJpg = require('../modules/AvifToJpg');
const JpgToAvif = require('../modules/JpgToAvif');
const PngToAvif = require('../modules/PngToAvif');

// Nuevos módulos de conversión HEIC y GIF
const HeicToJpg = require('../modules/HeicToJpg');
const HeicToPng = require('../modules/HeicToPng');
const GifToMp4 = require('../modules/GifToMp4');


const SvgToWebp = require('../modules/SvgToWebp');
const SvgToPng = require('../modules/SvgToPng');
const SvgToJpg = require('../modules/SvgToJpg');
const SvgToJpeg = require('../modules/SvgToJpeg');
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

    // Conversiones WEBP
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

    // Conversiones AVIF
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
    },

    // Nuevas conversiones HEIC
    'heic-to-jpg': {
        processor: HeicToJpg.processHeicToJpg,
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
    'heic-to-png': {
        processor: HeicToPng.processHeicToPng,
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
    'svg-to-webp': {
        processor: SvgToWebp.processSvgToWebp,
        outputFormat: 'webp',
        conversionOptions: {
            webpOptions: {
                quality: 90,
                lossless: false,
                effort: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
                width: null,
                height: null,
                density: 72
            }
        }
    },

    'svg-to-png': {
        processor: SvgToPng.processSvgToPng,
        outputFormat: 'png',
        conversionOptions: {
            pngOptions: {
                compressionLevel: 6,
                progressive: false,
                palette: false,
                background: null, // null mantiene transparencia
                width: null,
                height: null,
                density: 72
            }
        }
    },

    'svg-to-jpg': {
        processor: SvgToJpg.processSvgToJpg,
        outputFormat: 'jpg',
        conversionOptions: {
            jpgOptions: {
                quality: 90,
                progressive: false,
                mozjpeg: true,
                background: { r: 255, g: 255, b: 255 },
                width: null,
                height: null,
                density: 72
            }
        }
    },

    'svg-to-jpeg': {
        processor: SvgToJpeg.processSvgToJpeg,
        outputFormat: 'jpeg',
        conversionOptions: {
            jpegOptions: {
                quality: 85,
                progressive: true,
                mozjpeg: true,
                background: { r: 255, g: 255, b: 255 },
                width: null,
                height: null,
                density: 72,
                optimizeCoding: true
            }
        }
    },

    // Nuevas conversiones GIF
    'gif-to-mp4': {
        processor: GifToMp4.processGifToMp4,
        outputFormat: 'mp4',
        conversionOptions: {
            mp4Options: {
                quality: 23, // CRF value
                fps: null, // mantener fps original
                scale: null, // mantener escala original
                codec: 'libx264',
                preset: 'medium'
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
 * @param {string} inputFormat - Formato de entrada (jpg, png, webp, avif, heic, gif)
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
 * @param {string} outputFormat - Formato de salida (jpg, png, webp, avif, mp4)
 * @returns {Array<string>} - Array de conversiones disponibles
 */
const getConversionsByOutputFormat = (outputFormat) => {
    const lowerFormat = outputFormat.toLowerCase();
    return Object.keys(CONVERSION_MODULES).filter(key => 
        key.endsWith('-to-' + lowerFormat)
    );
};

/**
 * Obtiene información sobre los formatos soportados
 * @returns {Object} - Información de formatos de entrada y salida
 */
const getSupportedFormats = () => {
    const inputFormats = new Set();
    const outputFormats = new Set();
    
    Object.keys(CONVERSION_MODULES).forEach(key => {
        const [input, output] = key.split('-to-');
        inputFormats.add(input);
        outputFormats.add(output);
    });

    return {
        input: Array.from(inputFormats).sort(),
        output: Array.from(outputFormats).sort(),
        total: Object.keys(CONVERSION_MODULES).length
    };
};

/**
 * Verifica si un formato específico es soportado como entrada
 * @param {string} format - Formato a verificar
 * @returns {boolean} - true si es soportado como entrada
 */
const isInputFormatSupported = (format) => {
    const lowerFormat = format.toLowerCase();
    return Object.keys(CONVERSION_MODULES).some(key => 
        key.startsWith(lowerFormat + '-to-')
    );
};

/**
 * Verifica si un formato específico es soportado como salida
 * @param {string} format - Formato a verificar
 * @returns {boolean} - true si es soportado como salida
 */
const isOutputFormatSupported = (format) => {
    const lowerFormat = format.toLowerCase();
    return Object.keys(CONVERSION_MODULES).some(key => 
        key.endsWith('-to-' + lowerFormat)
    );
};

module.exports = {
    CONVERSION_MODULES,
    getConversionConfig,
    getSupportedConversions,
    isConversionSupported,
    getConversionsByInputFormat,
    getConversionsByOutputFormat,
    getSupportedFormats,
    isInputFormatSupported,
    isOutputFormatSupported
};