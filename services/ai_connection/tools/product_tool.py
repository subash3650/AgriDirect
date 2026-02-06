"""
Product Tools for AI Agent
These tools allow the AI to manage farmer's products through conversation.
Auth tokens are forwarded to the Product Service for proper authorization.

Refactored for:
- Thread-safe session-based storage
- Input validation
- Proper error handling
- Consistent field naming
"""

import requests
import os
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from threading import Lock

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Product Service URL
PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL", "http://localhost:5003/api/products")

# Configuration
REQUEST_TIMEOUT = int(os.getenv("AI_REQUEST_TIMEOUT", "10"))
MAX_IMAGE_SIZE_MB = int(os.getenv("AI_MAX_IMAGE_SIZE_MB", "2"))
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024


@dataclass
class SessionContext:
    """Thread-safe session context for each user request."""
    auth_token: Optional[str] = None
    pending_image: Optional[str] = None
    

# Session storage with thread safety
_sessions: Dict[str, SessionContext] = {}
_session_lock = Lock()


def get_session(session_id: str) -> SessionContext:
    """Get or create a session context."""
    with _session_lock:
        if session_id not in _sessions:
            _sessions[session_id] = SessionContext()
        return _sessions[session_id]


def set_session_token(session_id: str, token: Optional[str]):
    """Set auth token for a session."""
    session = get_session(session_id)
    session.auth_token = token
    logger.debug(f"Session {session_id[:8]}...: Token set (present: {bool(token)})")


def set_pending_image(session_id: str, base64_image: str) -> str:
    """
    Store an uploaded image for the session.
    Returns error message if image too large.
    """
    if len(base64_image) > MAX_IMAGE_SIZE_BYTES:
        return f"Error: Image too large. Maximum size is {MAX_IMAGE_SIZE_MB}MB."
    
    session = get_session(session_id)
    session.pending_image = base64_image
    logger.debug(f"Session {session_id[:8]}...: Pending image set (size: {len(base64_image)} bytes)")
    return "OK"


def get_and_clear_pending_image(session_id: str) -> Optional[str]:
    """Get and clear the pending image for a session."""
    session = get_session(session_id)
    img = session.pending_image
    session.pending_image = None
    return img


def _get_headers(session_id: str) -> dict:
    """Get headers with auth token if available."""
    headers = {"Content-Type": "application/json"}
    session = get_session(session_id)
    if session.auth_token:
        headers["Authorization"] = f"Bearer {session.auth_token}"
    return headers


def _validate_positive_int(value: Any, name: str, max_value: int = 1000000) -> tuple[bool, str, int]:
    """Validate that a value is a positive integer within bounds."""
    try:
        int_value = int(value)
        if int_value <= 0:
            return False, f"{name} must be a positive number.", 0
        if int_value > max_value:
            return False, f"{name} is too large. Maximum is {max_value}.", 0
        return True, "", int_value
    except (ValueError, TypeError):
        return False, f"{name} must be a valid number.", 0


# Current session ID (set by agent before each call)
CURRENT_SESSION_ID: str = "default"


def get_farmer_products() -> str:
    """
    Get all products belonging to the currently authenticated farmer.
    
    Returns:
        A summary of the farmer's existing products.
    """
    session = get_session(CURRENT_SESSION_ID)
    logger.debug(f"get_farmer_products called for session {CURRENT_SESSION_ID[:8]}...")
    
    if not session.auth_token:
        return "Error: No authentication token. Please login first."
    
    try:
        url = f"{PRODUCT_SERVICE_URL}/my-products"
        headers = _get_headers(CURRENT_SESSION_ID)
        
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        
        logger.debug(f"Response status: {response.status_code}")
        
        if response.status_code == 401:
            return "Error: Authentication failed. Please login again."
        
        response.raise_for_status()
        data = response.json()
        products = data.get("products", [])
        
        if not products:
            return "You have no products listed yet. You can add your first product!"
        
        # Format products (user-friendly, no IDs)
        result = f"You have {len(products)} products:\n"
        for p in products:
            qty = p.get('currentQuantity', p.get('quantity', 0))
            result += f"• {p.get('productName')}: {qty} units, ₹{p.get('price')}/unit\n"
        
        return result
        
    except requests.exceptions.Timeout:
        logger.error("Request timeout in get_farmer_products")
        return "Error: Server took too long to respond. Please try again."
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return f"Error fetching products: {str(e)}"


