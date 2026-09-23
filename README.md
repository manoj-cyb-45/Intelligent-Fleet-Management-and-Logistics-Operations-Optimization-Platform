# Intelligent Fleet Management and Logistics Operations Optimization Platform

## Overview

FleetFlow is an intelligent fleet management and logistics operations platform designed to help organizations manage vehicles, drivers, shipments, maintenance, fuel records, operational alerts, real-time tracking, trips, and route optimization from a centralized system.

The platform currently consists of:

- FastAPI backend
- PostgreSQL database
- Alembic database migrations
- React + Vite frontend
- JWT-based authentication
- Role-based access control
- REST API integration between frontend and backend
- Real-time shipment tracking
- WebSocket-based live updates
- GPS simulation
- Trip management
- Route optimization
- Route recalculation

---

# Milestone 1 Status

## Milestone 1 — Core Fleet Management Platform

**Status: COMPLETED**

The first milestone establishes the core backend APIs, database structure, authentication system, and functional React frontend.

Implemented modules:

- Authentication
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

---

# Milestone 2 Status

## Milestone 2 — Real-Time Tracking and Logistics Optimization

**Status: COMPLETED**

Milestone 2 extends FleetFlow from the core fleet management platform into a real-time fleet tracking and logistics optimization platform.

The milestone introduces:

- Real-time shipment tracking
- Live GPS position updates
- WebSocket communication
- Shipment tracking visualization
- Vehicle GPS tracking
- Trip management
- GPS simulation
- Route optimization
- Route recalculation
- Route-condition adjustment
- Live delivery progress
- Tracking and trip dashboards
- Additional database migrations
- Real-time frontend services

### Milestone 2 Functional Areas

#### Real-Time Tracking

The platform can display the current location and progress of tracked shipments and vehicles.

The tracking interface provides:

- Live vehicle location
- Shipment tracking
- Current GPS coordinates
- Shipment status
- Delivery progress
- Vehicle movement
- Real-time connection status
- Map-based tracking visualization

#### WebSocket Tracking

FleetFlow uses WebSocket communication for real-time shipment tracking.

The frontend establishes a live connection with the backend and receives shipment location updates without requiring continuous manual page refreshes.

The tracking system supports:

- Live connection status
- Real-time location updates
- Shipment-specific tracking
- Current latitude and longitude
- Delivery progress updates
- Vehicle movement visualization

#### GPS Simulation

A GPS simulator is included for testing real-time tracking functionality.

The simulator can generate vehicle location updates that are consumed by the real-time tracking system.

This allows the tracking workflow to be tested without requiring physical GPS hardware.

#### Trip Management

Milestone 2 introduces trip management functionality for logistics operations.

Trips provide a structure for managing vehicle movement and route-related information.

#### Route Optimization

The platform provides route optimization functionality for shipment operations.

The route optimization workflow supports:

- Route optimization
- Route recalculation
- Route condition adjustment
- Shipment route coordinates
- Optimization requests from the frontend
- Backend route optimization processing

The optimization workflow uses traffic-condition adjustment logic rather than depending on a live external traffic provider.

#### Live Shipment Tracking Example

Real-time tracking has been verified using an in-transit shipment.

The tracking interface displayed:

- Shipment status: `IN_TRANSIT`
- Live delivery progress
- Current GPS coordinates
- Vehicle position on the route
- Real-time WebSocket connection
- Vehicle movement between route locations

---

# Technology Stack

## Backend

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- Pydantic
- JWT authentication
- Password hashing
- WebSocket support

## Frontend

- React
- Vite
- React Router
- Axios
- Tailwind CSS
- Real-time tracking services
- Map-based tracking interface

## Development Tools

- Git
- GitHub
- Visual Studio Code
- PowerShell

---

# Project Structure

