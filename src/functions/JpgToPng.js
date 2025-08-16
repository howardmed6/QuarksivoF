const { app } = require('@azure/functions');
const { processJpgToPng } = require('../modules/jpgToPngConverter');
const parseMultipart = require('parse-multipart-data');
const sharp = require('sharp');

app.http('ImageConverter', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'convert/jpg-to-png',
    handler: async (request, context) => {
        const startTime = Date.now();
        context.log('🚀 Iniciando conversión JPG a PNG');
        
        try {
            // Validar Content-Type
            const contentType = request.headers.get('content-type');
            context.log('Content-Type recibido:', contentType);
            
            if (!contentType || !contentType.includes('multipart/form-data')) {
                context.log('❌ Content-Type inválido');
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    },
                    jsonBody: {
                        success: false,
                        error: 'Content-Type debe ser multipart/form-data',
                        code: 'INVALID_CONTENT_TYPE'
                    }
                };
            }

            // Obtener body y boundary
            const body = await request.arrayBuffer();
            const boundary = contentType.split('boundary=')[1];
            
            if (!boundary) {
                context.log('❌ Boundary no encontrado');
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    jsonBody: {
                        success: false,
                        error: 'Boundary no encontrado en Content-Type',
                        code: 'MISSING_BOUNDARY'
                    }
                };
            }

            context.log('🔍 Parseando multipart con boundary:', boundary);
            
            // SINTAXIS CORREGIDA para parse-multipart-data
            const parts = parseMultipart(Buffer.from(body), boundary);
            context.log('📦 Partes encontradas:', parts.length);
            
            let imageBuffer = null;
            let options = [];
            
            // Procesar partes del formulario
            for (const part of parts) {
                context.log('📄 Procesando parte:', part.name, 'Tamaño:', part.data?.length);
                
                if (part.name === 'file') {
                    imageBuffer = part.data;
                } else if (part.name === 'options') {
                    try {
                        const optionsStr = part.data.toString();
                        options = JSON.parse(optionsStr);
                        if (!Array.isArray(options)) options = [];
                    } catch (e) {
                        context.log('⚠️ Error parseando options:', e.message);
                        options = [];
                    }
                }
            }
            
            // Validar que se recibió archivo
            if (!imageBuffer || imageBuffer.length === 0) {
                context.log('❌ No se encontró archivo de imagen');
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    jsonBody: {
                        success: false,
                        error: 'No se encontró archivo de imagen',
                        code: 'NO_FILE_FOUND'
                    }
                };
            }
            
            context.log(`📁 Archivo recibido: ${(imageBuffer.length/1024/1024).toFixed(2)}MB`);
            context.log(`⚙️ Opciones: ${JSON.stringify(options)}`);
            
            // Procesar imagen
            const pngBuffer = await processJpgToPng(imageBuffer, options);
            
            // Obtener metadata de la imagen original
            const originalMetadata = await sharp(imageBuffer).metadata();
            
            // Convertir a base64
            const base64Image = pngBuffer.toString('base64');
            const processingTime = Date.now() - startTime;
            
            context.log(`✅ Conversión completada en ${processingTime}ms`);
            
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                jsonBody: {
                    success: true,
                    message: 'Conversión completada exitosamente',
                    image: `data:image/png;base64,${base64Image}`,
                    metadata: {
                        width: originalMetadata.width,
                        height: originalMetadata.height,
                        format: 'png',
                        originalFormat: originalMetadata.format
                    },
                    originalSize: imageBuffer.length,
                    processedSize: pngBuffer.length,
                    processingTime: processingTime,
                    appliedOptions: options
                }
            };
            
        } catch (error) {
            context.log('❌ Error en conversión:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: `Error interno del servidor: ${error.message}`,
                    code: 'INTERNAL_ERROR'
                }
            };
        }
    }
});

// Función para manejar CORS preflight
app.http('ImageConverterOptions', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: 'convert/jpg-to-png',
    handler: async (request, context) => {
        context.log('🔄 CORS preflight request');
        
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '3600'
            }
        };
    }
});

// Función de salud para verificar que la API funciona
app.http('HealthCheck', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('💓 Health check solicitado');
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'JPG to PNG Converter',
                version: '1.0.0'
            }
        };
    }
});