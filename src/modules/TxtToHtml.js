/**
 * Escapa caracteres HTML especiales
 */
const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/**
 * Detecta elementos de formato en texto plano
 */
const convertTextToHtml = (text, options = {}) => {
    const {
        autoDetectTitles = true,
        linkify = true,
        theme = 'light'
    } = options;

    const lines = text.split('\n');
    let html = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (trimmed === '') {
            html += '<br>\n';
            continue;
        }
        
        let isTitle = false;
        let headingLevel = 'h2';
        
        if (autoDetectTitles) {
            const nextLineEmpty = i < lines.length - 1 && lines[i + 1].trim() === '';
            const isShort = trimmed.length < 80;
            const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3;
            const isFirstLine = i === 0;
            const doesntEndWithPeriod = !trimmed.endsWith('.');
            
            if (trimmed.match(/^(capítulo|chapter)\s+\d+/i)) {
                isTitle = true;
                headingLevel = 'h1';
            } else if (isFirstLine || (isAllCaps && nextLineEmpty)) {
                isTitle = true;
                headingLevel = 'h1';
            } else if (isShort && nextLineEmpty && doesntEndWithPeriod) {
                isTitle = true;
                headingLevel = 'h2';
            } else if (trimmed.match(/^\d+\.\s/)) {
                isTitle = true;
                headingLevel = 'h3';
            }
        }
        
        let processedLine = escapeHtml(trimmed);
        
        if (linkify) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            processedLine = processedLine.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
            
            const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
            processedLine = processedLine.replace(emailRegex, '<a href="mailto:$1">$1</a>');
        }
        
        if (isTitle) {
            html += `<${headingLevel}>${processedLine}</${headingLevel}>\n`;
        } else {
            if (trimmed.match(/^[-*+]\s/)) {
                processedLine = processedLine.replace(/^[-*+]\s/, '');
                html += `<ul><li>${processedLine}</li></ul>\n`;
            } else if (trimmed.match(/^\d+\.\s/)) {
                processedLine = processedLine.replace(/^\d+\.\s/, '');
                html += `<ol><li>${processedLine}</li></ol>\n`;
            } else {
                html += `<p>${processedLine}</p>\n`;
            }
        }
    }
    
    return html;
};

/**
 * Genera CSS según el tema elegido
 */
const generateCSS = (theme, options = {}) => {
    const { fontSize = '16px', fontFamily = 'Arial, sans-serif', lineHeight = '1.6' } = options;
    
    const themes = {
        light: {
            background: '#ffffff',
            text: '#333333',
            heading: '#2c3e50',
            link: '#3498db',
            border: '#e1e8ed'
        },
        dark: {
            background: '#1a1a1a',
            text: '#e1e1e1',
            heading: '#61dafb',
            link: '#4dabf7',
            border: '#404040'
        },
        minimal: {
            background: '#fefefe',
            text: '#2c2c2c',
            heading: '#1a1a1a',
            link: '#0066cc',
            border: '#f0f0f0'
        },
        elegant: {
            background: '#f8f9fa',
            text: '#495057',
            heading: '#212529',
            link: '#6f42c1',
            border: '#dee2e6'
        }
    };
    
    const colors = themes[theme] || themes.light;
    
    return `
        body {
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: ${lineHeight};
            color: ${colors.text};
            background-color: ${colors.background};
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: ${colors.heading};
            margin-top: 2em;
            margin-bottom: 1em;
            font-weight: bold;
        }
        
        h1 { font-size: 2.5em; }
        h2 { font-size: 2em; }
        h3 { font-size: 1.5em; }
        
        p {
            margin: 1em 0;
            text-align: justify;
        }
        
        a {
            color: ${colors.link};
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        ul, ol {
            margin: 1em 0;
            padding-left: 2em;
        }
        
        li {
            margin: 0.5em 0;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 20px 15px;
                font-size: 14px;
            }
            
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.2em; }
        }
    `;
};

/**
 * Convierte TXT a HTML
 */
const convertTxtToHtml = async (textBuffer, options = {}) => {
    const {
        title = 'Documento convertido',
        theme = 'light',
        fontSize = '16px',
        fontFamily = 'Arial, sans-serif',
        lineHeight = '1.6',
        autoDetectTitles = true,
        linkify = true,
        includeStyles = true
    } = options;

    try {
        const textString = textBuffer.toString('utf8');
        
        const bodyHtml = convertTextToHtml(textString, {
            autoDetectTitles,
            linkify,
            theme
        });
        
        const css = includeStyles ? generateCSS(theme, { fontSize, fontFamily, lineHeight }) : '';
        
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    ${includeStyles ? `<style>${css}</style>` : ''}
</head>
<body>
    ${bodyHtml}
</body>
</html>`;
        
        return Buffer.from(html, 'utf8');
        
    } catch (error) {
        throw new Error(`Error convirtiendo TXT a HTML: ${error.message}`);
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
const processTxtToHtml = async (documentBuffer, processingOptions, conversionParams) => {
    try {
        if (!documentBuffer) {
            throw new Error('No se proporcionó documento');
        }

        if (!validateTextDocument(documentBuffer)) {
            throw new Error('El archivo no es un texto válido');
        }

        const safeProcessingOptions = processingOptions || [];
        const safeConversionParams = conversionParams || {};
        const htmlOptions = safeConversionParams.htmlOptions || {};

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

        let finalHtmlOptions = {
            title: 'Documento convertido',
            theme: 'light',
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.6',
            autoDetectTitles: true,
            linkify: true,
            includeStyles: true,
            ...htmlOptions
        };

        if (safeProcessingOptions.includes('optimize-size')) {
            finalHtmlOptions.includeStyles = false;
            finalHtmlOptions.theme = 'minimal';
            finalHtmlOptions.fontSize = '14px';
        }

        if (safeProcessingOptions.includes('improve-quality')) {
            finalHtmlOptions.theme = 'elegant';
            finalHtmlOptions.fontSize = '18px';
            finalHtmlOptions.fontFamily = 'Georgia, serif';
            finalHtmlOptions.lineHeight = '1.8';
            finalHtmlOptions.autoDetectTitles = true;
            finalHtmlOptions.linkify = true;
        }

        console.log('🔄 Convirtiendo a formato HTML...');
        const htmlBuffer = await convertTxtToHtml(processedBuffer, finalHtmlOptions);

        const finalSize = htmlBuffer.length;
        console.log(`📤 HTML generado: ${(finalSize/1024).toFixed(2)}KB`);

        return {
            success: true,
            buffer: htmlBuffer,
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
                    format: 'html',
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
        console.error('Error en processTxtToHtml:', error.message);
        throw new Error(`Error en proceso TXT->HTML: ${error.message}`);
    }
};

module.exports = {
    convertTxtToHtml,
    validateTextDocument,
    getTextMetadata,
    processTxtToHtml
};