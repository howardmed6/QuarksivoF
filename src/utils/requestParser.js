const parseMultipart = require('parse-multipart-data');

/**
 * Parsea request multipart y extrae imagen y opciones
 * @param {Object} request - Request de Azure Functions
 * @returns {Promise<Object>} - { imageBuffer, options, error }
 */
const parseImageRequest = async (request) => {
    try {
        const contentType = request.headers.get('content-type');
        
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return {
                error: {
                    status: 400,
                    message: 'Content-Type debe ser multipart/form-data',
                    code: 'INVALID_CONTENT_TYPE'
                }
            };
        }

        const body = await request.arrayBuffer();
        const boundary = contentType.split('boundary=')[1];
        
        if (!boundary) {
            return {
                error: {
                    status: 400,
                    message: 'Boundary no encontrado en Content-Type',
                    code: 'MISSING_BOUNDARY'
                }
            };
        }

        const parts = parseMultipart.parse(Buffer.from(body), boundary);
        
        let imageBuffer = null;
        let options = [];
        
        for (const part of parts) {
            if (part.name === 'file') {
                imageBuffer = part.data;
            } else if (part.name === 'options') {
                try {
                    const optionsStr = part.data.toString();
                    options = JSON.parse(optionsStr);
                    if (!Array.isArray(options)) options = [];
                } catch (e) {
                    console.log('⚠️ Error parseando options:', e.message);
                    options = [];
                }
            }
        }
        
        if (!imageBuffer || imageBuffer.length === 0) {
            return {
                error: {
                    status: 400,
                    message: 'No se encontró archivo de imagen',
                    code: 'NO_FILE_FOUND'
                }
            };
        }
        
        return {
            imageBuffer,
            options,
            size: (imageBuffer.length / 1024 / 1024).toFixed(2)
        };
        
    } catch (error) {
        return {
            error: {
                status: 500,
                message: `Error parseando request: ${error.message}`,
                code: 'PARSING_ERROR'
            }
        };
    }
};

/**
 * Extrae formato de conversión de la URL
 * @param {string} url - URL del request
 * @returns {Object} - { from, to, error }
 */
const extractConversionFormat = (url) => {
    try {
        const urlParts = url.split('/');
        const conversionPart = urlParts.find(part => part.includes('-to-'));
        
        if (!conversionPart) {
            return {
                error: {
                    status: 400,
                    message: 'Formato de conversión no válido en URL',
                    code: 'INVALID_CONVERSION_FORMAT'
                }
            };
        }
        
        const [from, to] = conversionPart.split('-to-');
        
        return { from, to };
        
    } catch (error) {
        return {
            error: {
                status: 400,
                message: 'Error extrayendo formato de conversión',
                code: 'FORMAT_EXTRACTION_ERROR'
            }
        };
    }
};

module.exports = {
    parseImageRequest,
    extractConversionFormat
};