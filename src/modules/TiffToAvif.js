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
 * Convierte TIFF a AVIF con opciones de calidad
 * @param {Buffer} tiffBuffer - Buffer de imagen TIFF
 * @param {Object} options - Opciones de conversión AVIF
 * @returns {Promise<Buffer>} - Buffer de AVIF
 */
const convertTiffToAvif = async (tiffBuffer, options = {}) => {
    const {
        quality = 50,
        lossless = false,
        effort = 4,
        chromaSubsampling = '4:4:4'
    } = options;

    try {
        let sharpInstance = sharp(tiffBuffer);

        // Aplicar conversión a AVIF con opciones
        const avifBuffer = await sharpInstance
            .avif({
                quality: quality,
                lossless: lossless,
                effort: effort,
                chromaSubsampling: chromaSubsampling
            })
            .toBuffer();

        return avifBuffer;

    } catch (error) {
        throw new Error(`Error convirtiendo TIFF a AVIF: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de TIFF a AVIF con opciones
 * @param {Buffer} tiffBuffer - Buffer de imagen TIFF
 * @param {Array} processingOptions - Opciones de procesamiento ('optimize-size', 'improve-quality', 'reduce-noise')
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer AVIF y metadata
 */
const processTiffToAvif = async (tiffBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(tiffBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen TIFF válida o está corrupto`);
        }

        const originalMetadata = await sharp(tiffBuffer).metadata();
        const originalSize = tiffBuffer.length;

        console.log(`📥 Procesando TIFF a AVIF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
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

        // Determinar opciones de AVIF basadas en las opciones seleccionadas
        let avifOptions = {
            quality: 50,
            lossless: false,
            effort: 4,
            chromaSubsampling: '4:4:4'
        };

        if (processingOptions.includes('optimize-size')) {
            avifOptions.quality = 40;
            avifOptions.effort = 6; // Más esfuerzo para mejor compresión
            avifOptions.chromaSubsampling = '4:2:0';
        }

        if (processingOptions.includes('improve-quality')) {
            avifOptions.quality = 70;
            avifOptions.lossless = false;
            avifOptions.effort = 6;
            avifOptions.chromaSubsampling = '4:4:4';
        }

        // Fusionar con parámetros personalizados si existen
        if (conversionParams.avifOptions) {
            avifOptions = { ...avifOptions, ...conversionParams.avifOptions };
        }

        console.log(`🔄 Convirtiendo TIFF a AVIF con calidad ${avifOptions.quality}...`);
        const avifBuffer = await convertTiffToAvif(processedBuffer, avifOptions);

        const finalSize = avifBuffer.length;
        const finalMetadata = await sharp(avifBuffer).metadata();

        console.log(`📤 AVIF generado exitosamente: ${(finalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📊 Reducción de tamaño: ${((1 - finalSize/originalSize) * 100).toFixed(1)}%`);

        return {
            success: true,
            buffer: avifBuffer,
            format: 'avif',
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
                    avifQuality: avifOptions.quality,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    compressionRatio: ((1 - finalSize/originalSize) * 100).toFixed(1) + '%'
                }
            }
        };

    } catch (error) {
        console.error(`❌ Error en proceso TIFF->AVIF:`, error.message);
        throw new Error(`Error en proceso TIFF->AVIF: ${error.message}`);
    }
};

module.exports = {
    processTiffToAvif,
    convertTiffToAvif,
    validateImageBuffer
};