def create_product(
    product_name: str,
    quantity: int,
    price: int,
    description: str = "",
    category: str = "Others"
) -> str:
    """
    Create a new product listing for the farmer.
    
    Args:
        product_name: Name of the product (e.g., "Tomato", "Rice", "Onion")
        quantity: Quantity available in kg or units (must be positive, max 1,000,000)
        price: Price per kg/unit in rupees (must be positive, max 100,000)
        description: Brief description of the product quality
        category: Category - Vegetables, Fruits, Grains, Pulses, Dairy, Spices, Oils, Others
    
    Returns:
        Success or error message.
    """
    session = get_session(CURRENT_SESSION_ID)
    logger.debug(f"create_product called: {product_name}, qty={quantity}, price={price}")
    
    if not session.auth_token:
        return "Error: No authentication token. Please login first."
    
    # Input validation
    if not product_name or not product_name.strip():
        return "Error: Product name cannot be empty."
    
    valid, error, qty_int = _validate_positive_int(quantity, "Quantity", 1000000)
    if not valid:
        return error
    
    valid, error, price_int = _validate_positive_int(price, "Price", 100000)
    if not valid:
        return error
    
    # Validate category
    valid_categories = ["Vegetables", "Fruits", "Grains", "Pulses", "Dairy", "Spices", "Oils", "Others"]
    if category not in valid_categories:
        logger.warning(f"Invalid category '{category}', defaulting to 'Others'")
        category = "Others"
    
    # Check for pending image (from image upload)
    pending_image = get_and_clear_pending_image(CURRENT_SESSION_ID)
    image_url = None
    if pending_image:
        image_url = f"data:image/jpeg;base64,{pending_image}"
        logger.info("Using uploaded image for new product")
    
    payload = {
        "productName": product_name.strip(),
        "quantity": qty_int,  # Server expects 'quantity', stores as allocatedQuantity/currentQuantity
        "price": price_int,
        "description": description or f"Fresh {product_name} directly from farm",
        "category": category
    }
    
    # Add image if available
    if image_url:
        payload["image"] = image_url
    
    try:
        response = requests.post(
            PRODUCT_SERVICE_URL,
            json=payload,
            headers=_get_headers(CURRENT_SESSION_ID),
            timeout=REQUEST_TIMEOUT
        )
        
        logger.debug(f"Response status: {response.status_code}")
        
        if response.status_code == 401:
            return "Error: Authentication failed. Please login again."
        
        if response.status_code == 403:
            return "Error: You don't have permission to create products. Only farmers can add products."
        
        response.raise_for_status()
        data = response.json()
        
        if data.get("success"):
            image_note = " with your uploaded image" if image_url else ""
            return f"✅ Successfully created {product_name}{image_note}! Quantity: {qty_int} units, Price: ₹{price_int}/unit"
        else:
            return f"Failed to create product: {data.get('message', 'Unknown error')}"
            
    except requests.exceptions.Timeout:
        logger.error("Request timeout in create_product")
        return "Error: Server took too long to respond. Please try again."
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return f"Error creating product: {str(e)}"



