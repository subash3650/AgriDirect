# 🌾 AgriDirect - Direct Farm-to-Table Marketplace

![AgriDirect Banner](https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=3200&auto=format&fit=crop)

> **Empowering farmers and connecting them directly with consumers.**  
> AgriDirect bridges the gap between agriculture and technology, ensuring fair prices for farmers and fresh produce for buyers.

---

## 🚀 Key Features

### 👨‍🌾 For Farmers
*   **dashboard & Analytics**: Real-time overview of sales, orders, and earnings.
*   **Product Management**: Easily add, update, and manage fresh produce listings with images and stock tracking.
*   **🚚 Smart Route Optimization**: 
    *   **AI-Powered Routing**: Automatically calculates the most efficient delivery sequence using the **Nearest Neighbor Algorithm**.
    *   **Visual Delivery Map**: View optimized routes with stop-by-stop navigation links (`#1`, `#2`, etc.).
    *   **Distance & Time Est.**: Get precise travel estimates using Haversine distance calculations.
*   **Order Management**: Accept, ship, and cancel orders with seamless status updates.
*   **Real-Time Chat**: Communicate directly with buyers to answer queries or coordinate deliveries.

### 🛒 For Buyers
*   **Fresh Marketplace**: Browse a wide variety of fresh, locally sourced fruits and vegetables.
*   **Transparent Sourcing**: View farmer profiles, location (Geo-tagged), and ratings before buying.
*   **Secure Checkout**: Simple OTP-based ordering system.
*   **Order Tracking**: Track order status from `Pending` → `Processing` → `Shipped` → `Delivered`.
*   **Reviews & Ratings**: Rate products and share feedback to help the community.
*   **Direct Chat**: Negotiate or ask questions directly to the farmer.

---

## 🛠️ Technology Stack

**Frontend**
*   ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) **React.js (Vite)**
*   ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) **Modern CSS3 (Variables, Flexbox, Grid)**
*   **Socket.io Client** (Real-time features)

**Backend**
*   ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white) **Node.js & Express**
*   ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white) **MongoDB & Mongoose**
*   **JWT** (Secure Authentication)
*   **Nodemailer** (OTP Services)

**Advanced Features**
*   📍 **Geospatial Queries**: Location-based search and distance calculations.
*   🧩 **Algorithms**: Custom Route Optimization service.

---

## ⚙️ Getting Started

### Prerequisites
*   Node.js (v14+)
*   MongoDB Atlas URI

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/subash3650/AgriDirect.git
    cd AgriDirect
    ```

2.  **Setup Backend**
    ```bash
    cd server
    npm install
    # Create .env file with:
    # PORT=5000, MONGO_URI=..., JWT_SECRET=..., EMAIL_USER=...
    node server.js
    ```

3.  **Setup Frontend**
    ```bash
    cd client
    npm install
    npm run dev
    ```

---

## 📸 Usage Highlights

| Feature | Description |
| :--- | :--- |
| **Route Optimization** | Farmers can select multiple pending orders and get a sorted list of stops to save fuel and time. |
| **Secure OTP Flow** | Stock is only deducted after strict OTP verification ensuring zero inventory errors. |
| **Profile Maps** | Integrated map links help navigate directly to the buyer's doorstep. |

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

This project is licensed under the MIT License.

---
*Built with ❤️ for the Agriculture Community*
