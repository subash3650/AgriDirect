# AgriDirect API Documentation

Base URL: `/api`

## Authentication (`/auth`)

| Method | Endpoint | Description | Protected | Roles |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/register` | Register a new user (farmer or buyer) | No | - |
| POST | `/login` | Login user and get JWT token | No | - |
| GET | `/me` | Get current user's profile | Yes | All |
| POST | `/logout` | Logout user (clears cookie) | Yes | All |

## Products (`/products`)

| Method | Endpoint | Description | Protected | Roles |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/` | Get all products (with filters) | No | - |
| GET | `/:id` | Get single product details | No | - |
| GET | `/my-products` | Get products posted by logged-in farmer | Yes | Farmer |
| POST | `/` | Create a new product | Yes | Farmer |
| PUT | `/:id` | Update product details | Yes | Farmer |
| DELETE | `/:id` | Delete a product | Yes | Farmer |

## Orders (`/orders`)

| Method | Endpoint | Description | Protected | Roles |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/` | Create a new order | Yes | Buyer |
| POST | `/:id/verify-otp` | Verify delivery OTP to complete order | Yes | Buyer |
| GET | `/my-orders` | Get orders for logged-in farmer | Yes | Farmer |
| GET | `/history` | Get order history for logged-in buyer | Yes | Buyer |
| GET | `/:id` | Get single order details | Yes | All |
| PATCH | `/:id/status` | Update order status (processing, shipped, etc.) | Yes | Farmer |
| PUT | `/:id/cancel` | Cancel an order | Yes | All |

## Route Optimization (`/optimize`)

**Farmer Only Modules**

| Method | Endpoint | Description | Protected | Roles |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/delivery-sequence` | Calculate optimal route for selected orders | Yes | Farmer |
| POST | `/save-sequence` | Save component calculated sequence to database | Yes | Farmer |
| POST | `/clear-sequence` | Remove sequence numbers from orders | Yes | Farmer |
| GET | `/active-sequence` | Get orders currently part of an active route | Yes | Farmer |

### Example Payloads

**Optimize Route Request (`POST /optimize/delivery-sequence`)**
```json
{
  "orderIds": ["65b...", "65c..."],
  "farmerLocation": [77.1234, 12.5678] // [lng, lat]
}
```
