import React, { useContext, useEffect, useState } from "react";
import UsersProductSales from "../components/UsersProductSales.jsx";
import ServiceProviders from "../components/ServiceProviders.jsx";
import Notifications from "../components/Notifications.jsx";
import MessagesServiceProviders from "../components/MessagesServiceProviders.jsx";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store";
import "./DashboardPage.css";

const NAV_ITEMS = [
  { key: "Users Product Sales",     label: "Users & Sales",       icon: "fas fa-chart-bar" },
  { key: "ServiceProviders",         label: "Service Providers",   icon: "fas fa-hard-hat" },
  { key: "MessagesServiceProviders", label: "Messages",            icon: "fas fa-envelope" },
  { key: "Notification",             label: "Notifications",       icon: "fas fa-bell" },
];

function Dashboard() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state || {};

  const [activeComponent, setActiveComponent] = useState("Users Product Sales");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = adminInfo?.token || userInfo?.token;
    const isAdmin = adminInfo?.isAdmin || userInfo?.isAdmin;
    if (!token || !isAdmin) {
      navigate("/signin");
    }
  }, [adminInfo, userInfo, navigate]);

  function renderComponent() {
    switch (activeComponent) {
      case "Users Product Sales":      return <UsersProductSales />;
      case "ServiceProviders":         return <ServiceProviders />;
      case "MessagesServiceProviders": return <MessagesServiceProviders />;
      case "Notification":             return <Notifications />;
      default:                         return <div>Select a section</div>;
    }
  }

  const handleSelect = (key) => {
    setActiveComponent(key);
    setSidebarOpen(false);
  };

  const activeLabel = NAV_ITEMS.find((i) => i.key === activeComponent)?.label || "Menu";

  return (
    <div className="db-container">

      {/* Mobile toggle */}
      <div className="db-mobile-toggle d-md-none">
        <button
          className="db-toggle-btn"
          onClick={() => setSidebarOpen((p) => !p)}
          aria-expanded={sidebarOpen}
        >
          <i className="fas fa-bars me-2"></i>
          {activeLabel}
          <i className={`fas fa-chevron-${sidebarOpen ? "up" : "down"} ms-2 db-chevron`}></i>
        </button>

        {sidebarOpen && (
          <>
            <div className="db-overlay" onClick={() => setSidebarOpen(false)} />
            <div className="db-dropdown">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  className={"db-dropdown-item" + (activeComponent === item.key ? " active" : "")}
                  onClick={() => handleSelect(item.key)}
                >
                  <i className={item.icon + " db-item-icon"}></i>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="db-sidebar d-none d-md-flex">
        <h3 className="db-sidebar-title">
          <i className="fas fa-tachometer-alt me-2"></i>Dashboard
        </h3>
        <nav className="db-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={"db-nav-item" + (activeComponent === item.key ? " active" : "")}
              onClick={() => handleSelect(item.key)}
            >
              <i className={item.icon + " db-item-icon"}></i>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="db-main">
        {renderComponent()}
      </main>
    </div>
  );
}

export default Dashboard;
