const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen JPG/JPEG a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Object} options - Opciones de conversión PNG
 * @returns {Promise<Buffer>} - Buffer de imagen PNG
 */
const convertJpgToPng = async (imageBuffer, options = {}) => {
    const {
        quality = 90,
        compressionLevel = 6,
        adaptiveFiltering = true,
        progressive = false,
        palette = false
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        pipeline = pipeline.png({
            quality: quality,
            compressionLevel: compressionLevel,
            adaptiveFiltering: adaptiveFiltering,
            progressive: progressive,
            palette: palette
        });

        const pngBuffer = await pipeline.toBuffer();
        return pngBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo JPG a PNG: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea una imagen JPG válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es JPG válido
 */
const validateJpgImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 10) {
        return false;
    }
    
    const jpegSignature = imageBuffer.slice(0, 3).toString('hex').toUpperCase();
    return jpegSignature === 'FFD8FF';
};

/**
 * Procesa conversión completa de JPG a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PNG y metadata
 */
const processJpgToPng = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateJpgImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen JPG/JPEG válida');
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

        console.log('🔄 Convirtiendo a formato PNG...');
        const pngBuffer = await convertJpgToPng(processedBuffer, conversionParams.pngOptions);

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
        throw new Error(`Error en proceso JPG->PNG: ${error.message}`);
    }
};

module.exports = {
    convertJpgToPng,
    validateJpgImage,
    processJpgToPng
};