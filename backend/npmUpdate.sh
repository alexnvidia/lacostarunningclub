#!/bin/bash

BASE_DIR="/Users/afernandez/Documents/lcrcDev/backend"

# Actualizar npm globalmente (opcional)
echo "Actualizando npm globalmente en la máquina local..."
npm install -g npm@latest

# Actualizar en api-gateway
cd "$BASE_DIR/api-gateway" || exit
echo "Actualizando npm en api-gateway..."
npm install -g npm@latest

# Recorrer cada servicio en la carpeta services
for service_dir in "$BASE_DIR/services"/*; do
  if [ -d "$service_dir" ]; then
    echo "Actualizando npm en $(basename "$service_dir")..."
    cd "$service_dir" || continue
    npm install -g npm@latest
  fi
done

echo "Actualización de npm completada en todos los servicios."
