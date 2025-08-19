// ========== BMP to PNG ==========
const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen BMP a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen BMP
 * @param {Object} options - Opciones de conversión PNG
 * @returns {Promise<Buffer>} - Buffer de imagen PNG
 */
const convertBmpToPng = async (imageBuffer, options = {}) => {
    const {
        quality = 90,
        compressionLevel = 6,
        progressive = false,
        palette = false
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // BMP no tiene transparencia, convertir directamente a PNG
        pipeline = pipeline.png({
            quality: quality,
            compressionLevel: compressionLevel,
            progressive: progressive,
            palette: palette
        });

        const pngBuffer = await pipeline.toBuffer();
        return pngBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo BMP a PNG: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea una imagen BMP válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es BMP válido
 */
const validateBmpImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 54) {
        return false;
    }
    
    // Verificar magic bytes de BMP (BM)
    return imageBuffer[0] === 0x42 && imageBuffer[1] === 0x4D;
};

/**
 * Valida que el buffer sea una imagen PNG válida (para compatibilidad con otros módulos)
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es PNG válido
 */
const validatePngImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 8) {
        return false;
    }
    
    // Verificar PNG signature (89 50 4E 47 0D 0A 1A 0A)
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    
    for (let i = 0; i < pngSignature.length; i++) {
        if (imageBuffer[i] !== pngSignature[i]) {
            return false;
        }
    }
    
    return true;
};

/**
 * Procesa conversión completa de BMP a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen BMP
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PNG y metadata
 */
const processBmpToPng = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateBmpImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen BMP válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando BMP: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo a formato PNG...');
        const pngBuffer = await convertBmpToPng(processedBuffer, conversionParams.pngOptions);

        const finalMetadata = await sharp(pngBuffer).metadata();
        const finalSize = pngBuffer.length;

        console.log(`📤 PNG generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: pngBuffer,
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
        throw new Error(`Error en proceso BMP->PNG: ${error.message}`);
    }
};

module.exports = {
    convertBmpToPng,
    validateBmpImage,
    validatePngImage,  // Para compatibilidad con otros módulos
    processBmpToPng
};