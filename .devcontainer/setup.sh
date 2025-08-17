#!/bin/bash
set -e

echo "🚀 Iniciando configuración del entorno de desarrollo..."

# Función para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Actualizar paquetes
log "Actualizando paquetes del sistema..."
sudo apt-get update -qq

# Instalar dependencias necesarias
log "Instalando dependencias..."
sudo apt-get install -y \
    curl \
    apt-transport-https \
    lsb-release \
    gnupg \
    software-properties-common \
    wget

# Verificar si Azure CLI ya está instalado
if ! command -v az &> /dev/null; then
    log "Instalando Azure CLI..."
    # Método alternativo más confiable
    curl -sL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/microsoft.gpg > /dev/null
    AZ_REPO=$(lsb_release -cs)
    echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $AZ_REPO main" | sudo tee /etc/apt/sources.list.d/azure-cli.list
    sudo apt-get update -qq
    sudo apt-get install -y azure-cli
else
    log "Azure CLI ya está instalado"
fi

# Verificar si Node.js está disponible
if ! command -v node &> /dev/null; then
    log "❌ Node.js no encontrado. Verificar configuración de features."
    exit 1
fi

# Instalar Azure Functions Core Tools v4
if ! command -v func &> /dev/null; then
    log "Instalando Azure Functions Core Tools..."
    npm install -g azure-functions-core-tools@4 --unsafe-perm true
else
    log "Azure Functions Core Tools ya está instalado"
fi

# Confirmar instalaciones
log "✅ Configuración completada. Versiones instaladas:"
echo "----------------------------------------"
node -v
npm -v
az --version | head -1
func --version
echo "----------------------------------------"

log "🎉 Entorno de desarrollo listo para usar!"