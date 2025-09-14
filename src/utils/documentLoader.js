/**
 * Cargador centralizado de módulos de conversión de documentos
 * Mantiene la función principal limpia de múltiples imports
 */

// Módulos de conversión de documentos
const PdfToDocx = require('../modules/PdfToDocx');
const DocxToPdf = require('../modules/DocxToPdf');
const WordToPdf = require('../modules/WordToPdf');

/**
 * Configuración centralizada de todas las conversiones de documentos
 * @type {Object} - Mapeo de conversiones con sus procesadores y opciones
 */
const DOCUMENT_CONVERSION_MODULES = {
    // Conversiones PDF
    'pdf-to-docx': {
        processor: PdfToDocx.processPdfToDocx,
        outputFormat: 'docx',
        conversionOptions: {
            docxOptions: {
                preserveFormatting: true,
                pageBreaks: true,
                fontSize: 12,
                fontFamily: 'Arial',
                extractMetadata: true
            }
        }
    },
    'word-to-pdf': {
    processor: WordToPdf.processWordToPdf,
    outputFormat: 'pdf',
    conversionOptions: {
        pdfOptions: {
            preserveFormatting: true,
            compressPdf: false,
            pageMargins: { top: 50, bottom: 50, left: 50, right: 50 },
            fontSize: 12,
            fontFamily: 'Helvetica',
            lineHeight: 1.2,
            pageSize: 'A4'
        }
    }
},
    // Conversiones DOCX
    'docx-to-pdf': {
        processor: DocxToPdf.processDocxToPdf,
        outputFormat: 'pdf',
        conversionOptions: {
            pdfOptions: {
                format: 'A4',
                margin: { 
                    top: '1in', 
                    bottom: '1in', 
                    left: '1in', 
                    right: '1in' 
                },
                printBackground: true,
                displayHeaderFooter: false,
                headerTemplate: '',
                footerTemplate: '',
                landscape: false
            }
        }
    }
};

/**
 * Obtiene la configuración de conversión para un tipo específico
 * @param {string} conversionType - Tipo de conversión (ej: 'pdf-to-docx')
 * @returns {Object|null} - Configuración de conversión o null si no existe
 */
const getDocumentConversionConfig = (conversionType) => {
    return DOCUMENT_CONVERSION_MODULES[conversionType] || null;
};

/**
 * Obtiene lista de todas las conversiones de documentos soportadas
 * @returns {Array<string>} - Array de tipos de conversión soportados
 */
const getSupportedDocumentConversions = () => {
    return Object.keys(DOCUMENT_CONVERSION_MODULES);
};

/**
 * Verifica si una conversión de documentos está soportada
 * @param {string} conversionType - Tipo de conversión a verificar
 * @returns {boolean} - true si está soportada
 */
const isDocumentConversionSupported = (conversionType) => {
    return conversionType in DOCUMENT_CONVERSION_MODULES;
};

/**
 * Obtiene conversiones disponibles por formato de entrada
 * @param {string} inputFormat - Formato de entrada (pdf, docx, doc, etc.)
 * @returns {Array<string>} - Array de conversiones disponibles
 */
const getDocumentConversionsByInputFormat = (inputFormat) => {
    const lowerFormat = inputFormat.toLowerCase();
    return Object.keys(DOCUMENT_CONVERSION_MODULES).filter(key => 
        key.startsWith(lowerFormat + '-to-')
    );
};

/**
 * Obtiene conversiones disponibles por formato de salida
 * @param {string} outputFormat - Formato de salida (pdf, docx, doc, etc.)
 * @returns {Array<string>} - Array de conversiones disponibles
 */
const getDocumentConversionsByOutputFormat = (outputFormat) => {
    const lowerFormat = outputFormat.toLowerCase();
    return Object.keys(DOCUMENT_CONVERSION_MODULES).filter(key => 
        key.endsWith('-to-' + lowerFormat)
    );
};

/**
 * Obtiene información sobre los formatos de documentos soportados
 * @returns {Object} - Información de formatos de entrada y salida
 */
const getSupportedDocumentFormats = () => {
    const inputFormats = new Set();
    const outputFormats = new Set();
    
    Object.keys(DOCUMENT_CONVERSION_MODULES).forEach(key => {
        const [input, output] = key.split('-to-');
        inputFormats.add(input);
        outputFormats.add(output);
    });

    return {
        input: Array.from(inputFormats).sort(),
        output: Array.from(outputFormats).sort(),
        total: Object.keys(DOCUMENT_CONVERSION_MODULES).length
    };
};

/**
 * Verifica si un formato específico es soportado como entrada
 * @param {string} format - Formato a verificar
 * @returns {boolean} - true si es soportado como entrada
 */
const isDocumentInputFormatSupported = (format) => {
    const lowerFormat = format.toLowerCase();
    return Object.keys(DOCUMENT_CONVERSION_MODULES).some(key => 
        key.startsWith(lowerFormat + '-to-')
    );
};

/**
 * Verifica si un formato específico es soportado como salida
 * @param {string} format - Formato a verificar
 * @returns {boolean} - true si es soportado como salida
 */
const isDocumentOutputFormatSupported = (format) => {
    const lowerFormat = format.toLowerCase();
    return Object.keys(DOCUMENT_CONVERSION_MODULES).some(key => 
        key.endsWith('-to-' + lowerFormat)
    );
};

/**
 * Obtiene estadísticas de uso de conversiones
 * @returns {Object} - Estadísticas generales
 */
const getDocumentConversionStats = () => {
    const formats = getSupportedDocumentFormats();
    const conversions = getSupportedDocumentConversions();
    
    return {
        totalConversions: conversions.length,
        inputFormats: formats.input.length,
        outputFormats: formats.output.length,
        supportedFormats: formats,
        availableConversions: conversions
    };
};

module.exports = {
    DOCUMENT_CONVERSION_MODULES,
    getDocumentConversionConfig,
    getSupportedDocumentConversions,
    isDocumentConversionSupported,
    getDocumentConversionsByInputFormat,
    getDocumentConversionsByOutputFormat,
    getSupportedDocumentFormats,
    isDocumentInputFormatSupported,
    isDocumentOutputFormatSupported,
    getDocumentConversionStats
};