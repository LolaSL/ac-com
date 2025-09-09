import React from "react";
import Button from "react-bootstrap/esm/Button";

const NotificationPopUp = ({ notification, buttonText, onButtonClick }) => {
  return (
    <div className="notification-popup">
      <h3
        className="text-danger"
        style={{ textShadow: "1px 1px 3px rgba(83, 79, 79, 0.5)" }}
      >
        {notification.title}
      </h3>
      <p className="notification-paragraph">{notification.message}</p>
<p>
  {new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}{" "}
  at{" "}
  {new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}
</p>
     <Button className="go-to-btn btn-text" onClick={onButtonClick}>
        {buttonText || "Close"}
      </Button>
    </div>
  );
};

export default NotificationPopUp;
