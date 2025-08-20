const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen AVIF válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es AVIF válido
 */
const validateAvifImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }
    
    // Verificar magic bytes de AVIF
    const header = imageBuffer.toString('ascii', 4, 12);
    return header === 'ftypavif' || header.startsWith('ftyp') && imageBuffer.includes(Buffer.from('avif', 'ascii'));
};

/**
 * Convierte imagen AVIF a WebP
 * @param {Buffer} imageBuffer - Buffer de imagen AVIF
 * @param {Object} options - Opciones de conversión WebP
 * @returns {Promise<Buffer>} - Buffer de imagen WebP
 */
const convertAvifToWebp = async (imageBuffer, options = {}) => {
    const {
        quality = 80,
        alphaQuality = 100,
        lossless = false,
        nearLossless = false,
        smartSubsample = false,
        effort = 4,
        loop = 0,
        delay = 100,
        force = true
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        const webpOptions = {
            quality: quality,
            alphaQuality: alphaQuality,
            lossless: lossless,
            nearLossless: nearLossless,
            smartSubsample: smartSubsample,
            effort: effort,
            loop: loop,
            delay: delay,
            force: force
        };

        pipeline = pipeline.webp(webpOptions);

        const webpBuffer = await pipeline.toBuffer();
        return webpBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo AVIF a WebP: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de AVIF a WebP
 * @param {Buffer} imageBuffer - Buffer de imagen AVIF
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer WebP y metadata
 */
const processAvifToWebp = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateAvifImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen AVIF válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando AVIF a WebP: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo AVIF a WebP...');
        const webpBuffer = await convertAvifToWebp(processedBuffer, conversionParams.webpOptions);

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
        throw new Error(`Error en proceso AVIF->WebP: ${error.message}`);
    }
};

module.exports = {
    convertAvifToWebp,
    validateAvifImage,
    processAvifToWebp
};