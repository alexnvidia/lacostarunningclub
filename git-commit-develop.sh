#!/bin/bash

# Comprueba que estás en la rama develop
branch=$(git branch --show-current)
if [ "$branch" != "develop" ]; then
  echo "No estás en la rama develop. Cambiando..."
  git checkout develop || exit 1
fi

read -p "Mensaje de commit: " msg

if [ -z "$msg" ]; then
  echo "Mensaje vacío. Abortando."
  exit 1
fi

# Añade todos los cambios
git add .

# Commit con mensaje
git commit -m "$msg"

# Push a develop automáticamente
git push origin develop
