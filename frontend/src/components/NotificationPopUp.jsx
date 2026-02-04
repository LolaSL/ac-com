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
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h3 className="text-danger mb-0">{notification.title}</h3>
        {notification.type && (
          <Badge bg={getNotificationVariant(notification.type)}>
            {notification.type}
          </Badge>
        )}
      </div>
      <p className="notification-paragraph my-3">{notification.message}</p>
      <p className="small mb-3 notification-time">
        {formatDate(notification.createdAt || notification.date)} at{" "}
        {formatTime(notification.createdAt || notification.date)}
      </p>
      <Button className="go-to-btn btn-text" onClick={onButtonClick}>
        {buttonText || "Close"}
      </Button>
    </div>
  );
};

export default NotificationPopUp;
