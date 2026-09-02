import asyncio

from fastapi import WebSocket


class ShipmentConnectionManager:
    """
    Manages active WebSocket connections for shipment tracking.

    Each shipment can have multiple connected clients.
    For example:
        - Dispatcher dashboard
        - Manager dashboard
        - Driver application
    """

    def __init__(self):
        self.connections: dict[
            str,
            set[WebSocket],
        ] = {}

        self.lock = asyncio.Lock()

    async def connect(
        self,
        shipment_id: str,
        websocket: WebSocket,
    ):
        await websocket.accept()

        async with self.lock:
            if shipment_id not in self.connections:
                self.connections[shipment_id] = set()

            self.connections[
                shipment_id
            ].add(websocket)

    async def disconnect(
        self,
        shipment_id: str,
        websocket: WebSocket,
    ):
        async with self.lock:
            connections = self.connections.get(
                shipment_id
            )

            if not connections:
                return

            connections.discard(websocket)

            if not connections:
                self.connections.pop(
                    shipment_id,
                    None,
                )

    async def broadcast(
        self,
        shipment_id: str,
        message: dict,
    ):
        async with self.lock:
            connections = list(
                self.connections.get(
                    shipment_id,
                    set(),
                )
            )

        disconnected = []

        for websocket in connections:
            try:
                await websocket.send_json(
                    message
                )
            except Exception:
                disconnected.append(
                    websocket
                )

        for websocket in disconnected:
            await self.disconnect(
                shipment_id,
                websocket,
            )


shipment_connection_manager = (
    ShipmentConnectionManager()
)