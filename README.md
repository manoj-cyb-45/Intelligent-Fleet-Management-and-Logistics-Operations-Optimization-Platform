# FleetFlow

## Intelligent Fleet Management and Logistics Operations Optimization Platform

FleetFlow is a centralized fleet and logistics management platform designed to manage vehicle operations, driver assignments, shipment tracking, trip execution, route optimization, maintenance, fuel monitoring, analytics, reporting, and operational notifications through a unified web application.

The platform provides role-based access control, real-time GPS tracking, WebSocket-based updates, route optimization, maintenance monitoring, analytics dashboards, report generation, and in-app/email notifications.

---

# Features

## Fleet Management

- Vehicle registration and management
- Vehicle status monitoring
- Vehicle assignment
- Fleet utilization monitoring
- Vehicle operational information

## Driver Management

- Driver registration and management
- Driver assignment
- Driver availability management
- Driver performance monitoring
- Driver-related operational notifications

## Shipment Management

- Shipment creation and management
- Shipment status tracking
- Shipment assignment
- Delivery progress monitoring
- Shipment tracking information
- Shipment status notifications

## Trip Management

- Trip scheduling
- Trip execution
- Trip status management
- Trip start notifications
- Vehicle and driver association
- Trip monitoring

## Real-Time GPS Tracking

- Real-time vehicle location tracking
- GPS tracking simulation
- WebSocket-based location updates
- Live tracking interface
- Vehicle movement visualization
- Delivery progress monitoring

## Route Optimization

- Route optimization
- Route recalculation
- Dynamic route changes
- Traffic-aware route optimization
- Optimization based on configurable criteria
- Route change notifications

## Maintenance Management

- Maintenance scheduling
- Maintenance records
- Maintenance monitoring
- Maintenance alerts
- Maintenance reports
- Scheduled maintenance processing

## Fuel Management

- Fuel monitoring
- Fuel consumption tracking
- Fuel analytics
- Fleet fuel performance analysis

## Analytics

- Fleet performance analytics
- Fleet utilization analytics
- Driver performance analytics
- Delivery performance analytics
- Fuel consumption analytics
- Operational dashboards
- KPI monitoring

## Reports

- PDF report generation
- Excel report generation
- Operational reports
- Maintenance reports
- Fleet performance reports

## Notifications

FleetFlow currently supports two notification channels:

- In-app notifications
- Gmail SMTP email notifications

Notifications are implemented for important operational events such as:

- Vehicle assignment
- Trip start
- Shipment status changes
- Route changes and recalculations
- Maintenance-related events
- Other operational alerts

SMS/Twilio and Firebase/FCM are not part of the current implementation.

---

# Technology Stack

## Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- Uvicorn
- Celery

## Frontend

- React
- Vite
- JavaScript
- Axios
- React Router

## Database

- PostgreSQL

## Authentication

- JWT authentication
- Role-based access control (RBAC)

## Real-Time Communication

- WebSockets
- GPS tracking/simulation

## Reporting

- PDF export
- Excel export

## Notifications

- In-app notification system
- Gmail SMTP

## Version Control

- Git
- GitHub

---

# System Architecture

FleetFlow follows a frontend-backend architecture.

```text
                        FleetFlow
                           |
             +-------------+-------------+
             |                           |
        React Frontend             FastAPI Backend
             |                           |
       Axios / WebSocket          REST API / WebSocket
             |                           |
             +-------------+-------------+
                           |
                      PostgreSQL
                           |
          +----------------+----------------+
          |                |                |
       Celery          Notifications    Route Engine
       Worker          In-App/Email      Optimization
          |
     Scheduled Jobs
```

The React frontend communicates with the FastAPI backend through REST APIs and WebSockets.

The FastAPI backend manages business logic, authentication, database operations, notifications, route optimization, and real-time operations.

PostgreSQL stores application data.

Celery handles background and scheduled processing.

---

# Main Modules

- User Management
- Authentication & Authorization
- Fleet Management
- Driver Management
- Driver Assignment
- Shipment Management
- Shipment Tracking
- Trip Scheduling
- Trip Management
- Real-Time GPS Tracking
- Route Optimization
- Route Recalculation
- Maintenance Management
- Fuel Management
- Alerts & Notifications
- Operational Analytics
- Fleet Performance Analytics
- Reports & Export
- Celery Background Processing

---

# Project Structure

```text
Intelligent-Fleet-Management-and-Logistics-Operations-Optimization-Platform/
│
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   ├── drivers/
│   │   ├── vehicles/
│   │   ├── shipments/
│   │   ├── trips/
│   │   ├── tracking/
│   │   ├── route_optimizer/
│   │   ├── maintenance/
│   │   ├── fuel/
│   │   ├── analytics/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── models/
│   │   ├── database/
│   │   ├── celery_app.py
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
│
├── README.md
└── .gitignore
```

> The exact directory structure may evolve as the project develops. The structure above represents the major application components.

---

# Milestones

