import React from "react";

const NotificationPopUp = ({ notification, buttonText, onButtonClick }) => {
  return (
    <div className="notification-popup">
      <h3 className="text-danger">{notification.title}</h3>
      <p className="notification-paragraph">{notification.message}</p>
      <p>{new Date(notification.createdAt).toISOString().split('T')[0]}</p>
      <button onClick={onButtonClick}>{buttonText || "Close"}</button>
    </div>
  );
};

export default NotificationPopUp;
