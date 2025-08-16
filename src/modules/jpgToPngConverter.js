const sharp = require('sharp');
// Importar módulo compartido - ajustar ruta según estructura
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Conversor específico de JPG a PNG
 * Usa el módulo compartido para opciones adicionales
 */

/**
 * Convierte imagen JPG/JPEG a PNG
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Object} options - Opciones de conversión PNG
 * @returns {Promise<Buffer>} - Buffer de imagen PNG
 */
const convertJpgToPng = async (imageBuffer, options = {}) => {
    const {
        quality = 90,
        compressionLevel = 6,
        adaptiveFiltering = true,
        progressive = false,
        palette = false // Para PNG-8 si se desea
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // Configurar salida PNG
        pipeline = pipeline.png({
            quality: quality,
            compressionLevel: compressionLevel,
            adaptiveFiltering: adaptiveFiltering,
            progressive: progressive,
            palette: palette
        });

        const pngBuffer = await pipeline.toBuffer();
        return pngBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo JPG a PNG: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea una imagen JPG válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es JPG válido
 */
const validateJpgImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 10) {
        return false;
    }
    
    // Verificar magic bytes de JPG/JPEG (FF D8 FF)
    const jpegSignature = imageBuffer.slice(0, 3).toString('hex').toUpperCase();
    return jpegSignature === 'FFD8FF';
};

/**
 * Función principal que maneja todo el proceso de conversión
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Array} processingOptions - Opciones de procesamiento ['reduce-noise', 'improve-quality', 'optimize-size']
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PNG y metadata
 */
const processJpgToPng = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // 1. Validar imagen JPG
        if (!validateJpgImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen JPG/JPEG válida');
        }

        // 2. Obtener metadata original
        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando JPG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

        // 3. Aplicar opciones de procesamiento usando módulo compartido
        let processedBuffer = imageBuffer;
        
        if (processingOptions.length > 0) {
            processedBuffer = await sharedImageProcessing.processImageWithOptions(
                imageBuffer, 
                processingOptions, 
                conversionParams
            );
        }

        // 4. Convertir a PNG (paso final)
        console.log('🔄 Convirtiendo a formato PNG...');
        const pngBuffer = await convertJpgToPng(processedBuffer, conversionParams.pngOptions);

        // 5. Obtener metadata final
        const finalMetadata = await sharp(pngBuffer).metadata();
        const finalSize = pngBuffer.length;

        console.log(`📤 PNG generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: pngBuffer,
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
        throw new Error(`Error en proceso JPG->PNG: ${error.message}`);
    }
};

module.exports = {
    convertJpgToPng,
    validateJpgImage,
    processJpgToPng
};