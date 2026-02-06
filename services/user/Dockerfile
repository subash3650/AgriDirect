FROM node:18-alpine

WORKDIR /app

# Install shared dependencies
COPY services/shared/package*.json ./services/shared/
RUN cd services/shared && npm install --production

# Install service dependencies
COPY services/user/package*.json ./services/user/
RUN cd services/user && npm install --production

# Copy source code
COPY services/shared ./services/shared
COPY services/user ./services/user

# Set workdir to service
WORKDIR /app/services/user

# Expose port
EXPOSE 5002

# Start command
CMD ["npm", "start"]
