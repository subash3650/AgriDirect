import os
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AgriDirect AI Service")

# CORS Configuration - Allow frontend direct access
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    language: str = "auto"  # auto, en, ta

class ChatResponse(BaseModel):
    response: str
    action: Optional[str] = None  # "product_created", "product_updated", etc.
    data: Optional[dict] = None   # Additional data for frontend

# Health Check
@app.get("/health")
def health_check():
    return {
        "service": "ai-service",
        "status": "healthy",
        "port": int(os.getenv("PORT", 5008))
    }

@app.get("/")
def read_root():
    return {"status": "AgriDirect AI Service is Running", "port": int(os.getenv("PORT", 5008))}

# Main Chat Endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Process a chat message from the farmer.
    - Supports text input (voice is converted to text on frontend)
    - Passes auth token to product tools
    """
    from agent import process_user_query
    
    try:
        # Extract token if present (Bearer token format)
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
        
        # Process the message with the agent
        result = await process_user_query(request.message, token, request.language)
        
        return ChatResponse(
            response=result.get("response", "Sorry, I couldn't process that."),
            action=result.get("action"),
            data=result.get("data")
        )
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Chat with Image Upload
@app.post("/chat/image", response_model=ChatResponse)
async def chat_with_image(
    message: str = Form(...),
    language: str = Form("auto"),
    image: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """
    Process a chat message with an image attachment.
    Used when farmer uploads a photo of their produce.
    """
    from agent import process_user_query_with_image
    
    try:
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
        
        # Read image bytes
        image_bytes = await image.read()
        
        result = await process_user_query_with_image(message, image_bytes, token, language)
        
        return ChatResponse(
            response=result.get("response", "Sorry, I couldn't process that."),
            action=result.get("action"),
            data=result.get("data")
        )
    except Exception as e:
        print(f"Chat with image error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5008))
    print(f"🤖 Starting AgriDirect AI Service on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
