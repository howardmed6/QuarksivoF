const sharp = require('sharp');
// Importar módulo compartido - ajustar ruta según estructura
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Conversor específico de PNG a JPG
 * Usa el módulo compartido para opciones adicionales
 */

/**
 * Convierte imagen PNG a JPG
 * @param {Buffer} imageBuffer - Buffer de imagen PNG
 * @param {Object} options - Opciones de conversión JPG
 * @returns {Promise<Buffer>} - Buffer de imagen JPG
 */
const convertPngToJpg = async (imageBuffer, options = {}) => {
    const {
        quality = 90,
        progressive = false,
        mozjpeg = true,
        background = { r: 255, g: 255, b: 255 } // Fondo blanco por defecto para transparencias
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // Manejar transparencia - agregar fondo si el PNG tiene canal alpha
        const metadata = await sharp(imageBuffer).metadata();
        if (metadata.hasAlpha) {
            pipeline = pipeline.flatten({ background });
        }

        // Configurar salida JPG
        pipeline = pipeline.jpeg({
            quality: quality,
            progressive: progressive,
            mozjpeg: mozjpeg
        });

        const jpgBuffer = await pipeline.toBuffer();
        return jpgBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo PNG a JPG: ${error.message}`);
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
    
    // Verificar magic bytes de PNG (89 50 4E 47 0D 0A 1A 0A)
    const pngSignature = imageBuffer.slice(0, 8).toString('hex').toUpperCase();
    return pngSignature === '89504E470D0A1A0A';
};

/**
 * Función principal que maneja todo el proceso de conversión
 * @param {Buffer} imageBuffer - Buffer de imagen PNG
 * @param {Array} processingOptions - Opciones de procesamiento ['reduce-noise', 'improve-quality', 'optimize-size']
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer JPG y metadata
 */
const processPngToJpg = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // 1. Validar imagen PNG
        if (!validatePngImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen PNG válida');
        }

        // 2. Obtener metadata original
        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando PNG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

        // 3. Aplicar opciones de procesamiento usando módulo compartido
        let processedBuffer = imageBuffer;
        
        if (processingOptions.length > 0) {
            processedBuffer = await sharedImageProcessing.processImageWithOptions(
                imageBuffer, 
                processingOptions, 
                conversionParams
            );
        }

        // 4. Convertir a JPG (paso final)
        console.log('🔄 Convirtiendo a formato JPG...');
        const jpgBuffer = await convertPngToJpg(processedBuffer, conversionParams.jpgOptions);

        // 5. Obtener metadata final
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
        throw new Error(`Error en proceso PNG->JPG: ${error.message}`);
    }
};

module.exports = {
    convertPngToJpg,
    validatePngImage,
    processPngToJpg
};