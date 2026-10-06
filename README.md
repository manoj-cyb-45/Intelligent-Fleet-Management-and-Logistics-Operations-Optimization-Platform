# FleetFlow
## Intelligent Fleet Management and Logistics Operations Optimization Platform

FleetFlow is an intelligent fleet management and logistics operations platform for managing vehicles, drivers, shipments, trips, maintenance, fuel records, alerts, notifications, and operational analytics through a centralized web application.

The platform combines a **FastAPI backend**, **PostgreSQL database**, **Alembic migrations**, **React + Vite frontend**, **JWT authentication**, **role-based access control**, **real-time WebSocket tracking**, **GPS simulation**, **route optimization**, **maintenance monitoring**, **analytics dashboards**, **report exports**, and **Celery background processing**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Objectives](#project-objectives)
- [Milestone Status](#milestone-status)
  - [Milestone 1](#milestone-1--core-fleet-management-platform)
  - [Milestone 2](#milestone-2--shipment-tracking-trip-scheduling--route-optimization)
  - [Milestone 3](#milestone-3--maintenance-management--analytics)
- [Milestone 3 Requirements Mapping](#milestone-3-requirements-mapping)
- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Authentication and Authorization](#authentication-and-authorization)
- [Fleet Management](#fleet-management)
- [Driver Management and Assignment](#driver-management-and-assignment)
- [Shipment and Trip Management](#shipment-and-trip-management)
- [Real-Time Tracking](#real-time-tracking)
- [Route Optimization](#route-optimization)
- [Maintenance Management](#maintenance-management)
- [Alerts and Notifications](#alerts-and-notifications)
- [Operational Analytics](#operational-analytics)
- [Fleet Performance Analytics](#fleet-performance-analytics)
- [Fuel Monitoring Analytics](#fuel-monitoring-analytics)
- [Driver and Delivery Analytics](#driver-and-delivery-analytics)
- [Reports and Export](#reports-and-export)
- [Celery Background Jobs](#celery-background-jobs)
- [API Endpoints](#api-endpoints)
- [Database and Migrations](#database-and-migrations)
- [Frontend](#frontend)
- [Environment Configuration](#environment-configuration)
- [Running the Backend](#running-the-backend)
- [Running the Frontend](#running-the-frontend)
- [Running Celery](#running-celery)
- [Production Frontend Build](#production-frontend-build)
- [Testing and Verification](#testing-and-verification)
- [Current Project Status](#current-project-status)
- [Repository and Git Workflow](#repository-and-git-workflow)
- [Future Scope](#future-scope)

---

## Project Overview

FleetFlow is designed around the operational workflow of a fleet and logistics organization.

The platform provides a centralized system for:

- Vehicle registration and monitoring
- Driver management
- Driver-vehicle assignment
- Shipment management
- Shipment history and delivery status
- Trip scheduling and execution
- GPS simulation and location updates
- Real-time shipment tracking
- Route visualization
- Route recalculation
- Route optimization
- Maintenance scheduling
- Maintenance alerts
- Maintenance reports
- Fuel records
- Fuel monitoring analytics
- Fleet performance analytics
- Driver performance analytics
- Delivery performance analytics
- Operational analytics
- In-app notifications
- Email, SMS, and push notification service integrations
- PDF analytics export
- Excel analytics export
- Background maintenance monitoring with Celery

The application uses PostgreSQL as the primary application database.

---

## Project Objectives

The project is aligned with the FleetFlow requirements specification, which defines the platform around fleet management, shipment tracking, route optimization, maintenance management, analytics, notifications, reporting, and background processing.

The main objectives are:

1. Build a centralized fleet management platform.
2. Manage vehicles and drivers through authenticated workflows.
3. Support shipment and trip operations.
4. Provide real-time tracking and GPS-based operational visibility.
5. Implement route optimization and route recalculation.
6. Provide maintenance scheduling and alerting.
7. Support driver assignment and monitoring workflows.
8. Generate operational, fleet, fuel, driver, delivery, and maintenance analytics.
9. Provide report export capabilities.
10. Configure background jobs using Celery.

---

# Milestone Status

## Milestone 1 — Core Fleet Management Platform

**Status: COMPLETED**

Milestone 1 established the core backend architecture, database, authentication, authorization, fleet modules, and React frontend.

Implemented modules include:

- Authentication
- JWT security
- Role-based access control
- Vehicles
- Drivers
- Driver-vehicle assignment
- Shipments
- Shipment history
- Maintenance records
- Fuel records
- Alerts
- Operations dashboard
- PostgreSQL integration
- Alembic migrations
- React frontend
- REST API integration
- CORS configuration

### Milestone 1 Completion

```text
Authentication              COMPLETE
JWT Security                COMPLETE
Role-Based Authorization    COMPLETE
Vehicle Management          COMPLETE
Driver Management           COMPLETE
Driver Assignment           COMPLETE
Shipment Management         COMPLETE
Shipment History            COMPLETE
Maintenance Records         COMPLETE
Fuel Records                COMPLETE
Alert Management            COMPLETE
Operations Dashboard        COMPLETE
PostgreSQL Integration      COMPLETE
Alembic Migrations          COMPLETE
React Frontend              COMPLETE
API Integration             COMPLETE
```

---

# Milestone 2 — Shipment Tracking, Trip Scheduling & Route Optimization

**Status: COMPLETED**

Milestone 2 extended FleetFlow from core fleet management into real-time logistics operations.

### Implemented and Verified

- Shipment tracking workflow
- Trip scheduling
- Trip execution
- Trip status transitions
- Automatic GPS simulation
- Real-time GPS position updates
- Shipment delivery progress tracking
- Expected delivery time (ETA)
- Live shipment tracking map
- Vehicle location tracking
- WebSocket-based real-time shipment updates
- Route visualization
- Route recalculation from live GPS coordinates
- Route optimization
- Live tracking dashboard
- Trip monitoring dashboard

### Milestone 2 Verification

The end-to-end workflow was tested using a live shipment and trip:

```text
Shipment:    SH011
Tracking:    TRK011
Vehicle:     VH001
Driver:      DRV001
Trip:        TP008
Route:       Bengaluru → Mysuru
```

Verified workflow:

```text
Authentication
      ↓
Shipment Creation
      ↓
Trip Scheduling
      ↓
Trip IN_PROGRESS
      ↓
Shipment IN_TRANSIT
      ↓
GPS Simulation
      ↓
Database Location Updates
      ↓
WebSocket Real-Time Updates
      ↓
Live Tracking Map
      ↓
Route Recalculation
      ↓
Route Optimization
```

### WebSocket Verification

The shipment WebSocket was tested through the live tracking interface.

The runtime required WebSocket support through the standard Uvicorn dependencies:

```powershell
pip install "uvicorn[standard]"
```

The live tracking interface subsequently reported:

```text
CONNECTED
Real-time location updates are active.
```

### Route Optimization Verification

The following endpoints were tested successfully:

```text
POST /route-optimizer/recalculate → 200 OK
POST /route-optimizer/optimize    → 200 OK
```

### Traffic-Aware Routing

The implemented route optimization workflow uses traffic-level duration multipliers on the calculated route travel time.

The implemented traffic levels are:

```text
LOW       1.00
MODERATE  1.15
HIGH      1.35
SEVERE    1.60
```

These are application-level traffic heuristics and are not a live Google Maps or Waze traffic feed.

### Milestone 2 Completion

```text
Shipment Tracking          COMPLETE
Trip Scheduling            COMPLETE
Trip Execution             COMPLETE
GPS Simulation             COMPLETE
Live GPS Updates           COMPLETE
ETA / Progress             COMPLETE
WebSocket Tracking         COMPLETE
Live Tracking UI           COMPLETE
Vehicle Tracking           COMPLETE
Route Visualization        COMPLETE
Route Recalculation        COMPLETE
Route Optimization         COMPLETE
Milestone 2                COMPLETE
```

---

# Milestone 3 — Maintenance Management & Analytics

**Status: COMPLETED**

The project requirements define Milestone 3 as:

> Week 5 & 6 — Maintenance Management & Analytics

The requirements specify the following Milestone 3 tasks:

1. Develop maintenance scheduling module.
2. Build driver assignment system.
3. Generate maintenance alerts and reports.
4. Implement operational analytics workflows.
5. Build fleet performance dashboards.
6. Develop fuel monitoring analytics.
7. Configure background jobs using Celery.

The implemented project covers these requirements through maintenance workflows, driver assignment, alerts, analytics, reporting/export, and Celery background processing.

---

## Milestone 3 Requirements Mapping

| Requirement | Implementation | Status |
|---|---|---|
| Maintenance scheduling | Maintenance records, dates, due dates, status management, upcoming schedule | COMPLETE |
| Driver assignment system | Authenticated driver-to-vehicle assignment and unassignment | COMPLETE |
| Maintenance alerts and reports | Maintenance alert monitoring and maintenance summary report | COMPLETE |
| Operational analytics | Operational analytics API and frontend dashboard | COMPLETE |
| Fleet performance dashboards | Fleet performance and utilization analytics | COMPLETE |
| Fuel monitoring analytics | Fuel analytics and per-vehicle fuel consumption | COMPLETE |
| Background jobs using Celery | Celery worker, task registration, and Celery Beat scheduling | COMPLETE |

### Milestone 3 Outcomes

The implementation supports the required outcomes:

- Maintenance management workflows
- Driver management and assignment workflows
- Logistics analytics and reporting workflows
- Operational monitoring
- Fleet performance analysis
- Fuel consumption monitoring
- Background maintenance monitoring
- End-to-end fleet and logistics management workflows

---

# Core Features

## Fleet Management

FleetFlow provides vehicle-level operational management including:

- Vehicle registration
- Vehicle status management
- Vehicle availability
- Vehicle assignment state
- Vehicle mileage
- Fuel level
- Fuel records
- Maintenance records
- Vehicle tracking

---

## Driver Management and Assignment

The driver module supports:

- Driver management
- Driver status
- Driver-vehicle assignment
- Driver unassignment
- Assignment validation
- Vehicle availability validation
- Active assignment conflict prevention
- In-transit assignment protection
- Assignment notifications

### Driver Assignment Workflow

```text
Authenticated User
       ↓
Select Driver
       ↓
Select Available Vehicle
       ↓
Validate Driver
       ↓
Validate Vehicle
       ↓
Check Active Assignment
       ↓
Create Assignment
       ↓
Vehicle → ASSIGNED
       ↓
Create Driver Assignment Notification
```

### Driver Unassignment Workflow

```text
Active Assignment
       ↓
Validate Assignment
       ↓
Check Transit Restrictions
       ↓
Complete Assignment
       ↓
Vehicle → AVAILABLE
```

---

# Shipment and Trip Management

Shipment and trip workflows support:

- Shipment creation
- Shipment tracking
- Shipment status transitions
- Shipment history
- Trip scheduling
- Trip execution
- Trip status monitoring
- Delivery progress
- ETA calculation
- Route association

Typical shipment lifecycle:

```text
CREATED
   ↓
ASSIGNED
   ↓
IN_TRANSIT
   ↓
DELIVERED
```

Alternative terminal state:

```text
CANCELLED
```

---

# Real-Time Tracking

Milestone 2 introduced real-time operational visibility.

The tracking system includes:

- GPS simulation
- GPS coordinate updates
- Database location updates
- WebSocket communication
- Live frontend updates
- Shipment tracking map
- Vehicle markers
- Route visualization
- Delivery progress

The real-time workflow is:

```text
GPS Simulator
      ↓
Location Update
      ↓
Backend
      ↓
PostgreSQL
      ↓
WebSocket
      ↓
React Tracking Interface
```

---

# Route Optimization

FleetFlow supports route optimization workflows including:

- Route calculation
- Route visualization
- Route recalculation
- Current-position-aware recalculation
- Traffic-aware duration adjustment
- Route optimization

Primary endpoints:

```text
POST /route-optimizer/recalculate
POST /route-optimizer/optimize
```

---

# Maintenance Management

Milestone 3 introduces a structured maintenance management workflow.

Maintenance records contain information such as:

- Vehicle
- Maintenance type
- Description
- Maintenance date
- Due date
- Cost
- Status

Supported maintenance statuses include:

```text
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED
```

### Maintenance Scheduling

The maintenance module supports:

- Creating maintenance records
- Viewing maintenance records
- Updating maintenance records
- Scheduling future maintenance
- Viewing upcoming maintenance
- Maintenance status management
- Maintenance cost tracking

### Upcoming Maintenance

The upcoming maintenance workflow evaluates scheduled maintenance against its due date.

### Maintenance Reporting

The maintenance summary report provides:

- Total maintenance records
- Scheduled records
- In-progress records
- Completed records
- Cancelled records
- Upcoming records
- Overdue records
- Total maintenance cost

---

# Alerts and Notifications

## Maintenance Alerts

The maintenance alert service monitors maintenance records and creates alerts based on maintenance timing.

The due-date workflow identifies maintenance that is:

- Due soon
- Overdue

The alert system prevents unnecessary duplicate open alerts for the same maintenance condition.

### Celery Maintenance Monitoring

Maintenance monitoring is also exposed as a Celery task:

```text
Celery Beat
     ↓
maintenance.monitor_maintenance_alerts
     ↓
Maintenance Alert Service
     ↓
PostgreSQL
     ↓
Alerts
```

---

## In-App Notifications

The notification module supports:

- Notification creation
- Notification listing
- Read/unread state
- Device token registration
- Driver assignment notifications
- Operational notification workflows

### Notification Types

Examples include:

```text
DRIVER_ASSIGNMENT
MAINTENANCE
DELIVERY
SHIPMENT_STATUS
ROUTE_CHANGE
```

---

## External Notification Integrations

The notification service includes integrations for:

- Email
- SMS
- Push notifications

The implementation uses:

- SMTP for email
- Twilio for SMS
- Firebase Admin for push notifications

External provider credentials must be configured in the environment before external delivery can occur.

The in-app notification workflow is implemented independently of external provider credentials.

---

# Operational Analytics

FleetFlow provides operational analytics through dedicated backend APIs and the React Analytics interface.

The analytics layer provides data for:

- Overall operations
- Fleet performance
- Fleet utilization
- Fuel usage
- Fuel consumption by vehicle
- Driver performance
- Delivery performance

---

## Operational Analytics

Endpoint:

```text
GET /analytics/operational
```

Operational analytics provide aggregated information for monitoring fleet and logistics activity.

---

# Fleet Performance Analytics

Endpoint:

```text
GET /analytics/fleet-performance
```

The fleet performance workflow provides vehicle-level operational metrics and fleet-level performance information.

---

## Fleet Utilization Analytics

Endpoint:

```text
GET /analytics/fleet-utilization
```

Fleet utilization analytics support operational monitoring of vehicle usage.

---

# Fuel Monitoring Analytics

The requirements specify fuel monitoring analytics as a Milestone 3 task.

FleetFlow implements two fuel analytics workflows.

## Fuel Analytics

Endpoint:

```text
GET /analytics/fuel
```

The endpoint provides aggregated fuel information including:

- Total fuel records
- Total quantity
- Total fuel cost
- Average cost per unit

## Fuel Consumption Analytics

Endpoint:

```text
GET /analytics/fuel-consumption
```

The per-vehicle fuel consumption workflow provides:

- Vehicle ID
- Total fuel quantity
- Total fuel cost
- Fuel record count

Example structure:

```text
Vehicle
 ├── Total Quantity
 ├── Total Cost
 └── Fuel Records
```

### Fuel Monitoring

The fuel management workflow also maintains low-fuel alerts.

The implemented low-fuel threshold is:

```text
20%
```

When a vehicle falls at or below the configured threshold, the system creates or updates an open high-severity low-fuel alert.

---

# Driver and Delivery Analytics

## Driver Performance

Endpoint:

```text
GET /analytics/driver-performance
```

The driver performance workflow provides driver-level operational analytics.

## Delivery Performance

Endpoint:

```text
GET /analytics/delivery-performance
```

The delivery performance workflow provides delivery statistics such as:

- Total shipments
- Delivered shipments
- In-transit shipments
- Pending shipments
- Cancelled shipments
- Delivery rate

A live verification produced:

```text
Total shipments:       11
Delivered shipments:    9
In-transit shipments:   0
Pending shipments:      0
Cancelled shipments:    2
Delivery rate:       81.82%
```

---

# Reports and Export

The requirements specify reporting workflows for:

- Fleet utilization
- Fuel consumption
- Driver performance
- Delivery performance
- Maintenance
- PDF export
- Excel export

FleetFlow implements analytics export from the React Analytics page.

## PDF Export

The frontend uses `jsPDF` to generate a PDF report containing:

- Operational Analytics
- Fleet Performance
- Fuel Analytics
- Delivery Performance
- Fuel Consumption
- Driver Performance

## Excel Export

The frontend uses `xlsx` to generate an Excel workbook containing dedicated worksheets:

```text
Operational
Fleet Performance
Fuel Analytics
Delivery Performance
Fuel Consumption
Driver Performance
```

---

# Celery Background Jobs

Celery is configured for asynchronous and scheduled background processing.

## Current Background Task

The implemented background task monitors maintenance alerts:

```text
maintenance.monitor_maintenance_alerts
```

The task:

1. Creates a database session.
2. Runs the maintenance alert monitoring service.
3. Returns the number of alerts created.
4. Rolls back on failure.
5. Closes the database session.

## Celery Worker

Worker command:

```powershell
celery -A app.celery_app:celery_app worker --loglevel=INFO --pool=solo
```

## Celery Beat

Scheduler command:

```powershell
celery -A app.celery_app:celery_app beat --loglevel=INFO
```

The maintenance monitoring task is scheduled hourly:

```text
3600 seconds
```

## Broker and Result Backend

The current development configuration uses the existing PostgreSQL database through Celery's SQLAlchemy transport.

Environment variables:

```text
CELERY_BROKER_URL
CELERY_RESULT_BACKEND
```

If they are not provided, the application derives them from:

```text
DATABASE_URL
```

This development setup avoids requiring a separate Redis server.

> The original project requirements list Redis as a cache/background-job technology. The current implemented development configuration uses PostgreSQL-backed Celery transport instead of requiring a separate Redis service.

## Celery Verification

Celery was verified with:

```text
Celery configuration       PASSED
Broker connection           PASSED
Result backend              PASSED
Task registration           PASSED
Worker startup              PASSED
Task execution              PASSED
Celery Beat startup         PASSED
Hourly schedule             CONFIGURED
```

---

# API Endpoints

## Authentication

Typical authentication endpoints include:

```text
POST /auth/login
```

JWT tokens are used to protect authenticated operations.

---

## Vehicle Management

Vehicle routes include the project's vehicle management operations.

---

## Driver Management

Driver routes include driver management and assignment operations.

Important assignment endpoints:

```text
POST /drivers/{driver_id}/assign
POST /drivers/{driver_id}/unassign
```

---

## Shipment Management

Shipment routes support:

```text
Shipment creation
Shipment listing
Shipment details
Shipment status updates
Shipment history
Shipment tracking
```

---

## Trip Management

Trip routes support:

```text
Trip creation
Trip scheduling
Trip execution
Trip status management
Trip monitoring
```

---

## Tracking

Tracking functionality includes:

```text
GPS updates
Tracking data
WebSocket shipment tracking
```

---

## Route Optimization

```text
POST /route-optimizer/recalculate
POST /route-optimizer/optimize
```

---

## Maintenance

```text
GET  /maintenance
POST /maintenance
GET  /maintenance/{maintenance_id}
PUT  /maintenance/{maintenance_id}
GET  /maintenance/schedule/upcoming
GET  /maintenance/report/summary
```

---

## Fuel

```text
GET  /fuel
POST /fuel
GET  /fuel/{fuel_id}
```

Fuel creation is protected by the appropriate role-based authorization.

---

## Alerts

```text
GET /alerts
GET /alerts/{alert_id}
PUT /alerts/{alert_id}/resolve
```

---

## Notifications

```text
GET  /notifications
POST /notifications
POST /notifications/device-token
PUT  /notifications/{notification_id}/read
```

---

## Analytics

```text
GET /analytics/operational
GET /analytics/fleet-performance
GET /analytics/fleet-utilization
GET /analytics/fuel
GET /analytics/fuel-consumption
GET /analytics/driver-performance
GET /analytics/delivery-performance
```

---

# System Architecture

The platform follows a layered client-server architecture.

```text
┌──────────────────────────────────────────────┐
│              React + Vite Frontend           │
│                                              │
│ Dashboard | Tracking | Analytics | Reports   │
└──────────────────────┬───────────────────────┘
                       │
                 REST / WebSocket
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                 FastAPI Backend              │
│                                              │
│ Auth | Vehicles | Drivers | Shipments        │
│ Trips | Tracking | Maintenance | Fuel       │
│ Alerts | Notifications | Analytics           │
└──────────────┬────────────────┬──────────────┘
               │                │
               ▼                ▼
       ┌──────────────┐   ┌───────────────┐
       │ PostgreSQL   │   │ Celery Worker │
       │              │   │ + Beat        │
       └──────────────┘   └───────┬───────┘
                                   │
                                   ▼
                         Maintenance Monitoring
```

---

# Technology Stack

## Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn
- Alembic
- Celery
- WebSockets
- JWT authentication
- Password hashing

## Database

- PostgreSQL
- SQLAlchemy ORM
- Alembic migrations

## Frontend

- JavaScript
- React
- Vite
- React Router
- Axios
- jsPDF
- XLSX

## Notifications

- SMTP
- Twilio
- Firebase Admin

## Tracking and Maps

- GPS simulation
- WebSockets
- Map visualization
- Route optimization

## Background Processing

- Celery
- Celery Beat
- Kombu
- SQLAlchemy broker transport
- PostgreSQL result backend

## Development Tools

- VS Code
- Git
- GitHub
- PowerShell
- Postman / Swagger UI

---

# Project Structure

The project follows a backend/frontend structure similar to:

```text
FleetFlow/
│
├── backend/
│   ├── app/
│   │   ├── alerts/
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   │
│   │   ├── analytics/
│   │   │   └── routes.py
│   │   │
│   │   ├── auth/
│   │   ├── database/
│   │   ├── drivers/
│   │   ├── fuel/
│   │   ├── maintenance/
│   │   ├── notifications/
│   │   ├── shipments/
│   │   ├── tracking/
│   │   ├── trips/
│   │   ├── vehicles/
│   │   ├── route_optimizer/
│   │   │
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   └── maintenance.py
│   │   │
│   │   ├── celery_app.py
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── package.json
│   └── vite.config.*
│
└── README.md
```

---

# Authentication and Authorization

FleetFlow uses JWT-based authentication.

The authorization layer uses role-based access control.

Roles used by protected workflows include:

```text
ADMIN
MANAGER
DISPATCHER
```

Authentication protects operational endpoints such as:

- Driver assignment
- Fuel entry
- Maintenance operations
- Notifications
- Analytics

---

# Database and Migrations

PostgreSQL is the primary database.

Alembic is used for schema migrations.

The project uses SQLAlchemy models for database interaction.

Recent Milestone 3 database migration work includes:

```text
c9a4b7e2d1f0
      ↓
816e4bb85faf
      ↓
54008601e592
      ↓
9deb8cb20eb7
```

These migrations introduced the database structures required for:

- Maintenance alert relationships
- Notifications
- Device tokens

The database was successfully upgraded to the current Alembic head.

---

# Frontend

The React + Vite frontend provides operational interfaces for:

- Authentication
- Dashboard
- Vehicles
- Drivers
- Shipments
- Trips
- Tracking
- Maintenance
- Fuel
- Alerts
- Notifications
- Analytics
- Reports

## Analytics Interface

The Analytics page integrates the Milestone 3 analytics endpoints and provides:

- Operational analytics
- Fleet performance
- Fleet utilization
- Fuel analytics
- Fuel consumption
- Driver performance
- Delivery performance
- PDF export
- Excel export

---

# Environment Configuration

The backend uses environment variables.

Minimum database configuration:

```env
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
JWT_SECRET_KEY=<secret-key>
```

Optional Celery configuration:

```env
CELERY_BROKER_URL=<broker-url>
CELERY_RESULT_BACKEND=<result-backend-url>
```

If Celery URLs are omitted, the current implementation derives PostgreSQL-backed Celery configuration from `DATABASE_URL`.

Optional notification provider configuration may include:

```env
SMTP_HOST=<smtp-host>
SMTP_PORT=<smtp-port>
SMTP_USERNAME=<smtp-username>
SMTP_PASSWORD=<smtp-password>

TWILIO_ACCOUNT_SID=<account-sid>
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_FROM_NUMBER=<from-number>

FIREBASE_CREDENTIALS=<firebase-credentials>
```

Do not commit real credentials to Git.

---

# Running the Backend

Navigate to the backend:

```powershell
cd backend
```

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

If the virtual environment is located at the project root, activate it from the project directory instead.

Install dependencies:

```powershell
pip install -r requirements.txt
```

Run database migrations:

```powershell
alembic upgrade head
```

Start FastAPI:

```powershell
uvicorn app.main:app --reload
```

The API can then be accessed through the configured local backend address.

Swagger documentation is available at:

```text
/docs
```

OpenAPI JSON is available at:

```text
/openapi.json
```

---

# Running the Frontend

Navigate to the frontend:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

The Vite development server will display the local frontend URL in the terminal.

---

# Running Celery

Celery should be run from the backend environment.

## Worker

```powershell
celery -A app.celery_app:celery_app worker --loglevel=INFO --pool=solo
```

The worker should register:

```text
maintenance.monitor_maintenance_alerts
```

## Beat Scheduler

Open another terminal and run:

```powershell
celery -A app.celery_app:celery_app beat --loglevel=INFO
```

The current schedule is:

```text
Maintenance alert monitoring → every 3600 seconds
```

or:

```text
Hourly
```

The worker and Beat processes should remain running while scheduled background processing is required.

---

# Production Frontend Build

The frontend production build was successfully verified.

Run:

```powershell
cd frontend
npm run build
```

Expected result:

```text
vite building client environment for production
✓ modules transformed
✓ production bundle generated
```

The build currently completes successfully.

A Vite warning may appear for large JavaScript chunks. This is a bundle-size optimization warning rather than a build failure.

---

# Testing and Verification

Milestone 3 was tested through live backend workflows and frontend build verification.

## Backend Verification

Verified:

```text
Backend import                  PASSED
FastAPI route registration      PASSED
PostgreSQL connection           PASSED
Alembic migrations              PASSED
Authentication                  PASSED
Analytics routes                PASSED
Maintenance routes              PASSED
Alert routes                    PASSED
Driver assignment               PASSED
Notification creation           PASSED
Fuel analytics                  PASSED
Delivery analytics              PASSED
Celery configuration             PASSED
Celery task registration         PASSED
Celery worker                    PASSED
Celery task execution            PASSED
Celery Beat                      PASSED
```

## Maintenance Verification

A maintenance record was tested with:

```text
Maintenance ID: 1
Vehicle:        VH001
Type:           ROUTINE
Maintenance:    2026-09-30
Due Date:       2026-10-08
Status:         SCHEDULED
Cost:           5000
```

Maintenance alert monitoring successfully created a maintenance alert for the due condition.

## Driver Assignment Verification

A live assignment was tested:

```text
Driver:         DRV001
Vehicle:        VH001
Assignment:     18
Status:         ACTIVE
```

The database state was verified:

```text
Assignment:     DRV001 → VH001 → ACTIVE
Vehicle:        VH001 → ASSIGNED
Notification:   DRIVER_ASSIGNMENT
```

The assignment was then unassigned successfully:

```text
Assignment:     COMPLETED
Vehicle:        VH001 → AVAILABLE
Active Driver Assignment: NONE
```

## Fuel Analytics Verification

The fuel consumption endpoint returned per-vehicle data successfully.

Example verified record:

```text
Vehicle:         VH004
Total Quantity:  180.0
Total Cost:      18400.0
Fuel Records:    2
```

## Delivery Analytics Verification

A live delivery performance response was verified:

```text
Total Shipments:       11
Delivered:              9
In Transit:             0
Pending:                0
Cancelled:              2
Delivery Rate:       81.82%
```

## Celery Verification

Celery configuration was verified against PostgreSQL:

```text
Celery configuration:   PASSED
Broker:                 PostgreSQL / localhost:5432/fleetflow_db
Backend:                PostgreSQL / localhost:5432/fleetflow_db
Schedule:               3600 seconds
Task registered:        YES
```

The worker received and successfully executed the maintenance monitoring task.

Celery Beat also started successfully with the hourly schedule.

## Frontend Verification

The production frontend build completed successfully:

```text
✓ 353 modules transformed
✓ production build completed
```

PDF export and Excel export were also tested successfully from the Analytics workflow.

---

# Current Project Status

The current implementation state is:

```text
Backend Architecture             COMPLETE
PostgreSQL Integration           COMPLETE
Alembic Migrations               COMPLETE
JWT Authentication               COMPLETE
Role-Based Authorization         COMPLETE

Vehicle Management               COMPLETE
Driver Management                COMPLETE
Driver Assignment                COMPLETE
Shipment Management              COMPLETE
Shipment History                 COMPLETE
Maintenance Management           COMPLETE
Fuel Management                  COMPLETE
Alert Management                 COMPLETE
Notification Module              COMPLETE

Shipment Tracking                COMPLETE
Trip Scheduling                  COMPLETE
Trip Execution                   COMPLETE
GPS Simulation                   COMPLETE
Live GPS Updates                 COMPLETE
ETA / Delivery Progress         COMPLETE
WebSocket Tracking               COMPLETE
Live Tracking UI                 COMPLETE
Route Visualization              COMPLETE
Route Recalculation              COMPLETE
Route Optimization               COMPLETE

Maintenance Scheduling           COMPLETE
Maintenance Alerts               COMPLETE
Maintenance Reports              COMPLETE
Operational Analytics            COMPLETE
Fleet Performance Analytics      COMPLETE
Fleet Utilization Analytics      COMPLETE
Fuel Monitoring Analytics        COMPLETE
Fuel Consumption Analytics       COMPLETE
Driver Performance Analytics     COMPLETE
Delivery Performance Analytics   COMPLETE

PDF Export                       COMPLETE
Excel Export                     COMPLETE

Celery Worker                    COMPLETE
Celery Task Registration         COMPLETE
Celery Beat                       COMPLETE
Scheduled Maintenance Monitoring COMPLETE

Milestone 1                     COMPLETE
Milestone 2                     COMPLETE
Milestone 3                     COMPLETE
```

---

# Milestone 3 Completion Summary

The Milestone 3 evaluation criteria from the project requirements are addressed as follows:

| Evaluation Criterion | Status |
|---|---|
| Maintenance scheduling system implemented | COMPLETE |
| Driver assignment and monitoring workflows functional | COMPLETE |
| Fleet analytics dashboards working | COMPLETE |
| Fuel monitoring and operational reports generated | COMPLETE |

Milestone 3 therefore completes the project's **Maintenance Management & Analytics** implementation scope.

---

# Repository and Git Workflow

The project uses Git for version control and GitHub for remote repository management.

Repository:

```text
manoj-cyb-45/Intelligent-Fleet-Management-and-Logistics-Operations-Optimization-Platform
```

Current development branch:

```text
milestone-2-final
```

The Milestone 3 implementation is being developed and verified on this branch before any final integration into the main branch.

Typical workflow:

```powershell
git status
git add .
git commit -m "Complete Milestone 3 maintenance analytics and Celery"
git push origin milestone-2-final
```

Before committing, generated files such as Celery Beat schedule databases and Python cache directories should not be committed.

---

# Future Scope

The current README documents the completed Milestone 1, Milestone 2, and Milestone 3 implementation.

Future enhancements may include:

- Predictive maintenance using historical maintenance data
- Advanced fleet optimization algorithms
- More advanced ETA prediction
- AI-assisted fleet decision support
- Advanced route optimization models
- Additional operational KPIs
- More detailed notification provider configuration
- Production-scale asynchronous infrastructure
- Additional analytics visualizations
- Advanced deployment and production infrastructure

These are future enhancements and are not presented as completed Milestone 3 functionality.

---

# Project Requirements Alignment

The original project specification defines FleetFlow as a multi-module fleet and logistics platform covering:

- Authentication
- Fleet management
- Driver management
- Shipment management
- Trip scheduling
- GPS and tracking
- Route optimization
- Maintenance management
- Notifications
- Reports and export
- Analytics
- Background processing

The completed implementation addresses the core functionality through three completed development milestones:

```text
Milestone 1
Core Fleet Management
        ↓
Milestone 2
Shipment Tracking & Route Optimization
        ↓
Milestone 3
Maintenance Management & Analytics
```

---

# Conclusion

FleetFlow provides an integrated fleet and logistics management platform combining:

```text
Fleet Management
       +
Driver Management
       +
Shipment Management
       +
Trip Scheduling
       +
Real-Time Tracking
       +
Route Optimization
       +
Maintenance Management
       +
Alerts & Notifications
       +
Operational Analytics
       +
Fuel Monitoring
       +
Reporting & Export
       +
Celery Background Processing
```

The current project implementation has completed the defined **Milestone 1, Milestone 2, and Milestone 3** development scope and has been verified through backend workflow testing, database validation, Celery execution, and frontend production build testing.
