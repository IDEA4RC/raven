#!/bin/bash

# Script para buildear y deployar la aplicación Raven

echo "🚀 Iniciando el proceso de build y deploy..."

# Buildear la imagen Docker con el nombre 'raven'
echo "📦 Buildeando la imagen Docker..."
docker build -t raven .

# Verificar si el build fue exitoso
if [ $? -eq 0 ]; then
    echo "✅ Imagen buildeada exitosamente"
else
    echo "❌ Error al buildear la imagen"
    exit 1
fi

# Detener y eliminar el contenedor existente si existe
echo "🔄 Limpiando contenedor anterior..."
docker stop raven 2>/dev/null || true
docker rm raven 2>/dev/null || true

# Crear el contenedor con la configuración especificada
echo "🐳 Creando contenedor..."
docker create --network raven --ip 172.2.0.2 -p 3000:3000 --name raven raven

# Verificar si el contenedor fue creado exitosamente
if [ $? -eq 0 ]; then
    echo "✅ Contenedor creado exitosamente"
    echo "🎯 Para iniciar el contenedor ejecuta: docker start raven"
else
    echo "❌ Error al crear el contenedor"
    exit 1
fi

echo "🔧 Configuración del contenedor completada"
echo "🐳 Iniciando el contenedor..."
docker start raven

echo "🎉 Deploy completado!"

