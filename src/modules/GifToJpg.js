// ========== GIF to JPG ==========
const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen GIF a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen GIF
 * @param {Object} options - Opciones de conversión JPG
 * @returns {Promise<Buffer>} - Buffer de imagen JPG
 */
const convertGifToJpg = async (imageBuffer, options = {}) => {
    const {
        quality = 80,
        progressive = true,
        mozjpeg = true
    } = options;

    try {
        let pipeline = sharp(imageBuffer, { page: 0 }); // Solo primer frame

        // GIF puede tener transparencia, usar fondo blanco para JPG
        pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });

        pipeline = pipeline.jpeg({
            quality: quality,
            progressive: progressive,
            mozjpeg: mozjpeg
        });

        const jpgBuffer = await pipeline.toBuffer();
        return jpgBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo GIF a JPG: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea una imagen GIF válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es GIF válido
 */
const validateGifImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 6) {
        return false;
    }
    
    // Verificar GIF signature (GIF87a o GIF89a)
    const signature = imageBuffer.slice(0, 6).toString('ascii');
    return signature === 'GIF87a' || signature === 'GIF89a';
};

/**
 * Procesa conversión completa de GIF a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen GIF
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer JPG y metadata
 */
const processGifToJpg = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateGifImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen GIF válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando GIF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo a formato JPG (primer frame)...');
        const jpgBuffer = await convertGifToJpg(processedBuffer, conversionParams.jpgOptions);

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
        throw new Error(`Error en proceso GIF->JPG: ${error.message}`);
    }
};

module.exports = {
    convertGifToJpg,
    validateGifImage,
    processGifToJpg
};