def update_product_quantity(product_name: str, quantity_to_add: int) -> str:
    """
    Update the quantity of an existing product by adding more stock.
    
    Args:
        product_name: Name of the product to update (e.g., "Tomato")
        quantity_to_add: Additional quantity to add (must be positive, max 100,000)
    
    Returns:
        Success or error message.
    """
    session = get_session(CURRENT_SESSION_ID)
    logger.debug(f"update_product_quantity called: {product_name}, add={quantity_to_add}")
    
    if not session.auth_token:
        return "Error: No authentication token. Please login first."
    
    # Input validation
    valid, error, qty_int = _validate_positive_int(quantity_to_add, "Quantity to add", 100000)
    if not valid:
        return error
    
    try:
        # Find product by name first
        response = requests.get(
            f"{PRODUCT_SERVICE_URL}/my-products",
            headers=_get_headers(CURRENT_SESSION_ID),
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code == 401:
            return "Error: Authentication failed. Please login again."
        
        response.raise_for_status()
        products = response.json().get("products", [])
        
        # Find matching product (case-insensitive)
        matching = None
        for p in products:
            if p.get("productName", "").lower() == product_name.lower():
                matching = p
                break
        
        if not matching:
            return f"Could not find product '{product_name}' in your listings."
        
        product_id = matching.get("_id")
        current_qty = matching.get("currentQuantity", matching.get("quantity", 0))
        new_qty = current_qty + qty_int
        
        # Update
        update_response = requests.put(
            f"{PRODUCT_SERVICE_URL}/{product_id}",
            json={"quantity": new_qty},
            headers=_get_headers(CURRENT_SESSION_ID),
            timeout=REQUEST_TIMEOUT
        )
        
        if update_response.status_code == 401:
            return "Error: Authentication failed. Please login again."
        
        if update_response.status_code == 403:
            return "Error: You can only update your own products."
        
        update_response.raise_for_status()
        
        return f"✅ Updated {product_name}! Added {qty_int} units. New total: {new_qty} units."
        
    except requests.exceptions.Timeout:
        return "Error: Server took too long to respond. Please try again."
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return f"Error updating product: {str(e)}"


def search_products(query: str) -> str:
    """
    Search for products in the marketplace.
    
    Args:
        query: Search term (e.g., "Tomatoes", "Organic Rice")
    
    Returns:
        List of matching products.
    """
    if not query or not query.strip():
        return "Error: Search query cannot be empty."
    
    try:
        response = requests.get(
            PRODUCT_SERVICE_URL,
            params={"search": query.strip()},
            headers=_get_headers(CURRENT_SESSION_ID),  # Use auth if available
            timeout=REQUEST_TIMEOUT
        )
        
        response.raise_for_status()
        data = response.json()
        products = data.get("products", [])
        
        if not products:
            return f"No products found matching '{query}'."
        
        result = f"Found {len(products)} products matching '{query}':\n"
        for p in products[:5]:
            qty = p.get('currentQuantity', p.get('quantity', 0))
            result += f"• {p.get('productName')} from {p.get('ownerName', 'Unknown')}: "
            result += f"{qty} units at ₹{p.get('price')}/unit\n"
        
        return result
        
    except requests.exceptions.Timeout:
        return "Error: Server took too long to respond. Please try again."
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return f"Error searching products: {str(e)}"


def categorize_product(product_name: str) -> str:
    """
    Determine the appropriate category for a product based on its name.
    
    Args:
        product_name: Name of the product
    
    Returns:
        The category name.
    """
    categories = {
        "Vegetables": [
            "tomato", "onion", "potato", "carrot", "brinjal", "cabbage", "cauliflower",
            "beans", "peas", "spinach", "ladyfinger", "okra", "drumstick", "bitter gourd",
            "bottle gourd", "cucumber", "radish", "beetroot", "green chilli", "capsicum",
            "தக்காளி", "வெங்காயம்", "உருளைக்கிழங்கு", "கேரட்", "கத்திரிக்காய்"
        ],
        "Fruits": [
            "mango", "banana", "apple", "orange", "grapes", "papaya", "guava", "pomegranate",
            "watermelon", "pineapple", "coconut", "lemon", "lime", "jackfruit",
            "மாம்பழம்", "வாழைப்பழம்", "ஆப்பிள்", "ஆரஞ்சு", "திராட்சை"
        ],
        "Grains": [
            "rice", "wheat", "maize", "corn", "millet", "barley", "oats", "ragi",
            "jowar", "bajra", "quinoa",
            "அரிசி", "கோதுமை", "சோளம்", "கேழ்வரகு"
        ],
        "Pulses": [
            "dal", "lentil", "chickpea", "chana", "moong", "urad", "toor", "masoor",
            "rajma", "kidney bean", "black gram", "green gram",
            "பருப்பு", "கடலை"
        ],
        "Dairy": [
            "milk", "curd", "yogurt", "butter", "ghee", "cheese", "paneer", "cream"
        ],
        "Spices": [
            "turmeric", "chilli", "pepper", "cardamom", "cinnamon", "clove", "cumin",
            "coriander", "mustard", "fenugreek", "ginger", "garlic",
            "மஞ்சள்", "மிளகு", "இஞ்சி", "பூண்டு"
        ],
        "Oils": [
            "groundnut oil", "coconut oil", "sesame oil", "mustard oil", "sunflower oil",
            "olive oil", "palm oil",
            "நல்லெண்ணெய்", "தேங்காய் எண்ணெய்"
        ]
    }
    
    product_lower = product_name.lower()
    
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in product_lower or product_lower in keyword:
                return category
    
    return "Others"


def update_product_image(product_name: str) -> str:
    """
    Update the image for an existing product using the previously uploaded image.
    
    Args:
        product_name: Name of the product to update (e.g., "Onion", "Rice")
    
    Returns:
        Success or error message.
    """
    session = get_session(CURRENT_SESSION_ID)
    logger.debug(f"update_product_image called: {product_name}")
    
    if not session.auth_token:
        return "Error: No authentication token. Please login first."
    
    # Get pending image
    pending_img = get_and_clear_pending_image(CURRENT_SESSION_ID)
    if not pending_img:
        return "No image uploaded. Please upload an image first, then ask me to update the product."
    
    try:
        # Find product by name
        response = requests.get(
            f"{PRODUCT_SERVICE_URL}/my-products",
            headers=_get_headers(CURRENT_SESSION_ID),
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code == 401:
            return "Error: Authentication failed. Please login again."
        
        response.raise_for_status()
        products = response.json().get("products", [])
        
        # Find matching product (case-insensitive)
        matching = None
        for p in products:
            if p.get("productName", "").lower() == product_name.lower():
                matching = p
                break
        
        if not matching:
            return f"Could not find product '{product_name}' in your listings. Please check the name."
        
        product_id = matching.get("_id")
        
        # Update with image
        image_url = f"data:image/jpeg;base64,{pending_img}"
        
        update_response = requests.put(
            f"{PRODUCT_SERVICE_URL}/{product_id}",
            json={"image": image_url},
            headers=_get_headers(CURRENT_SESSION_ID),
            timeout=REQUEST_TIMEOUT
        )
        
        if update_response.status_code == 401:
            return "Error: Authentication failed. Please login again."
        
        if update_response.status_code == 403:
            return "Error: You can only update your own products."
        
        update_response.raise_for_status()
        
        logger.info(f"Image updated successfully for {product_name}")
        return f"✅ Successfully updated image for {product_name}!"
        
    except requests.exceptions.Timeout:
        return "Error: Server took too long to respond. Please try again."
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return f"Error updating product image: {str(e)}"
