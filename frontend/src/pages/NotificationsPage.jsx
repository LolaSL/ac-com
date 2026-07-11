import React, { useContext, useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Store } from "../Store.js";
import "./NotificationsPage.css";
const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

const typeIcon = (type) => {
  switch (type) {
    case "urgent":
      return "fas fa-exclamation-triangle";
    case "discount":
      return "fas fa-tag";
    case "quote":
      return "fas fa-file-invoice-dollar";
    case "success":
      return "fas fa-check-circle";
    default:
      return "fas fa-bell";
  }
};

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
};

export default function NotificationsPage() {
  const { state } = useContext(Store);
  const { userInfo, adminInfo, serviceProviderInfo } = state;
  const navigate = useNavigate();

  const token =
    userInfo?.token || adminInfo?.token || serviceProviderInfo?.token;

  // Admins have their own management page — redirect to avoid duplication.
  useEffect(() => {
    if (adminInfo) {
      navigate("/admin/dashboard/notification", { replace: true });
    }
  }, [adminInfo, navigate]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const resolveLink = useCallback(
    async (n) => {
      if (n.link) return n.link;

      const orderMatch =
        n.message && n.message.match(/#([a-zA-Z0-9]{6})/);
      if (orderMatch) {
        try {
          const { data } = await axios.get(
            `/api/orders/by-short-id/${orderMatch[1]}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return adminInfo
            ? `/admin/order/${data.orderId}`
            : `/order/${data.orderId}`;
        } catch {
          return null;
        }
      }

      if (n.title === "Get A Quote")
        return userInfo || adminInfo || serviceProviderInfo
          ? "/measurement"
          : "/signin?redirect=/measurement";
      if (n.title === "Discount Offer") return "/offers";
      if (n.recipientType === "serviceProvider")
        return "/serviceprovider/messages";

      if (adminInfo) return "/admin/dashboard";
      if (serviceProviderInfo) return "/serviceprovider/dashboard";
      return "/profile";
    },
    [token, userInfo, adminInfo, serviceProviderInfo]
  );

  const markAsRead = useCallback(
    async (id) => {
      try {
        await axios.put(
          `/api/notifications/${id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        // silent
      }
    },
    [token]
  );

  const handleClick = async (n) => {
    setBusyId(n._id);
    if (!n.isRead) await markAsRead(n._id);
    const link = await resolveLink(n);
    setBusyId(null);
    if (link) navigate(link);
  };

  const markAllRead = async () => {
    try {
      await axios.put(
        "/api/notifications/mark-all-read",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to mark all as read"
      );
    }
  };

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    if (filter === "read") return notifications.filter((n) => n.isRead);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  if (!token) {
    return (
      <div className="notifications-page">
        <div className="notifications-empty">
          <i className="fas fa-lock"></i>
          <p>Please sign in to view your notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1>
            <i className="fas fa-bell me-2"></i>
            Notifications
          </h1>
          <p className="notifications-sub">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You are all caught up."}
          </p>
        </div>
        <div className="notifications-actions">
          <button
            className="btn-refresh"
            onClick={fetchNotifications}
            disabled={loading}
            title="Refresh"
          >
            <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`}></i>
          </button>
          <button
            className="btn-mark-all"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>
      </div>

      <div className="notifications-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-chip ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === "unread" && unreadCount > 0 && (
              <span className="chip-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="notifications-loading">
          <i className="fas fa-spinner fa-spin"></i> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="notifications-empty">
          <i className="far fa-bell-slash"></i>
          <p>No notifications to show.</p>
        </div>
      ) : (
        <ul className="notifications-list">
          {filtered.map((n) => (
            <li
              key={n._id}
              className={`notification-item ${n.isRead ? "read" : "unread"} type-${n.type || "info"}`}
              onClick={() => handleClick(n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClick(n);
              }}
            >
              <div className="notification-icon">
                <i className={typeIcon(n.type)}></i>
              </div>
              <div className="notification-body">
                <div className="notification-title-row">
                  <h3 className="notification-title">{n.title}</h3>
                  {!n.isRead && <span className="unread-dot" />}
                </div>
                <p className="notification-message">{n.message}</p>
                <span className="notification-date">
                  {formatDate(n.createdAt)}
                </span>
              </div>
              {busyId === n._id && (
                <div className="notification-busy">
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
