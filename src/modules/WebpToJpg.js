const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen WEBP a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen WEBP
 * @param {Object} options - Opciones de conversión JPG
 * @returns {Promise<Buffer>} - Buffer de imagen JPG
 */
const convertWebpToJpg = async (imageBuffer, options = {}) => {
    const {
        quality = 90,
        progressive = false,
        mozjpeg = true,
        background = { r: 255, g: 255, b: 255 }
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // WEBP puede tener transparencia, manejarla como PNG
        const metadata = await sharp(imageBuffer).metadata();
        if (metadata.hasAlpha) {
            pipeline = pipeline.flatten({ background });
        }

        pipeline = pipeline.jpeg({
            quality: quality,
            progressive: progressive,
            mozjpeg: mozjpeg
        });

        const jpgBuffer = await pipeline.toBuffer();
        return jpgBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo WEBP a JPG: ${error.message}`);
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
 * Procesa conversión completa de WEBP a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen WEBP
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer JPG y metadata
 */
const processWebpToJpg = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
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

        console.log('🔄 Convirtiendo a formato JPG...');
        const jpgBuffer = await convertWebpToJpg(processedBuffer, conversionParams.jpgOptions);

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
        throw new Error(`Error en proceso WEBP->JPG: ${error.message}`);
    }
};

module.exports = {
    convertWebpToJpg,
    validateWebpImage,
    processWebpToJpg
};