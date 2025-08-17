const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen WEBP a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen WEBP
 * @param {Object} options - Opciones de conversión PNG
 * @returns {Promise<Buffer>} - Buffer de imagen PNG
 */
const convertWebpToPng = async (imageBuffer, options = {}) => {
    const {
        quality = 90,
        compressionLevel = 6,
        progressive = false,
        palette = false
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // WEBP puede tener transparencia, mantenerla en PNG
        const metadata = await sharp(imageBuffer).metadata();
        
        pipeline = pipeline.png({
            quality: quality,
            compressionLevel: compressionLevel,
            progressive: progressive,
            palette: palette
        });

        const pngBuffer = await pipeline.toBuffer();
        return pngBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo WEBP a PNG: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea una imagen WEBP válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es WEBP válido
 */
const validateWebpImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }
    
    // Verificar magic bytes de WEBP (RIFF + WEBP)
    const riffSignature = imageBuffer.slice(0, 4).toString('ascii');
    const webpSignature = imageBuffer.slice(8, 12).toString('ascii');
    
    return riffSignature === 'RIFF' && webpSignature === 'WEBP';
};

/**
 * Procesa conversión completa de WEBP a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen WEBP
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PNG y metadata
 */
const processWebpToPng = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateWebpImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen WEBP válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando WEBP: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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
        const pngBuffer = await convertWebpToPng(processedBuffer, conversionParams.pngOptions);

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
        throw new Error(`Error en proceso WEBP->PNG: ${error.message}`);
    }
};

module.exports = {
    convertWebpToPng,
    validateWebpImage,
    processWebpToPng
};