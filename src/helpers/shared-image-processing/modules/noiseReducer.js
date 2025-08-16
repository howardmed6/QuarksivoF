const sharp = require('sharp');

/**
 * Módulo para reducir ruido en imágenes
 * Reutilizable por cualquier tipo de conversión
 */

/**
 * Reduce el ruido de la imagen usando técnicas de suavizado
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {Object} options - Opciones de reducción de ruido
 * @returns {Promise<Buffer>} - Buffer de imagen con ruido reducido
 */
const reduceNoise = async (imageBuffer, options = {}) => {
    const {
        blurSigma = 0.3,
        sharpenSigma = 0.5,
        sharpenFlat = 1.0,
        sharpenJagged = 1.0,
        brightnessAdjust = 1.02,
        saturationAdjust = 0.98,
        medianFilter = false
    } = options;

    try {
        let pipeline = sharp(imageBuffer);

        // Aplicar blur muy leve para reducir ruido
        if (blurSigma > 0) {
            pipeline = pipeline.blur(blurSigma);
        }

        // Compensar con sharpening sutil para recuperar detalles
        if (sharpenSigma > 0) {
            pipeline = pipeline.sharpen({
                sigma: sharpenSigma,
                flat: sharpenFlat,
                jagged: sharpenJagged
            });
        }

        // Ajustar brillo y saturación para compensar el procesamiento
        pipeline = pipeline.modulate({
            brightness: brightnessAdjust,
            saturation: saturationAdjust
        });

        const denoisedBuffer = await pipeline.toBuffer();
        
        return denoisedBuffer;
    } catch (error) {
        throw new Error(`Error reduciendo ruido: ${error.message}`);
    }
};

/**
 * Reducción de ruido suave para fotografías
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Buffer>} - Buffer de imagen procesada
 */
const reducePhotoNoise = async (imageBuffer) => {
    return reduceNoise(imageBuffer, {
        blurSigma: 0.2,
        sharpenSigma: 0.4,
        sharpenFlat: 1.2,
        sharpenJagged: 0.8,
        brightnessAdjust: 1.01,
        saturationAdjust: 0.99
    });
};

/**
 * Reducción de ruido más agresiva para imágenes muy ruidosas
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Buffer>} - Buffer de imagen procesada
 */
const reduceNoiseAggressive = async (imageBuffer) => {
    return reduceNoise(imageBuffer, {
        blurSigma: 0.5,
        sharpenSigma: 0.7,
        sharpenFlat: 0.8,
        sharpenJagged: 1.2,
        brightnessAdjust: 1.03,
        saturationAdjust: 0.96
    });
};

/**
 * Reducción de ruido conservadora para preservar detalles
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Buffer>} - Buffer de imagen procesada
 */
const reduceNoiseConservative = async (imageBuffer) => {
    return reduceNoise(imageBuffer, {
        blurSigma: 0.1,
        sharpenSigma: 0.3,
        sharpenFlat: 1.0,
        sharpenJagged: 1.0,
        brightnessAdjust: 1.005,
        saturationAdjust: 0.995
    });
};

module.exports = {
    reduceNoise,
    reducePhotoNoise,
    reduceNoiseAggressive,
    reduceNoiseConservative
};