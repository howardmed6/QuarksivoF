const sharp = require('sharp');

/**
 * Módulo para optimizar el tamaño de imágenes
 * Reutilizable por cualquier tipo de conversión
 */

/**
 * Optimiza el tamaño de archivo manteniendo calidad visual
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {Object} options - Opciones de optimización
 * @returns {Promise<Buffer>} - Buffer de imagen optimizada
 */
const optimizeSize = async (imageBuffer, options = {}) => {
    const {
        maxWidth = null,
        maxHeight = null,
        quality = 80,
        compressionLevel = 9,
        progressive = true,
        adaptiveFiltering = true,
        preserveAspectRatio = true
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // Redimensionar si se especifica
        if (maxWidth || maxHeight) {
            pipeline = pipeline.resize(maxWidth, maxHeight, {
                withoutEnlargement: true,
                fit: preserveAspectRatio ? 'inside' : 'fill'
            });
        }

        // Obtener metadata para decidir formato de optimización
        const metadata = await sharp(imageBuffer).metadata();
        
        // Aplicar optimización según el formato
        if (metadata.format === 'jpeg') {
            pipeline = pipeline.jpeg({
                quality: quality,
                progressive: progressive,
                mozjpeg: true
            });
        } else if (metadata.format === 'png') {
            pipeline = pipeline.png({
                quality: quality,
                compressionLevel: compressionLevel,
                adaptiveFiltering: adaptiveFiltering,
                progressive: progressive
            });
        } else if (metadata.format === 'webp') {
            pipeline = pipeline.webp({
                quality: quality,
                effort: 6
            });
        }

        const optimizedBuffer = await pipeline.toBuffer();
        
        return optimizedBuffer;
    } catch (error) {
        throw new Error(`Error optimizando tamaño: ${error.message}`);
    }
};

/**
 * Optimización agresiva para reducir al máximo el tamaño
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Buffer>} - Buffer de imagen muy optimizada
 */
const optimizeSizeAggressive = async (imageBuffer) => {
    return optimizeSize(imageBuffer, {
        quality: 70,
        compressionLevel: 9,
        progressive: true,
        adaptiveFiltering: true
    });
};

/**
 * Optimización conservadora manteniendo alta calidad
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Buffer>} - Buffer de imagen optimizada suavemente
 */
const optimizeSizeConservative = async (imageBuffer) => {
    return optimizeSize(imageBuffer, {
        quality: 85,
        compressionLevel: 6,
        progressive: true,
        adaptiveFiltering: true
    });
};

/**
 * Redimensionar imagen manteniendo proporciones
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {number} maxDimension - Dimensión máxima (ancho o alto)
 * @returns {Promise<Buffer>} - Buffer de imagen redimensionada
 */
const resizeImage = async (imageBuffer, maxDimension = 1920) => {
    try {
        const resizedBuffer = await sharp(imageBuffer)
            .resize(maxDimension, maxDimension, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .toBuffer();
        
        return resizedBuffer;
    } catch (error) {
        throw new Error(`Error redimensionando imagen: ${error.message}`);
    }
};

module.exports = {
    optimizeSize,
    optimizeSizeAggressive,
    optimizeSizeConservative,
    resizeImage
};