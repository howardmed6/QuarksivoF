const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');

/**
 * Convierte DOCX a PDF
 */
const convertDocxToPdf = async (docxBuffer, options = {}) => {
    const {
        fontSize = 12,
        fontFamily = 'Helvetica',
        pageMargins = { top: 50, bottom: 50, left: 50, right: 50 }
    } = options;

    try {
        const result = await mammoth.extractRawText(docxBuffer);
        const textContent = result.value;

        const doc = new PDFDocument({
            size: 'A4',
            margins: pageMargins
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        const lines = textContent.split('\n').filter(line => line.trim());
        
        doc.font(fontFamily).fontSize(fontSize);
        
        for (const line of lines) {
            if (line.trim()) {
                const isTitle = line.length < 80 && line === line.toUpperCase();
                
                if (isTitle) {
                    doc.fontSize(fontSize * 1.2).font('Helvetica-Bold');
                    doc.text(line, { align: 'left' });
                    doc.fontSize(fontSize).font(fontFamily);
                } else {
                    doc.text(line, { align: 'left' });
                }
                doc.moveDown(0.5);
            }
        }

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });

    } catch (error) {
        throw new Error(`Error convirtiendo DOCX a PDF: ${error.message}`);
    }
};

/**
 * Valida documento Word
 */
const validateWordDocument = (documentBuffer) => {
    if (!Buffer.isBuffer(documentBuffer) || documentBuffer.length < 100) {
        return false;
    }
    
    const zipSignature = documentBuffer.toString('hex', 0, 4);
    const isZip = zipSignature === '504b0304' || zipSignature === '504b0506';
    
    if (!isZip) {
        const docSignature = documentBuffer.toString('hex', 0, 8);
        return docSignature === 'd0cf11e0a1b11ae1';
    }
    
    return true;
};

/**
 * Obtiene metadata del Word
 */
const getWordMetadata = async (docxBuffer) => {
    try {
        const result = await mammoth.extractRawText(docxBuffer);
        const textContent = result.value;
        
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
        const paragraphCount = textContent.split('\n').filter(line => line.trim().length > 0).length;
        
        return {
            wordCount: wordCount,
            paragraphCount: paragraphCount,
            characterCount: textContent.length,
            size: docxBuffer.length,
            format: docxBuffer.toString('hex', 0, 4) === '504b0304' ? 'docx' : 'doc'
        };
    } catch (error) {
        return {
            wordCount: 0,
            paragraphCount: 0,
            characterCount: 0,
            size: docxBuffer.length,
            format: 'unknown'
        };
    }
};

/**
 * Procesa conversión completa - FUNCIÓN PRINCIPAL
 */
const processWordToPdf = async (documentBuffer, processingOptions, conversionParams) => {
    try {
        // Validar parámetros
        if (!documentBuffer) {
            throw new Error('No se proporcionó documento');
        }

        if (!validateWordDocument(documentBuffer)) {
            throw new Error('El archivo no es un documento Word válido');
        }

        // Valores por defecto seguros
        const safeProcessingOptions = processingOptions || [];
        const safeConversionParams = conversionParams || {};
        const pdfOptions = safeConversionParams.pdfOptions || {};

        const originalSize = documentBuffer.length;
        console.log(`📥 Procesando Word: ${(originalSize/1024/1024).toFixed(2)}MB`);

        // Obtener metadata
        const originalMetadata = await getWordMetadata(documentBuffer);

        console.log('🔄 Convirtiendo a formato PDF...');
        const pdfBuffer = await convertDocxToPdf(documentBuffer, pdfOptions);

        const finalSize = pdfBuffer.length;
        console.log(`📤 PDF generado: ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: pdfBuffer,
            metadata: {
                original: {
                    format: originalMetadata.format || 'docx',
                    wordCount: originalMetadata.wordCount || 0,
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
        console.error('Error en processWordToPdf:', error.message);
        throw new Error(`Error en proceso Word->PDF: ${error.message}`);
    }
};

module.exports = {
    convertDocxToPdf,
    validateWordDocument,
    getWordMetadata,
    processWordToPdf
};