## Milestone 1 — Project Initialization, Design & Core Setup

**Status: COMPLETED**

### Tasks Completed

- Defined project objectives and logistics workflows
- Designed system architecture and database structure
- Planned UI and operational workflows
- Set up React frontend
- Set up FastAPI backend
- Implemented JWT authentication
- Implemented role-based access control
- Built the fleet monitoring dashboard
- Developed vehicle registration and management workflows
- Integrated PostgreSQL
- Configured Alembic database migrations
- Implemented core fleet management
- Implemented driver management
- Implemented shipment management
- Implemented maintenance management
- Implemented fuel management
- Implemented alert functionality

---

## Milestone 2 — Shipment Tracking & Route Optimization

**Status: COMPLETED**

### Tasks Completed

- Developed shipment tracking workflows
- Implemented shipment status management
- Implemented trip scheduling
- Implemented trip execution
- Integrated GPS tracking/simulation
- Implemented real-time location updates
- Implemented WebSocket-based tracking
- Built delivery progress workflows
- Implemented ETA workflows
- Added live tracking UI
- Added route visualization
- Implemented route recalculation
- Implemented route optimization
- Added trip monitoring workflows

---

## Milestone 3 — Maintenance Management & Analytics

**Status: COMPLETED**

### Tasks Completed

- Developed maintenance scheduling
- Implemented maintenance alerts
- Added maintenance reports
- Implemented driver assignment workflows
- Added operational analytics
- Built fleet performance dashboards
- Added fleet utilization analytics
- Added fuel monitoring
- Added fuel consumption analytics
- Added driver performance analytics
- Added delivery performance analytics
- Implemented PDF report exports
- Implemented Excel report exports
- Configured Celery worker
- Configured scheduled maintenance monitoring
- Verified maintenance workflows
- Verified assignment workflows
- Verified analytics workflows
- Verified database workflows
- Verified Celery workflows

---

## Milestone 4 — UI Improvements & Notification Integrations

**Status: COMPLETED**

### Tasks Completed

- Improved page layout and visual consistency
- Standardized page containers
- Standardized headers, titles, and subtitles
- Improved KPI cards
- Improved dashboard presentation
- Improved buttons
- Improved forms
- Improved tables
- Improved modals
- Improved responsive layouts
- Improved mobile navigation
- Refined Analytics page UI
- Refined Tracking page alignment and layout
- Improved profile controls
- Improved appearance controls
- Configured Gmail SMTP email notifications
- Implemented in-app notifications
- Implemented email notifications for vehicle assignment
- Implemented email notifications for trip start events
- Implemented email notifications for shipment status changes
- Implemented email notifications for route changes and recalculations
- Improved email notification formatting
- Verified in-app notification workflows
- Verified email notification workflows

---

# Notification Configuration

FleetFlow currently supports two notification channels.

| Channel | Provider | Purpose |
|---|---|---|
| In-App | FleetFlow | Application notification records |
| Email | Gmail SMTP | Operational email notifications |

## Notification Events

### Vehicle Assignment

When a driver is assigned to a vehicle, FleetFlow creates an in-app notification and sends an email notification to the driver.

### Trip Started

When a trip enters the `IN_PROGRESS` state, FleetFlow creates an in-app notification and sends a trip-start email.

### Shipment Status

When a shipment status changes, FleetFlow can create an operational notification and send an email notification to the assigned driver.

### Route Recalculation

When a route is recalculated or changed, FleetFlow creates an operational notification and sends an email notification to the assigned driver.

---

# Email Notifications

FleetFlow uses Gmail SMTP for email delivery.

Email notifications contain:

- Notification title
- Notification message
- FleetFlow branding
- HTML formatting
- Plain-text fallback

The email implementation provides a simple professional notification layout instead of sending unformatted plain-text messages.

---

# Environment Configuration

## Backend Environment

Create a `.env` file inside the `backend` directory.

```env
DATABASE_URL=<postgresql-database-url>

JWT_SECRET_KEY=<jwt-secret>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<your-gmail-address>
SMTP_PASSWORD=<your-google-app-password>
```

### Important

Use a Gmail App Password for SMTP authentication when required.

Never commit:

- `.env`
- Database passwords
- JWT secrets
- Gmail passwords
- API keys
- Private credentials

---

## Frontend Environment

The current frontend does not require Firebase or Twilio notification configuration.

If additional frontend environment variables are required by the application, configure them according to `frontend/.env.example`.

---

# Prerequisites

Before running FleetFlow, install:

- Python 3.x
- Node.js
- npm
- PostgreSQL
- Git

For background processing:

- Celery
- A supported Celery message broker/configuration

---

# Backend Setup

