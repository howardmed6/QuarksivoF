const pdf = require('pdf-parse');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

/**
 * Convierte PDF a DOCX extrayendo texto y estructura básica
 * @param {Buffer} pdfBuffer - Buffer del documento PDF
 * @param {Object} options - Opciones de conversión
 * @returns {Promise<Buffer>} - Buffer del documento DOCX
 */
const convertPdfToDocx = async (pdfBuffer, options = {}) => {
    const {
        preserveFormatting = true,
        pageBreaks = true,
        fontSize = 12,
        fontFamily = 'Arial',
        extractMetadata = true
    } = options;

    try {
        // Extraer contenido del PDF
        const pdfData = await pdf(pdfBuffer);
        
        const paragraphs = [];
        
        // Agregar metadata si se solicita
        if (extractMetadata && pdfData.info) {
            if (pdfData.info.Title) {
                paragraphs.push(
                    new Paragraph({
                        children: [new TextRun({ text: pdfData.info.Title, bold: true, size: fontSize * 2 })],
                        heading: HeadingLevel.TITLE,
                    })
                );
            }
            
            if (pdfData.info.Author) {
                paragraphs.push(
                    new Paragraph({
                        children: [new TextRun({ text: `Autor: ${pdfData.info.Author}`, italics: true })],
                    })
                );
            }
            
            paragraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] })); // Línea vacía
        }

        // Procesar el texto extraído
        const textLines = pdfData.text.split('\n').filter(line => line.trim() !== '');
        
        for (let i = 0; i < textLines.length; i++) {
            const line = textLines[i].trim();
            
            if (line.length > 0) {
                // Detectar posibles títulos (líneas cortas, en mayúsculas, etc.)
                const isTitle = line.length < 80 && 
                               (line === line.toUpperCase() || 
                                line.match(/^\d+\.?\s/) || 
                                line.match(/^[A-Z][A-Z\s]{3,}$/));
                
                if (isTitle && preserveFormatting) {
                    paragraphs.push(
                        new Paragraph({
                            children: [new TextRun({ 
                                text: line, 
                                bold: true, 
                                size: fontSize * 1.2,
                                font: fontFamily 
                            })],
                            heading: HeadingLevel.HEADING_1,
                        })
                    );
                } else {
                    paragraphs.push(
                        new Paragraph({
                            children: [new TextRun({ 
                                text: line,
                                size: fontSize,
                                font: fontFamily 
                            })],
                        })
                    );
                }
            }
            
            // Agregar salto de página si se solicita (cada cierta cantidad de líneas)
            if (pageBreaks && i > 0 && i % 50 === 0) {
                paragraphs.push(new Paragraph({ pageBreak: true }));
            }
        }

        // Crear documento DOCX
        const doc = new Document({
            sections: [{
                properties: {},
                children: paragraphs,
            }],
        });

        // Generar buffer
        const docxBuffer = await Packer.toBuffer(doc);
        return docxBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo PDF a DOCX: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea un PDF válido
 * @param {Buffer} documentBuffer - Buffer a validar
 * @returns {boolean} - true si es PDF válido
 */
const validatePdfDocument = (documentBuffer) => {
    if (!Buffer.isBuffer(documentBuffer) || documentBuffer.length < 5) {
        return false;
    }
    
    // Verificar magic bytes de PDF (%PDF-)
    const pdfSignature = documentBuffer.toString('ascii', 0, 4);
    return pdfSignature === '%PDF';
};

/**
 * Obtiene metadata del PDF
 * @param {Buffer} pdfBuffer - Buffer del PDF
 * @returns {Promise<Object>} - Metadata del PDF
 */
const getPdfMetadata = async (pdfBuffer) => {
    try {
        const pdfData = await pdf(pdfBuffer);
        return {
            pages: pdfData.numpages,
            info: pdfData.info || {},
            textLength: pdfData.text.length,
            size: pdfBuffer.length,
            version: pdfData.version || 'Unknown'
        };
    } catch (error) {
        throw new Error(`Error obteniendo metadata del PDF: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de PDF a DOCX
 * @param {Buffer} documentBuffer - Buffer del documento PDF
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer DOCX y metadata
 */
const processPdfToDocx = async (documentBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validatePdfDocument(documentBuffer)) {
            throw new Error('El archivo no es un PDF válido');
        }

        const originalMetadata = await getPdfMetadata(documentBuffer);
        const originalSize = documentBuffer.length;

        console.log(`📥 Procesando PDF: ${originalMetadata.pages} páginas, ${(originalSize/1024/1024).toFixed(2)}MB`);

        console.log('🔄 Convirtiendo a formato DOCX...');
        const docxBuffer = await convertPdfToDocx(documentBuffer, conversionParams.docxOptions);

        const finalSize = docxBuffer.length;

        console.log(`📤 DOCX generado: ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: docxBuffer,
            metadata: {
                original: {
                    format: 'pdf',
                    pages: originalMetadata.pages,
                    size: originalSize,
                    version: originalMetadata.version,
                    textLength: originalMetadata.textLength,
                    info: originalMetadata.info
                },
                final: {
                    format: 'docx',
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
        throw new Error(`Error en proceso PDF->DOCX: ${error.message}`);
    }
};

module.exports = {
    convertPdfToDocx,
    validatePdfDocument,
    getPdfMetadata,
    processPdfToDocx
};