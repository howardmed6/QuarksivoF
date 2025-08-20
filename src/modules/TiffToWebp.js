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
 * Convierte TIFF a WebP con opciones de calidad
 * @param {Buffer} tiffBuffer - Buffer de imagen TIFF
 * @param {Object} options - Opciones de conversión WebP
 * @returns {Promise<Buffer>} - Buffer de WebP
 */
const convertTiffToWebp = async (tiffBuffer, options = {}) => {
    const {
        quality = 80,
        lossless = false,
        nearLossless = false,
        smartSubsample = false,
        effort = 4
    } = options;

    try {
        let sharpInstance = sharp(tiffBuffer);

        // Aplicar conversión a WebP con opciones
        const webpBuffer = await sharpInstance
            .webp({
                quality: quality,
                lossless: lossless,
                nearLossless: nearLossless,
                smartSubsample: smartSubsample,
                effort: effort
            })
            .toBuffer();

        return webpBuffer;

    } catch (error) {
        throw new Error(`Error convirtiendo TIFF a WebP: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de TIFF a WebP con opciones
 * @param {Buffer} tiffBuffer - Buffer de imagen TIFF
 * @param {Array} processingOptions - Opciones de procesamiento ('optimize-size', 'improve-quality', 'reduce-noise')
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer WebP y metadata
 */
const processTiffToWebp = async (tiffBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(tiffBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen TIFF válida o está corrupto`);
        }

        const originalMetadata = await sharp(tiffBuffer).metadata();
        const originalSize = tiffBuffer.length;

        console.log(`📥 Procesando TIFF a WebP: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
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

        // Determinar opciones de WebP basadas en las opciones seleccionadas
        let webpOptions = {
            quality: 80,
            lossless: false,
            nearLossless: false,
            smartSubsample: false,
            effort: 4
        };

        if (processingOptions.includes('optimize-size')) {
            webpOptions.quality = 70;
            webpOptions.effort = 6; // Más esfuerzo para mejor compresión
            webpOptions.smartSubsample = true;
        }

        if (processingOptions.includes('improve-quality')) {
            webpOptions.quality = 90;
            webpOptions.lossless = false;
            webpOptions.nearLossless = false;
            webpOptions.effort = 6;
        }

        // Fusionar con parámetros personalizados si existen
        if (conversionParams.webpOptions) {
            webpOptions = { ...webpOptions, ...conversionParams.webpOptions };
        }

        console.log(`🔄 Convirtiendo TIFF a WebP con calidad ${webpOptions.quality}...`);
        const webpBuffer = await convertTiffToWebp(processedBuffer, webpOptions);

        const finalSize = webpBuffer.length;
        const finalMetadata = await sharp(webpBuffer).metadata();

        console.log(`📤 WebP generado exitosamente: ${(finalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📊 Reducción de tamaño: ${((1 - finalSize/originalSize) * 100).toFixed(1)}%`);

        return {
            success: true,
            buffer: webpBuffer,
            format: 'webp',
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
                    webpQuality: webpOptions.quality,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    compressionRatio: ((1 - finalSize/originalSize) * 100).toFixed(1) + '%'
                }
            }
        };

    } catch (error) {
        console.error(`❌ Error en proceso TIFF->WebP:`, error.message);
        throw new Error(`Error en proceso TIFF->WebP: ${error.message}`);
    }
};

module.exports = {
    processTiffToWebp,
    convertTiffToWebp,
    validateImageBuffer
};