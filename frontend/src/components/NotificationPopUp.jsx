import React from "react";
import Button from "react-bootstrap/esm/Button";
import Badge from "react-bootstrap/esm/Badge";
import "./NotificationPopUp.css";

const NotificationPopUp = ({ notification, buttonText, onButtonClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getNotificationVariant = (type) => {
    const variants = {
      info: "info",
      discount: "success",
      urgent: "danger",
      quote: "warning",
    };
    return variants[type] || "secondary";
  };

  return (
    <div className="notification-popup">
      <div className="popup-header mb-1">
        <h5 className="text-danger mb-0 fs-5" style={{ fontSize: "0.9rem" }}>{notification.title}</h5>
        {notification.type && (
          <Badge bg={getNotificationVariant(notification.type)} style={{ flexShrink: 0 }}>
            {notification.type}
          </Badge>
        )}
      </div>
      <p className="notification-paragraph my-2" style={{ fontSize: "0.82rem" }}>{notification.message}</p>
      <p className="small mb-2 notification-time" style={{ fontSize: "0.75rem" }}>
        {formatDate(notification.createdAt || notification.date)} at{" "}
        {formatTime(notification.createdAt || notification.date)}
      </p>
      <Button className="go-to-btn btn-text popup-btn" size="sm" onClick={onButtonClick}>
        {buttonText || "Close"}
      </Button>
    </div>
  );
};

export default NotificationPopUp;
