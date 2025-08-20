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
        // Verificar que sea realmente ICO o que Sharp pueda procesarlo
        return metadata.format !== undefined && metadata.width > 0 && metadata.height > 0;
    } catch (error) {
        return false;
    }
};

/**
 * Convierte ICO a SVG convirtiendo primero a PNG y luego creando SVG
 * @param {Buffer} icoBuffer - Buffer de imagen ICO
 * @param {Object} options - Opciones de conversión SVG
 * @returns {Promise<Buffer>} - Buffer de SVG
 */
const convertIcoToSvg = async (icoBuffer, options = {}) => {
    const {
        embedImage = true,
        backgroundColor = 'transparent',
        preserveAspectRatio = 'xMidYMid meet'
    } = options;

    try {
        // Primero convertir ICO a PNG para obtener datos de imagen
        const pngBuffer = await sharp(icoBuffer)
            .png()
            .toBuffer();

        const metadata = await sharp(icoBuffer).metadata();
        
        if (embedImage) {
            // Crear SVG con imagen PNG embebida
            const base64Image = pngBuffer.toString('base64');
            const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${metadata.width}" 
     height="${metadata.height}" 
     viewBox="0 0 ${metadata.width} ${metadata.height}"
     style="background-color: ${backgroundColor}">
  <image x="0" y="0" 
         width="${metadata.width}" 
         height="${metadata.height}" 
         preserveAspectRatio="${preserveAspectRatio}"
         xlink:href="data:image/png;base64,${base64Image}"/>
</svg>`;
            
            return Buffer.from(svgContent, 'utf8');
        } else {
            // Crear SVG vectorial simple (rectángulo con color promedio)
            const { r, g, b } = await sharp(pngBuffer)
                .resize(1, 1)
                .raw()
                .toBuffer()
                .then(buf => ({ r: buf[0], g: buf[1], b: buf[2] }));
            
            const avgColor = `rgb(${r},${g},${b})`;
            const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${metadata.width}" 
     height="${metadata.height}" 
     viewBox="0 0 ${metadata.width} ${metadata.height}">
  <rect x="0" y="0" 
        width="${metadata.width}" 
        height="${metadata.height}" 
        fill="${avgColor}"/>
</svg>`;
            
            return Buffer.from(svgContent, 'utf8');
        }

    } catch (error) {
        throw new Error(`Error convirtiendo ICO a SVG: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de ICO a SVG con opciones
 * @param {Buffer} icoBuffer - Buffer de imagen ICO
 * @param {Array} processingOptions - Opciones de procesamiento ('optimize-size', 'improve-quality', 'reduce-noise')
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer SVG y metadata
 */
const processIcoToSvg = async (icoBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(icoBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen ICO válida o está corrupto`);
        }

        const originalMetadata = await sharp(icoBuffer).metadata();
        const originalSize = icoBuffer.length;

        console.log(`📥 Procesando ICO a SVG: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📋 Formato detectado por Sharp: ${originalMetadata.format}`);

        let processedBuffer = icoBuffer;
        
        // Aplicar opciones de procesamiento si existen
        if (processingOptions.length > 0) {
            try {
                processedBuffer = await sharedImageProcessing.processImageWithOptions(
                    icoBuffer, 
                    processingOptions, 
                    conversionParams
                );
                console.log(`✅ Aplicadas ${processingOptions.length} opciones de procesamiento`);
            } catch (sharedError) {
                console.log('⚠️ Error en shared processing, usando buffer original:', sharedError.message);
                processedBuffer = icoBuffer;
            }
        }

        // Determinar opciones de SVG basadas en las opciones seleccionadas
        let svgOptions = {
            embedImage: true,
            backgroundColor: 'transparent',
            preserveAspectRatio: 'xMidYMid meet'
        };

        if (processingOptions.includes('optimize-size')) {
            svgOptions.embedImage = false; // Vectorial simple para menor tamaño
        }

        if (processingOptions.includes('improve-quality')) {
            svgOptions.embedImage = true; // Mantener imagen raster para calidad
            svgOptions.preserveAspectRatio = 'xMidYMid meet';
        }

        // Fusionar con parámetros personalizados si existen
        if (conversionParams.svgOptions) {
            svgOptions = { ...svgOptions, ...conversionParams.svgOptions };
        }

        console.log(`🔄 Convirtiendo ICO a SVG (embedImage: ${svgOptions.embedImage})...`);
        const svgBuffer = await convertIcoToSvg(processedBuffer, svgOptions);

        const finalSize = svgBuffer.length;
        
        // Para SVG, intentar obtener metadata como imagen
        let finalMetadata = null;
        try {
            finalMetadata = await sharp(svgBuffer).metadata();
        } catch {
            finalMetadata = {
                format: 'svg',
                width: originalMetadata.width,
                height: originalMetadata.height,
                channels: null,
                hasAlpha: null
            };
        }

        console.log(`📤 SVG generado exitosamente: ${(finalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📊 Cambio de tamaño: ${((finalSize - originalSize)/originalSize * 100).toFixed(1)}%`);

        return {
            success: true,
            buffer: svgBuffer,
            format: 'svg',
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
                    embedImage: svgOptions.embedImage,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    compressionRatio: finalSize > originalSize ? 'Expansion' : ((1 - finalSize/originalSize) * 100).toFixed(1) + '%'
                }
            }
        };

    } catch (error) {
        console.error(`❌ Error en proceso ICO->SVG:`, error.message);
        throw new Error(`Error en proceso ICO->SVG: ${error.message}`);
    }
};

module.exports = {
    processIcoToSvg,
    convertIcoToSvg,
    validateImageBuffer
};