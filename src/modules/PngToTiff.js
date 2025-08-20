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
        // Verificar que sea realmente PNG o que Sharp pueda procesarlo
        return metadata.format !== undefined && metadata.width > 0 && metadata.height > 0;
    } catch (error) {
        return false;
    }
};

/**
 * Convierte PNG a TIFF con opciones de compresión
 * @param {Buffer} pngBuffer - Buffer de imagen PNG
 * @param {Object} options - Opciones de conversión TIFF
 * @returns {Promise<Buffer>} - Buffer de TIFF
 */
const convertPngToTiff = async (pngBuffer, options = {}) => {
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
        let sharpInstance = sharp(pngBuffer);

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
        throw new Error(`Error convirtiendo PNG a TIFF: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de PNG a TIFF con opciones
 * @param {Buffer} pngBuffer - Buffer de imagen PNG
 * @param {Array} processingOptions - Opciones de procesamiento ('optimize-size', 'improve-quality', 'reduce-noise')
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer TIFF y metadata
 */
const processPngToTiff = async (pngBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(pngBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen PNG válida o está corrupto`);
        }

        const originalMetadata = await sharp(pngBuffer).metadata();
        const originalSize = pngBuffer.length;

        console.log(`📥 Procesando PNG a TIFF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📋 Formato detectado por Sharp: ${originalMetadata.format}`);

        let processedBuffer = pngBuffer;
        
        // Aplicar opciones de procesamiento si existen
        if (processingOptions.length > 0) {
            try {
                processedBuffer = await sharedImageProcessing.processImageWithOptions(
                    pngBuffer, 
                    processingOptions, 
                    conversionParams
                );
                console.log(`✅ Aplicadas ${processingOptions.length} opciones de procesamiento`);
            } catch (sharedError) {
                console.log('⚠️ Error en shared processing, usando buffer original:', sharedError.message);
                processedBuffer = pngBuffer;
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

        console.log(`🔄 Convirtiendo PNG a TIFF con compresión ${tiffOptions.compression}...`);
        const tiffBuffer = await convertPngToTiff(processedBuffer, tiffOptions);

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
        console.error(`❌ Error en proceso PNG->TIFF:`, error.message);
        throw new Error(`Error en proceso PNG->TIFF: ${error.message}`);
    }
};

module.exports = {
    processPngToTiff,
    convertPngToTiff,
    validateImageBuffer
};