const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen HEIC válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es HEIC válido
 */
const validateHeicImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }
    
    // Verificar magic bytes de HEIC/HEIF
    const heicSignature = imageBuffer.toString('ascii', 4, 8);
    const brandSignature = imageBuffer.toString('ascii', 8, 12);
    
    return heicSignature === 'ftyp' && 
           (brandSignature === 'heic' || 
            brandSignature === 'heix' || 
            brandSignature === 'hevc' || 
            brandSignature === 'hevx');
};

/**
 * Convierte imagen HEIC a AVIF
 * @param {Buffer} imageBuffer - Buffer de imagen HEIC
 * @param {Object} options - Opciones de conversión AVIF
 * @returns {Promise<Buffer>} - Buffer de imagen AVIF
 */
const convertHeicToAvif = async (imageBuffer, options = {}) => {
    const {
        quality = 50,
        lossless = false,
        effort = 4,
        chromaSubsampling = '4:4:4',
        bitdepth = 8,
        speed = 8,
        background = { r: 255, g: 255, b: 255 }
    } = options;

    try {
        let pipeline = sharp(imageBuffer);
        const metadata = await sharp(imageBuffer).metadata();

        // Si no es lossless y tiene alpha, considerar el fondo si se especifica
        if (!lossless && metadata.hasAlpha && options.flatten === true) {
            pipeline = pipeline.flatten({ background: background });
        }

        const avifOptions = {
            quality: quality,
            lossless: lossless,
            effort: effort,
            chromaSubsampling: chromaSubsampling,
            bitdepth: bitdepth,
            speed: speed
        };

        pipeline = pipeline.avif(avifOptions);

        const avifBuffer = await pipeline.toBuffer();
        return avifBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo HEIC a AVIF: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de HEIC a AVIF
 * @param {Buffer} imageBuffer - Buffer de imagen HEIC
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer AVIF y metadata
 */
const processHeicToAvif = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateHeicImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen HEIC válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando HEIC a AVIF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo HEIC a AVIF...');
        const avifBuffer = await convertHeicToAvif(processedBuffer, conversionParams.avifOptions);

        const finalMetadata = await sharp(avifBuffer).metadata();
        const finalSize = avifBuffer.length;

        console.log(`📤 AVIF generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: avifBuffer,
            format: 'avif',
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
        throw new Error(`Error en proceso HEIC->AVIF: ${error.message}`);
    }
};

module.exports = {
    convertHeicToAvif,
    validateHeicImage,
    processHeicToAvif
};