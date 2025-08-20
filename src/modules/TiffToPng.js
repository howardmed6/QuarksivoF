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
        // Verificar que sea realmente TIFF o que Sharp pueda procesarlo
        return metadata.format !== undefined && metadata.width > 0 && metadata.height > 0;
    } catch (error) {
        return false;
    }
};

/**
 * Convierte TIFF a PNG con opciones de compresión
 * @param {Buffer} tiffBuffer - Buffer de imagen TIFF
 * @param {Object} options - Opciones de conversión PNG
 * @returns {Promise<Buffer>} - Buffer de PNG
 */
const convertTiffToPng = async (tiffBuffer, options = {}) => {
    const {
        compressionLevel = 6,
        progressive = false,
        palette = false,
        adaptiveFiltering = false
    } = options;

    try {
        let sharpInstance = sharp(tiffBuffer);

        // Aplicar conversión a PNG con opciones
        const pngBuffer = await sharpInstance
            .png({
                compressionLevel: compressionLevel,
                progressive: progressive,
                palette: palette,
                adaptiveFiltering: adaptiveFiltering
            })
            .toBuffer();

        return pngBuffer;

    } catch (error) {
        throw new Error(`Error convirtiendo TIFF a PNG: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de TIFF a PNG con opciones
 * @param {Buffer} tiffBuffer - Buffer de imagen TIFF
 * @param {Array} processingOptions - Opciones de procesamiento ('optimize-size', 'improve-quality', 'reduce-noise')
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PNG y metadata
 */
const processTiffToPng = async (tiffBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(tiffBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen TIFF válida o está corrupto`);
        }

        const originalMetadata = await sharp(tiffBuffer).metadata();
        const originalSize = tiffBuffer.length;

        console.log(`📥 Procesando TIFF a PNG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📋 Formato detectado por Sharp: ${originalMetadata.format}`);

        let processedBuffer = tiffBuffer;
        
        // Aplicar opciones de procesamiento si existen
        if (processingOptions.length > 0) {
            try {
                processedBuffer = await sharedImageProcessing.processImageWithOptions(
                    tiffBuffer, 
                    processingOptions, 
                    conversionParams
                );
                console.log(`✅ Aplicadas ${processingOptions.length} opciones de procesamiento`);
            } catch (sharedError) {
                console.log('⚠️ Error en shared processing, usando buffer original:', sharedError.message);
                processedBuffer = tiffBuffer;
            }
        }

        // Determinar opciones de PNG basadas en las opciones seleccionadas
        let pngOptions = {
            compressionLevel: 6,
            progressive: false,
            palette: false,
            adaptiveFiltering: false
        };

        if (processingOptions.includes('optimize-size')) {
            pngOptions.compressionLevel = 9; // Máxima compresión
            pngOptions.palette = true; // Usar paleta si es posible
            pngOptions.adaptiveFiltering = true;
        }

        if (processingOptions.includes('improve-quality')) {
            pngOptions.compressionLevel = 3; // Menos compresión para más calidad
            pngOptions.progressive = false;
            pngOptions.palette = false; // Sin paleta para mejor calidad
        }

        // Fusionar con parámetros personalizados si existen
        if (conversionParams.pngOptions) {
            pngOptions = { ...pngOptions, ...conversionParams.pngOptions };
        }

        console.log(`🔄 Convirtiendo TIFF a PNG con compresión ${pngOptions.compressionLevel}...`);
        const pngBuffer = await convertTiffToPng(processedBuffer, pngOptions);

        const finalSize = pngBuffer.length;
        const finalMetadata = await sharp(pngBuffer).metadata();

        console.log(`📤 PNG generado exitosamente: ${(finalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📊 Cambio de tamaño: ${((finalSize - originalSize)/originalSize * 100).toFixed(1)}%`);

        return {
            success: true,
            buffer: pngBuffer,
            format: 'png',
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
                    compressionLevel: pngOptions.compressionLevel,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    compressionRatio: finalSize > originalSize ? 'Expansion' : ((1 - finalSize/originalSize) * 100).toFixed(1) + '%'
                }
            }
        };

    } catch (error) {
        console.error(`❌ Error en proceso TIFF->PNG:`, error.message);
        throw new Error(`Error en proceso TIFF->PNG: ${error.message}`);
    }
};

module.exports = {
    processTiffToPng,
    convertTiffToPng,
    validateImageBuffer
};