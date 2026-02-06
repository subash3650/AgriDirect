FROM node:18-alpine

WORKDIR /app

# Install shared dependencies
COPY services/shared/package*.json ./services/shared/
RUN cd services/shared && npm install --production

# Install service dependencies
COPY services/communication/package*.json ./services/communication/
RUN cd services/communication && npm install --production

# Copy source code
COPY services/shared ./services/shared
COPY services/communication ./services/communication

# Set workdir to service
WORKDIR /app/services/communication

# Expose port
EXPOSE 5005

# Start command
CMD ["npm", "start"]
