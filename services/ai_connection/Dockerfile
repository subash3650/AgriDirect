FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY services/ai_connection/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY services/ai_connection ./

# Expose port
EXPOSE 5008

# Start command
CMD ["python", "main.py"]
