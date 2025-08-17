const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen JPG a WEBP
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Object} options - Opciones de conversión WEBP
 * @returns {Promise<Buffer>} - Buffer de imagen WEBP
 */
const convertJpgToWebp = async (imageBuffer, options = {}) => {
    const {
        quality = 80,
        lossless = false,
        effort = 4,
        smartSubsample = true
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        pipeline = pipeline.webp({
            quality: quality,
            lossless: lossless,
            effort: effort,
            smartSubsample: smartSubsample
        });

        const webpBuffer = await pipeline.toBuffer();
        return webpBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo JPG a WEBP: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea una imagen JPG válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es JPG válido
 */
const validateJpgImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 3) {
        return false;
    }
    
    // Verificar magic bytes de JPG (0xFFD8FF)
    const jpegSignature = imageBuffer.slice(0, 3);
    
    return jpegSignature[0] === 0xFF && jpegSignature[1] === 0xD8 && jpegSignature[2] === 0xFF;
};

/**
 * Procesa conversión completa de JPG a WEBP
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer WEBP y metadata
 */
const processJpgToWebp = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateJpgImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen JPG válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando JPG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo a formato WEBP...');
        const webpBuffer = await convertJpgToWebp(processedBuffer, conversionParams.webpOptions);

        const finalMetadata = await sharp(webpBuffer).metadata();
        const finalSize = webpBuffer.length;

        console.log(`📤 WEBP generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: webpBuffer,
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
        throw new Error(`Error en proceso JPG->WEBP: ${error.message}`);
    }
};

module.exports = {
    convertJpgToWebp,
    validateJpgImage,
    processJpgToWebp
};