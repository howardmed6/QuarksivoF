const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const sharedImageProcessing = require('../helpers/shared-image-processing');

/**
 * Valida que el buffer sea una imagen válida usando Sharp
 * @param {Buffer} imageBuffer - Buffer a validar
 * @param {string} expectedFormat - Formato esperado ('jpg', 'png', 'avif', 'bmp', 'webp', 'heic', 'tiff')
 * @returns {Promise<boolean>} - true si es válido
 */
const validateImageFormat = async (imageBuffer, expectedFormat) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }

    try {
        // Usar Sharp para obtener metadata real del archivo
        const metadata = await sharp(imageBuffer).metadata();
        
        // Normalizar formatos para comparación
        const normalizeFormat = (format) => {
            const normalized = format.toLowerCase();
            if (normalized === 'jpeg') return 'jpg';
            if (normalized === 'tif') return 'tiff';
            if (normalized === 'heif') return 'heic';
            return normalized;
        };

        const detectedFormat = normalizeFormat(metadata.format);
        const expectedNormalized = normalizeFormat(expectedFormat);

        return detectedFormat === expectedNormalized;
    } catch (error) {
        // Si Sharp no puede leer la imagen, intentar validación manual como fallback
        return validateImageFormatManual(imageBuffer, expectedFormat);
    }
};

/**
 * Validación manual como fallback (mejorada)
 * @param {Buffer} imageBuffer - Buffer a validar
 * @param {string} expectedFormat - Formato esperado
 * @returns {boolean} - true si es válido
 */
const validateImageFormatManual = (imageBuffer, expectedFormat) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 12) {
        return false;
    }

    switch (expectedFormat.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
            return imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF;
        
        case 'png':
            return imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && 
                   imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47 &&
                   imageBuffer[4] === 0x0D && imageBuffer[5] === 0x0A &&
                   imageBuffer[6] === 0x1A && imageBuffer[7] === 0x0A;
        
        case 'avif':
            // Verificar si es un container ISO/MP4 con brand AVIF
            if (imageBuffer.length < 20) return false;
            const boxType = imageBuffer.toString('ascii', 4, 8);
            if (boxType !== 'ftyp') return false;
            const brand = imageBuffer.toString('ascii', 8, 12);
            return brand === 'avif' || brand === 'avis';
        
        case 'webp':
            return imageBuffer.length >= 12 &&
                   imageBuffer.toString('ascii', 0, 4) === 'RIFF' && 
                   imageBuffer.toString('ascii', 8, 12) === 'WEBP';
        
        case 'heic':
        case 'heif':
            // Mejorar detección HEIC/HEIF
            if (imageBuffer.length < 20) return false;
            const heicBoxType = imageBuffer.toString('ascii', 4, 8);
            if (heicBoxType !== 'ftyp') return false;
            const heicBrand = imageBuffer.toString('ascii', 8, 12);
            return heicBrand === 'heic' || heicBrand === 'heix' || 
                   heicBrand === 'hevc' || heicBrand === 'hevx' ||
                   heicBrand === 'heim' || heicBrand === 'heis' ||
                   heicBrand === 'mif1' || heicBrand === 'msf1';
        
        case 'bmp':
            // Validación BMP más completa
            return imageBuffer.length >= 14 &&
                   imageBuffer[0] === 0x42 && imageBuffer[1] === 0x4D && // 'BM'
                   imageBuffer.readUInt32LE(2) === imageBuffer.length; // File size check
        
        case 'tiff':
        case 'tif':
            // Little endian TIFF
            const isLittleEndian = imageBuffer[0] === 0x49 && imageBuffer[1] === 0x49 && 
                                   imageBuffer[2] === 0x2A && imageBuffer[3] === 0x00;
            // Big endian TIFF
            const isBigEndian = imageBuffer[0] === 0x4D && imageBuffer[1] === 0x4D && 
                                imageBuffer[2] === 0x00 && imageBuffer[3] === 0x2A;
            return isLittleEndian || isBigEndian;
        
        default:
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
        
        // Para algunos formatos, convertir primero a un formato compatible con PDFKit
        let processedBuffer = imageBuffer;
        const incompatibleFormats = ['avif', 'heic', 'heif', 'tiff', 'tif'];
        
        if (incompatibleFormats.includes(sourceFormat.toLowerCase())) {
            console.log(`🔄 Convirtiendo ${sourceFormat.toUpperCase()} a PNG para compatibilidad con PDF...`);
            processedBuffer = await sharp(imageBuffer)
                .png({ quality: 100, compressionLevel: 0 })
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
 * Procesa conversión completa de imagen a PDF
 * @param {Buffer} imageBuffer - Buffer de imagen
 * @param {string} sourceFormat - Formato de origen
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PDF y metadata
 */
const processImageToPdf = async (imageBuffer, sourceFormat, processingOptions = [], conversionParams = {}) => {
    try {
        // Usar validación mejorada
        const isValid = await validateImageFormat(imageBuffer, sourceFormat);
        if (!isValid) {
            throw new Error(`El archivo no es una imagen ${sourceFormat.toUpperCase()} válida`);
        }

        const originalMetadata = await sharp(imageBuffer).metadata();
        const originalSize = imageBuffer.length;

        console.log(`📥 Procesando ${sourceFormat.toUpperCase()} a PDF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);

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

        console.log(`🔄 Convirtiendo ${sourceFormat.toUpperCase()} a PDF...`);
        const pdfBuffer = await convertImageToPdf(processedBuffer, sourceFormat, conversionParams.pdfOptions);

        const finalSize = pdfBuffer.length;

        console.log(`📤 PDF generado: ${(finalSize/1024/1024).toFixed(2)}MB`);

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
                    sourceFormat: sourceFormat.toUpperCase()
                }
            }
        };

    } catch (error) {
        throw new Error(`Error en proceso ${sourceFormat.toUpperCase()}->PDF: ${error.message}`);
    }
};

// Funciones específicas para cada formato
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
    validateImageFormat,
    validateImageFormatManual,
    
    // Funciones específicas por formato
    processJpgToPdf,
    processPngToPdf,
    processAvifToPdf,
    processBmpToPdf,
    processWebpToPdf,
    processHeicToPdf,
    processTiffToPdf
};