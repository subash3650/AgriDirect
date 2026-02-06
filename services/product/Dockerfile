FROM node:18-alpine

WORKDIR /app

# Install shared dependencies
COPY services/shared/package*.json ./services/shared/
RUN cd services/shared && npm install --production

# Install service dependencies
COPY services/product/package*.json ./services/product/
RUN cd services/product && npm install --production

# Copy source code
COPY services/shared ./services/shared
COPY services/product ./services/product

# Set workdir to service
WORKDIR /app/services/product

# Expose port
EXPOSE 5003

# Start command
CMD ["npm", "start"]
