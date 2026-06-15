Backend Daycare Management System
A powerful, scalable, and API-driven backend system designed to support the operations of a modern daycare service platform. It enables user and provider management, service booking, secure payments, real-time notifications, and AI-powered service recommendations.

📚 Table of Contents
🚀 Project Overview

🛠️ Tech Stack

📁 Project Structure

✨ Key Features

📦 Installation & Setup

⚙️ Environment Variables

🧪 Running the App

📡 API Endpoints

🧩 Data Models

🧠 Recommendation Engine

💬 Socket.IO Integration

🤝 Contributing

📝 License

🚀 Project Overview
The Daycare Management Backend System offers a complete solution for managing daycare services. It handles everything from user registration and service discovery to real-time updates and intelligent recommendations.

🛠️ Tech Stack
Layer	Technology
Runtime	Node.js
Framework	Express.js
Database	MongoDB + Mongoose
Authentication	JWT (JSON Web Tokens)
Payment Gateway	Stripe
Realtime Comm.	Socket.IO
Recommendations	Python (Flask + Sentence Transformers)
Documentation	Swagger

📁 Project Structure
plaintext
Copier
Modifier
├── controllers/        # Route logic
├── middleware/         # Custom middleware
├── models/             # Mongoose models
├── recommender/        # Python recommendation engine
├── routes/             # Express routes
├── seeders/            # DB seed scripts
├── services/           # Shared services (e.g. Socket.IO)
├── uploads/            # Uploaded files
├── views/              # Email templates (if any)
├── .env                # Environment variables
├── index.js            # Entry point
├── package.json        # Node dependencies
└── swagger.js          # Swagger config
✨ Key Features
👥 User Management
User & provider registration

JWT-based authentication

Role-based access control

Profile management

🛎️ Service Management
Categories & subcategories

Service creation & updates

Smart discovery and search

📅 Reservation System
Booking & reservation tracking

Notifications on status changes

💳 Payment Integration
Stripe payments

Invoice generation

Subscription handling for providers

🌟 Ratings & Reviews
User feedback on services

Ratings aggregation

🔔 Real-Time Notifications
Reservation & payment updates

Message and alert notifications

🧠 Recommendation Engine
AI-based personalized recommendations

Powered by Python & NLP (Sentence Transformers)

📦 Installation & Setup
🔧 Prerequisites
Node.js (v14+)

MongoDB

Python 3.7+

Stripe account

📥 Install Backend Dependencies
bash
Copier
Modifier
npm install
📥 Install Python Dependencies (for recommender)
bash
Copier
Modifier
pip install -r recommender/requirements.txt
⚙️ Configure .env
Create a .env file in the root and set the following variables (see next section).

⚙️ Environment Variables
env
Copier
Modifier
PORT=8000
MONGODB_URI=mongodb://<your-db-uri>
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_key

FRONTEND_URL=https://your-frontend.app
BACKEND_URL=https://your-backend.api
RECOMMENDER_URL=http://localhost:5000  # Flask recommendation service

EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
🧪 Running the App
🧪 Development Mode
Runs both the Node.js server and the Flask recommender service:

bash
Copier
Modifier
npm run dev
🏁 Production Mode
bash
Copier
Modifier
npm start
📡 API Endpoints
🔐 Authentication
bash
Copier
Modifier
/api/auth
👤 Users
bash
Copier
Modifier
/api/users
🧑‍💼 Providers
bash
Copier
Modifier
/api/prestataire
🛎️ Services
bash
Copier
Modifier
/api/services
📅 Reservations
bash
Copier
Modifier
/api/reservations
🧾 Invoices & Payments
bash
Copier
Modifier
/api/factures
/api/stripeWebhook
⭐ Ratings & Reviews
bash
Copier
Modifier
/api/ratings
🗂️ Categories
bash
Copier
Modifier
/api/category
🔔 Notifications
bash
Copier
Modifier
/api/notifications
🤖 Recommendations
bash
Copier
Modifier
/api/recommendation
📄 API Docs (Swagger)
bash
Copier
Modifier
/api-docs
🧩 Data Models
User – End-users who book services

Prestataire – Service providers

Service – Childcare or education-related offerings

Reservation – Bookings made by users

Facture – Invoices tied to bookings

Category & SubCategory – Organizational hierarchy

Rating – User feedback

Notification – System messages

Subscription – Provider plans

🧠 Recommendation Engine
Separate Python service using Flask

Utilizes Sentence Transformers for smart suggestions

Communicates with Node.js backend via REST API

💬 Socket.IO Integration
Used for real-time features:

Live updates on reservation status

Instant payment confirmations

New message alerts and more

🤝 Contributing
We welcome contributions! To contribute:

Fork the repository

Create a new feature branch:

bash
Copier
Modifier
git checkout -b feature/your-feature
Commit your changes

Push your branch:

bash
Copier
Modifier
git push origin feature/your-feature
Open a Pull Request 🎉

📝 License
This project is licensed under the MIT License.
Feel free to use, distribute, and modify it.

