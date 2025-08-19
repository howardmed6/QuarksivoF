const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen JPG válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es JPG válido
 */
const validateJpgImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 3) {
        return false;
    }
    
    // Verificar magic bytes de JPEG
    return imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF;
};

/**
 * Convierte imagen JPG a HEIC
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Object} options - Opciones de conversión HEIC
 * @returns {Promise<Buffer>} - Buffer de imagen HEIC
 */
const convertJpgToHeic = async (imageBuffer, options = {}) => {
    const {
        quality = 50,
        compression = 'av1',
        effort = 4,
        chromaSubsampling = '4:2:0',
        bitdepth = 8,
        lossless = false
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

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
        throw new Error(`Error convirtiendo JPG a HEIC: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de JPG a HEIC
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer HEIC y metadata
 */
const processJpgToHeic = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateJpgImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen JPG válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando JPG a HEIC: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo JPG a HEIC...');
        const heicBuffer = await convertJpgToHeic(processedBuffer, conversionParams.heicOptions);

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
        throw new Error(`Error en proceso JPG->HEIC: ${error.message}`);
    }
};

module.exports = {
    convertJpgToHeic,
    validateJpgImage,
    processJpgToHeic
};