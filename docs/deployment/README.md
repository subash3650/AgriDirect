# Deployment Guide

You can deploy AgriDirect using Docker (recommended) or manually on a VPS/Cloud provider.

## 🐳 Docker Deployment (Recommended)

This is the easiest way to get everything running, including the database.

### Prerequisites
*   [Docker](https://docs.docker.com/get-docker/) installed based on your OS.
*   [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop).

### Steps
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/agridirect.git
    cd agridirect
    ```

2.  **Configure Environment**:
    Create a `.env` file in `server/` or rely on the `docker-compose.yml` defaults for testing.
    > **Note:** The `docker-compose.yml` comes with default environment variables. For production, modify the `environment` section in `docker-compose.yml` with your real secrets.

3.  **Run the containers**:
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Start MongoDB on port `27017`
    *   Build and start the Backend Server on port `5000`
    *   Build and serve the Frontend (Nginx) on port `3000`

4.  **Access the App**:
    Open [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Manual Deployment

If you prefer to deploy services individually (e.g., Render for backend, Vercel for frontend, Atlas for DB).

### 1. Database (MongoDB)
*   Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
*   Get your connection string: `mongodb+srv://<username>:<password>@cluster...`

### 2. Backend Server
*   Navigate to `server/`.
*   Install dependencies: `npm install --omit=dev`.
*   Set environment variables (see `server/.env.example`).
*   Start server: `npm start`.

### 3. Frontend Client
*   Navigate to `client/`.
*   Set API URL using environment variable `VITE_API_URL`.
*   Install dependencies: `npm install`.
*   Build for production: `npm run build`.
*   Serve the `dist/` folder using a static file server (e.g., `serve -s dist`).