```text
Intelligent-Fleet-Management-and-Logistics-Operations-Optimization-Platform/
|
+-- backend/
|   +-- app/
|   |   +-- alerts/
|   |   +-- auth/
|   |   +-- database/
|   |   +-- drivers/
|   |   +-- fuel/
|   |   +-- maintenance/
|   |   +-- models/
|   |   +-- shipments/
|   |   +-- users/
|   |   +-- vehicles/
|   |   +-- trips/
|   |   +-- tracking/
|   |   +-- route_optimizer/
|   |   +-- main.py
|   |
|   +-- alembic/
|       +-- versions/
|   |
|   +-- tools/
|       +-- gps_simulator.py
|
+-- frontend/
|   +-- public/
|   +-- src/
|   |   +-- components/
|   |   +-- context/
|   |   +-- layouts/
|   |   +-- pages/
|   |   +-- services/
|   |   +-- App.jsx
|   |   +-- index.css
|   |   +-- main.jsx
|   |
|   +-- package.json
|   +-- vite.config.js
|
+-- docs/
+-- LICENSE
+-- README.md
```

---

# Authentication

Authentication is implemented using JWT access tokens.

## Login

```text
POST /auth/login
```

The login response contains:

- Access token
- Token type
- User ID
- User role

## Current User

```text
GET /auth/me
```

## Driver Role Test

```text
GET /auth/driver-test
```

Protected endpoints use role-based authorization.

---

# Vehicle Management

The vehicle module manages fleet vehicles and their operational information.

## Endpoints

```text
POST   /vehicles
GET    /vehicles
GET    /vehicles/{vehicle_id}
PUT    /vehicles/{vehicle_id}
DELETE /vehicles/{vehicle_id}
```

Vehicle information includes:

- Vehicle ID
- Registration number
- Vehicle type
- Capacity
- Fuel type
- Current status
- Current location
- Fuel level
- Mileage
- GPS tracking information

---

# Driver Management

The driver module manages driver accounts and vehicle assignments.

## Endpoints

```text
POST /drivers
GET  /drivers
GET  /drivers/{driver_id}
POST /drivers/{driver_id}/assign
```

Driver information includes:

- Driver ID
- Name
- Email
- Phone
- License details
- Experience
- Working hours
- Account status
- Assigned vehicle

The system prevents:

- Assigning a non-existent vehicle
- Assigning multiple active vehicles to the same driver
- Assigning the same vehicle to multiple drivers

---

# Shipment Management

The shipment module manages logistics operations and shipment progress.

## Endpoints

```text
POST /shipments
GET  /shipments
GET  /shipments/{shipment_id}
PUT  /shipments/{shipment_id}
GET  /shipments/{shipment_id}/history
```

Shipment information includes:

- Shipment ID
- Tracking number
- Description
- Origin
- Destination
- Due date
- Status
- Current location
- Delivery progress
- Vehicle
- Driver
- Expected delivery time
- Delivery completion time
- Route information
- GPS coordinates

## Shipment Statuses

```text
PENDING
IN_TRANSIT
DELIVERED
CANCELLED
```

Shipment history is recorded when shipment activity is updated.

Shipment cancellation also generates an operational alert.

---

# Maintenance Management

The maintenance module records vehicle maintenance activities.

## Endpoints

```text
POST /maintenance
GET  /maintenance
GET  /maintenance/{maintenance_id}
PUT  /maintenance/{maintenance_id}
```

Maintenance records include:

- Maintenance ID
- Vehicle ID
- Maintenance type
- Description
- Maintenance date
- Due date
- Cost
- Status

## Maintenance Statuses

```text
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED
```

---

# Fuel Management

The fuel module records vehicle fuel transactions.

## Endpoints

```text
POST /fuel
GET  /fuel
GET  /fuel/{fuel_id}
PUT  /fuel/{fuel_id}
```

Fuel records include:

- Fuel ID
- Vehicle ID
- Fuel date
- Fuel type
- Quantity
- Cost per unit
- Total cost
- Odometer reading

