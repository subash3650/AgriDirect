import os
import json
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
from groq import Groq

load_dotenv()

# Configure Groq
API_KEY = os.getenv("GROQ_API_KEY")
if not API_KEY:
    print("⚠️ Warning: GROQ_API_KEY not found in environment variables.")

client = Groq(api_key=API_KEY)

# Initial Model Configuration
check_model = "llama-3.3-70b-versatile"
vision_model = "llama-3.2-11b-vision-preview"

# Import tools
from tools.product_tool import (
    get_farmer_products,
    create_product,
    update_product_quantity,
    search_products,
    categorize_product,
    update_product_image,
    set_session_token,
    set_pending_image,
    CURRENT_SESSION_ID
)
import tools.product_tool as pt

# Tool Definitions for Groq (OpenAI-compatible schema)
tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "get_farmer_products",
            "description": "Get all products belonging to the currently authenticated farmer.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_product",
            "description": "Create a new product listing for the farmer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "Name of the product"},
                    "quantity": {"type": "string", "description": "Quantity available in kg/units (number as string)"},
                    "price": {"type": "string", "description": "Price per kg/unit in rupees (number as string)"},
                    "description": {"type": "string", "description": "Brief description"},
                    "category": {"type": "string", "description": "Category: Vegetables, Fruits, Grains, etc."}
                },
                "required": ["product_name", "quantity", "price"]
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_product_quantity",
            "description": "Update quantity of an existing product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "Name of the product to update"},
                    "quantity_to_add": {"type": "string", "description": "Quantity to add (number as string)"}
                },
                "required": ["product_name", "quantity_to_add"]
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search for products in the marketplace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term"}
                },
                "required": ["query"]
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "categorize_product",
            "description": "Determine category for a product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "Product name"}
                },
                "required": ["product_name"]
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_product_image",
            "description": "Update the image for an existing product. Use when farmer uploads a photo to update their product image.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "Name of the product to update image for"}
                },
                "required": ["product_name"]
            },
        }
    }
]

# Map string function names to actual functions
available_functions = {
    "get_farmer_products": get_farmer_products,
    "create_product": create_product,
    "update_product_quantity": update_product_quantity,
    "search_products": search_products,
    "categorize_product": categorize_product,
    "update_product_image": update_product_image
}

# System Prompt
SYSTEM_INSTRUCTION = """
You are AgriBot - AI assistant for farmers. You speak Tamil and English.

## Your Role
Help farmers manage products via voice.
- If user speaks Tamil, reply in Tamil.
- If user speaks English, reply in English.
- Use simple words.
- Always confirm actions.

## Product Flow
1. Check existing products first (`get_farmer_products`).
2. If exists, update quantity (`update_product_quantity`).
3. If new, create product (`create_product`). Auto-categorize if needed.

## Categories
Vegetables, Fruits, Grains, Pulses, Dairy, Spices, Oils, Others.

## Example
User: "I have 50kg tomatoes at 40 rupees"
Bot: "Ok! Adding 50kg tomatoes at ₹40. Correct?"
"""

# Simple in-memory session store
chat_histories: Dict[str, List[Dict[str, Any]]] = {}

def get_history(session_id: str) -> List[Dict[str, Any]]:
    if session_id not in chat_histories:
        chat_histories[session_id] = [
            {"role": "system", "content": SYSTEM_INSTRUCTION}
        ]
    return chat_histories[session_id]

async def process_user_query(user_input: str, auth_token: Optional[str] = None, language: str = "auto") -> dict:
    try:
        # Set up session context (thread-safe)
        session_id = auth_token[:16] if auth_token else "anonymous"
        pt.CURRENT_SESSION_ID = session_id
        set_session_token(session_id, auth_token)
        
        messages = get_history(session_id)
        
        # Add user message
        messages.append({"role": "user", "content": user_input})
        
        # First call to LLM
        response = client.chat.completions.create(
            model=check_model,
            messages=messages,
            tools=tools_schema,
            tool_choice="auto",
            max_tokens=1024
        )
        
        response_message = response.choices[0].message
        messages.append(response_message)
        
        action = None
        data = None
        final_response_text = ""

        # Handle tool calls
        if response_message.tool_calls:
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_to_call = available_functions.get(function_name)
                function_args = json.loads(tool_call.function.arguments)
                if function_args is None:
                    function_args = {}
                
                # Identify action type
                if function_name == "create_product":
                    action = "product_created"
                elif function_name == "update_product_quantity":
                    action = "product_updated"
                
                # Execute tool
                tool_response = function_to_call(**function_args)
                
                # Add tool response to history
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": str(tool_response),
                })
            
            # Second call to LLM to generate final response
            second_response = client.chat.completions.create(
                model=check_model,
                messages=messages
            )
            final_response_text = second_response.choices[0].message.content
            messages.append(second_response.choices[0].message)
            
        else:
            final_response_text = response_message.content
            
        return {
            "response": final_response_text,
            "action": action,
            "data": data
        }
        
    except Exception as e:
        print(f"Agent error: {e}")
        return {
            "response": "Sorry, there was an issue. Please try again.",
            "action": "error",
            "data": {"error": str(e)}
        }

async def process_user_query_with_image(
    user_input: str, 
    image_bytes: bytes, 
    auth_token: Optional[str] = None,
    language: str = "auto"
) -> dict:
    """
    Process a user query that includes an uploaded image.
    The image is compressed and stored for use in product creation/update.
    No vision analysis - the main agent handles the product logic.
    """
    try:
        import base64
        from utils.image_utils import compress_image, validate_image
        
        # Encode to base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # Set up session
        session_id = auth_token[:16] if auth_token else "anonymous"
        pt.CURRENT_SESSION_ID = session_id
        set_session_token(session_id, auth_token)
        
        # Validate image
        is_valid, error = validate_image(base64_image)
        if not is_valid:
            return {
                "response": f"The uploaded image is not valid. Please upload a proper image file. Error: {error}",
                "action": "error",
                "data": {}
            }
        
        # Compress image to 2MB
        compressed_image, success = compress_image(base64_image)
        if not success:
            print("⚠️ Image compression failed, using original")
            compressed_image = base64_image
        
        # Store compressed image for product operations
        result = set_pending_image(session_id, compressed_image)
        if result != "OK":
            return {"response": result, "action": "error", "data": {}}
        
        original_size = len(image_bytes) / 1024
        compressed_size = len(base64.b64decode(compressed_image)) / 1024
        print(f"📸 Image stored: {original_size:.1f}KB -> {compressed_size:.1f}KB")
        
        # Pass to main agent with note about the image
        # The agent will use update_product_image or create a new product with the image
        enhanced_input = f"""
{user_input}

[Image attached: The farmer has uploaded a product image. If creating or updating a product, use the update_product_image tool to attach this image to the product.]
"""
        
        result = await process_user_query(enhanced_input, auth_token, language)
        result["data"] = {"image_uploaded": True, "compressed_size_kb": compressed_size}
        
        return result
        
    except Exception as e:
        print(f"Image processing error: {e}")
        return {
            "response": "There was an error processing your image. Please try again or describe your product without an image.",
            "action": "error",
            "data": {"error": str(e)}
        }
