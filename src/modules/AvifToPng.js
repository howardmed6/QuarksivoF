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
 * Convierte imagen AVIF a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen AVIF
 * @param {Object} options - Opciones de conversión PNG
 * @returns {Promise<Buffer>} - Buffer de imagen PNG
 */
const convertAvifToPng = async (imageBuffer, options = {}) => {
    const {
        compressionLevel = 6,
        adaptiveFiltering = false,
        palette = false,
        quality = 100,
        effort = 7,
        colours = 256,
        dither = 1.0
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        const pngOptions = {
            compressionLevel: compressionLevel,
            adaptiveFiltering: adaptiveFiltering,
            palette: palette,
            quality: quality,
            effort: effort,
            colours: colours,
            dither: dither
        };

        pipeline = pipeline.png(pngOptions);

        const pngBuffer = await pipeline.toBuffer();
        return pngBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo AVIF a PNG: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de AVIF a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen AVIF
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PNG y metadata
 */
const processAvifToPng = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateAvifImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen AVIF válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando AVIF a PNG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo AVIF a PNG...');
        const pngBuffer = await convertAvifToPng(processedBuffer, conversionParams.pngOptions);

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
        throw new Error(`Error en proceso AVIF->PNG: ${error.message}`);
    }
};

module.exports = {
    convertAvifToPng,
    validateAvifImage,
    processAvifToPng
};