# FleetFlow

## Fleet Management & Logistics Tracking Platform

FleetFlow is a centralized fleet and logistics management platform for
vehicle management, driver assignment, shipment tracking, route
optimization, maintenance, fuel monitoring, analytics, reports, and
notifications.

## Core Stack

-   **Backend:** Python, FastAPI, SQLAlchemy, Pydantic, Alembic, Uvicorn
-   **Frontend:** React, Vite, JavaScript, Axios, React Router
-   **Database:** PostgreSQL
-   **Authentication:** JWT and role-based access control
-   **Real-Time:** WebSockets and GPS tracking/simulation
-   **Background Processing:** Celery
-   **Reports:** PDF and Excel export
-   **Notifications:** In-app, Gmail SMTP, Twilio SMS, Firebase Cloud
    Messaging
-   **Version Control:** Git and GitHub

------------------------------------------------------------------------

# Milestones

## Milestone 1 --- Project Initialization, Design & Core Setup

**Status: COMPLETED**

### Tasks Completed

-   Defined project objectives and logistics workflows.
-   Designed system architecture and database structure.
-   Planned UI and operational workflows.
-   Set up React frontend and FastAPI backend.
-   Implemented JWT authentication and role-based access control.
-   Built the fleet monitoring dashboard.
-   Developed vehicle registration and management workflows.
-   Integrated PostgreSQL.
-   Configured Alembic database migrations.
-   Implemented core fleet, driver, shipment, maintenance, fuel, and
    alert modules.

------------------------------------------------------------------------

## Milestone 2 --- Shipment Tracking & Route Optimization

**Status: COMPLETED**

### Tasks Completed

-   Developed shipment tracking workflows.
-   Implemented shipment status management.
-   Implemented trip scheduling and execution.
-   Integrated GPS tracking/simulation.
-   Implemented real-time location updates.
-   Implemented WebSocket-based tracking.
-   Built delivery progress and ETA workflows.
-   Added live tracking UI.
-   Added route visualization.
-   Implemented route recalculation.
-   Implemented route optimization.
-   Added trip monitoring workflows.

------------------------------------------------------------------------

## Milestone 3 --- Maintenance Management & Analytics

**Status: COMPLETED**

### Tasks Completed

-   Developed maintenance scheduling.
-   Implemented maintenance alerts.
-   Added maintenance reports.
-   Implemented driver assignment workflows.
-   Added operational analytics.
-   Built fleet performance dashboards.
-   Added fleet utilization analytics.
-   Added fuel monitoring and consumption analytics.
-   Added driver performance analytics.
-   Added delivery performance analytics.
-   Implemented PDF and Excel report exports.
-   Configured Celery worker and scheduled maintenance monitoring.
-   Verified maintenance, assignment, analytics, database, and Celery
    workflows.

------------------------------------------------------------------------

## Milestone 4 --- UI Improvements & Notification Integrations

**Status: COMPLETED**

### Tasks Completed

-   Improved page layout and visual consistency.
-   Standardized page containers, headers, titles, and subtitles.
-   Improved KPI cards and dashboard presentation.
-   Improved buttons, forms, tables, and modals.
-   Improved responsive layouts and mobile navigation.
-   Refined Analytics page UI.
-   Refined Tracking page alignment and layout.
-   Improved profile and appearance controls.
-   Configured Gmail SMTP email notifications.
-   Configured Twilio SMS notifications.
-   Configured Firebase Cloud Messaging push notifications.
-   Configured `firebase-messaging-sw.js` for browser background
    notifications.
-   Configured browser notification token registration.
-   Verified email, SMS, and push notification workflows.
-   Documented notification environment configuration.

------------------------------------------------------------------------

# Main Modules

-   User Management
-   Fleet Management
-   Driver Management
-   Driver Assignment
-   Shipment Management
-   Shipment Tracking
-   Trip Scheduling
-   Real-Time GPS Tracking
-   Route Optimization
-   Maintenance Management
-   Fuel Management
-   Alerts & Notifications
-   Operational Analytics
-   Fleet Performance Analytics
-   Reports & Export
-   Celery Background Processing

------------------------------------------------------------------------

# Notification Configuration

FleetFlow supports four notification channels:

  ------------------------------------------------------------------------
  Channel                 Provider                Configuration
  ----------------------- ----------------------- ------------------------
  In-App                  FleetFlow               Application notification
                                                  records

  Email                   Gmail SMTP              `SMTP_*`

  SMS                     Twilio                  `TWILIO_*`

  Push                    Firebase Cloud          `VITE_FIREBASE_*` +
                          Messaging               `FIREBASE_CREDENTIALS`
  ------------------------------------------------------------------------

Typical events include driver assignment, maintenance alerts, shipment
status changes, delivery updates, route changes, and operational alerts.

## Backend Environment

``` env
DATABASE_URL=<postgresql-database-url>
JWT_SECRET_KEY=<jwt-secret>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<your-gmail-address>
SMTP_PASSWORD=<your-google-app-password>

TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_PHONE_NUMBER=<your-twilio-phone-number>

FIREBASE_CREDENTIALS=firebase-service-account.json
```

## Frontend Environment

``` env
VITE_FIREBASE_API_KEY=<your-firebase-web-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-firebase-auth-domain>
VITE_FIREBASE_PROJECT_ID=<your-firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-firebase-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-firebase-messaging-sender-id>
VITE_FIREBASE_APP_ID=<your-firebase-app-id>
VITE_FIREBASE_VAPID_KEY=<your-firebase-vapid-key>
```

Firebase messaging service worker:

``` text
frontend/public/firebase-messaging-sw.js
```

**Never commit `.env` files, Firebase service-account JSON files, or
private credentials.**

------------------------------------------------------------------------

# Running the Application

## Backend

``` powershell
cd backend
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## Frontend

``` powershell
cd frontend
npm install
npm run dev
```

## Celery Worker

``` powershell
celery -A app.celery_app:celery_app worker --loglevel=INFO --pool=solo
```

## Celery Beat

``` powershell
celery -A app.celery_app:celery_app beat --loglevel=INFO
```

------------------------------------------------------------------------

# Project Status

``` text
Milestone 1    COMPLETED
Milestone 2    COMPLETED
Milestone 3    COMPLETED
Milestone 4    COMPLETED
```

The completed scope covers the application functionality delivered
across Milestones 1--4.

