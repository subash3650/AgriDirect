"""
Image utilities for AI service.
Handles image compression and format conversion.
"""

import io
import base64
import logging
from PIL import Image
from typing import Tuple

logger = logging.getLogger(__name__)

# Target max size in bytes (2MB)
MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024  # 2MB
MIN_QUALITY = 10
MAX_DIMENSION = 1920  # Max width/height


def compress_image(base64_image: str, target_size_bytes: int = MAX_IMAGE_SIZE_BYTES) -> Tuple[str, bool]:
    """
    Compress an image to be under the target size.
    
    Args:
        base64_image: Base64 encoded image string
        target_size_bytes: Maximum size in bytes (default 2MB)
    
    Returns:
        Tuple of (compressed_base64_image, success_bool)
    """
    try:
        # Decode base64 to bytes
        image_data = base64.b64decode(base64_image)
        original_size = len(image_data)
        
        logger.debug(f"Original image size: {original_size / 1024:.1f}KB")
        
        # If already under target, return as-is
        if original_size <= target_size_bytes:
            logger.debug("Image already under target size, no compression needed")
            return base64_image, True
        
        # Open image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary (for JPEG)
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Resize if too large
        original_dimensions = image.size
        if max(image.size) > MAX_DIMENSION:
            ratio = MAX_DIMENSION / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            logger.debug(f"Resized from {original_dimensions} to {new_size}")
        
        # Binary search for optimal quality
        quality = 85
        low, high = MIN_QUALITY, 95
        best_result = None
        
        for _ in range(8):  # Max 8 iterations
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=quality, optimize=True)
            size = buffer.tell()
            
            logger.debug(f"Quality {quality}: {size / 1024:.1f}KB")
            
            if size <= target_size_bytes:
                best_result = buffer.getvalue()
                if size > target_size_bytes * 0.8:  # Good enough (80-100% of target)
                    break
                low = quality
            else:
                high = quality
            
            quality = (low + high) // 2
        
        if best_result:
            compressed_base64 = base64.b64encode(best_result).decode('utf-8')
            final_size = len(best_result)
            logger.info(f"Compressed image: {original_size / 1024:.1f}KB -> {final_size / 1024:.1f}KB ({(1 - final_size/original_size) * 100:.1f}% reduction)")
            return compressed_base64, True
        
        # Last resort: use lowest quality
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=MIN_QUALITY, optimize=True)
        compressed_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        logger.warning(f"Used minimum quality, result may be low quality")
        return compressed_base64, True
        
    except Exception as e:
        logger.error(f"Image compression failed: {str(e)}")
        return base64_image, False


def validate_image(base64_image: str) -> Tuple[bool, str]:
    """
    Validate that a base64 string is a valid image.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        image_data = base64.b64decode(base64_image)
        image = Image.open(io.BytesIO(image_data))
        image.verify()
        return True, ""
    except Exception as e:
        return False, f"Invalid image: {str(e)}"
