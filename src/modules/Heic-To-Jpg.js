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
 * Convierte imagen HEIC a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen HEIC
 * @param {Object} options - Opciones de conversión JPG
 * @returns {Promise<Buffer>} - Buffer de imagen JPG
 */
const convertHeicToJpg = async (imageBuffer, options = {}) => {
    const {
        quality = 90,
        progressive = false,
        mozjpeg = true,
        background = { r: 255, g: 255, b: 255 }
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // HEIC puede tener transparencia, agregar fondo si es necesario
        const metadata = await sharp(imageBuffer).metadata();
        
        if (metadata.hasAlpha) {
            pipeline = pipeline.flatten({ background: background });
        }

        pipeline = pipeline.jpeg({
            quality: quality,
            progressive: progressive,
            mozjpeg: mozjpeg
        });

        const jpgBuffer = await pipeline.toBuffer();
        return jpgBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo HEIC a JPG: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de HEIC a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen HEIC
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer JPG y metadata
 */
const processHeicToJpg = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateHeicImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen HEIC válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando HEIC a JPG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo HEIC a JPG...');
        const jpgBuffer = await convertHeicToJpg(processedBuffer, conversionParams.jpgOptions);

        const finalMetadata = await sharp(jpgBuffer).metadata();
        const finalSize = jpgBuffer.length;

        console.log(`📤 JPG generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: jpgBuffer,
            format: 'jpeg',
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
        throw new Error(`Error en proceso HEIC->JPG: ${error.message}`);
    }
};

module.exports = {
    convertHeicToJpg,
    validateHeicImage,
    processHeicToJpg
};