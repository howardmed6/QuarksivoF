const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen PNG a AVIF
 * @param {Buffer} imageBuffer - Buffer de imagen PNG
 * @param {Object} options - Opciones de conversión AVIF
 * @returns {Promise<Buffer>} - Buffer de imagen AVIF
 */
const convertPngToAvif = async (imageBuffer, options = {}) => {
    const {
        quality = 50,
        lossless = false,
        effort = 4,
        chromaSubsampling = '4:4:4'
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // PNG puede tener transparencia, mantenerla en AVIF
        const metadata = await sharp(imageBuffer).metadata();
        
        pipeline = pipeline.avif({
            quality: quality,
            lossless: lossless,
            effort: effort,
            chromaSubsampling: chromaSubsampling
        });

        const avifBuffer = await pipeline.toBuffer();
        return avifBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo PNG a AVIF: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea una imagen PNG válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es PNG válido
 */
const validatePngImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 8) {
        return false;
    }
    
    // Verificar magic bytes de PNG (0x89504E47)
    const pngSignature = imageBuffer.slice(0, 8);
    
    return pngSignature[0] === 0x89 && 
           pngSignature[1] === 0x50 && 
           pngSignature[2] === 0x4E && 
           pngSignature[3] === 0x47 &&
           pngSignature[4] === 0x0D &&
           pngSignature[5] === 0x0A &&
           pngSignature[6] === 0x1A &&
           pngSignature[7] === 0x0A;
};

/**
 * Procesa conversión completa de PNG a AVIF
 * @param {Buffer} imageBuffer - Buffer de imagen PNG
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer AVIF y metadata
 */
const processPngToAvif = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validatePngImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen PNG válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando PNG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo a formato AVIF...');
        const avifBuffer = await convertPngToAvif(processedBuffer, conversionParams.avifOptions);

        const finalMetadata = await sharp(avifBuffer).metadata();
        const finalSize = avifBuffer.length;

        console.log(`📤 AVIF generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: avifBuffer,
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
        throw new Error(`Error en proceso PNG->AVIF: ${error.message}`);
    }
};

module.exports = {
    convertPngToAvif,
    validatePngImage,
    processPngToAvif
};