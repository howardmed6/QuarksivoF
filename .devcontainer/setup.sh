# .devcontainer/setup.sh
#!/bin/bash
set -e

# Actualizar paquetes
sudo apt-get update && sudo apt-get install -y curl apt-transport-https lsb-release gnupg

# Instalar Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Instalar Azure Functions Core Tools v4
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Confirmar instalaciones
echo "Versiones instaladas:"
node -v
npm -v
az --version
func --version
