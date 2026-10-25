# MediFind 💊
### Full-Stack Medicine Discovery & Pharmacy Inventory Management Platform

MediFind is a full-stack web application designed to help users search for medicines, explore nearby pharmacies, compare listed prices, and check medicine stock information. It also provides pharmacy inventory management, user authentication, CSV-based inventory import, and administrator verification workflows.

The project combines a responsive web interface with REST APIs, database models, location-based search, and role-based access control.

> **Note:** The current project uses demonstration inventory data. Real-time stock information from external pharmacy providers is not integrated. Users should contact pharmacies to confirm availability and pricing.

## 🚀 Key Features

### 🔍 1. Medicine Search & Discovery
- Search medicines by name, brand, generic name, and strength.
- Medicine suggestions while typing.
- Typo-tolerant search and relevance-based matching.
- Filter results by stock availability and distance.
- Sort listings by relevance, price, or distance.
- Display stock freshness and last verification information.

### 📍 2. Location-Based Pharmacy Finder
- Search for pharmacies near a selected location.
- Use browser geolocation when the user grants permission.
- Display pharmacies on an interactive map.
- Calculate approximate straight-line distances.
- Open Google Maps directions to a selected pharmacy.
- Convert place names into geographic coordinates using geocoding.

### 💊 3. Pharmacy Inventory Management
- Pharmacy-owner authentication.
- View the signed-in pharmacy's inventory.
- Update medicine quantities and listed prices.
- Refresh inventory verification timestamps after updates.
- Import inventory using CSV files.
- Validate CSV rows before importing valid records.
- Report incorrect medicine stock information.

### 🛡️ 4. Admin Dashboard & Management APIs
- View pharmacy records and verification status.
- Approve, reject, or suspend pharmacies.
- Review administrative audit logs.
- View statistics for pharmacies, users, inventory listings, and reports.

### 🔐 5. Authentication & Security
- Password hashing using bcryptjs.
- JWT-based authentication.
- HTTP-only session cookies.
- Role-based access control for protected endpoints.
- Server-side input validation for important operations.
- Basic request rate limiting and security response headers.

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, JavaScript, HTML5, CSS3 |
| Frontend tooling | Vite, npm |
| Backend | Node.js, Express.js |
| API architecture | RESTful APIs, JSON |
| Database | MongoDB |
| Database integration | Mongoose |
| Authentication | JWT, bcryptjs, HTTP-only cookies |
| Maps | Leaflet |
| Map data | OpenStreetMap |
| Geocoding | OpenStreetMap Nominatim API |
| Directions | Google Maps Directions URL |
| Version control | Git, GitHub |
| Testing and API development | Postman-compatible REST endpoints |

## 🌐 APIs & External Services

### 1. OpenStreetMap Nominatim API
Used to convert place names and addresses into latitude and longitude coordinates for location-based discovery.

### 2. OpenStreetMap Tile Service
Provides map tiles displayed through the Leaflet map interface.

### 3. Leaflet JavaScript Library
Used to display interactive maps and pharmacy markers.

### 4. Browser Geolocation API
Requests the user's current coordinates when location access is enabled.

### 5. Google Maps Directions Integration
Opens directions to a pharmacy using its coordinates. This is a directions URL integration, not a Google Maps API-key integration.

### 6. MediFind REST API
Custom Express endpoints support authentication, medicine search, pharmacy discovery, inventory management, CSV import, reports, and administration.

**AI/LLM API and live third-party medicine-stock API integrations are not currently implemented.** Medicine search matching is handled by project logic.

## 🏗️ System Architecture

~~~text
                    USER / PHARMACY / ADMIN
                              |
                              v
                   React.js Web Interface
                              |
                              v
                     REST API Requests
                              |
                              v
                     Node.js + Express
                              |
                 +------------+------------+
                 |                         |
                 v                         v
          Authentication              API Services
          JWT + bcryptjs         Search / Inventory /
                                 Reports / Admin
                 |                         |
                 +------------+------------+
                              |
                              v
                         MongoDB
                         Mongoose
                              |
                              v
                 Persistent Application Data
~~~

## 📁 Project Structure

~~~text
MediFind/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── public/
├── models.js
├── seed.js
├── server.js
├── server_mongo.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
~~~

### Server Modes

- **server.js:** In-memory demonstration server. Data changes are not persisted after restarting the server.
- **server_mongo.js:** MongoDB-backed API server using Mongoose models.
- **client/:** React frontend powered by Vite, configured to proxy API requests to the MongoDB backend.

