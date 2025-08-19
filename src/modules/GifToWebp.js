// ========== GIF to WebP ==========
const sharp = require('sharp');
const sharedImageProcessing = require('../helpers/shared-image-processing');

const convertGifToWebp = async (imageBuffer, options = {}) => {
    const {
        quality = 80,
        lossless = false,
        nearLossless = false,
        smartSubsample = true
    } = options;

    try {
        let pipeline = sharp(imageBuffer, { animated: true });

        pipeline = pipeline.webp({
            quality: quality,
            lossless: lossless,
            nearLossless: nearLossless,
            smartSubsample: smartSubsample
        });

        const webpBuffer = await pipeline.toBuffer();
        return webpBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo GIF a WebP: ${error.message}`);
    }
};

const validateGifImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 6) {
        return false;
    }
    
    // Verificar magic bytes de GIF
    const gifSignature = imageBuffer.slice(0, 6).toString('ascii');
    return gifSignature === 'GIF87a' || gifSignature === 'GIF89a';
};

const processGifToWebp = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateGifImage(imageBuffer)) {
            throw new Error('El archivo no es una imagen GIF válida');
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando GIF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log('🔄 Convirtiendo a formato WebP...');
        const webpBuffer = await convertGifToWebp(processedBuffer, conversionParams.webpOptions);

        const finalMetadata = await sharp(webpBuffer).metadata();
        const finalSize = webpBuffer.length;

        console.log(`📤 WebP generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: webpBuffer,
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
        throw new Error(`Error en proceso GIF->WebP: ${error.message}`);
    }
};

module.exports = {
    convertGifToWebp,
    validateGifImage,
    processGifToWebp
};
