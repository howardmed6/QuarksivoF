const { app } = require('@azure/functions');

// Página principal que captura todas las rutas
app.http('QuarkCorporationIndex', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: '{*segments}', // Captura cualquier ruta
    handler: async (request, context) => {
        const currentYear = new Date().getFullYear();
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            },
            body: `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Quark Corporation - Advanced Technology Solutions</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        background: linear-gradient(135deg, #0f0f23, #1a1a3a);
                        color: #ffffff;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .stars {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                    }
                    
                    .star {
                        position: absolute;
                        width: 2px;
                        height: 2px;
                        background: white;
                        border-radius: 50%;
                        animation: twinkle 3s infinite;
                    }
                    
                    @keyframes twinkle {
                        0%, 100% { opacity: 0; }
                        50% { opacity: 1; }
                    }
                    
                    .container {
                        text-align: center;
                        z-index: 10;
                        max-width: 800px;
                        padding: 40px 20px;
                    }
                    
                    .logo {
                        font-size: 4rem;
                        font-weight: 900;
                        background: linear-gradient(45deg, #00d4ff, #0099cc, #0078d4);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin-bottom: 20px;
                        text-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
                        animation: glow 2s ease-in-out infinite alternate;
                    }
                    
                    @keyframes glow {
                        from { filter: brightness(1); }
                        to { filter: brightness(1.2); }
                    }
                    
                    .subtitle {
                        font-size: 1.5rem;
                        margin-bottom: 30px;
                        color: #b8c5d6;
                        font-weight: 300;
                    }
                    
                    .description {
                        font-size: 1.1rem;
                        line-height: 1.6;
                        margin-bottom: 40px;
                        color: #8892a6;
                    }
                    
                    .tech-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin: 40px 0;
                    }
                    
                    .tech-card {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(0, 212, 255, 0.2);
                        border-radius: 15px;
                        padding: 25px;
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                    }
                    
                    .tech-card:hover {
                        transform: translateY(-5px);
                        border-color: rgba(0, 212, 255, 0.5);
                        box-shadow: 0 10px 30px rgba(0, 212, 255, 0.2);
                    }
                    
                    .tech-icon {
                        font-size: 2rem;
                        margin-bottom: 15px;
                    }
                    
                    .vision-section {
                        margin-top: 60px;
                        padding: 30px;
                        background: rgba(0, 120, 212, 0.1);
                        border-radius: 20px;
                        border: 1px solid rgba(0, 120, 212, 0.3);
                    }
                    
                    .vision-year {
                        font-size: 2.5rem;
                        font-weight: 700;
                        color: #00d4ff;
                        margin-bottom: 15px;
                        text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
                    }
                    
                    .footer {
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-size: 0.9rem;
                        color: #666;
                    }
                    
                    .api-status {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(0, 255, 0, 0.1);
                        border: 1px solid rgba(0, 255, 0, 0.3);
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 0.9rem;
                        margin-top: 20px;
                    }
                    
                    .status-dot {
                        width: 8px;
                        height: 8px;
                        background: #00ff00;
                        border-radius: 50%;
                        animation: pulse 1.5s infinite;
                    }
                    
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }
                </style>
            </head>
            <body>
                <div class="stars" id="stars"></div>
                
                <div class="container">
                    <div class="logo">QUARK CORPORATION</div>
                    <div class="subtitle">Advanced Technology Solutions</div>
                    
                    <div class="description">
                        Pioneering the future of digital transformation through cutting-edge APIs, 
                        advanced image processing, and revolutionary technological solutions.
                    </div>
                    
                    <div class="tech-grid">
                        <div class="tech-card">
                            <div class="tech-icon">🚀</div>
                            <h3>High-Performance APIs</h3>
                            <p>Ultra-fast processing with enterprise-grade reliability</p>
                        </div>
                        <div class="tech-card">
                            <div class="tech-icon">🖼️</div>
                            <h3>Image Conversion</h3>
                            <p>Advanced algorithms for seamless format transformation</p>
                        </div>
                        <div class="tech-card">
                            <div class="tech-icon">⚡</div>
                            <h3>Cloud Infrastructure</h3>
                            <p>Scalable solutions for the modern enterprise</p>
                        </div>
                    </div>
                    
                    <div class="api-status">
                        <span class="status-dot"></span>
                        API Services Online
                    </div>
                    
                    <div class="vision-section">
                        <div class="vision-year">Vision 2075</div>
                        <p>
                            "Building the technological foundation for tomorrow's world. 
                            From humble beginnings in ${currentYear} to global innovation leadership 
                            by 2075, Quark Corporation continues to push the boundaries of what's possible."
                        </p>
                    </div>
                </div>
                
                <div class="footer">
                    © ${currentYear} Quark Corporation. Shaping the Future of Technology.
                </div>
                
                <script>
                    // Generar estrellas
                    const starsContainer = document.getElementById('stars');
                    for (let i = 0; i < 100; i++) {
                        const star = document.createElement('div');
                        star.className = 'star';
                        star.style.left = Math.random() * 100 + '%';
                        star.style.top = Math.random() * 100 + '%';
                        star.style.animationDelay = Math.random() * 3 + 's';
                        starsContainer.appendChild(star);
                    }
                </script>
            </body>
            </html>
            `
        };
    }
});

module.exports = app;