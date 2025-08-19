const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen WebP válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es WebP válido
 */
const validateWebpImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }
    
    // Verificar magic bytes de WebP
    const riffSignature = imageBuffer.toString('ascii', 0, 4);
    const webpSignature = imageBuffer.toString('ascii', 8, 12);
    
    return riffSignature === 'RIFF' && webpSignature === 'WEBP';
};

/**
 * Convierte imagen WebP a HEIC
 * @param {Buffer} imageBuffer - Buffer de imagen WebP
 * @param {Object} options - Opciones de conversión HEIC
 * @returns {Promise<Buffer>} - Buffer de imagen HEIC
 */
const convertWebpToHeic = async (imageBuffer, options = {}) => {
    const {
        quality = 50,
        compression = 'av1',
        effort = 4,
        chromaSubsampling = '4:2:0',
        bitdepth = 8,
        lossless = false,
        background = { r: 255, g: 255, b: 255 }
    } = options;

    try {
        let pipeline = sharp(imageBuffer);
        const metadata = await sharp(imageBuffer).metadata();

        // Si no es lossless y tiene alpha, considerar el fondo si se especifica
        if (!lossless && metadata.hasAlpha && options.flatten === true) {
            pipeline = pipeline.flatten({ background: background });
        }

        const heicOptions = {
            quality: quality,
            compression: compression,
            effort: effort,
            chromaSubsampling: chromaSubsampling,
            bitdepth: bitdepth,
            lossless: lossless
        };

        pipeline = pipeline.heif(heicOptions);

        const heicBuffer = await pipeline.toBuffer();
        return heicBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo WebP a HEIC: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de WebP a HEIC
 * @param {Buffer} imageBuffer - Buffer de imagen WebP
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer HEIC y metadata
 */
const processWebpToHeic = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateWebpImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen WebP válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando WebP a HEIC: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo WebP a HEIC...');
        const heicBuffer = await convertWebpToHeic(processedBuffer, conversionParams.heicOptions);

        const finalMetadata = await sharp(heicBuffer).metadata();
        const finalSize = heicBuffer.length;

        console.log(`📤 HEIC generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: heicBuffer,
            format: 'heif',
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
        throw new Error(`Error en proceso WebP->HEIC: ${error.message}`);
    }
};

module.exports = {
    convertWebpToHeic,
    validateWebpImage,
    processWebpToHeic
};