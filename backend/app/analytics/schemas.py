from pydantic import BaseModel


class OperationalAnalytics(BaseModel):
    total_trips: int
    scheduled_trips: int
    in_progress_trips: int
    completed_trips: int
    cancelled_trips: int
    completion_rate: float


class FleetPerformance(BaseModel):
    total_vehicles: int
    available_vehicles: int
    active_vehicles: int
    maintenance_vehicles: int
    average_mileage: float
    average_fuel_level: float


class FuelAnalytics(BaseModel):
    total_records: int
    total_quantity: float
    total_cost: float
    average_cost_per_unit: float


class FleetUtilization(BaseModel):
    total_vehicles: int
    utilized_vehicles: int
    utilization_rate: float


class FuelConsumptionReport(BaseModel):
    vehicle_id: str
    total_quantity: float
    total_cost: float
    fuel_records: int


class DriverPerformance(BaseModel):
    driver_id: str
    total_trips: int
    completed_trips: int
    cancelled_trips: int
    completion_rate: float


class DeliveryPerformance(BaseModel):
    total_shipments: int
    delivered_shipments: int
    in_transit_shipments: int
    pending_shipments: int
    cancelled_shipments: int
    delivery_rate: float