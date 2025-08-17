const { app } = require('@azure/functions');

// Utils
const { parseImageRequest, extractConversionFormat } = require('../utils/requestParser');
const { createSuccessResponse, createErrorResponse, createCorsResponse, createHealthResponse } = require('../utils/responseBuilder');
const { getConversionConfig, isConversionSupported } = require('../utils/moduleLoader');

/**
 * Procesador principal de conversión de imágenes
 */
app.http('ImageConverterMain', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'convert/{conversionType}',
    handler: async (request, context) => {
        const startTime = Date.now();
        const conversionType = request.params.conversionType;
        
        context.log(`🚀 Iniciando conversión: ${conversionType}`);
        
        try {
            // Parsear request
            const parseResult = await parseImageRequest(request);
            if (parseResult.error) {
                context.log(`❌ Error parsing: ${parseResult.error.message}`);
                return createErrorResponse(
                    parseResult.error.status,
                    parseResult.error.message,
                    parseResult.error.code
                );
            }

            const { imageBuffer, options } = parseResult;
            context.log(`📁 Archivo recibido: ${parseResult.size}MB`);
            context.log(`⚙️ Opciones: ${JSON.stringify(options)}`);

            // Verificar si la conversión está soportada
            if (!isConversionSupported(conversionType)) {
                context.log(`❌ Conversión no soportada: ${conversionType}`);
                return createErrorResponse(
                    400,
                    `Tipo de conversión no soportado: ${conversionType}`,
                    'UNSUPPORTED_CONVERSION'
                );
            }

            const conversionConfig = getConversionConfig(conversionType);

            // Procesar imagen
            context.log(`🔄 Procesando con módulo: ${conversionType}`);
            const processingResult = await conversionConfig.processor(
                imageBuffer,
                options,
                conversionConfig.conversionOptions
            );

            // Validar resultado
            if (!processingResult.success || !processingResult.buffer) {
                context.log('❌ Procesamiento falló');
                return createErrorResponse(
                    500,
                    'Error en el procesamiento de la imagen',
                    'PROCESSING_ERROR'
                );
            }

            const processingTime = Date.now() - startTime;
            context.log(`✅ Conversión completada en ${processingTime}ms`);

            return createSuccessResponse(
                processingResult.buffer,
                processingResult.metadata,
                processingTime,
                conversionConfig.outputFormat
            );

        } catch (error) {
            context.log('❌ Error crítico:', error.message);
            context.log('Stack trace:', error.stack);
            
            return createErrorResponse(
                500,
                `Error interno del servidor: ${error.message}`,
                'INTERNAL_ERROR'
            );
        }
    }
});

/**
 * Handler de CORS para preflight requests
 */
app.http('ImageConverterCors', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: 'convert/{conversionType}',
    handler: async (request, context) => {
        const conversionType = request.params.conversionType;
        context.log(`🔄 CORS preflight para: ${conversionType}`);
        
        return createCorsResponse();
    }
});

/**
 * Health check endpoint
 */
app.http('ImageConverterHealth', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('💓 Health check solicitado');
        
        return createHealthResponse('Universal Image Converter', '2.0.0');
    }
});