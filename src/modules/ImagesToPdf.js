const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen válida usando Sharp (simplificado)
 * En lugar de validar el formato específico, dejamos que Sharp determine si puede procesarlo
 * @param {Buffer} imageBuffer - Buffer a validar
 * @returns {Promise<boolean>} - true si Sharp puede procesar la imagen
 */
const validateImageBuffer = async (imageBuffer) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }

    try {
        await sharp(imageBuffer).metadata();
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Convierte imagen a PDF
 * @param {Buffer} imageBuffer - Buffer de imagen
 * @param {string} sourceFormat - Formato de origen
 * @param {Object} options - Opciones de conversión PDF
 * @returns {Promise<Buffer>} - Buffer de PDF
 */
const convertImageToPdf = async (imageBuffer, sourceFormat, options = {}) => {
    const {
        pageSize = 'A4',
        orientation = 'portrait',
        margin = 50,
        fitToPage = true,
        quality = 90,
        title = `Converted from ${sourceFormat.toUpperCase()}`,
        author = 'Image to PDF Converter'
    } = options;

    try {
        // Obtener metadata de la imagen usando Sharp
        const metadata = await sharp(imageBuffer).metadata();
        
        // Para formatos que PDFKit no soporta nativamente, convertir a JPEG
        let processedBuffer = imageBuffer;
        const needsConversion = !['jpeg', 'jpg', 'png'].includes(metadata.format?.toLowerCase());
        
        if (needsConversion) {
            console.log(`🔄 Convirtiendo ${sourceFormat.toUpperCase()} (${metadata.format}) a JPEG para compatibilidad con PDF...`);
            processedBuffer = await sharp(imageBuffer)
                .jpeg({ quality: 95, mozjpeg: true })
                .toBuffer();
        }
        
        // Crear documento PDF
        const doc = new PDFDocument({
            size: pageSize,
            layout: orientation,
            margins: {
                top: margin,
                bottom: margin,
                left: margin,
                right: margin
            },
            info: {
                Title: title,
                Author: author,
                Subject: `Image conversion from ${sourceFormat.toUpperCase()} to PDF`,
                Keywords: `${sourceFormat}, PDF, conversion, image`
            }
        });

        // Buffer para almacenar el PDF
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        
        return new Promise((resolve, reject) => {
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(pdfBuffer);
            });

            doc.on('error', reject);

            try {
                // Calcular dimensiones para ajustar a la página
                const pageWidth = doc.page.width - (margin * 2);
                const pageHeight = doc.page.height - (margin * 2);
                
                let imageWidth = metadata.width;
                let imageHeight = metadata.height;

                if (fitToPage) {
                    // Calcular escala para ajustar a la página manteniendo proporción
                    const scaleX = pageWidth / imageWidth;
                    const scaleY = pageHeight / imageHeight;
                    const scale = Math.min(scaleX, scaleY);
                    
                    imageWidth = imageWidth * scale;
                    imageHeight = imageHeight * scale;
                }

                // Centrar imagen en la página
                const x = (doc.page.width - imageWidth) / 2;
                const y = (doc.page.height - imageHeight) / 2;

                // Insertar imagen en el PDF
                doc.image(processedBuffer, x, y, {
                    width: imageWidth,
                    height: imageHeight
                });

                // Finalizar documento
                doc.end();

            } catch (error) {
                reject(error);
            }
        });

    } catch (error) {
        throw new Error(`Error convirtiendo ${sourceFormat.toUpperCase()} a PDF: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de imagen a PDF (versión simplificada)
 * @param {Buffer} imageBuffer - Buffer de imagen
 * @param {string} sourceFormat - Formato de origen
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PDF y metadata
 */
const processImageToPdf = async (imageBuffer, sourceFormat, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(imageBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen válida o está corrupto`);
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando ${sourceFormat.toUpperCase()} a PDF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📋 Formato detectado por Sharp: ${originalMetadata.format}`);

        let processedBuffer = imageBuffer;
        
        if (processingOptions.length > 0) {
            try {
                processedBuffer = await sharedImageProcessing.processImageWithOptions(
                    imageBuffer, 
                    processingOptions, 
                    conversionParams
                );
                console.log(`✅ Aplicadas ${processingOptions.length} opciones de procesamiento`);
            } catch (sharedError) {
                console.log('⚠️ Error en shared processing, usando buffer original:', sharedError.message);
                processedBuffer = imageBuffer;
            }
        }

        console.log(`🔄 Convirtiendo ${sourceFormat.toUpperCase()} a PDF...`);
        const pdfBuffer = await convertImageToPdf(processedBuffer, sourceFormat, conversionParams.pdfOptions);

        const finalSize = pdfBuffer.length;

        console.log(`📤 PDF generado exitosamente: ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: pdfBuffer,
            format: 'pdf',
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
                    format: 'pdf',
                    size: finalSize
                },
                processing: {
                    appliedOptions: processingOptions,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    sourceFormat: sourceFormat.toUpperCase(),
                    detectedFormat: originalMetadata.format
                }
            }
        };

    } catch (error) {
        console.error(`❌ Error en proceso ${sourceFormat.toUpperCase()}->PDF:`, error.message);
        throw new Error(`Error en proceso ${sourceFormat.toUpperCase()}->PDF: ${error.message}`);
    }
};

// Funciones específicas para cada formato (todas usan la misma lógica universal)
const processJpgToPdf = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    return processImageToPdf(imageBuffer, 'jpg', processingOptions, conversionParams);
};

const processPngToPdf = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    return processImageToPdf(imageBuffer, 'png', processingOptions, conversionParams);
};

const processAvifToPdf = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    return processImageToPdf(imageBuffer, 'avif', processingOptions, conversionParams);
};

const processBmpToPdf = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    return processImageToPdf(imageBuffer, 'bmp', processingOptions, conversionParams);
};

const processWebpToPdf = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    return processImageToPdf(imageBuffer, 'webp', processingOptions, conversionParams);
};

const processHeicToPdf = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    return processImageToPdf(imageBuffer, 'heic', processingOptions, conversionParams);
};

const processTiffToPdf = async (imageBuffer, processingOptions = [], conversionParams = {}) => {
    return processImageToPdf(imageBuffer, 'tiff', processingOptions, conversionParams);
};

module.exports = {
    // Función universal
    processImageToPdf,
    convertImageToPdf,
    validateImageBuffer,
    
    // Funciones específicas por formato
    processJpgToPdf,
    processPngToPdf,
    processAvifToPdf,
    processBmpToPdf,
    processWebpToPdf,
    processHeicToPdf,
    processTiffToPdf
};