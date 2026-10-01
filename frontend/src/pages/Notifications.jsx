import { useEffect, useState } from "react";
import api from "../services/api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notifications");
      setNotifications(response.data || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(
        err.response?.data?.detail ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await api.put(
        `/notifications/${notificationId}/read`
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification.notification_id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      console.error(
        "Failed to mark notification as read:",
        err
      );
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(
      (notification) => !notification.is_read
    );

    await Promise.all(
      unread.map((notification) =>
        markAsRead(notification.notification_id)
      )
    );
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const getTypeClass = (type) => {
    switch (type) {
      case "MAINTENANCE_DUE":
      case "MAINTENANCE_OVERDUE":
        return "notification-type maintenance";

      case "DRIVER_ASSIGNMENT":
        return "notification-type assignment";

      case "SHIPMENT_STATUS":
        return "notification-type shipment";

      case "DELIVERY":
        return "notification-type delivery";

      case "ROUTE_CHANGE":
        return "notification-type route";

      default:
        return "notification-type default";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "MAINTENANCE_DUE":
        return "Maintenance Due";

      case "MAINTENANCE_OVERDUE":
        return "Maintenance Overdue";

      case "DRIVER_ASSIGNMENT":
        return "Driver Assignment";

      case "SHIPMENT_STATUS":
        return "Shipment Status";

      case "DELIVERY":
        return "Delivery";

      case "ROUTE_CHANGE":
        return "Route Change";

      default:
        return type || "Notification";
    }
  };

  const formatDate = (value) => {
    if (!value) return "Unknown time";

    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="page-heading">
          <span className="eyebrow">COMMUNICATION CENTER</span>
          <h1>Notifications</h1>
          <p>Stay updated with fleet operations.</p>
        </div>

        <div className="notifications-loading">
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <span className="eyebrow">
            COMMUNICATION CENTER
          </span>

          <h1>Notifications</h1>

          <p>
            Stay updated with assignments, shipments,
            deliveries, routes and maintenance.
          </p>
        </div>

        <div className="notification-header-actions">
          <div className="notification-count">
            <strong>{unreadCount}</strong>
            <span>Unread</span>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="notification-mark-all"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="notification-error">
          <strong>Notifications unavailable</strong>
          <p>{error}</p>

          <button
            type="button"
            onClick={loadNotifications}
          >
            Try Again
          </button>
        </div>
      )}

      {!error && notifications.length === 0 && (
        <div className="notifications-empty">
          <div className="notifications-empty-icon">
            🔔
          </div>

          <h2>No notifications</h2>

          <p>
            You're all caught up. New fleet activity
            will appear here.
          </p>
        </div>
      )}

      {!error && notifications.length > 0 && (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <article
              key={notification.notification_id}
              className={`notification-card ${
                notification.is_read
                  ? "read"
                  : "unread"
              }`}
            >
              <div className="notification-icon">
                🔔
              </div>

              <div className="notification-content">
                <div className="notification-top">
                  <span
                    className={getTypeClass(
                      notification.notification_type
                    )}
                  >
                    {getTypeLabel(
                      notification.notification_type
                    )}
                  </span>

                  {!notification.is_read && (
                    <span className="unread-dot">
                      New
                    </span>
                  )}
                </div>

                <h2>{notification.title}</h2>

                <p>{notification.message}</p>

                <span className="notification-time">
                  {formatDate(notification.created_at)}
                </span>
              </div>

              {!notification.is_read && (
                <button
                  type="button"
                  onClick={() =>
                    markAsRead(
                      notification.notification_id
                    )
                  }
                  className="notification-read-button"
                >
                  Mark read
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;