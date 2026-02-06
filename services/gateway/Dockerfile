FROM node:18-alpine

WORKDIR /app

# Install shared dependencies
COPY services/shared/package*.json ./services/shared/
RUN cd services/shared && npm install --production

# Install service dependencies
COPY services/gateway/package*.json ./services/gateway/
RUN cd services/gateway && npm install --production

# Copy source code
COPY services/shared ./services/shared
COPY services/gateway ./services/gateway

# Set workdir to service
WORKDIR /app/services/gateway

# Expose port
EXPOSE 8000

# Start command
CMD ["npm", "start"]
