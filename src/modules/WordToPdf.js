// WordToPdf.js - Versión para Azure Functions (SIN puppeteer)
const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');

const convertDocxToPdf = async (docxBuffer, options = {}) => {
    const {
        preserveFormatting = true,
        fontSize = 12,
        fontFamily = 'Helvetica',
        pageMargins = { top: 50, bottom: 50, left: 50, right: 50 }
    } = options;

    try {
        // Extraer texto del DOCX
        const result = await mammoth.extractRawText(docxBuffer);
        const textContent = result.value;

        // Crear PDF con PDFKit (no requiere Chrome)
        const doc = new PDFDocument({
            size: 'A4',
            margins: pageMargins
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        // Procesar texto
        const lines = textContent.split('\n').filter(line => line.trim());
        
        doc.font(fontFamily).fontSize(fontSize);
        
        for (const line of lines) {
            if (line.trim()) {
                doc.text(line, { align: 'left' });
                doc.moveDown(0.5);
            }
        }

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', reject);
        });

    } catch (error) {
        throw new Error(`Error convirtiendo DOCX a PDF: ${error.message}`);
    }
};

// Resto de funciones igual...
const processWordToPdf = async (documentBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        console.log('🔄 Convirtiendo Word a PDF (servidor)...');
        const pdfBuffer = await convertDocxToPdf(documentBuffer, conversionParams.pdfOptions);
        
        return {
            success: true,
            buffer: pdfBuffer,
            metadata: {
                original: { size: documentBuffer.length },
                final: { size: pdfBuffer.length }
            }
        };
    } catch (error) {
        throw new Error(`Error en proceso Word->PDF: ${error.message}`);
    }
};

module.exports = {
    convertDocxToPdf,
    processWordToPdf
};