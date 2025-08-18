const mammoth = require('mammoth');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Convierte DOCX a PDF usando extracción de HTML y Puppeteer
 * @param {Buffer} docxBuffer - Buffer del documento DOCX
 * @param {Object} options - Opciones de conversión
 * @returns {Promise<Buffer>} - Buffer del documento PDF
 */
const convertDocxToPdf = async (docxBuffer, options = {}) => {
    const {
        format = 'A4',
        margin = { top: '1in', bottom: '1in', left: '1in', right: '1in' },
        printBackground = true,
        displayHeaderFooter = false,
        headerTemplate = '',
        footerTemplate = '',
        landscape = false
    } = options;

    let browser = null;

    try {
        // Extraer HTML del DOCX
        const result = await mammoth.convertToHtml({ buffer: docxBuffer });
        let htmlContent = result.value;

        // Agregar estilos CSS básicos para mejor presentación
        const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.6; 
                    margin: 0; 
                    padding: 20px;
                    color: #333;
                }
                h1, h2, h3, h4, h5, h6 { 
                    color: #2c3e50; 
                    margin-top: 1.5em; 
                    margin-bottom: 0.5em; 
                }
                p { margin-bottom: 1em; }
                table { 
                    border-collapse: collapse; 
                    width: 100%; 
                    margin: 1em 0; 
                }
                table, th, td { border: 1px solid #ddd; }
                th, td { padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                img { max-width: 100%; height: auto; }
                .page-break { page-break-before: always; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
        `;

        // Usar Puppeteer para generar PDF
        browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        
        const page = await browser.newPage();
        await page.setContent(styledHtml, { waitUntil: 'networkidle0' });

        const pdfOptions = {
            format: format,
            margin: margin,
            printBackground: printBackground,
            displayHeaderFooter: displayHeaderFooter,
            landscape: landscape
        };

        if (displayHeaderFooter) {
            pdfOptions.headerTemplate = headerTemplate;
            pdfOptions.footerTemplate = footerTemplate;
        }

        const pdfBuffer = await page.pdf(pdfOptions);
        
        return pdfBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo DOCX a PDF: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

/**
 * Valida que el buffer sea un DOCX válido
 * @param {Buffer} documentBuffer - Buffer a validar
 * @returns {boolean} - true si es DOCX válido
 */
const validateDocxDocument = (documentBuffer) => {
    if (!Buffer.isBuffer(documentBuffer) || documentBuffer.length < 22) {
        return false;
    }
    
    // Verificar magic bytes de ZIP (DOCX es un archivo ZIP)
    const zipSignature = documentBuffer.toString('hex', 0, 4);
    const isZip = zipSignature === '504b0304' || zipSignature === '504b0506' || zipSignature === '504b0708';
    
    if (!isZip) return false;
    
    // Verificar contenido típico de DOCX buscando strings características
    const bufferString = documentBuffer.toString('utf8');
    return bufferString.includes('word/') && 
           (bufferString.includes('document.xml') || bufferString.includes('app.xml'));
};

/**
 * Obtiene metadata del DOCX
 * @param {Buffer} docxBuffer - Buffer del DOCX
 * @returns {Promise<Object>} - Metadata del DOCX
 */
const getDocxMetadata = async (docxBuffer) => {
    try {
        const result = await mammoth.extractRawText({ buffer: docxBuffer });
        const textContent = result.value;
        
        return {
            textLength: textContent.length,
            wordCount: textContent.split(/\s+/).filter(word => word.length > 0).length,
            size: docxBuffer.length,
            hasImages: result.messages.some(msg => msg.type === 'warning' && msg.message.includes('image')),
            format: 'docx'
        };
    } catch (error) {
        throw new Error(`Error obteniendo metadata del DOCX: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de DOCX a PDF
 * @param {Buffer} documentBuffer - Buffer del documento DOCX
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PDF y metadata
 */
const processDocxToPdf = async (documentBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateDocxDocument(documentBuffer)) {
            throw new Error('El archivo no es un DOCX válido');
        }

        const originalMetadata = await getDocxMetadata(documentBuffer);
        const originalSize = documentBuffer.length;

        console.log(`📥 Procesando DOCX: ${originalMetadata.wordCount} palabras, ${(originalSize/1024/1024).toFixed(2)}MB`);

        console.log('🔄 Convirtiendo a formato PDF...');
        const pdfBuffer = await convertDocxToPdf(documentBuffer, conversionParams.pdfOptions);

        const finalSize = pdfBuffer.length;

        console.log(`📤 PDF generado: ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: pdfBuffer,
            metadata: {
                original: {
                    format: originalMetadata.format,
                    size: originalSize,
                    textLength: originalMetadata.textLength,
                    wordCount: originalMetadata.wordCount,
                    hasImages: originalMetadata.hasImages
                },
                final: {
                    format: 'pdf',
                    size: finalSize
                },
                processing: {
                    appliedOptions: processingOptions,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: ((finalSize - originalSize) / originalSize * 100).toFixed(1)
                }
            }
        };

    } catch (error) {
        throw new Error(`Error en proceso DOCX->PDF: ${error.message}`);
    }
};

module.exports = {
    convertDocxToPdf,
    validateDocxDocument,
    getDocxMetadata,
    processDocxToPdf
};