---

# Alert Management

The alert module provides operational alerts generated by the system.

## Endpoints

```text
GET /alerts
GET /alerts/{alert_id}
PUT /alerts/{alert_id}/resolve
```

Alert information includes:

- Alert ID
- Shipment ID
- Alert type
- Message
- Severity
- Status
- Created time
- Resolved time

Alerts can be resolved by authorized users.

---

# Trip Management

Milestone 2 introduces trip management functionality for logistics operations.

Trips provide a structured way to manage vehicle movement and route-related operations.

Trip functionality supports:

- Trip creation and management
- Vehicle association
- Route information
- Trip status
- Trip progress
- Shipment-related movement
- Route optimization integration

The trip system is backed by PostgreSQL and database migrations.

---

# Real-Time Shipment Tracking

FleetFlow provides real-time shipment tracking using WebSocket communication.

The tracking system connects the frontend to the FastAPI backend and receives live shipment location updates.

## Tracking Features

- Real-time GPS updates
- Live vehicle location
- Shipment tracking
- Current latitude
- Current longitude
- Delivery progress
- Shipment status
- Vehicle movement
- WebSocket connection status
- Map visualization

## WebSocket Tracking

Shipment tracking uses a WebSocket connection between the frontend and backend.

The frontend can establish a shipment-specific live tracking connection and receive location updates as the vehicle position changes.

The tracking interface displays the connection state so the operator can determine whether real-time updates are active.

Example tracking state:

```text
Live GPS Connection: CONNECTED
Real-time location updates: ACTIVE
Shipment Status: IN_TRANSIT
```

---

# GPS Tracking

Vehicles and shipments can store GPS-related information required for real-time tracking.

GPS tracking supports:

- Latitude
- Longitude
- Current vehicle position
- Shipment position
- Route progress
- Real-time movement

The tracking interface updates the displayed vehicle position as new GPS information is received.

---

# GPS Simulator

FleetFlow includes a GPS simulation utility for testing real-time tracking.

The simulator is available under:

```text
backend/tools/gps_simulator.py
```

The simulator allows the project to reproduce vehicle movement and GPS updates for development and testing.

This provides a controlled environment for validating:

- WebSocket connections
- Live GPS updates
- Shipment tracking
- Vehicle movement
- Delivery progress
- Map visualization

---

# Route Optimization

Milestone 2 introduces route optimization functionality.

The route optimization system is integrated into the logistics workflow and can process route optimization requests from the frontend.

## Route Optimization Features

- Route optimization
- Route recalculation
- Shipment route coordinates
- Route condition adjustment
- Optimization requests
- Backend optimization processing
- Frontend optimization controls

## Route Optimization Endpoints

```text
POST /route-optimizer/optimize
POST /route-optimizer/recalculate
```

The route optimization workflow includes traffic-condition adjustment logic.

It should not be interpreted as a direct live Google Maps or Waze traffic feed.

---

# Route Recalculation

Route recalculation allows the system to request an updated route for an existing logistics operation.

Example request flow:

```text
Frontend
   |
   v
Route Recalculation Request
   |
   v
FastAPI Backend
   |
   v
Route Optimizer
   |
   v
Updated Route
   |
   v
Frontend
```

The backend route recalculation endpoint has been verified successfully.

Example API verification:

```text
OPTIONS /route-optimizer/recalculate 200 OK
POST    /route-optimizer/recalculate 200 OK
```

---

# Route Optimization Verification

The route optimization workflow has been tested successfully.

Example API verification:

```text
OPTIONS /route-optimizer/optimize 200 OK
POST    /route-optimizer/optimize 200 OK
```

The frontend provides controls for initiating route optimization and route recalculation.

---

# Real-Time Tracking Verification

The real-time tracking workflow has been verified successfully.

Verified tracking behavior includes:

