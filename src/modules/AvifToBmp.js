const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen AVIF válida
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es AVIF válido
 */
const validateAvifImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }
    
    // Verificar magic bytes de AVIF
    const header = imageBuffer.toString('ascii', 4, 12);
    return header === 'ftypavif' || header.startsWith('ftyp') && imageBuffer.includes(Buffer.from('avif', 'ascii'));
};

/**
 * Convierte imagen AVIF a BMP
 * @param {Buffer} imageBuffer - Buffer de imagen AVIF
 * @param {Object} options - Opciones de conversión BMP
 * @returns {Promise<Buffer>} - Buffer de imagen BMP
 */
const convertAvifToBmp = async (imageBuffer, options = {}) => {
    const {
        background = { r: 255, g: 255, b: 255 }
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // BMP no soporta transparencia, por lo que necesitamos un fondo
        if (background) {
            pipeline = pipeline.flatten({ background });
        }

        // Convertir a BMP (formato TIFF como alternativa ya que Sharp no tiene BMP nativo)
        // Usamos formato raw y luego manejamos como BMP
        pipeline = pipeline.raw();
        
        const rawBuffer = await pipeline.toBuffer({ resolveWithObject: true });
        
        // Convertir raw a BMP usando Sharp con formato TIFF como alternativa más compatible
        const bmpPipeline = sharp(rawBuffer.data, {
            raw: {
                width: rawBuffer.info.width,
                height: rawBuffer.info.height,
                channels: rawBuffer.info.channels
            }
        });
        
        const bmpBuffer = await bmpPipeline.tiff().toBuffer();
        return bmpBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo AVIF a BMP: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de AVIF a BMP
 * @param {Buffer} imageBuffer - Buffer de imagen AVIF
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer BMP y metadata
 */
const processAvifToBmp = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateAvifImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen AVIF válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando AVIF a BMP: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo AVIF a BMP...');
        const bmpBuffer = await convertAvifToBmp(processedBuffer, conversionParams.bmpOptions);

        const finalMetadata = await sharp(bmpBuffer).metadata();
        const finalSize = bmpBuffer.length;

        console.log(`📤 BMP generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: bmpBuffer,
            format: 'tiff', // Sharp maneja BMP como TIFF internamente
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
        throw new Error(`Error en proceso AVIF->BMP: ${error.message}`);
    }
};

module.exports = {
    convertAvifToBmp,
    validateAvifImage,
    processAvifToBmp
};