#!/bin/bash

# Guardar el directorio base
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🎭 Starting all microservices in OAS mode..."
echo ""

# Colores
GREEN='\033[0;32m'
NC='\033[0m'

#OAS mode
OAS=oas

# API Gateway
echo -e "${GREEN}Starting API Gateway...${NC}"
cd "$BASE_DIR/api-gateway" && npm run dev &
sleep 2

# Auth Service
echo -e "${GREEN}Starting Auth Service...${NC}"
cd "$BASE_DIR/services/auth-service" && npm run dev:$OAS &
sleep 1

# User Service
echo -e "${GREEN}Starting User Service...${NC}"
cd "$BASE_DIR/services/user-service" && npm run dev:$OAS &
sleep 1

# Order Service
echo -e "${GREEN}Starting Order Service...${NC}"
cd "$BASE_DIR/services/order-service" && npm run dev:$OAS &
sleep 1

# Product Service
echo -e "${GREEN}Starting Product Service...${NC}"
cd "$BASE_DIR/services/product-service" && npm run dev:$OAS &
sleep 1

# Admin Service
echo -e "${GREEN}Starting Admin Service...${NC}"
cd "$BASE_DIR/services/admin-service" && npm run dev:$OAS &
sleep 1

# Communication Service
echo -e "${GREEN}Starting Communication Service...${NC}"
cd "$BASE_DIR/services/communication-service" && npm run dev:$OAS &
sleep 1

# Performance Service
echo -e "${GREEN}Starting Performance Service...${NC}"
cd "$BASE_DIR/services/performance-service" && npm run dev:$OAS &



echo ""
echo "✅ All services started in OAS mode!"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

wait
