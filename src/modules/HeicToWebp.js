const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen HEIC válida usando Sharp
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {Promise<boolean>} - true si es HEIC válido
 */
const validateHeicImage = async (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        return false;
    }
    
    try {
        const metadata = await sharp(imageBuffer).metadata();
        return metadata.format === 'heif'; // Sharp identifica HEIC como 'heif'
    } catch (error) {
        return false;
    }
};

/**
 * Convierte imagen HEIC a WebP
 * @param {Buffer} imageBuffer - Buffer de imagen HEIC
 * @param {Object} options - Opciones de conversión WebP
 * @returns {Promise<Buffer>} - Buffer de imagen WebP
 */
const convertHeicToWebp = async (imageBuffer, options = {}) => {
    const {
        quality = 80,
        alphaQuality = 100,
        lossless = false,
        nearLossless = false,
        smartSubsample = false,
        effort = 4
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        const webpOptions = {
            quality: quality,
            alphaQuality: alphaQuality,
            lossless: lossless,
            nearLossless: nearLossless,
            smartSubsample: smartSubsample,
            effort: effort
        };

        pipeline = pipeline.webp(webpOptions);

        const webpBuffer = await pipeline.toBuffer();
        return webpBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo HEIC a WebP: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de HEIC a WebP
 * @param {Buffer} imageBuffer - Buffer de imagen HEIC
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer WebP y metadata
 */
const processHeicToWebp = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!(await validateHeicImage(imageBuffer))) {
            throw new Error('El archivo no es una imagen HEIC válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando HEIC a WebP: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo HEIC a WebP...');
        const webpBuffer = await convertHeicToWebp(processedBuffer, conversionParams.webpOptions);

        const finalMetadata = await sharp(webpBuffer).metadata();
        const finalSize = webpBuffer.length;

        console.log(`📤 WebP generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: webpBuffer,
            format: 'webp',
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
        throw new Error(`Error en proceso HEIC->WebP: ${error.message}`);
    }
};

module.exports = {
    convertHeicToWebp,
    validateHeicImage,
    processHeicToWebp
};