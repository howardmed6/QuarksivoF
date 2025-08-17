/**
 * Headers CORS estándar para todas las respuestas
 */
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

/**
 * Crea respuesta de éxito para conversión de imagen
 * @param {Buffer} imageBuffer - Buffer de imagen convertida
 * @param {Object} metadata - Metadata del procesamiento
 * @param {number} processingTime - Tiempo de procesamiento en ms
 * @param {string} format - Formato final (png, jpg, etc)
 * @returns {Object} - Respuesta HTTP
 */
const createSuccessResponse = (imageBuffer, metadata, processingTime, format) => {
    const base64Image = imageBuffer.toString('base64');
    
    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        },
        jsonBody: {
            success: true,
            message: 'Conversión completada exitosamente',
            image: `data:image/${format};base64,${base64Image}`,
            metadata: {
                width: metadata.final.width,
                height: metadata.final.height,
                format: format,
                originalFormat: metadata.original.format
            },
            originalSize: metadata.original.size,
            processedSize: metadata.final.size,
            processingTime: processingTime,
            appliedOptions: metadata.processing.appliedOptions,
            compressionRatio: metadata.processing.compressionRatio
        }
    };
};

/**
 * Crea respuesta de error estándar
 * @param {number} status - Código de estado HTTP
 * @param {string} message - Mensaje de error
 * @param {string} code - Código de error interno
 * @returns {Object} - Respuesta HTTP de error
 */
const createErrorResponse = (status, message, code) => {
    return {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        },
        jsonBody: {
            success: false,
            error: message,
            code: code
        }
    };
};

/**
 * Crea respuesta CORS para preflight requests
 * @returns {Object} - Respuesta CORS
 */
const createCorsResponse = () => {
    return {
        status: 200,
        headers: {
            ...CORS_HEADERS,
            'Access-Control-Max-Age': '3600'
        }
    };
};

/**
 * Crea respuesta de health check
 * @param {string} serviceName - Nombre del servicio
 * @param {string} version - Versión del servicio
 * @returns {Object} - Respuesta de health check
 */
const createHealthResponse = (serviceName = 'Image Converter', version = '1.0.0') => {
    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        },
        jsonBody: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: serviceName,
            version: version
        }
    };
};

module.exports = {
    createSuccessResponse,
    createErrorResponse,
    createCorsResponse,
    createHealthResponse,
    CORS_HEADERS
};