# Development Guide

Follow these steps to set up your local development environment for AgriDirect.

## Prerequisites
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [MongoDB](https://www.mongodb.com/try/download/community) (running locally or standard Atlas URI)
*   Git

## Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/agridirect.git
    cd agridirect
    ```

2.  **Server Setup**
    ```bash
    cd server
    npm install
    # Copy example env
    cp .env.example .env
    # Edit .env and add your MongoDB URI and Secrets
    npm run dev
    ```
    Server runs on `http://localhost:5000`

3.  **Client Setup** (Open a new terminal)
    ```bash
    cd client
    npm install
    # Copy example env
    cp .env.example .env
    npm run dev
    ```
    Client runs on `http://localhost:5173`

## Project Structure

```bash
agridirect/
├── client/                 # Frontend React App
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page views (Buyer, Farmer)
│   │   ├── services/       # API integration
│   │   └── context/        # React Context (Auth, Socket)
├── server/                 # Backend Node/Express App
│   ├── models/             # Mongoose Schemas
│   ├── controllers/        # Route logic
│   ├── routes/             # API Endpoints
│   ├── services/           # Business logic (Optimization, Email)
│   └── middleware/         # Auth, Role protection
└── docs/                   # Documentation
```

## Common Commands

| Command | Path | Description |
| :--- | :--- | :--- |
| `npm run dev` | `client/` | Start Vite dev server |
| `npm run dev` | `server/` | Start Backend with Nodemon |
| `npm run build` | `client/` | Build frontend for production |
| `npm start` | `server/` | Start backend in production mode |
