FROM node:18-alpine

WORKDIR /app

# Install shared dependencies
COPY services/shared/package*.json ./services/shared/
RUN cd services/shared && npm install --production

# Install service dependencies
COPY services/feedback/package*.json ./services/feedback/
RUN cd services/feedback && npm install --production

# Copy source code
COPY services/shared ./services/shared
COPY services/feedback ./services/feedback

# Set workdir to service
WORKDIR /app/services/feedback

# Expose port
EXPOSE 5006

# Start command
CMD ["npm", "start"]
