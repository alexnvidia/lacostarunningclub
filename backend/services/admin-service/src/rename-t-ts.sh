#!/bin/bash

# Renombrar todos los .js a .ts en controllers/
echo "Renombrando archivos .js a .ts en controllers/..."

count=0
for f in controllers/*.js; do
  if [ -f "$f" ]; then
    mv "$f" "${f%.js}.ts"
    echo "✓ Renombrado: $(basename "$f") → $(basename "${f%.js}.ts")"
    ((count++))
  fi
done

echo ""
echo "Total de archivos renombrados: $count"