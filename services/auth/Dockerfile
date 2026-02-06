FROM node:18-alpine

WORKDIR /app

# Install shared dependencies
COPY services/shared/package*.json ./services/shared/
RUN cd services/shared && npm install --production

# Install service dependencies
COPY services/auth/package*.json ./services/auth/
RUN cd services/auth && npm install --production

# Copy source code
COPY services/shared ./services/shared
COPY services/auth ./services/auth

# Set workdir to service
WORKDIR /app/services/auth

# Expose port
EXPOSE 5001

# Start command
CMD ["npm", "start"]
