import React, { useContext, useEffect, useState } from "react";
import UsersProductSales from "../components/UsersProductSales.jsx";
import ServiceProviders from "../components/ServiceProviders.jsx";
import Notifications from "../components/Notifications.jsx";
import MessagesServiceProviders from "../components/MessagesServiceProviders.jsx";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Row, Col } from "react-bootstrap";
import { Store } from "../Store";
import "./DashboardPage.css";
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
    <div className="sidebar-toggle d-md-none position-relative">
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="toggle-button"
        aria-expanded={sidebarOpen}
        aria-controls="dashboard-sidebar"
      >
        ☰ Menu
      </Button>
      {sidebarOpen && (
        <div
          id="dashboard-sidebar"
          className="sidebar-dropdown position-absolute top-100 start-0 w-100 bg-white border shadow-sm"
          style={{ zIndex: 1050 }}
        >
          {renderSidebarContent()}
        </div>
      )}
    </div>

    <div className="sidebar d-none d-md-flex" id="dashboard-sidebar">
      {renderSidebarContent()}
    </div>

    <div className="main-content">
      <Row className="mb-3 quick-actions-bar">
        <Col>
          <Card className="p-3 border-0 bg-light">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="fw-semibold text-muted small">Quick Actions:</span>
              <Button variant="outline-secondary" size="sm" onClick={() => setActiveComponent("Notification")}>
                <i className="bi bi-envelope me-1"></i> View Notifications
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
      {renderComponent()}
    </div>
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
