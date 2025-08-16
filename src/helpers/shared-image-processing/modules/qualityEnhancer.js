const sharp = require('sharp');

/**
 * Módulo para mejorar la calidad de imágenes
 * Reutilizable por cualquier tipo de conversión
 */

/**
 * Mejora la calidad general de la imagen
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {Object} options - Opciones de mejora
 * @returns {Promise<Buffer>} - Buffer de imagen procesada
 */
const enhanceQuality = async (imageBuffer, options = {}) => {
    const {
        sharpenSigma = 1.0,
        sharpenFlat = 1.0,
        sharpenJagged = 2.0,
        normalizeEnabled = true,
        enhanceEnabled = true,
        contrastMultiplier = 1.05,
        brightnessMultiplier = 1.02
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // Aplicar sharpening
        pipeline = pipeline.sharpen({
            sigma: sharpenSigma,
            flat: sharpenFlat,
            jagged: sharpenJagged
        });

        // Normalizar histograma si está habilitado
        if (normalizeEnabled) {
            pipeline = pipeline.normalize();
        }

        // Mejorar contraste y brillo
        pipeline = pipeline.modulate({
            brightness: brightnessMultiplier,
            saturation: 1.01 // Ligero aumento de saturación
        });

        // Aplicar mejora general si está habilitada
        if (enhanceEnabled) {
            pipeline = pipeline.linear(contrastMultiplier, 0); // Aumentar contraste
        }

        const enhancedBuffer = await pipeline.toBuffer();
        
        return enhancedBuffer;
    } catch (error) {
        throw new Error(`Error mejorando calidad: ${error.message}`);
    }
};

/**
 * Mejora específica para fotografías
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Buffer>} - Buffer de imagen procesada
 */
const enhancePhotoQuality = async (imageBuffer) => {
    return enhanceQuality(imageBuffer, {
        sharpenSigma: 1.2,
        sharpenFlat: 1.0,
        sharpenJagged: 2.5,
        contrastMultiplier: 1.08,
        brightnessMultiplier: 1.03
    });
};

/**
 * Mejora específica para gráficos/logos
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Buffer>} - Buffer de imagen procesada
 */
const enhanceGraphicsQuality = async (imageBuffer) => {
    return enhanceQuality(imageBuffer, {
        sharpenSigma: 0.8,
        sharpenFlat: 0.5,
        sharpenJagged: 1.5,
        normalizeEnabled: false,
        contrastMultiplier: 1.03,
        brightnessMultiplier: 1.01
    });
};

module.exports = {
    enhanceQuality,
    enhancePhotoQuality,
    enhanceGraphicsQuality
};