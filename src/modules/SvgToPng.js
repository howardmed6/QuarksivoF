const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen SVG a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen SVG
 * @param {Object} options - Opciones de conversión PNG
 * @returns {Promise<Buffer>} - Buffer de imagen PNG
 */
const convertSvgToPng = async (imageBuffer, options = {}) => {
    const {
        compressionLevel = 6,
        progressive = false,
        palette = false,
        background = null, // null para mantener transparencia
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
                background: background || { r: 0, g: 0, b: 0, alpha: 0 }
            });
        }

        // Si se especifica background, aplicar flatten
        if (background) {
            pipeline = pipeline.flatten({ background });
        }

        pipeline = pipeline.png({
            compressionLevel: compressionLevel,
            progressive: progressive,
            palette: palette,
            quality: 100,
            effort: 7
        });

        const pngBuffer = await pipeline.toBuffer();
        return pngBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo SVG a PNG: ${error.message}`);
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
 * Procesa conversión completa de SVG a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen SVG
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PNG y metadata
 */
const processSvgToPng = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
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

        console.log('🔄 Convirtiendo a formato PNG...');
        const pngBuffer = await convertSvgToPng(processedBuffer, conversionParams.pngOptions);

        const finalMetadata = await sharp(pngBuffer).metadata();
        const finalSize = pngBuffer.length;

        console.log(`📤 PNG generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024).toFixed(2)}KB`);

        return {
            success: true,
            buffer: pngBuffer,
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
        throw new Error(`Error en proceso SVG->PNG: ${error.message}`);
    }
};

module.exports = {
    convertSvgToPng,
    validateSvgImage,
    processSvgToPng
};