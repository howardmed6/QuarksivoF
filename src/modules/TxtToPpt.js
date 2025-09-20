const PptxGenJS = require('pptxgenjs');

/**
 * Detecta breaks naturales para dividir en slides
 */
const detectSlides = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const slides = [];
    let currentSlide = { title: '', content: [] };
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        const isTitle = (
            (line.length < 50 && line === line.toUpperCase()) ||
            (line.length < 80 && !line.endsWith('.') && !line.endsWith(',')) ||
            (i === 0) ||
            (line.match(/^(capítulo|chapter|parte|section|título|title)/i))
        );
        
        if (isTitle && currentSlide.content.length === 0) {
            currentSlide.title = line;
        } else if (isTitle && currentSlide.content.length > 0) {
            if (currentSlide.title || currentSlide.content.length > 0) {
                slides.push({ ...currentSlide });
            }
            currentSlide = { title: line, content: [] };
        } else {
            currentSlide.content.push(line);
            
            const totalContent = currentSlide.content.join(' ');
            if (totalContent.length > 1000) {
                slides.push({ ...currentSlide });
                currentSlide = { title: '', content: [] };
            }
        }
    }
    
    if (currentSlide.title || currentSlide.content.length > 0) {
        slides.push(currentSlide);
    }
    
    if (slides.length === 0) {
        slides.push({
            title: 'Documento',
            content: [text.substring(0, 1000)]
        });
    }
    
    return slides;
};

/**
 * Convierte TXT a PPTX
 */
const convertTxtToPptx = async (textBuffer, options = {}) => {
    const {
        fontSize = 18,
        titleFontSize = 28,
        fontFamily = 'Arial',
        theme = 'light',
        maxWordsPerSlide = 150,
        autoSplit = true
    } = options;

    try {
        const textString = textBuffer.toString('utf8');
        const pptx = new PptxGenJS();
        
        pptx.author = 'Convertidor TXT a PPTX';
        pptx.title = 'Presentación desde TXT';
        
        const slides = autoSplit ? detectSlides(textString) : [
            { title: 'Documento', content: [textString] }
        ];
        
        console.log(`📊 Detectados ${slides.length} slides`);
        
        const colors = theme === 'dark' ? 
            { background: '363636', text: 'FFFFFF', title: '4472C4' } :
            { background: 'FFFFFF', text: '333333', title: '4472C4' };
        
        slides.forEach((slideData, index) => {
            const slide = pptx.addSlide();
            
            slide.background = { color: colors.background };
            
            if (slideData.title) {
                slide.addText(slideData.title, {
                    x: 0.5,
                    y: 0.5,
                    w: 9,
                    h: 1,
                    fontSize: titleFontSize,
                    fontFace: fontFamily,
                    color: colors.title,
                    bold: true,
                    align: 'center'
                });
            }
            
            if (slideData.content.length > 0) {
                const content = slideData.content.join('\n\n');
                
                const words = content.split(/\s+/);
                const limitedContent = words.length > maxWordsPerSlide ? 
                    words.slice(0, maxWordsPerSlide).join(' ') + '...' : 
                    content;
                
                slide.addText(limitedContent, {
                    x: 0.5,
                    y: slideData.title ? 1.8 : 0.5,
                    w: 9,
                    h: slideData.title ? 5.2 : 6.5,
                    fontSize: fontSize,
                    fontFace: fontFamily,
                    color: colors.text,
                    align: 'left',
                    valign: 'top',
                    wrap: true
                });
            }
            
            if (slides.length > 1) {
                slide.addText(`${index + 1} / ${slides.length}`, {
                    x: 8.5,
                    y: 7,
                    w: 1,
                    h: 0.3,
                    fontSize: 10,
                    fontFace: fontFamily,
                    color: colors.text,
                    align: 'right'
                });
            }
        });
        
        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
        return pptxBuffer;
        
    } catch (error) {
        throw new Error(`Error convirtiendo TXT a PPTX: ${error.message}`);
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
        const estimatedSlides = Math.max(1, Math.ceil(wordCount / 150));
        
        return {
            wordCount: wordCount,
            lineCount: lineCount,
            estimatedSlides: estimatedSlides,
            characterCount: textString.length,
            size: textBuffer.length,
            format: 'txt'
        };
    } catch (error) {
        return {
            wordCount: 0,
            lineCount: 0,
            estimatedSlides: 1,
            characterCount: 0,
            size: textBuffer.length,
            format: 'unknown'
        };
    }
};

/**
 * Procesa conversión completa - FUNCIÓN PRINCIPAL
 */
const processTxtToPptx = async (documentBuffer, processingOptions, conversionParams) => {
    try {
        if (!documentBuffer) {
            throw new Error('No se proporcionó documento');
        }

        if (!validateTextDocument(documentBuffer)) {
            throw new Error('El archivo no es un texto válido');
        }

        const safeProcessingOptions = processingOptions || [];
        const safeConversionParams = conversionParams || {};
        const pptxOptions = safeConversionParams.pptxOptions || {};

        const originalSize = documentBuffer.length;
        console.log(`📥 Procesando TXT: ${(originalSize/1024).toFixed(2)}KB`);

        const originalMetadata = await getTextMetadata(documentBuffer);

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

        let finalPptxOptions = {
            fontSize: 18,
            titleFontSize: 28,
            fontFamily: 'Arial',
            theme: 'light',
            maxWordsPerSlide: 150,
            autoSplit: true,
            ...pptxOptions
        };

        if (safeProcessingOptions.includes('optimize-size')) {
            finalPptxOptions.fontSize = 16;
            finalPptxOptions.titleFontSize = 24;
            finalPptxOptions.maxWordsPerSlide = 200;
        }

        if (safeProcessingOptions.includes('improve-quality')) {
            finalPptxOptions.fontSize = 20;
            finalPptxOptions.titleFontSize = 32;
            finalPptxOptions.fontFamily = 'Calibri';
            finalPptxOptions.maxWordsPerSlide = 100;
        }

        console.log('🔄 Convirtiendo a formato PPTX...');
        const pptxBuffer = await convertTxtToPptx(processedBuffer, finalPptxOptions);

        const finalSize = pptxBuffer.length;
        const actualSlides = Math.max(1, Math.ceil(originalMetadata.wordCount / finalPptxOptions.maxWordsPerSlide));
        console.log(`📤 PPTX generado: ${actualSlides} slides, ${(finalSize/1024/1024).toFixed(2)}MB`);

        return {
            success: true,
            buffer: pptxBuffer,
            metadata: {
                original: {
                    format: originalMetadata.format || 'txt',
                    wordCount: originalMetadata.wordCount || 0,
                    lineCount: originalMetadata.lineCount || 0,
                    estimatedSlides: originalMetadata.estimatedSlides || 1,
                    characterCount: originalMetadata.characterCount || 0,
                    size: originalSize
                },
                final: {
                    format: 'pptx',
                    size: finalSize,
                    actualSlides: actualSlides
                },
                processing: {
                    appliedOptions: safeProcessingOptions,
                    sizeChange: finalSize - originalSize,
                    sizeChangePercent: originalSize > 0 ? ((finalSize - originalSize) / originalSize * 100).toFixed(1) : '0'
                }
            }
        };

    } catch (error) {
        console.error('Error en processTxtToPptx:', error.message);
        throw new Error(`Error en proceso TXT->PPTX: ${error.message}`);
    }
};

module.exports = {
    convertTxtToPptx,
    validateTextDocument,
    getTextMetadata,
    processTxtToPptx
};