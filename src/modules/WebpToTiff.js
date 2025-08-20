const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen válida usando Sharp
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {Promise<boolean>} - true si Sharp puede procesar la imagen
 */
const validateImageBuffer = async (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }

    try {
        const metadata = await sharp(imageBuffer).metadata();
        // Verificar que sea realmente WebP o que Sharp pueda procesarlo
        return metadata.format !== undefined && metadata.width > 0 && metadata.height > 0;
    } catch (error) {
        return false;
    }
};

/**
 * Convierte WebP a TIFF con opciones de compresión
 * @param {Buffer} webpBuffer - Buffer de imagen WebP
 * @param {Object} options - Opciones de conversión TIFF
 * @returns {Promise<Buffer>} - Buffer de TIFF
 */
const convertWebpToTiff = async (webpBuffer, options = {}) => {
    const {
        compression = 'lzw',
        quality = 80,
        predictor = 'horizontal',
        pyramid = false,
        tile = false,
        tileWidth = 256,
        tileHeight = 256
    } = options;

    try {
        let sharpInstance = sharp(webpBuffer);

        // Aplicar conversión a TIFF con opciones
        const tiffBuffer = await sharpInstance
            .tiff({
                compression: compression,
                quality: quality,
                predictor: predictor,
                pyramid: pyramid,
                tile: tile,
                tileWidth: tileWidth,
                tileHeight: tileHeight
            })
            .toBuffer();

        return tiffBuffer;

    } catch (error) {
        throw new Error(`Error convirtiendo WebP a TIFF: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de WebP a TIFF con opciones
 * @param {Buffer} webpBuffer - Buffer de imagen WebP
 * @param {Array} processingOptions - Opciones de procesamiento ('optimize-size', 'improve-quality', 'reduce-noise')
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer TIFF y metadata
 */
const processWebpToTiff = async (webpBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(webpBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen WebP válida o está corrupto`);
        }

        const originalMetadata = await sharp(webpBuffer).metadata();
        const originalSize = webpBuffer.length;

        console.log(`📥 Procesando WebP a TIFF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📋 Formato detectado por Sharp: ${originalMetadata.format}`);

        let processedBuffer = webpBuffer;
        
        // Aplicar opciones de procesamiento si existen
        if (processingOptions.length > 0) {
            try {
                processedBuffer = await sharedImageProcessing.processImageWithOptions(
                    webpBuffer, 
                    processingOptions, 
                    conversionParams
                );
                console.log(`✅ Aplicadas ${processingOptions.length} opciones de procesamiento`);
            } catch (sharedError) {
                console.log('⚠️ Error en shared processing, usando buffer original:', sharedError.message);
                processedBuffer = webpBuffer;
            }
        }

        // Determinar opciones de TIFF basadas en las opciones seleccionadas
        let tiffOptions = {
            compression: 'lzw',
            quality: 80,
            predictor: 'horizontal',
            pyramid: false,
            tile: false,
            tileWidth: 256,
            tileHeight: 256
        };

        if (processingOptions.includes('optimize-size')) {
            tiffOptions.compression = 'lzw'; // Buena compresión sin pérdida
            tiffOptions.predictor = 'horizontal';
            tiffOptions.tile = true; // Usar tiles para mejor compresión
        }

        if (processingOptions.includes('improve-quality')) {
            tiffOptions.compression = 'none'; // Sin compresión para máxima calidad
            tiffOptions.quality = 100;
            tiffOptions.pyramid = true; // Para mejor rendimiento en visualización
        }

        // Fusionar con parámetros personalizados si existen
        if (conversionParams.tiffOptions) {
            tiffOptions = { ...tiffOptions, ...conversionParams.tiffOptions };
        }

        console.log(`🔄 Convirtiendo WebP a TIFF con compresión ${tiffOptions.compression}...`);
        const tiffBuffer = await convertWebpToTiff(processedBuffer, tiffOptions);

        const finalSize = tiffBuffer.length;
        const finalMetadata = await sharp(tiffBuffer).metadata();

        console.log(`📤 TIFF generado exitosamente: ${(finalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📊 Cambio de tamaño: ${((finalSize - originalSize)/originalSize * 100).toFixed(1)}%`);

        return {
            success: true,
            buffer: tiffBuffer,
            format: 'tiff',
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
                    compression: tiffOptions.compression,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    compressionRatio: finalSize > originalSize ? 'Expansion' : ((1 - finalSize/originalSize) * 100).toFixed(1) + '%'
                }
            }
        };

    } catch (error) {
        console.error(`❌ Error en proceso WebP->TIFF:`, error.message);
        throw new Error(`Error en proceso WebP->TIFF: ${error.message}`);
    }
};

module.exports = {
    processWebpToTiff,
    convertWebpToTiff,
    validateImageBuffer
};