The MongoDB API and demonstration frontend are still being integrated and should be tested end-to-end before production deployment.

## 🗃️ Database Design

The Mongoose data models include:

- **User:** User identity, email, password hash, role, and associated pharmacy.
- **Medicine:** Medicine name, generic name, brand, strength, dosage form, and prescription category.
- **Pharmacy:** Pharmacy details, location, contact information, and verification status.
- **Inventory:** Pharmacy and medicine references, quantity, price, verification timestamp, and data source.
- **Report:** Reports about incorrect stock information.
- **AuditLog:** Records of administrative actions and timestamps.

## 🔌 REST API Documentation

Base URL for the MongoDB backend:

~~~text
http://localhost:5000
~~~

### Authentication APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Authenticate and create a session |
| POST | `/api/auth/logout` | Clear the session cookie |
| GET | `/api/auth/me` | Retrieve the authenticated user's details |

### Medicine & Pharmacy APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/medicines/suggestions` | Retrieve medicine suggestions |
| GET | `/api/inventory/search` | Search inventory listings |
| GET | `/api/pharmacies/nearby` | Find nearby pharmacies |
| GET | `/api/inventory/mine` | Retrieve the pharmacy owner's inventory |
| PATCH | `/api/inventory/:id` | Update inventory quantity and price |
| POST | `/api/reports/stock` | Report incorrect stock information |
| POST | `/api/inventory/import` | Validate and import CSV inventory |

### Administration APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/pharmacies` | Retrieve pharmacy records |
| PATCH | `/api/admin/pharmacies/:id/verification` | Update pharmacy verification status |
| GET | `/api/admin/audit-logs` | Retrieve recent audit records |
| GET | `/api/admin/stats` | Retrieve application statistics |

Protected endpoints use authentication and role-based access checks. Actual authorization requirements depend on the endpoint.

## ⚙️ Installation & Setup

### Prerequisites
- Node.js and npm
- MongoDB installed locally or a valid MongoDB connection URI
- Git

### Step 1: Clone the repository

~~~bash
git clone https://github.com/732523AD016/MediFind.git
cd MediFind
npm install
~~~

### Step 2: Configure environment variables

Create a root-level `.env` file:

~~~env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/medifind
JWT_SECRET=your-long-random-secret
STALE_HOURS=24
~~~

Use your own secure JWT secret. Never upload real credentials or `.env` files to GitHub.

### Step 3: Seed demonstration data

Start MongoDB, then run:

~~~bash
node seed.js
~~~

### Step 4: Start the MongoDB backend

~~~bash
node server_mongo.js
~~~

### Step 5: Start the frontend

Open another terminal:

~~~bash
cd client
npm install
npm run dev
~~~

Open the local URL displayed by Vite, usually `http://localhost:5173`.

The frontend's Vite configuration proxies `/api` requests to `http://localhost:5000`.

## 🧠 Technical Highlights

- Full-stack application architecture using React, Node.js, Express, and MongoDB.
- REST API design for multiple user roles and workflows.
- JWT authentication with password hashing and HTTP-only cookies.
- Location-based search using geographic coordinates.
- Search matching designed to handle common typing errors.
- Inventory validation and CSV import workflows.
- Stock freshness indicators to distinguish older or unverified data.
- Separation of application models, routes, and frontend components.
- Git-based version control and GitHub project hosting.

## 🔒 Security & Responsible Use

- Store credentials in environment variables.
- Never commit database passwords, JWT secrets, or private API credentials.
- Replace demonstration credentials before deployment.
- Configure HTTPS, secure cookie settings, production CORS rules, and appropriate rate limiting before public release.
- Demonstration inventory is not guaranteed to reflect real-world availability.
- MediFind is a medicine discovery tool, not a medical diagnosis or treatment recommendation system.

## 🛣️ Future Enhancements

- Complete end-to-end integration of all frontend workflows with the MongoDB API.
- Add automated unit tests and API integration tests.
- Deploy the frontend and backend with secure production configuration.
- Integrate verified pharmacy inventory feeds.
- Add monitoring, API documentation, and continuous integration.
- Improve accessibility, performance, and mobile responsiveness.

## 👩‍💻 Author

**Hema Periyasamy**

Full-Stack Development Project | Medicine Discovery | Pharmacy Inventory Management

**GitHub Repository:**  
https://github.com/732523AD016/MediFind

---

*Built with React.js, Node.js, Express.js, MongoDB, and location-based services.*
