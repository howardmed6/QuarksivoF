const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen SVG a WebP
 * @param {Buffer} imageBuffer - Buffer de imagen SVG
 * @param {Object} options - Opciones de conversión WebP
 * @returns {Promise<Buffer>} - Buffer de imagen WebP
 */
const convertSvgToWebp = async (imageBuffer, options = {}) => {
    const {
        quality = 90,
        lossless = false,
        effort = 4,
        background = { r: 255, g: 255, b: 255, alpha: 1 },
        width = null,
        height = null,
        density = 72
    } = options;

    try {
        let pipeline = sharp(imageBuffer, { density });

        // Si se especifican dimensiones, redimensionar
        if (width || height) {
            pipeline = pipeline.resize(width, height, {
                withoutEnlargement: false,
                fit: 'contain',
                background
            });
        }

        pipeline = pipeline.webp({
            quality: lossless ? 100 : quality,
            lossless: lossless,
            effort: effort,
            smartSubsample: !lossless
        });

        const webpBuffer = await pipeline.toBuffer();
        return webpBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo SVG a WebP: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea una imagen SVG válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es SVG válido
 */
const validateSvgImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 10) {
        return false;
    }
    
    const svgString = imageBuffer.toString('utf8', 0, Math.min(200, imageBuffer.length));
    return svgString.includes('<svg') || svgString.includes('<?xml') && svgString.includes('svg');
};

/**
 * Procesa conversión completa de SVG a WebP
 * @param {Buffer} imageBuffer - Buffer de imagen SVG
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer WebP y metadata
 */
const processSvgToWebp = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateSvgImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen SVG válida');
        }

        const originalSize = imageBuffer.length;
        console.log(`📥 Procesando SVG: ${(originalSize/1024).toFixed(2)}KB`);

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

        console.log('🔄 Convirtiendo a formato WebP...');
        const webpBuffer = await convertSvgToWebp(processedBuffer, conversionParams.webpOptions);

        const finalMetadata = await sharp(webpBuffer).metadata();
        const finalSize = webpBuffer.length;

        console.log(`📤 WebP generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024).toFixed(2)}KB`);

        return {
            success: true,
            buffer: webpBuffer,
            metadata: {
                original: {
                    format: 'svg',
                    size: originalSize,
                    isVector: true
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
        throw new Error(`Error en proceso SVG->WebP: ${error.message}`);
    }
};

module.exports = {
    convertSvgToWebp,
    validateSvgImage,
    processSvgToWebp
};