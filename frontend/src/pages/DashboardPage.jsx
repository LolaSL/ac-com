import React, { useState } from "react";
import UsersProductSales from "../components/UsersProductSales.jsx";
import ServiceProviders from "../components/ServiceProviders.jsx";
import Notifications from "../components/Notifications.jsx";
import MessagesServiceProviders from "../components/MessagesServiceProviders.jsx";
import { Link } from "react-router";
function Dashboard() {
  const [activeComponent, setActiveComponent] = useState("Users Product Sales");
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  function renderComponent() {
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
        return <div>Select a component</div>;
    }
  }
  return (
    <div className="dashboard-container">
      <div className="sidebar-toggle d-md-none">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="toggle-button"
        >
          ☰ Menu
        </button>
        {sidebarOpen && (
          <div className="sidebar-dropdown">{renderSidebarContent()}</div>
        )}
      </div>

      <div className="sidebar d-none d-md-flex">{renderSidebarContent()}</div>

      <div className="main-content">{renderComponent()}</div>
    </div>
  );

  function renderSidebarContent() {
    return (
      <>
        <h3 className="mb-4">Dashboard</h3>
        <ul>
          {[
            "Users Product Sales",
            "ServiceProviders",
            "MessagesServiceProviders",
            "Notification",
          ].map((item) => (
            <li key={item}>
              <Link
                to="#"
                className={activeComponent === item ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveComponent(item);
                  setSidebarOpen(false);
                }}
              >
                {item.replace(/([A-Z])/g, " $1").trim()}
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }
}
export default Dashboard;
