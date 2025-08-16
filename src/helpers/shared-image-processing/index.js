/**
 * Módulo compartido de procesamiento de imágenes
 * Exporta todas las funcionalidades reutilizables
 */

const qualityEnhancer = require('./modules/qualityEnhancer');
const sizeOptimizer = require('./modules/sizeOptimizer');
const noiseReducer = require('./modules/noiseReducer');

/**
 * Procesa imagen aplicando múltiples filtros en orden lógico
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {Array} options - Array de opciones a aplicar
 * @param {Object} customParams - Parámetros personalizados
 * @returns {Promise<Buffer>} - Buffer de imagen procesada
 */
const processImageWithOptions = async (imageBuffer, options = [], customParams = {}) => {
    let processedBuffer = imageBuffer;
    
    try {
        // Orden lógico de procesamiento:
        
        // 1. Reducir ruido primero (si está seleccionado)
        if (options.includes('reduce-noise')) {
            console.log('📸 Aplicando reducción de ruido...');
            processedBuffer = await noiseReducer.reduceNoise(processedBuffer, customParams.noiseReduction);
        }
        
        // 2. Mejorar calidad después de reducir ruido
        if (options.includes('improve-quality')) {
            console.log('✨ Mejorando calidad de imagen...');
            processedBuffer = await qualityEnhancer.enhanceQuality(processedBuffer, customParams.qualityEnhancement);
        }
        
        // 3. Optimizar tamaño al final (para mantener los beneficios anteriores)
        if (options.includes('optimize-size')) {
            console.log('🗜️ Optimizando tamaño...');
            processedBuffer = await sizeOptimizer.optimizeSize(processedBuffer, customParams.sizeOptimization);
        }
        
        return processedBuffer;
        
    } catch (error) {
        throw new Error(`Error en procesamiento de opciones: ${error.message}`);
    }
};

/**
 * Obtiene información sobre las opciones disponibles
 * @returns {Object} - Objeto con información de opciones
 */
const getAvailableOptions = () => {
    return {
        'reduce-noise': {
            id: 'reduce-noise',
            name: 'Reducir Ruido',
            description: 'Elimina el ruido visual de la imagen',
            icon: '🎯',
            category: 'quality'
        },
        'improve-quality': {
            id: 'improve-quality',
            name: 'Mejorar Calidad',
            description: 'Mejora la nitidez y contraste de la imagen',
            icon: '✨',
            category: 'quality'
        },
        'optimize-size': {
            id: 'optimize-size',
            name: 'Optimizar Tamaño',
            description: 'Reduce el tamaño de archivo manteniendo calidad visual',
            icon: '🗜️',
            category: 'optimization'
        }
    };
};

module.exports = {
    // Módulos individuales
    qualityEnhancer,
    sizeOptimizer,
    noiseReducer,
    
    // Funciones de alto nivel
    processImageWithOptions,
    getAvailableOptions,
    
    // Funciones específicas más usadas
    enhanceQuality: qualityEnhancer.enhanceQuality,
    optimizeSize: sizeOptimizer.optimizeSize,
    reduceNoise: noiseReducer.reduceNoise
};