const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

/**
 * Detecta si una línea parece ser un título
 */
const isLikelyTitle = (line, index, lines) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    
    const isFirstNonEmpty = index === 0 || lines.slice(0, index).every(l => l.trim() === '');
    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length < 50;
    const nextLineEmpty = index < lines.length - 1 && lines[index + 1].trim() === '';
    const doesntEndWithPeriod = !trimmed.endsWith('.');
    const isShort = trimmed.length < 80;
    
    return isFirstNonEmpty || (isAllCaps && nextLineEmpty) || (isShort && nextLineEmpty && doesntEndWithPeriod);
};

/**
 * Convierte TXT a DOCX
 */
const convertTxtToDocx = async (textBuffer, options = {}) => {
    const {
        fontSize = 24,
        fontFamily = 'Arial',
        lineSpacing = 240,
        autoDetectTitles = true
    } = options;

    try {
        const textString = textBuffer.toString('utf8');
        const lines = textString.split('\n');
        
        const paragraphs = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.trim() === '') {
                paragraphs.push(new Paragraph({
                    children: [new TextRun("")],
                    spacing: { after: 200 }
                }));
                continue;
            }
            
            const isTitle = autoDetectTitles && isLikelyTitle(line, i, lines);
            
            if (isTitle) {
                paragraphs.push(new Paragraph({
                    children: [
                        new TextRun({
                            text: line.trim(),
                            bold: true,
                            size: fontSize + 8,
                            font: fontFamily
                        })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }));
            } else {
                paragraphs.push(new Paragraph({
                    children: [
                        new TextRun({
                            text: line,
                            size: fontSize,
                            font: fontFamily
                        })
                    ],
                    spacing: { 
                        line: lineSpacing,
                        after: line.trim().length > 0 ? 120 : 0
                    }
                }));
            }
        }
        
        const doc = new Document({
            sections: [{
                properties: {},
                children: paragraphs
            }],
            styles: {
                paragraphStyles: [{
                    id: "Normal",
                    name: "Normal",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        font: fontFamily,
                        size: fontSize
                    },
                    paragraph: {
                        spacing: { line: lineSpacing }
                    }
                }]
            }
        });
        
        const buffer = await Packer.toBuffer(doc);
        return buffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo TXT a DOCX: ${error.message}`);
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
const processTxtToDocx = async (documentBuffer, processingOptions, conversionParams) => {
    try {
        if (!documentBuffer) {
            throw new Error('No se proporcionó documento');
        }

        if (!validateTextDocument(documentBuffer)) {
            throw new Error('El archivo no es un texto válido');
        }

        const safeProcessingOptions = processingOptions || [];
        const safeConversionParams = conversionParams || {};
        const docxOptions = safeConversionParams.docxOptions || {};

        const originalSize = documentBuffer.length;
        console.log(`📥 Procesando TXT: ${(originalSize/1024).toFixed(2)}KB`);

        const originalMetadata = await getTextMetadata(documentBuffer);

        // Aplicar limpieza si está seleccionada
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
        let finalDocxOptions = {
            fontSize: 24,
            fontFamily: 'Arial',
            lineSpacing: 240,
            autoDetectTitles: true,
            ...docxOptions
        };

        if (safeProcessingOptions.includes('optimize-size')) {
            finalDocxOptions.fontSize = 20;
            finalDocxOptions.lineSpacing = 220;
            finalDocxOptions.autoDetectTitles = false;
        }

        if (safeProcessingOptions.includes('improve-quality')) {
            finalDocxOptions.fontSize = 28;
            finalDocxOptions.fontFamily = 'Times New Roman';
            finalDocxOptions.lineSpacing = 280;
            finalDocxOptions.autoDetectTitles = true;
        }

        console.log('🔄 Convirtiendo a formato DOCX...');
        const docxBuffer = await convertTxtToDocx(processedBuffer, finalDocxOptions);

        const finalSize = docxBuffer.length;
        console.log(`📤 DOCX generado: ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: docxBuffer,
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
                    format: 'docx',
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
        console.error('Error en processTxtToDocx:', error.message);
        throw new Error(`Error en proceso TXT->DOCX: ${error.message}`);
    }
};

module.exports = {
    convertTxtToDocx,
    validateTextDocument,
    getTextMetadata,
    processTxtToDocx
};