Navigate to the backend directory:

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate the virtual environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
pip install -r requirements.txt
```

Configure the backend `.env` file.

Run database migrations:

```powershell
alembic upgrade head
```

Start the FastAPI development server:

```powershell
uvicorn app.main:app --reload
```

The backend will normally be available at:

```text
http://127.0.0.1:8000
```

---

# Frontend Setup

Navigate to the frontend directory:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

The Vite development server will display the local frontend URL in the terminal.

---

# Database Setup

FleetFlow uses PostgreSQL as its primary relational database.

Configure the database connection through:

```env
DATABASE_URL=<postgresql-database-url>
```

Run database migrations:

```powershell
cd backend
alembic upgrade head
```

Alembic manages database schema migrations.

---

# Celery Background Processing

FleetFlow uses Celery for background and scheduled processing.

## Start Celery Worker

```powershell
celery -A app.celery_app:celery_app worker --loglevel=INFO --pool=solo
```

## Start Celery Beat

```powershell
celery -A app.celery_app:celery_app beat --loglevel=INFO
```

Celery is used for scheduled and background operational tasks such as maintenance monitoring.

---

# API Documentation

FleetFlow uses FastAPI for its backend API.

When the backend is running, FastAPI provides interactive API documentation.

## Swagger UI

```text
http://127.0.0.1:8000/docs
```

## ReDoc

```text
http://127.0.0.1:8000/redoc
```

These interfaces can be used to inspect and test available API endpoints.

---

# Real-Time Tracking

FleetFlow supports real-time vehicle tracking using WebSockets.

The tracking workflow includes:

1. Vehicle location generation or GPS simulation
2. Backend location processing
3. WebSocket communication
4. Frontend live location updates
5. Map visualization
6. Delivery and trip progress monitoring

This allows fleet operators to monitor vehicle movement without repeatedly refreshing the application.

---

# Route Optimization

The route optimization module provides:

- Route calculation
- Route optimization
- Route recalculation
- Traffic-aware optimization
- Optimization criteria
- Dynamic route updates

When a route changes, the assigned driver can receive an in-app and email notification.

---

# Maintenance Processing

Maintenance management includes:

- Maintenance scheduling
- Maintenance records
- Maintenance monitoring
- Maintenance alerts
- Maintenance reporting

Celery background processing can be used for scheduled maintenance monitoring.

---

# Analytics

FleetFlow provides operational analytics covering:

- Fleet utilization
- Fleet performance
- Driver performance
- Delivery performance
- Fuel consumption
- Operational KPIs

The analytics dashboard provides a centralized view of fleet operations.

---

# Reports

FleetFlow supports report generation and export in:

- PDF
- Excel

Reports can be used for fleet performance, maintenance, delivery, and operational analysis.

---

# Security

FleetFlow implements:

- JWT-based authentication
- Role-based access control
- Protected backend endpoints
- Environment-based configuration
- Database authentication
- Secure SMTP credential configuration

Sensitive credentials must always remain outside source control.

---

# Testing & Verification

The following major workflows were verified during development:

- Backend startup
- Frontend production build
- Database connectivity
- Vehicle assignment
- Driver workflows
- Trip start workflow
- Shipment status updates
- Route optimization
- Route recalculation
- In-app notifications
- Gmail SMTP email notifications
- GPS tracking/simulation
- Real-time tracking
- Maintenance workflows
- Analytics workflows
- Report generation
- Celery processing

## Backend Compilation Check

Backend Python modules were validated using:

```powershell
python -m compileall app -q
```

## Frontend Production Build

The frontend production build was validated using:

```powershell
npm run build
```

## Git Validation

Git whitespace validation was performed using:

```powershell
git diff --check
```

---

# Current Notification Architecture

```text
                    FleetFlow Event
                          |
             +------------+------------+
             |                         |
        In-App Notification        Email Notification
             |                         |
       FleetFlow Database          Gmail SMTP
```

The project intentionally does not use SMS/Twilio or Firebase/FCM in the current implementation.

---

# Project Status

| Milestone | Status |
|---|---|
| Milestone 1 — Core Setup | COMPLETED |
| Milestone 2 — Tracking & Route Optimization | COMPLETED |
| Milestone 3 — Maintenance & Analytics | COMPLETED |
| Milestone 4 — UI & Notifications | COMPLETED |

FleetFlow currently provides an integrated fleet and logistics management platform covering fleet operations, driver management, shipment tracking, trip management, route optimization, maintenance, fuel monitoring, analytics, reporting, real-time tracking, and operational notifications.

---

# Future Enhancements

Potential future improvements include:

- Advanced route optimization algorithms
- Predictive maintenance
- Machine-learning-based ETA prediction
- Advanced fuel consumption prediction
- Geospatial analytics
- Automated operational alerts
- Advanced fleet forecasting
- Improved dashboard customization
- Additional reporting capabilities
- Containerized deployment
- Cloud deployment
- Infrastructure automation

---

# Version Control

The project is maintained using Git and GitHub.

Development work is organized through Git branches and milestone-based project development.

The project contains:

- FastAPI backend
- React frontend
- PostgreSQL database integration
- Celery background processing
- Real-time WebSocket tracking
- Route optimization
- Fleet and logistics management modules

---

# License

This project is developed as an academic and project implementation for fleet and logistics management.
