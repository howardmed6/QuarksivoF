const { app } = require('@azure/functions');

// Utils reutilizados de imágenes
const { parseImageRequest } = require('../utils/requestParser');
const { createSuccessResponse, createErrorResponse, createCorsResponse, createHealthResponse } = require('../utils/responseBuilder');

// Utils específicos para documentos  
const { getDocumentConversionConfig, isDocumentConversionSupported } = require('../utils/documentLoader');

/**
 * Procesador principal de conversión de documentos
 */
app.http('DocumentConverterMain', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'convert/{conversionType}',
    handler: async (request, context) => {
        const startTime = Date.now();
        const conversionType = request.params.conversionType;
        
        context.log(`🚀 Iniciando conversión de documento: ${conversionType}`);
        
        try {
            // Parsear request (reutilizamos el parser de imágenes ya que maneja buffers genéricos)
            const parseResult = await parseImageRequest(request);
            if (parseResult.error) {
                context.log(`❌ Error parsing: ${parseResult.error.message}`);
                return createErrorResponse(
                    parseResult.error.status,
                    parseResult.error.message,
                    parseResult.error.code
                );
            }

            const { imageBuffer: documentBuffer, options } = parseResult;
            context.log(`📁 Documento recibido: ${parseResult.size}MB`);
            context.log(`⚙️ Opciones: ${JSON.stringify(options)}`);

            // Verificar si la conversión está soportada
            if (!isDocumentConversionSupported(conversionType)) {
                context.log(`❌ Conversión de documento no soportada: ${conversionType}`);
                return createErrorResponse(
                    400,
                    `Tipo de conversión de documento no soportado: ${conversionType}`,
                    'UNSUPPORTED_DOCUMENT_CONVERSION'
                );
            }

            const conversionConfig = getDocumentConversionConfig(conversionType);

            // Procesar documento
            context.log(`🔄 Procesando documento con módulo: ${conversionType}`);
            const processingResult = await conversionConfig.processor(
                documentBuffer,
                options,
                conversionConfig.conversionOptions
            );

            // Validar resultado
            if (!processingResult.success || !processingResult.buffer) {
                context.log('❌ Procesamiento de documento falló');
                return createErrorResponse(
                    500,
                    'Error en el procesamiento del documento',
                    'DOCUMENT_PROCESSING_ERROR'
                );
            }

            const processingTime = Date.now() - startTime;
            context.log(`✅ Conversión de documento completada en ${processingTime}ms`);

            return createSuccessResponse(
                processingResult.buffer,
                processingResult.metadata,
                processingTime,
                conversionConfig.outputFormat
            );

        } catch (error) {
            context.log('❌ Error crítico en conversión de documento:', error.message);
            context.log('Stack trace:', error.stack);
            
            return createErrorResponse(
                500,
                `Error interno del servidor en conversión de documento: ${error.message}`,
                'DOCUMENT_INTERNAL_ERROR'
            );
        }
    }
});

/**
 * Handler de CORS para preflight requests de documentos
 */
app.http('DocumentConverterCors', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: 'convert/{conversionType}',
    handler: async (request, context) => {
        const conversionType = request.params.conversionType;
        context.log(`🔄 CORS preflight para documento: ${conversionType}`);
        
        return createCorsResponse();
    }
});

/**
 * Health check endpoint para documentos
 */
app.http('DocumentConverterHealth', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health-docs',
    handler: async (request, context) => {
        context.log('💓 Health check de documentos solicitado');
        
        return createHealthResponse('Universal Document Converter', '1.0.0');
    }
});