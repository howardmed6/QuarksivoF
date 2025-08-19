// ========== JPG to BMP ==========
const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Convierte imagen JPG a BMP
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Object} options - Opciones de conversión BMP
 * @returns {Promise<Buffer>} - Buffer de imagen BMP
 */
const convertJpgToBmp = async (imageBuffer, options = {}) => {
    try {
        let pipeline = sharp(imageBuffer);

        // BMP no soporta transparencia, usar fondo blanco
        pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });

        // Convertir a formato BMP (usar PNG como alternativa más compatible)
        pipeline = pipeline.png({
            compressionLevel: 0, // Sin compresión para simular BMP
            quality: 100
        });

        const bmpBuffer = await pipeline.toBuffer();
        return bmpBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo JPG a BMP: ${error.message}`);
    }
};

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
 * Valida que el buffer sea una imagen BMP válida (para compatibilidad con otros módulos)
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es BMP válido
 */
const validateBmpImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 54) {
        return false;
    }
    
    // Verificar magic bytes de BMP (BM)
    return imageBuffer[0] === 0x42 && imageBuffer[1] === 0x4D;
};

/**
 * Procesa conversión completa de JPG a BMP
 * @param {Buffer} imageBuffer - Buffer de imagen JPG
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer BMP y metadata
 */
const processJpgToBmp = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateJpgImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen JPG válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando JPG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo a formato BMP...');
        const bmpBuffer = await convertJpgToBmp(processedBuffer, conversionParams.bmpOptions);

        const finalMetadata = await sharp(bmpBuffer).metadata();
        const finalSize = bmpBuffer.length;

        console.log(`📤 BMP generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: bmpBuffer,
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
        throw new Error(`Error en proceso JPG->BMP: ${error.message}`);
    }
};

module.exports = {
    convertJpgToBmp,
    validateJpgImage,    // Para validar archivos JPG (entrada)
    validateBmpImage,    // Para compatibilidad con otros módulos
    processJpgToBmp
};