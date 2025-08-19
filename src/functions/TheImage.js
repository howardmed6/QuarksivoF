const { app } = require('@azure/functions');

// eslint-disable-next-line no-unused-vars
const { parseImageRequest, extractConversionFormat } = require('../utils/requestParser');
const { createSuccessResponse, createErrorResponse, createCorsResponse, createHealthResponse } = require('../utils/responseBuilder');
const { getConversionConfig, isConversionSupported } = require('../utils/moduleLoader');

// RATE LIMITING STORAGE
const ipLimits = new Map();
const REQUESTS_PER_DAY = 200;
const DAY_IN_MS = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

/**
 * Función para verificar y actualizar límites de peticiones por IP
 */
function checkRateLimit(ip) {
    const now = Date.now();
    
    if (!ipLimits.has(ip)) {
        // Primera petición de esta IP
        ipLimits.set(ip, {
            count: 1,
            lastReset: now
        });
        return { allowed: true, remaining: REQUESTS_PER_DAY - 1 };
    }
    
    const ipData = ipLimits.get(ip);
    
    // Verificar si han pasado 24 horas para resetear
    if (now - ipData.lastReset >= DAY_IN_MS) {
        ipData.count = 1;
        ipData.lastReset = now;
        ipLimits.set(ip, ipData);
        return { allowed: true, remaining: REQUESTS_PER_DAY - 1 };
    }
    
    // Verificar si ya excedió el límite
    if (ipData.count >= REQUESTS_PER_DAY) {
        const resetTime = new Date(ipData.lastReset + DAY_IN_MS);
        return { 
            allowed: false, 
            remaining: 0,
            resetTime: resetTime.toISOString()
        };
    }
    
    // Incrementar contador
    ipData.count++;
    ipLimits.set(ip, ipData);
    
    return { 
        allowed: true, 
        remaining: REQUESTS_PER_DAY - ipData.count 
    };
}

/**
 * Procesador principal de conversión de imágenes
 */
app.http('ImageConverterMain', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'image/{conversionType}',
    handler: async (request, context) => {
        const startTime = Date.now();
        const conversionType = request.params.conversionType;
        
        // EXTRAER IP DEL CLIENTE
        const clientIP = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                        request.headers['x-real-ip'] || 
                        request.headers['cf-connecting-ip'] ||
                        request.ip || 
                        'unknown';
        
        context.log(`🌐 IP Cliente: ${clientIP}`);
        
        // VERIFICAR RATE LIMITING
        const rateLimitResult = checkRateLimit(clientIP);
        
        if (!rateLimitResult.allowed) {
            context.log(`🚫 Rate limit excedido para IP: ${clientIP}`);
            return createErrorResponse(
                429,
                `Límite de peticiones excedido. Has alcanzado el máximo de ${REQUESTS_PER_DAY} conversiones por día. Tu límite se restablecerá el ${new Date(rateLimitResult.resetTime).toLocaleString('es-ES')}.`,
                'RATE_LIMIT_EXCEEDED',
                {
                    resetTime: rateLimitResult.resetTime,
                    maxRequests: REQUESTS_PER_DAY,
                    remaining: 0
                }
            );
        }
        
        context.log(`🚀 Iniciando conversión: ${conversionType} (Peticiones restantes: ${rateLimitResult.remaining})`);
        
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

            // Incluir información de rate limiting en respuesta exitosa
            const response = createSuccessResponse(
                processingResult.buffer,
                processingResult.metadata,
                processingTime,
                conversionConfig.outputFormat
            );
            
            // Agregar headers de rate limiting
            response.headers = {
                ...response.headers,
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Limit': REQUESTS_PER_DAY.toString()
            };
            
            return response;

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

/**
 * Endpoint para consultar límites de rate limiting
 */
app.http('RateLimitStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'rate-limit-status',
    handler: async (request, context) => {
        const clientIP = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                        request.headers['x-real-ip'] || 
                        request.headers['cf-connecting-ip'] ||
                        request.ip || 
                        'unknown';
        
        const rateLimitResult = checkRateLimit(clientIP);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                ip: clientIP,
                remaining: rateLimitResult.remaining,
                limit: REQUESTS_PER_DAY,
                resetTime: rateLimitResult.resetTime || null
            })
        };
    }
});