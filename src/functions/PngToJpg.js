const { app } = require('@azure/functions');
const { processPngToJpg } = require('../modules/pngToJpgConverter');
const parseMultipart = require('parse-multipart-data');
const sharp = require('sharp');

app.http('ImageConverter', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'convert/png-to-jpg',
    handler: async (request, context) => {
        const startTime = Date.now();
        context.log('🚀 Iniciando conversión PNG a JPG');
        
        try {
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
            
            const parts = parseMultipart.parse(Buffer.from(body), boundary);
            context.log('📦 Partes encontradas:', parts.length);
            
            let imageBuffer = null;
            let options = [];
            
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
            
            // Procesar imagen usando tu módulo (que devuelve un objeto)
            context.log('🔄 Procesando con módulo pngToJpgConverter...');
            const processingResult = await processPngToJpg(
                imageBuffer, 
                options, // processingOptions
                {        // conversionParams
                    jpgOptions: {
                        quality: 90,
                        progressive: false,
                        mozjpeg: true
                    }
                }
            );
            
            context.log('📊 Resultado procesamiento:', {
                success: processingResult.success,
                bufferSize: processingResult.buffer?.length,
                originalSize: processingResult.metadata?.original?.size,
                finalSize: processingResult.metadata?.final?.size
            });
            
            // Validar que el procesamiento fue exitoso
            if (!processingResult.success || !processingResult.buffer) {
                context.log('❌ Procesamiento falló o buffer vacío');
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    jsonBody: {
                        success: false,
                        error: 'Error en el procesamiento de la imagen',
                        code: 'PROCESSING_ERROR'
                    }
                };
            }
            
            const jpgBuffer = processingResult.buffer;
            context.log(`📦 Buffer JPG validado: ${jpgBuffer.length} bytes`);
            
            // Convertir a base64 con validación
            let base64Image;
            try {
                base64Image = jpgBuffer.toString('base64');
                context.log(`📝 Base64 generado: ${base64Image.length} caracteres`);
                
                if (!base64Image || base64Image.length < 100) {
                    throw new Error('Base64 demasiado corto o vacío');
                }
                
            } catch (base64Error) {
                context.log('❌ Error convirtiendo a base64:', base64Error.message);
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    jsonBody: {
                        success: false,
                        error: 'Error convirtiendo imagen a base64',
                        code: 'BASE64_ERROR'
                    }
                };
            }
            
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
                    image: `data:image/jpeg;base64,${base64Image}`,
                    metadata: {
                        width: processingResult.metadata.final.width,
                        height: processingResult.metadata.final.height,
                        format: 'jpeg',
                        originalFormat: processingResult.metadata.original.format
                    },
                    originalSize: processingResult.metadata.original.size,
                    processedSize: processingResult.metadata.final.size,
                    processingTime: processingTime,
                    appliedOptions: processingResult.metadata.processing.appliedOptions,
                    compressionRatio: processingResult.metadata.processing.compressionRatio
                }
            };
            
        } catch (error) {
            context.log('❌ Error crítico en conversión:', error.message);
            context.log('Stack trace:', error.stack);
            
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

app.http('ImageConverterOptions', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: 'convert/png-to-jpg',
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
                service: 'PNG to JPG Converter',
                version: '1.0.0'
            }
        };
    }
});