const { app } = require('@azure/functions');

// Utils
const { parseImageRequest, extractConversionFormat } = require('../utils/requestParser');
const { createSuccessResponse, createErrorResponse, createCorsResponse, createHealthResponse } = require('../utils/responseBuilder');

// Módulos de conversión
const JpgToPng = require('../modules/JpgToPng');
const PngToJpg = require('../modules/PngToJpg');

/**
 * Mapeo de conversiones disponibles
 */
const CONVERSION_MODULES = {
    'jpg_to_png': {
        processor: JpgToPng.processJpgToPng,
        outputFormat: 'png',
        conversionOptions: { pngOptions: { quality: 90, compressionLevel: 6, progressive: false } }
    },
    'png_to_jpg': {
        processor: PngToJpg.processPngToJpg,
        outputFormat: 'jpg',
        conversionOptions: { jpgOptions: { quality: 90, progressive: false, mozjpeg: true } }
    }
    // Aquí puedes agregar fácilmente más conversiones:
    // 'webp_to_jpg': { processor: WebpToJpg.processWebpToJpg, outputFormat: 'jpg', ... }
};

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
            const conversionKey = conversionType.replace('-', '_');
            const conversionConfig = CONVERSION_MODULES[conversionKey];
            
            if (!conversionConfig) {
                context.log(`❌ Conversión no soportada: ${conversionType}`);
                return createErrorResponse(
                    400,
                    `Tipo de conversión no soportado: ${conversionType}`,
                    'UNSUPPORTED_CONVERSION'
                );
            }

            // Procesar imagen
            context.log(`🔄 Procesando con módulo: ${conversionKey}`);
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