```text
Live GPS Connection: CONNECTED
Real-time location updates: ACTIVE
Shipment Status: IN_TRANSIT
Delivery Progress: LIVE
GPS Coordinates: LIVE
Vehicle Marker: MOVING
```

A tracked shipment was observed moving along its route with live GPS coordinates and delivery progress being updated.

The tracking interface displayed a vehicle position around:

```text
Latitude: 12.641563
Longitude: 77.514854
```

The vehicle marker progressed along the Bengaluru–Mysuru route during testing.

---

# Frontend

The frontend is implemented using React and Vite.

Axios is used to communicate with the FastAPI backend.

Milestone 2 extends the frontend with tracking, trips, route optimization, and real-time functionality.

## Frontend Modules

The following modules are implemented:

- Login
- Dashboard
- Vehicles
- Drivers
- Shipments
- Maintenance
- Fuel
- Alerts
- Tracking
- Trips
- Shipment Map
- Route Optimization

## Frontend Routes

Core routes include:

```text
/login
/
/vehicles
/drivers
/shipments
/maintenance
/fuel
/alerts
```

Milestone 2 adds frontend functionality for:

```text
/tracking
/trips
```

---

# Dashboard

The FleetFlow dashboard displays live information retrieved from the backend.

Current dashboard information includes:

- Active vehicles
- Active shipments
- Registered drivers
- Open alerts
- Vehicle status
- Shipment status
- Recent shipments
- Delivery progress

Dashboard statistics are calculated from live API responses rather than hard-coded values.

Milestone 2 extends the operational view with real-time tracking and logistics optimization capabilities.

---

# Frontend Authentication

The frontend uses the backend JWT authentication system.

After successful login:

1. The access token is stored locally.
2. User information is stored locally.
3. Axios automatically attaches the JWT to protected API requests.
4. The authenticated user's role is displayed in the application header.
5. Logout removes the stored authentication information.

---

# CORS Configuration

The FastAPI backend is configured to allow communication with the React development server.

Development origins:

```text
http://localhost:5173
http://127.0.0.1:5173
```

---

# Database

PostgreSQL is used as the primary relational database.

SQLAlchemy is used for ORM-based database access.

Alembic is used for database migrations.

The database contains the core entities required for:

- Users
- Vehicles
- Driver-vehicle assignments
- Shipments
- Shipment history
- Maintenance records
- Fuel records
- Alerts
- Trips
- GPS tracking information
- Route information

## Milestone 2 Database Changes

Milestone 2 introduced additional database migrations for:

- Vehicle GPS tracking fields
- Fuel tank capacity
- Shipment route coordinates
- Shipment GPS coordinates
- Trips

These migrations extend the original FleetFlow database structure to support real-time tracking and logistics optimization.

---

# API Documentation

When the backend server is running, FastAPI provides interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

OpenAPI specification:

```text
http://127.0.0.1:8000/openapi.json
```

Health check:

```text
http://127.0.0.1:8000/health
```

---

# Running the Backend

Navigate to the backend directory:

```powershell
cd backend
```

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Start the FastAPI development server:

```powershell
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

---

# Running the Frontend

Open a separate terminal and navigate to the frontend directory:

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

Frontend:

```text
http://localhost:5173
```

---

# Production Build

The frontend production build can be verified using:

```powershell
cd frontend
npm run build
```

---

# Testing and Verification

## Milestone 1 Verification

The following areas were verified during Milestone 1 development:

- Backend application import
- FastAPI route registration
- OpenAPI route generation
- PostgreSQL database connection
- Database migrations
- Authentication
- JWT-protected API requests
- Role-based authorization
- Vehicle management
- Driver management
- Driver-vehicle assignment
- Shipment management
- Shipment history
- Maintenance records
- Fuel records
- Alert management
- React frontend routing
- Axios API integration
- CORS communication
- Dashboard API integration
- Frontend production build

## Milestone 2 Verification

Milestone 2 functionality has been verified through backend and frontend testing.

Verified areas include:

- Real-time GPS tracking
- WebSocket connection
- Live shipment location updates
- Vehicle GPS movement
- Shipment delivery progress
- Shipment tracking visualization
- GPS simulation
- Trip functionality
- Route optimization
- Route recalculation
- Route optimization API
- Route recalculation API
- Frontend tracking interface
- Frontend route optimization controls
- Database migrations
- API integration

## Verified Backend Requests

The following requests were successfully verified:

```text
GET  /shipments
POST /route-optimizer/recalculate
POST /route-optimizer/optimize
```

Successful API responses included:

```text
OPTIONS /route-optimizer/recalculate 200 OK
POST    /route-optimizer/recalculate 200 OK

