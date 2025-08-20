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
 * Convierte TIFF a JPG con opciones de calidad
 * @param {Buffer} tiffBuffer - Buffer de imagen TIFF
 * @param {Object} options - Opciones de conversión JPG
 * @returns {Promise<Buffer>} - Buffer de JPG
 */
const convertTiffToJpg = async (tiffBuffer, options = {}) => {
    const {
        quality = 90,
        progressive = true,
        mozjpeg = true,
        optimizeScans = true,
        chromaSubsampling = '4:2:0'
    } = options;

    try {
        let sharpInstance = sharp(tiffBuffer);

        // Aplicar conversión a JPG con opciones
        const jpgBuffer = await sharpInstance
            .jpeg({
                quality: quality,
                progressive: progressive,
                mozjpeg: mozjpeg,
                optimizeScans: optimizeScans,
                chromaSubsampling: chromaSubsampling
            })
            .toBuffer();

        return jpgBuffer;

    } catch (error) {
        throw new Error(`Error convirtiendo TIFF a JPG: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de TIFF a JPG con opciones
 * @param {Buffer} tiffBuffer - Buffer de imagen TIFF
 * @param {Array} processingOptions - Opciones de procesamiento ('optimize-size', 'improve-quality', 'reduce-noise')
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer JPG y metadata
 */
const processTiffToJpg = async (tiffBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(tiffBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen TIFF válida o está corrupto`);
        }

        const originalMetadata = await sharp(tiffBuffer).metadata();
        const originalSize = tiffBuffer.length;

        console.log(`📥 Procesando TIFF a JPG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
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

        // Determinar opciones de JPG basadas en las opciones seleccionadas
        let jpgOptions = {
            quality: 90,
            progressive: true,
            mozjpeg: true,
            optimizeScans: true,
            chromaSubsampling: '4:2:0'
        };

        if (processingOptions.includes('optimize-size')) {
            jpgOptions.quality = 80;
            jpgOptions.chromaSubsampling = '4:2:0'; // Más compresión
        }

        if (processingOptions.includes('improve-quality')) {
            jpgOptions.quality = 95;
            jpgOptions.chromaSubsampling = '4:4:4'; // Menos compresión, más calidad
        }

        // Fusionar con parámetros personalizados si existen
        if (conversionParams.jpgOptions) {
            jpgOptions = { ...jpgOptions, ...conversionParams.jpgOptions };
        }

        console.log(`🔄 Convirtiendo TIFF a JPG con calidad ${jpgOptions.quality}...`);
        const jpgBuffer = await convertTiffToJpg(processedBuffer, jpgOptions);

        const finalSize = jpgBuffer.length;
        const finalMetadata = await sharp(jpgBuffer).metadata();

        console.log(`📤 JPG generado exitosamente: ${(finalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📊 Reducción de tamaño: ${((1 - finalSize/originalSize) * 100).toFixed(1)}%`);

        return {
            success: true,
            buffer: jpgBuffer,
            format: 'jpg',
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
                    jpgQuality: jpgOptions.quality,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    compressionRatio: ((1 - finalSize/originalSize) * 100).toFixed(1) + '%'
                }
            }
        };

    } catch (error) {
        console.error(`❌ Error en proceso TIFF->JPG:`, error.message);
        throw new Error(`Error en proceso TIFF->JPG: ${error.message}`);
    }
};

module.exports = {
    processTiffToJpg,
    convertTiffToJpg,
    validateImageBuffer
};