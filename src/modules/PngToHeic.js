const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen PNG válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es PNG válido
 */
const validatePngImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 8) {
        return false;
    }
    
    // Verificar magic bytes de PNG
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    return imageBuffer.subarray(0, 8).equals(pngSignature);
};

/**
 * Convierte imagen PNG a HEIC
 * @param {Buffer} imageBuffer - Buffer de imagen PNG
 * @param {Object} options - Opciones de conversión HEIC
 * @returns {Promise<Buffer>} - Buffer de imagen HEIC
 */
const convertPngToHeic = async (imageBuffer, options = {}) => {
    const {
        quality = 50,
        compression = 'av1',
        effort = 4,
        chromaSubsampling = '4:4:4',
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
        throw new Error(`Error convirtiendo PNG a HEIC: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de PNG a HEIC
 * @param {Buffer} imageBuffer - Buffer de imagen PNG
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer HEIC y metadata
 */
const processPngToHeic = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validatePngImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen PNG válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando PNG a HEIC: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo PNG a HEIC...');
        const heicBuffer = await convertPngToHeic(processedBuffer, conversionParams.heicOptions);

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
        throw new Error(`Error en proceso PNG->HEIC: ${error.message}`);
    }
};

module.exports = {
    convertPngToHeic,
    validatePngImage,
    processPngToHeic
};