const puppeteer = require('puppeteer');

/**
 * Convierte TXT a PDF
 */
const convertTxtToPdf = async (textBuffer, options = {}) => {
    const {
        format = 'A4',
        fontSize = '12px',
        fontFamily = 'Arial, sans-serif',
        lineHeight = '1.5',
        margin = { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        preserveWhitespace = true
    } = options;

    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        const textString = textBuffer.toString('utf8');
        const escapedText = textString
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        margin: 0; 
                        padding: 20px; 
                        font-family: ${fontFamily};
                        font-size: ${fontSize};
                        line-height: ${lineHeight};
                        color: #333;
                    }
                    .text-content { 
                        white-space: ${preserveWhitespace ? 'pre-wrap' : 'normal'};
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }
                </style>
            </head>
            <body>
                <div class="text-content">${escapedText}</div>
            </body>
            </html>
        `;

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: format,
            printBackground: true,
            preferCSSPageSize: true,
            margin: margin
        });

        return pdfBuffer;

    } catch (error) {
        throw new Error(`Error convirtiendo TXT a PDF: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

/**
 * Valida archivo TXT
 */
const validateTextDocument = (documentBuffer) => {
    if (!Buffer.isBuffer(documentBuffer) || documentBuffer.length === 0) {
        return false;
    }
    
    try {
        const textString = documentBuffer.toString('utf8');
        const binaryChars = textString.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g);
        const binaryRatio = binaryChars ? binaryChars.length / textString.length : 0;
        
        return binaryRatio < 0.3;
    } catch (error) {
        return false;
    }
};

/**
 * Obtiene metadata del TXT
 */
const getTextMetadata = async (textBuffer) => {
    try {
        const textString = textBuffer.toString('utf8');
        
        const wordCount = textString.split(/\s+/).filter(word => word.length > 0).length;
        const lineCount = textString.split('\n').length;
        const paragraphCount = textString.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
        
        return {
            wordCount: wordCount,
            lineCount: lineCount,
            paragraphCount: paragraphCount,
            characterCount: textString.length,
            size: textBuffer.length,
            format: 'txt'
        };
    } catch (error) {
        return {
            wordCount: 0,
            lineCount: 0,
            paragraphCount: 0,
            characterCount: 0,
            size: textBuffer.length,
            format: 'unknown'
        };
    }
};

/**
 * Procesa conversión completa - FUNCIÓN PRINCIPAL
 */
const processTxtToPdf = async (documentBuffer, processingOptions, conversionParams) => {
    try {
        // Validar parámetros
        if (!documentBuffer) {
            throw new Error('No se proporcionó documento');
        }

        if (!validateTextDocument(documentBuffer)) {
            throw new Error('El archivo no es un texto válido');
        }

        // Valores por defecto seguros
        const safeProcessingOptions = processingOptions || [];
        const safeConversionParams = conversionParams || {};
        const pdfOptions = safeConversionParams.pdfOptions || {};

        const originalSize = documentBuffer.length;
        console.log(`📥 Procesando TXT: ${(originalSize/1024).toFixed(2)}KB`);

        // Obtener metadata
        const originalMetadata = await getTextMetadata(documentBuffer);

        // Aplicar opciones de procesamiento
        let processedBuffer = documentBuffer;
        
        if (safeProcessingOptions.includes('reduce-noise')) {
            const textString = documentBuffer.toString('utf8');
            const cleanedText = textString
                .replace(/[ \t]+/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/^\s+|\s+$/gm, '')
                .trim();
            
            processedBuffer = Buffer.from(cleanedText, 'utf8');
        }

        // Configurar opciones según procesamiento
        let finalPdfOptions = {
            format: 'A4',
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.5',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            preserveWhitespace: true,
            ...pdfOptions
        };

        if (safeProcessingOptions.includes('optimize-size')) {
            finalPdfOptions.fontSize = '10px';
            finalPdfOptions.lineHeight = '1.3';
            finalPdfOptions.margin = { top: '15px', right: '15px', bottom: '15px', left: '15px' };
        }

        if (safeProcessingOptions.includes('improve-quality')) {
            finalPdfOptions.fontSize = '14px';
            finalPdfOptions.lineHeight = '1.6';
            finalPdfOptions.fontFamily = 'Times New Roman, serif';
        }

        console.log('🔄 Convirtiendo a formato PDF...');
        const pdfBuffer = await convertTxtToPdf(processedBuffer, finalPdfOptions);

        const finalSize = pdfBuffer.length;
        console.log(`📤 PDF generado: ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: pdfBuffer,
            metadata: {
                original: {
                    format: originalMetadata.format || 'txt',
                    wordCount: originalMetadata.wordCount || 0,
                    lineCount: originalMetadata.lineCount || 0,
                    paragraphCount: originalMetadata.paragraphCount || 0,
                    characterCount: originalMetadata.characterCount || 0,
                    size: originalSize
                },
                final: {
                    format: 'pdf',
                    size: finalSize
                },
                processing: {
                    appliedOptions: safeProcessingOptions,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: originalSize > 0 ? ((finalSize - originalSize) / originalSize * 100).toFixed(1) : '0'
                }
            }
        };

    } catch (error) {
        console.error('Error en processTxtToPdf:', error.message);
        throw new Error(`Error en proceso TXT->PDF: ${error.message}`);
    }
};

module.exports = {
    convertTxtToPdf,
    validateTextDocument,
    getTextMetadata,
    processTxtToPdf
};