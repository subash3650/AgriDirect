FROM node:18-alpine

WORKDIR /app

# Install shared dependencies
COPY services/shared/package*.json ./services/shared/
RUN cd services/shared && npm install --production

# Install service dependencies
COPY services/payment/package*.json ./services/payment/
RUN cd services/payment && npm install --production

# Copy source code
COPY services/shared ./services/shared
COPY services/payment ./services/payment

# Set workdir to service
WORKDIR /app/services/payment

# Expose port
EXPOSE 5007

# Start command
CMD ["npm", "start"]
