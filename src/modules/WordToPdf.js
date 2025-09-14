const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Convierte DOCX a PDF manteniendo formato y estructura
 * @param {Buffer} docxBuffer - Buffer del documento DOCX
 * @param {Object} options - Opciones de conversión
 * @returns {Promise<Buffer>} - Buffer del documento PDF
 */
const convertDocxToPdf = async (docxBuffer, options = {}) => {
    const {
        preserveFormatting = true,
        compressPdf = false,
        pageMargins = { top: 50, bottom: 50, left: 50, right: 50 },
        fontSize = 12,
        fontFamily = 'Helvetica',
        lineHeight = 1.2,
        pageSize = 'A4'
    } = options;

    try {
        // Extraer contenido del DOCX
        const result = await mammoth.extractRawText(docxBuffer);
        const textContent = result.value;
        
        // También extraer con formato HTML para mejor preservación
        const htmlResult = await mammoth.convertToHtml(docxBuffer);
        const htmlContent = htmlResult.value;

        // Crear documento PDF
        const doc = new PDFDocument({
            size: pageSize,
            margins: pageMargins,
            compress: compressPdf,
            info: {
                Title: 'Converted from Word',
                Author: 'Word to PDF Converter',
                Subject: 'Document conversion',
                Creator: 'CorQuark Converter'
            }
        });

        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {});

        // Configurar fuente y tamaño
        doc.font(fontFamily).fontSize(fontSize);

        // Procesar contenido línea por línea
        const lines = textContent.split('\n').filter(line => line.trim() !== '');
        let currentY = doc.y;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.length > 0) {
                // Detectar títulos potenciales
                const isTitle = line.length < 100 && 
                               (line === line.toUpperCase() || 
                                line.match(/^\d+\.?\s/) ||
                                htmlContent.includes(`<h[1-6]>${line}</h[1-6]>`));
                
                // Verificar si necesitamos nueva página
                if (currentY > doc.page.height - pageMargins.bottom - 100) {
                    doc.addPage();
                    currentY = pageMargins.top;
                }
                
                if (isTitle && preserveFormatting) {
                    // Formato de título
                    doc.fontSize(fontSize * 1.3)
                       .font(`${fontFamily}-Bold`)
                       .text(line, {
                           align: 'left',
                           lineGap: lineHeight * 2
                       });
                    
                    currentY = doc.y + 10;
                } else {
                    // Formato de párrafo normal
                    doc.fontSize(fontSize)
                       .font(fontFamily)
                       .text(line, {
                           align: 'justify',
                           lineGap: lineHeight
                       });
                    
                    currentY = doc.y + 5;
                }
                
                // Actualizar posición Y
                doc.y = currentY;
            }
        }

        // Finalizar documento
        doc.end();

        // Esperar a que termine la generación
        return new Promise((resolve, reject) => {
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(pdfBuffer);
            });
            
            doc.on('error', reject);
        });
        
    } catch (error) {
        throw new Error(`Error convirtiendo DOCX a PDF: ${error.message}`);
    }
};

/**
 * Valida que el buffer sea un documento Word válido
 * @param {Buffer} documentBuffer - Buffer a validar
 * @returns {boolean} - true si es documento Word válido
 */
const validateWordDocument = (documentBuffer) => {
    if (!Buffer.isBuffer(documentBuffer) || documentBuffer.length < 100) {
        return false;
    }
    
    // Verificar magic bytes para documentos Office (ZIP-based)
    const zipSignature = documentBuffer.toString('hex', 0, 4);
    const isZip = zipSignature === '504b0304' || zipSignature === '504b0506';
    
    if (!isZip) {
        // Verificar formato DOC antiguo
        const docSignature = documentBuffer.toString('hex', 0, 8);
        return docSignature === 'd0cf11e0a1b11ae1'; // OLE2 signature
    }
    
    return true;
};

/**
 * Obtiene metadata del documento Word
 * @param {Buffer} docxBuffer - Buffer del DOCX
 * @returns {Promise<Object>} - Metadata del documento
 */
const getWordMetadata = async (docxBuffer) => {
    try {
        const result = await mammoth.extractRawText(docxBuffer);
        const textContent = result.value;
        
        // Contar palabras y párrafos aproximados
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
        const paragraphCount = textContent.split('\n').filter(line => line.trim().length > 0).length;
        
        return {
            wordCount: wordCount,
            paragraphCount: paragraphCount,
            characterCount: textContent.length,
            size: docxBuffer.length,
            hasImages: result.messages.some(msg => msg.type === 'warning' && msg.message.includes('image')),
            format: docxBuffer.toString('hex', 0, 4) === '504b0304' ? 'docx' : 'doc'
        };
    } catch (error) {
        throw new Error(`Error obteniendo metadata del documento: ${error.message}`);
    }
};

/**
 * Procesa conversión completa de Word a PDF
 * @param {Buffer} documentBuffer - Buffer del documento Word
 * @param {Array} processingOptions - Opciones de procesamiento
 * @param {Object} conversionParams - Parámetros específicos de conversión
 * @returns {Promise<Object>} - Resultado con buffer PDF y metadata
 */
const processWordToPdf = async (documentBuffer, processingOptions = [], conversionParams = {}) => {
    try {
        if (!validateWordDocument(documentBuffer)) {
            throw new Error('El archivo no es un documento Word válido');
        }

        const originalMetadata = await getWordMetadata(documentBuffer);
        const originalSize = documentBuffer.length;

        console.log(`📥 Procesando Word: ${originalMetadata.wordCount} palabras, ${(originalSize/1024/1024).toFixed(2)}MB`);

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
                    wordCount: originalMetadata.wordCount,
                    paragraphCount: originalMetadata.paragraphCount,
                    characterCount: originalMetadata.characterCount,
                    size: originalSize,
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
        throw new Error(`Error en proceso Word->PDF: ${error.message}`);
    }
};

module.exports = {
    convertDocxToPdf,
    validateWordDocument,
    getWordMetadata,
    processWordToPdf
};