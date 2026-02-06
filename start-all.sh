#!/bin/bash

echo "==================================="
echo "   AgriDirect Microservices Startup"
echo "==================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local name=$1
    local port=$2
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} $name is ready on port $port"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo -e "${RED}✗${NC} $name failed to start on port $port"
    return 1
}

# Kill existing processes on our ports
echo -e "${YELLOW}Killing any existing processes on service ports...${NC}"
for port in 5001 5002 5003 5004 5005 5006 5007 5173 8000; do
    fuser -k $port/tcp 2>/dev/null
done
sleep 2

# Check if Docker mode is requested
if [ "$1" == "--docker" ] || [ "$1" == "-d" ]; then
    echo -e "${BLUE}Starting with Docker Compose...${NC}"
    echo ""
    cd "$SCRIPT_DIR"
    docker-compose up -d
    
    echo ""
    echo "Waiting for services to be ready..."
    sleep 10
    
    echo ""
    echo -e "${GREEN}==================================="
    echo "   All services started (Docker)"
    echo "===================================${NC}"
    echo ""
    echo "Services:"
    echo "  Gateway:       http://localhost:8000"
    echo "  Auth:          http://localhost:5001"
    echo "  User:          http://localhost:5002"
    echo "  Product:       http://localhost:5003"
    echo "  Order:         http://localhost:5004"
    echo "  Communication: http://localhost:5005"
    echo "  Feedback:      http://localhost:5006"
    echo "  Frontend:      http://localhost:3000"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop: docker-compose down"
    exit 0
fi

# Local development mode
echo -e "${BLUE}Starting services in local development mode...${NC}"
echo ""

# Install shared dependencies
echo -e "${YELLOW}Installing shared library dependencies...${NC}"
cd "$SCRIPT_DIR/services/shared" && npm install --silent 2>/dev/null

# Start each service in background
services=(
    "auth:5001"
    "user:5002"
    "product:5003"
    "order:5004"
    "communication:5005"
    "feedback:5006"
    "payment:5007"
)

for service_info in "${services[@]}"; do
    IFS=':' read -r service port <<< "$service_info"
    echo -e "${YELLOW}Starting $service service (port $port)...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "$SCRIPT_DIR/services/$service/node_modules" ]; then
        cd "$SCRIPT_DIR/services/$service" && npm install --silent 2>/dev/null
    fi
    
    # Start service
    cd "$SCRIPT_DIR/services/$service" && npm run dev > /tmp/agridirect-$service.log 2>&1 &
done

# Start gateway
echo -e "${YELLOW}Starting API Gateway (port 8000)...${NC}"
if [ ! -d "$SCRIPT_DIR/services/gateway/node_modules" ]; then
    cd "$SCRIPT_DIR/services/gateway" && npm install --silent 2>/dev/null
fi
cd "$SCRIPT_DIR/services/gateway" && npm run dev > /tmp/agridirect-gateway.log 2>&1 &

# Start AI Service (Python FastAPI)
echo -e "${YELLOW}Starting AI Service (port 5008)...${NC}"
if [ -d "$SCRIPT_DIR/services/ai_connection" ]; then
    cd "$SCRIPT_DIR/services/ai_connection"
    # Activate venv if exists, otherwise use system python
    if [ -d "venv" ]; then
        source venv/bin/activate 2>/dev/null || true
    fi
    python main.py > /tmp/agridirect-ai.log 2>&1 &
fi

# Wait for services
echo ""
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 5

# Check all services
echo ""
echo "Service Status:"
wait_for_service "Auth Service" 5001
wait_for_service "User Service" 5002
wait_for_service "Product Service" 5003
wait_for_service "Order Service" 5004
wait_for_service "Communication Service" 5005
wait_for_service "Feedback Service" 5006
wait_for_service "Payment Service" 5007
wait_for_service "API Gateway" 8000

# Check AI Service (simple port check since it doesn't have /health)
if check_port 5008; then
    echo -e "${GREEN}✓${NC} AI Service is ready on port 5008"
else
    echo -e "${RED}✗${NC} AI Service failed to start on port 5008"
fi

# Start Frontend
echo ""
echo -e "${YELLOW}Starting Frontend (port 5173)...${NC}"
if [ -d "$SCRIPT_DIR/client" ]; then
    cd "$SCRIPT_DIR/client" && npm run dev > /tmp/agridirect-client.log 2>&1 &
    sleep 3
    if check_port 5173; then
        echo -e "${GREEN}✓${NC} Frontend is ready on port 5173"
    fi
fi

echo ""
echo -e "${GREEN}==================================="
echo "   All services started!"
echo "===================================${NC}"
echo ""
echo "Services:"
echo "  Gateway:       http://localhost:8000"
echo "  Auth:          http://localhost:5001"
echo "  User:          http://localhost:5002"
echo "  Product:       http://localhost:5003"
echo "  Order:         http://localhost:5004"
echo "  Communication: http://localhost:5005"
echo "  Feedback:      http://localhost:5006"
echo "  Payment:       http://localhost:5007"
echo "  AI Service:    http://localhost:5008"
echo "  Frontend:      http://localhost:5173"
echo ""
echo "Logs are available at /tmp/agridirect-*.log"
echo ""
echo "Press Enter to stop all services..."
read

# Cleanup
echo ""
echo -e "${YELLOW}Stopping all services...${NC}"
for port in 5001 5002 5003 5004 5005 5006 5007 5008 5173 8000; do
    fuser -k $port/tcp 2>/dev/null
done
echo -e "${GREEN}All services stopped.${NC}"
