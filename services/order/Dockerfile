FROM node:18-alpine

WORKDIR /app

# Install shared dependencies
COPY services/shared/package*.json ./services/shared/
RUN cd services/shared && npm install --production

# Install service dependencies
COPY services/order/package*.json ./services/order/
RUN cd services/order && npm install --production

# Copy source code
COPY services/shared ./services/shared
COPY services/order ./services/order

# Set workdir to service
WORKDIR /app/services/order

# Expose port
EXPOSE 5004

# Start command
CMD ["npm", "start"]
