const sharp = require('sharp');
const puppeteer = require('puppeteer');
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
        // Verificar que sea realmente SVG o que Sharp pueda procesarlo
        return metadata.format !== undefined && metadata.width > 0 && metadata.height > 0;
    } catch (error) {
        // Para SVG, también validar como texto
        try {
            const svgString = imageBuffer.toString('utf8');
            return svgString.includes('<svg') && svgString.includes('</svg>');
        } catch {
            return false;
        }
    }
};

/**
 * Convierte SVG a PDF usando Puppeteer
 * @param {Buffer} svgBuffer - Buffer de imagen SVG
 * @param {Object} options - Opciones de conversión PDF
 * @returns {Promise<Buffer>} - Buffer de PDF
 */
const convertSvgToPdf = async (svgBuffer, options = {}) => {
    const {
        format = 'A4',
        printBackground = true,
        preferCSSPageSize = true,
        margin = { top: 0, right: 0, bottom: 0, left: 0 },
        scale = 1
    } = options;

    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Crear HTML con el SVG embebido
        const svgString = svgBuffer.toString('utf8');
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; }
                    svg { width: 100%; height: 100%; }
                </style>
            </head>
            <body>
                ${svgString}
            </body>
            </html>
        `;

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: format,
            printBackground: printBackground,
            preferCSSPageSize: preferCSSPageSize,
            margin: margin,
            scale: scale
        });

        return pdfBuffer;

    } catch (error) {
        throw new Error(`Error convirtiendo SVG a PDF: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

/**
 * Procesa conversión completa de SVG a PDF con opciones
 * @param {Buffer} svgBuffer - Buffer de imagen SVG
 * @param {Array} processingOptions - Opciones de procesamiento ('optimize-size', 'improve-quality', 'reduce-noise')
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PDF y metadata
 */
const processSvgToPdf = async (svgBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        // Validar que Sharp puede procesar el buffer
        const isValidImage = await validateImageBuffer(svgBuffer);
        if (!isValidImage) {
            throw new Error(`El archivo no es una imagen SVG válida o está corrupto`);
        }

        const originalMetadata = await sharp(svgBuffer).metadata();
        const originalSize = svgBuffer.length;

        console.log(`📥 Procesando SVG a PDF: ${originalMetadata.width}x${originalMetadata.height}, ${(originalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📋 Formato detectado por Sharp: ${originalMetadata.format}`);

        let processedBuffer = svgBuffer;
        
        // Aplicar opciones de procesamiento si existen
        if (processingOptions.length > 0) {
            try {
                processedBuffer = await sharedImageProcessing.processImageWithOptions(
                    svgBuffer, 
                    processingOptions, 
                    conversionParams
                );
                console.log(`✅ Aplicadas ${processingOptions.length} opciones de procesamiento`);
            } catch (sharedError) {
                console.log('⚠️ Error en shared processing, usando buffer original:', sharedError.message);
                processedBuffer = svgBuffer;
            }
        }

        // Determinar opciones de PDF basadas en las opciones seleccionadas
        let pdfOptions = {
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            scale: 1
        };

        if (processingOptions.includes('optimize-size')) {
            pdfOptions.scale = 0.8;
            pdfOptions.format = 'A4';
        }

        if (processingOptions.includes('improve-quality')) {
            pdfOptions.scale = 1.2;
            pdfOptions.preferCSSPageSize = true;
        }

        // Fusionar con parámetros personalizados si existen
        if (conversionParams.pdfOptions) {
            pdfOptions = { ...pdfOptions, ...conversionParams.pdfOptions };
        }

        console.log(`🔄 Convirtiendo SVG a PDF con formato ${pdfOptions.format}...`);
        const pdfBuffer = await convertSvgToPdf(processedBuffer, pdfOptions);

        const finalSize = pdfBuffer.length;
        
        console.log(`📤 PDF generado exitosamente: ${(finalSize/1024/1024).toFixed(2)}MB`);
        console.log(`📊 Cambio de tamaño: ${((finalSize - originalSize)/originalSize * 100).toFixed(1)}%`);

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
                    width: null, // PDF no tiene dimensiones de pixel
                    height: null,
                    size: finalSize,
                    channels: null,
                    hasAlpha: null
                },
                processing: {
                    appliedOptions: processingOptions,
                    pdfFormat: pdfOptions.format,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1),
                    compressionRatio: finalSize > originalSize ? 'Expansion' : ((1 - finalSize/originalSize) * 100).toFixed(1) + '%'
                }
            }
        };

    } catch (error) {
        console.error(`❌ Error en proceso SVG->PDF:`, error.message);
        throw new Error(`Error en proceso SVG->PDF: ${error.message}`);
    }
};

module.exports = {
    processSvgToPdf,
    convertSvgToPdf,
    validateImageBuffer
};