GET     /shipments 200 OK

OPTIONS /route-optimizer/optimize 200 OK
POST    /route-optimizer/optimize 200 OK
```

---

# Git and GitHub

The project uses Git for version control and GitHub as the remote repository.

Repository:

```text
manoj-cyb-45/Intelligent-Fleet-Management-and-Logistics-Operations-Optimization-Platform
```

## Main Branch

```text
main
```

## Milestone 2 Branch

```text
milestone-2-final
```

Milestone 2 was completed on the `milestone-2-final` branch and merged into `main`.

Milestone 2 commit:

```text
63b62c0 Unify KPI cards across management pages
```

The merge into `main` was completed successfully.

The final push to GitHub was also completed successfully.

Current repository state:

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

The `main` branch is synchronized with `origin/main`.

---

# Milestone 2 Completion Summary

## Completed

- Real-time GPS tracking
- WebSocket-based live tracking
- Shipment tracking
- Vehicle GPS tracking
- GPS simulation
- Trip management
- Shipment GPS coordinates
- Shipment route coordinates
- Vehicle GPS fields
- Route optimization
- Route recalculation
- Traffic-condition adjustment logic
- Tracking interface
- Shipment map
- Route optimization controls
- Additional database migrations
- Backend API integration
- Frontend real-time integration
- KPI card improvements
- Milestone 2 branch completion
- Milestone 2 merged into main
- GitHub synchronization

## Current State

```text
Backend                    COMPLETE
Database                   COMPLETE
Authentication             COMPLETE
Core APIs                  COMPLETE
Frontend                   COMPLETE
Dashboard                  COMPLETE
API Integration            COMPLETE
Real-Time Tracking         COMPLETE
WebSocket Tracking         COMPLETE
GPS Simulation             COMPLETE
Trip Management            COMPLETE
Route Optimization         COMPLETE
Route Recalculation        COMPLETE
Milestone 1                COMPLETE
Milestone 2                COMPLETE
GitHub                     SYNCHRONIZED
Main Branch                UP TO DATE
Working Tree               CLEAN
```

---

# Current Platform Capabilities

FleetFlow currently provides a centralized platform for:

- User authentication
- Role-based access control
- Vehicle management
- Driver management
- Driver-vehicle assignment
- Shipment management
- Shipment history
- Maintenance management
- Fuel management
- Alert management
- Operations dashboard
- Real-time vehicle tracking
- Real-time shipment tracking
- GPS simulation
- Trip management
- Route optimization
- Route recalculation
- Delivery progress monitoring

The platform has progressed from the core fleet management functionality of Milestone 1 to real-time tracking and logistics optimization functionality in Milestone 2.

---

# Future Development

Future milestones can extend FleetFlow with advanced operational and optimization capabilities such as:

- Fleet utilization analytics
- Fuel efficiency analytics
- Maintenance cost analytics
- Predictive maintenance
- ETA prediction
- Driver performance analytics
- Advanced alerting
- Operational reports
- Analytics dashboards
- Logistics optimization
- AI-assisted fleet decision support

These features are planned for future development and are not part of the completed Milestone 1 or Milestone 2 implementation.
