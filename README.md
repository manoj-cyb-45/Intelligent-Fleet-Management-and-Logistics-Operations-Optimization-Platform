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
-   **Notifications:** In-app and Gmail SMTP email notifications
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
-   Implemented in-app notifications.
-   Implemented email notifications for vehicle assignment.
-   Implemented email notifications for trip start events.
-   Implemented email notifications for shipment status changes.
-   Implemented email notifications for route changes and
    recalculations.
-   Verified in-app and email notification workflows.
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

FleetFlow supports two notification channels:

  ------------------------------------------------------------------------
  Channel                 Provider                Configuration
  ----------------------- ----------------------- ------------------------
  In-App                  FleetFlow               Application notification
                                                  records

  Email                   Gmail SMTP              `SMTP_*`
  ------------------------------------------------------------------------

Typical events include driver assignment, trip start, maintenance
alerts, shipment status changes, delivery updates, route changes, and
operational alerts.

## Backend Environment

```env
DATABASE_URL=<postgresql-database-url>
JWT_SECRET_KEY=<jwt-secret>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<your-gmail-address>
SMTP_PASSWORD=<your-google-app-password>