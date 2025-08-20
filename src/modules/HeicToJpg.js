const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen HEIC válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es HEIC válido
 */
const validateHeicImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        console.log('❌ Buffer inválido o muy pequeño:', imageBuffer?.length || 'undefined');
        return false;
    }
    
    try {
        // Verificar magic bytes de HEIC/HEIF
        const heicSignature = imageBuffer.toString('ascii', 4, 8);
        const brandSignature = imageBuffer.toString('ascii', 8, 12);
        
        console.log('🔍 Verificando firmas HEIC:');
        console.log('  - heicSignature:', heicSignature);
        console.log('  - brandSignature:', brandSignature);
        console.log('  - Primeros 16 bytes (hex):', imageBuffer.subarray(0, 16).toString('hex'));
        
        // Verificar diferentes variantes de HEIC/HEIF
        const isValidHeic = heicSignature === 'ftyp' && 
               (brandSignature === 'heic' || 
                brandSignature === 'heix' || 
                brandSignature === 'hevc' || 
                brandSignature === 'hevx' ||
                brandSignature === 'mif1' ||  // HEIF genérico
                brandSignature === 'msf1' ||  // HEIF sequence
                brandSignature === 'avif');   // AVIF (formato similar)
        
        console.log('✅ Validación HEIC:', isValidHeic);
        return isValidHeic;
        
    } catch (error) {
        console.log('❌ Error en validación HEIC:', error.message);
        return false;
    }
};

/**
 * Validación alternativa usando Sharp directamente
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {Promise<boolean>} - true si Sharp puede procesar el archivo
 */
const validateHeicWithSharp = async (imageBuffer) => {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        console.log('📊 Metadata Sharp:', {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            channels: metadata.channels
        });
        
        return metadata.format === 'heif'; // Sharp identifica HEIC como 'heif'
    } catch (error) {
        console.log('❌ Sharp no puede procesar el archivo:', error.message);
        return false;
    }
};

/**
 * Convierte imagen HEIC a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen HEIC
 * @param {Object} options - Opciones de conversión PNG
 * @returns {Promise<Buffer>} - Buffer de imagen PNG
 */
const convertHeicToPng = async (imageBuffer, options = {}) => {
    const {
        compressionLevel = 6,
        adaptiveFiltering = false,
        palette = false,
        quality = 100,
        effort = 7,
        colors = 256,
        dither = 1.0
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        const pngOptions = {
            compressionLevel: compressionLevel,
            adaptiveFiltering: adaptiveFiltering,
            quality: quality,
            effort: effort
        };

        // Agregar opciones de paleta solo si está habilitada
        if (palette) {
            pngOptions.palette = true;
            pngOptions.colors = colors;
            pngOptions.dither = dither;
        }

        pipeline = pipeline.png(pngOptions);

        const pngBuffer = await pipeline.toBuffer();
        return pngBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo HEIC a PNG: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de HEIC a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen HEIC
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PNG y metadata
 */
const processHeicToPng = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        console.log('🔍 Iniciando validación HEIC...');
        
        // Validación con métodos múltiples
        const isValidBySignature = validateHeicImage(imageBuffer);
        const isValidBySharp = await validateHeicWithSharp(imageBuffer);
        
        console.log('📋 Resultados validación:', {
            bySignature: isValidBySignature,
            bySharp: isValidBySharp
        });
        
        if (!isValidBySignature && !isValidBySharp) {
            throw new Error('El archivo no es una imagen HEIC válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando HEIC a PNG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

        let processedBuffer = imageBuffer;
        
        if (processingOptions.length > 0) {
            try {
                processedBuffer = await sharedImageProcessing.processImageWithOptions(
                    imageBuffer, 
                    processingOptions, 
                    conversionParams
                );
            } catch (sharedError) {
                console.log('⚠️ Error en shared processing, usando buffer original:', sharedError.message);
                processedBuffer = imageBuffer;
            }
        }

        console.log('🔄 Convirtiendo HEIC a PNG...');
        const pngBuffer = await convertHeicToPng(processedBuffer, conversionParams.pngOptions);

        const finalMetadata = await sharp(pngBuffer).metadata();
        const finalSize = pngBuffer.length;

        console.log(`📤 PNG generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: pngBuffer,
            format: 'png',
            metadata: {
                original: {
                    format: originalMetadata.format,
                    width: originalMetadata.width,
                    height: originalMetadata.height,
                    size: originalSize,
                    channels: originalMetadata.channels,
                    hasAlpha: originalMetadata.hasAlpha
                },
                final: {
                    format: finalMetadata.format,
                    width: finalMetadata.width,
                    height: finalMetadata.height,
                    size: finalSize,
                    channels: finalMetadata.channels,
                    hasAlpha: finalMetadata.hasAlpha
                },
                processing: {
                    appliedOptions: processingOptions,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    compressionRatio: originalSize > finalSize ? ((originalSize - finalSize) / originalSize * 100).toFixed(1) : '0'
                }
            }
        };

    } catch (error) {
        console.error('💥 Error completo en processHeicToPng:', error);
        throw new Error(`Error en proceso HEIC->PNG: ${error.message}`);
    }
};

module.exports = {
    convertHeicToPng,
    validateHeicImage,
    validateHeicWithSharp,
    processHeicToPng
};