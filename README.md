# FleetFlow

## Intelligent Fleet Management & Logistics Operations Optimization Platform

FleetFlow is an AI-powered fleet management and logistics platform developed as part of the **Infosys Internship 7.0** program. It helps organizations manage vehicles, drivers, fleet operations, and logistics through a modern web-based dashboard built with **React**, **FastAPI**, and **PostgreSQL**.

---

## Project Overview

FleetFlow provides a centralized platform to:

* Monitor fleet operations in real time
* Manage vehicles and drivers
* Track logistics workflows
* Monitor maintenance status
* View operational analytics through a live dashboard
* Build a scalable foundation for shipment tracking and AI-based route optimization

---

## Milestone 1 Status

**Status:** Completed

### Implemented Features

* React + Vite Frontend
* FastAPI Backend
* PostgreSQL Integration
* JWT Authentication
* Driver Management (CRUD)
* Vehicle Management (CRUD)
* Dynamic Fleet Dashboard
* Responsive UI
* Axios API Integration
* FastAPI Swagger Documentation

---

## Current Dashboard

The dashboard includes:

* Live Vehicle Count
* Live Driver Count
* Dynamic Maintenance Count
* Dynamic Alerts
* Interactive Cyber-style UI
* Responsive Dashboard Cards
* Fleet Analytics Components

---

## Core Modules

| Module                 | Status    |
| ---------------------- | --------- |
| Authentication         | Completed |
| Driver Management      | Completed |
| Vehicle Management     | Completed |
| Fleet Dashboard        | Completed |
| Shipment Tracking      | Planned   |
| Route Optimization     | Planned   |
| Maintenance Management | Planned   |
| Reports & Export       | Planned   |

---

## Technology Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* React Router
* Axios
* Framer Motion

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* Alembic

### Database

* PostgreSQL

### Future Integrations

* Google Maps API
* WebSockets
* Redis
* Celery
* Docker
* Cloud Deployment

---

## System Architecture

```text
                    USERS
                      │
                      ▼
              React Frontend
            (Vite + Tailwind)
                      │
                Axios API Calls
                      │
                      ▼
               FastAPI Backend
                      │
                SQLAlchemy ORM
                      │
                      ▼
                 PostgreSQL
```

---

## Project Structure

```text
FleetFlow/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── assets/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routes/
│   │   └── schemas/
│   ├── main.py
│   └── requirements.txt
│
├── docs/
├── README.md
└── .gitignore
```

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd Intelligent-Fleet-Management-and-Logistics-Operations-Optimization-Platform
```

---

## Backend Setup

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## API Endpoints

Current APIs include:

* Authentication
* Driver CRUD
* Vehicle CRUD
* Dashboard Data

Swagger automatically documents all endpoints.

---

## Milestone Roadmap

### Milestone 1 (Completed)

* Project Initialization
* Authentication
* Driver Management
* Vehicle Management
* Dynamic Dashboard

### Milestone 2

* Shipment Tracking
* Google Maps Integration
* Route Optimization
* ETA Calculation
* WebSocket Live Tracking

### Milestone 3

* Maintenance Scheduling
* Fleet Analytics
* Fuel Monitoring
* Background Jobs

### Milestone 4

* Testing
* Docker Deployment
* Cloud Deployment
* Documentation
* Final Presentation

---

## Team

**Infosys Internship 7.0 – FleetFlow Team**

**Mentor**

Ankit Kumar Tripathy
Data Scientist

---

## License

This project is licensed under the MIT License.
