import React, { useState } from "react";
import UsersProductSales from "../components/UsersProductSales.jsx";
import ServiceProviders from "../components/ServiceProviders.jsx";
import Notifications from "../components/Notifications.jsx";
import MessagesServiceProviders from "../components/MessagesServiceProviders.jsx";


export default function DashboardPage() {

  const [activeComponent, setActiveComponent] = useState("Users Product Sales");
  
  const renderComponent = () => {
    switch (activeComponent) {
      case "Users Product Sales":
        return <UsersProductSales />;
      case "ServiceProviders":
        return <ServiceProviders />;
      case "MessagesServiceProviders":
        return <MessagesServiceProviders />;
      case "Notification":
        return <Notifications />;
      default:
        return <UsersProductSales />;
    }
  };

  return (

      <div className="dashboard-container">
        <div className="sidebar">
          <h3>Dashboard</h3>
          <ul>
            <li>
              <button
                className={
                  activeComponent === "Users Product Sales"
                    ? "active"
                    : "btn-outline"
                }
                onClick={() => setActiveComponent("Users Product Sales")}
              >
                Users Product Sales
              </button>
            </li>
            <li>
              <button
                className={activeComponent === "ServiceProviders" ? "active" : ""}
                onClick={() => setActiveComponent("ServiceProviders")}
              >
                Service Providers
              </button>
            </li>
            <li>
              <button
                className={
                  activeComponent === "MessagesServiceProviders" ? "active" : ""
                }
                onClick={() => setActiveComponent("MessagesServiceProviders")}
              >
                Messages of Service Providers
              </button>
            </li>
            <li>
              <button
                className={activeComponent === "Notification" ? "active" : ""}
                onClick={() => setActiveComponent("Notification")}
              >
                Notifications
              </button>
            </li>
          </ul>
        </div>
        <div className="main-content">{renderComponent()}</div>
      </div>
 
  );
}
