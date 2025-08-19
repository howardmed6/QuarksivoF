// ========== BMP to JPG ==========
const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen BMP a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen BMP
 * @param {Object} options - Opciones de conversión JPG
 * @returns {Promise<Buffer>} - Buffer de imagen JPG
 */
const convertBmpToJpg = async (imageBuffer, options = {}) => {
    const {
        quality = 80,
        progressive = true,
        mozjpeg = true
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // BMP no tiene transparencia, convertir directamente a JPG
        pipeline = pipeline.jpeg({
            quality: quality,
            progressive: progressive,
            mozjpeg: mozjpeg
        });

        const jpgBuffer = await pipeline.toBuffer();
        return jpgBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo BMP a JPG: ${error.message}`);
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
 * Procesa conversión completa de BMP a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen BMP
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer JPG y metadata
 */
const processBmpToJpg = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
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

        console.log('🔄 Convirtiendo a formato JPG...');
        const jpgBuffer = await convertBmpToJpg(processedBuffer, conversionParams.jpgOptions);

        const finalMetadata = await sharp(jpgBuffer).metadata();
        const finalSize = jpgBuffer.length;

        console.log(`📤 JPG generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: jpgBuffer,
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
        throw new Error(`Error en proceso BMP->JPG: ${error.message}`);
    }
};

module.exports = {
    convertBmpToJpg,
    validateBmpImage,
    processBmpToJpg
};