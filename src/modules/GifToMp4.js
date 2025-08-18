const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Convierte GIF animado a MP4
 * @param {Buffer} gifBuffer - Buffer de imagen GIF
 * @param {Object} options - Opciones de conversión MP4
 * @returns {Promise<Buffer>} - Buffer de video MP4
 */
const convertGifToMp4 = async (gifBuffer, options = {}) => {
    const {
        quality = 23, // CRF value (0-51, menor = mejor calidad)
        fps = null, // null = mantener fps original
        scale = null, // null = mantener escala original
        codec = 'libx264',
        preset = 'medium'
    } = options;

    const tempDir = path.join(__dirname, '../temp');
    const uniqueId = uuidv4();
    const inputPath = path.join(tempDir, `${uniqueId}_input.gif`);
    const outputPath = path.join(tempDir, `${uniqueId}_output.mp4`);

    try {
        // Crear directorio temporal si no existe
        try {
            await fs.access(tempDir);
        } catch {
            await fs.mkdir(tempDir, { recursive: true });
        }

        // Escribir GIF temporal
        await fs.writeFile(inputPath, gifBuffer);

        // Convertir usando FFmpeg
        await new Promise((resolve, reject) => {
            let command = ffmpeg(inputPath)
                .videoCodec(codec)
                .outputOptions([
                    '-crf', quality.toString(),
                    '-preset', preset,
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart'
                ]);

            if (fps) {
                command = command.fps(fps);
            }

            if (scale) {
                command = command.size(scale);
            }

            command
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Leer resultado
        const mp4Buffer = await fs.readFile(outputPath);

        // Limpiar archivos temporales
        try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
        } catch (cleanupError) {
            console.warn('⚠️ Error limpiando archivos temporales:', cleanupError.message);
        }

        return mp4Buffer;
        
    } catch (error) {
        // Limpiar archivos temporales en caso de error
        try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
        } catch {}
        
        throw new Error(`Error convirtiendo GIF a MP4: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea un GIF válido
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {boolean} - true si es GIF válido
 */
const validateGifImage = (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 6) {
        return false;
    }
    
    // Verificar magic bytes de GIF (GIF87a o GIF89a)
    const signature = imageBuffer.toString('ascii', 0, 6);
    
    return signature === 'GIF87a' || signature === 'GIF89a';
};

/**
 * Obtiene información del GIF usando Sharp
 * @param {Buffer} gifBuffer - Buffer del GIF
 * @returns {Promise<Object>} - Metadata del GIF
 */
const getGifMetadata = async (gifBuffer) => {
    try {
        const metadata = await sharp(gifBuffer, { pages: -1 }).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            pages: metadata.pages || 1,
            format: metadata.format,
            size: gifBuffer.length,
            density: metadata.density,
            hasAlpha: metadata.hasAlpha,
            isAnimated: (metadata.pages || 1) > 1
        };
    } catch (error) {
        throw new Error(`Error obteniendo metadata del GIF: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de GIF a MP4
 * @param {Buffer} imageBuffer - Buffer de imagen GIF
 * @param {Array} processingOptions - Opciones de procesamiento (limitadas para GIF)
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer MP4 y metadata
 */
const processGifToMp4 = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateGifImage(imageBuffer)) {
            throw new Error('El archivo no es un GIF válido');
        }

        const originalMetadata = await getGifMetadata(imageBuffer);
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando GIF: ${originalMetadata.width}x${originalMetadata.height}, ${originalMetadata.pages} frames, ${(originalSize/1024/1024).toFixed(2)}MB`);

        if (!originalMetadata.isAnimated) {
            console.log('⚠️ Advertencia: El GIF no parece ser animado');
        }

        // Nota: Para GIF a MP4, el procesamiento de opciones es limitado
        // ya que trabajamos directamente con el archivo GIF animado
        
        console.log('🔄 Convirtiendo a formato MP4...');
        const mp4Buffer = await convertGifToMp4(imageBuffer, conversionParams.mp4Options);

        const finalSize = mp4Buffer.length;

        // Para MP4 no podemos usar Sharp para metadata, usamos estimaciones
        const finalMetadata = {
            format: 'mp4',
            width: originalMetadata.width,
            height: originalMetadata.height,
            size: finalSize,
            codec: conversionParams.mp4Options?.codec || 'libx264'
        };

        console.log(`📤 MP4 generado: ${finalMetadata.width}x${finalMetadata.height}, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: mp4Buffer,
            metadata: {
                original: {
                    format: originalMetadata.format,
                    width: originalMetadata.width,
                    height: originalMetadata.height,
                    size: originalSize,
                    pages: originalMetadata.pages,
                    isAnimated: originalMetadata.isAnimated,
                    hasAlpha: originalMetadata.hasAlpha
                },
                final: {
                    format: finalMetadata.format,
                    width: finalMetadata.width,
                    height: finalMetadata.height,
                    size: finalSize,
                    codec: finalMetadata.codec
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
        throw new Error(`Error en proceso GIF->MP4: ${error.message}`);
    }
};

module.exports = {
    convertGifToMp4,
    validateGifImage,
    getGifMetadata,
    processGifToMp4
};