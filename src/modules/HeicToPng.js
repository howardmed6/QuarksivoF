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
        if (!(await validateHeicImage(imageBuffer))) {
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
        throw new Error(`Error en proceso HEIC->PNG: ${error.message}`);
    }
};

module.exports = {
    convertHeicToPng,
    validateHeicImage,
    processHeicToPng
};