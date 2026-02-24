import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import { Store } from "../Store.js";
import SearchBox from "../components/SearchBox.jsx";
import "./Header.css";

function Header({ setSidebarIsOpen, sidebarIsOpen }) {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo, serviceProviderInfo, adminInfo } = state;

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

  const userSignoutHandler = () => {
    ctxDispatch({ type: "USER_SIGNOUT" });
    localStorage.removeItem("userInfo");
    localStorage.removeItem("shippingAddress");
    localStorage.removeItem("paymentMethod");
    window.location.href = "/";
  };

  const serviceProviderSignoutHandler = () => {
    ctxDispatch({ type: "SERVICE_PROVIDER_SIGNOUT" });
    localStorage.removeItem("serviceProviderInfo");
    window.location.href = "/";
  };

  const adminLogoutHandler = () => {
    ctxDispatch({ type: "ADMIN_LOGOUT" });
    localStorage.removeItem("adminInfo");
    window.location.href = "/";
  };

  return (
    <header className="header-nav">
      <Navbar className="navbar" expand="lg">
        <Container fluid className="header-container">
          <Button
            variant="secondary"
            onClick={() => setSidebarIsOpen(!sidebarIsOpen)}
            className="btn-toggle me-4 w-auto"
          >
            <i className="fas fa-bars"></i>
          </Button>

          <Link to="/" className="navbar-brand me-4">
            <h3>AC Commerce</h3>
            <p className="handwritten">Cooling Solutions For Every Space</p>
          </Link>

          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse
            id="basic-navbar-nav"
            className="justify-content-start"
          >
            <div className="flex-grow-1 me-3 search-wrapper">
              <SearchBox />
            </div>
            <Nav className=" align-items-center gap-3 ms-auto me-4">
              <div
                className="d-flex align-items-center gap-1"
                style={{
                  flexWrap: "nowrap",
                }}
              >
                <Link
                  to="/cart"
                  className="text-decoration-none d-flex nav-link "
                  style={{ whiteSpace: "nowrap" }}
                >
                  Cart
                </Link>
                {cart.cartItems.length > 0 ? (
                  <Badge
                    bg="danger"
                    role="button"
                    onClick={() =>
                      (window.location.href = "/signin?redirect=/shipping")
                    }
                    style={{
                      whiteSpace: "nowrap",
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.5rem",
                    }}
                  >
                    Checkout
                  </Badge>
                ) : (
                  <Badge
                    pill
                    bg="secondary"
                    style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}
                  >
                    Empty
                  </Badge>
                )}
              </div>
              {userInfo ? (
                <NavDropdown
                  show={userDropdownOpen}
                  onToggle={setUserDropdownOpen}
                  onMouseLeave={() => setUserDropdownOpen(false)}
                  title={
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {userInfo.avatar ? (
                        <img
                          src={userInfo.avatar}
                          alt={userInfo.name}
                          className="user-avatar"
                        />
                      ) : (
                        <i className="fas fa-user-circle user-icon"></i>
                      )}
                      <span className="user-name">{userInfo.name}</span>
                    </span>
                  }
                  id="basic-nav-dropdown"
                >
                  <Link to="/profile" className="dropdown-item ">
                    User Profile
                  </Link>
                  <Link to="/uploadfile" className="dropdown-item">
                    Get A Quote
                  </Link>
                  <Link to="/roi-calculator" className="dropdown-item">
                    ROI Calculator
                  </Link>
                  <Link to="/orderhistory" className="dropdown-item">
                    Order History
                  </Link>
                  <Link to="/wishlist" className="dropdown-item">
                    <i className="fas fa-heart me-2 heart-icon"></i>
                    My Wishlist
                  </Link>
                  <Link to="/order-messages" className="dropdown-item">
                    Order Messages
                  </Link>
                  <Link to="/offers" className="dropdown-item">
                    Offers
                  </Link>
                  <Link to="/browsing-history" className="dropdown-item">
                    Browsing History
                  </Link>
                  <Link to="/my-reviews" className="dropdown-item">
                    My Reviews
                  </Link>
                  {userInfo.referredBy && (
                    <Link
                      to={`/seller/dashboard/${userInfo.referredBy}`}
                      className="dropdown-item"
                    >
                      <i className="fas fa-chart-line me-2"></i>
                      Referral Dashboard
                    </Link>
                  )}
                  <NavDropdown.Divider />
                  <Link
                    className="dropdown-item"
                    to="#signout"
                    onClick={userSignoutHandler}
                  >
                    Sign Out
                  </Link>
                </NavDropdown>
              ) : (
                <Link
                  className="nav-link"
                  to={`/signin?redirect=${encodeURIComponent(
                    window.location.pathname + window.location.search
                  )}`}
                >
                  User Login
                </Link>
              )}
              {serviceProviderInfo ? (
                <NavDropdown
                  show={providerDropdownOpen}
                  onToggle={setProviderDropdownOpen}
                  onMouseLeave={() => setProviderDropdownOpen(false)}
                  title={serviceProviderInfo.name}
                  id="provider-nav-dropdown"
                >
                  <Link
                    to={`/serviceprovider/profile/${serviceProviderInfo._id}`}
                    className="dropdown-item"
                  >
                    Service Provider Profile
                  </Link>
                  <Link
                    to="/serviceprovider/projects"
                    className="dropdown-item"
                  >
                    Projects
                  </Link>
                  <Link to="/serviceprovider/hours" className="dropdown-item">
                    Hours
                  </Link>
                  <Link
                    to="/serviceprovider/earnings"
                    className="dropdown-item"
                  >
                    Earnings
                  </Link>
                  <Link
                    to="/serviceprovider/messages"
                    className="dropdown-item"
                  >
                    Messages
                  </Link>
                  <NavDropdown.Divider />
                  <Link
                    className="dropdown-item"
                    to="#signout"
                    onClick={serviceProviderSignoutHandler}
                  >
                    Log Out
                  </Link>
                </NavDropdown>
              ) : (
                <Link className="nav-link" to="/serviceprovider/login">
                  Service Provider Login
                </Link>
              )}
              {adminInfo ? (
                <NavDropdown
                  show={adminDropdownOpen}
                  onToggle={setAdminDropdownOpen}
                  onMouseLeave={() => setAdminDropdownOpen(false)}
                  title="Admin"
                  id="admin-nav-dropdown"
                >
                  <Link to="/admin/dashboard" className="dropdown-item">
                    Dashboard
                  </Link>

                  <Link to="/admin/products" className="dropdown-item">
                    Products
                  </Link>
                  <Link to="/admin/orders" className="dropdown-item">
                    Orders
                  </Link>
                  <Link to="/admin/users" className="dropdown-item">
                    Users
                  </Link>
                  <Link
                    to="/admin/manage-service-providers"
                    className="dropdown-item"
                  >
                    Service Providers
                  </Link>
                  <Link to="/admin/payments" className="dropdown-item">
                    <i className="fas fa-chart-bar me-2"></i>
                    Service Providers Dashboard
                  </Link>
                  <Link to="/admin/sellers" className="dropdown-item">
                    Sellers
                  </Link>
                  <Link
                    to="/admin/sellers/total-dashboard"
                    className="dropdown-item"
                  >
                    <i className="fas fa-chart-bar me-2"></i>
                    Seller Referral Dashboard
                  </Link>
                  <Link to="/admin/blogs-list" className="dropdown-item">
                    Blogs
                  </Link>
                  <Link to="/admin/all-annotations" className="dropdown-item">
                    Users Drawings
                  </Link>
                  <NavDropdown.Divider />
                  <Link
                    className="dropdown-item"
                    to="#adminlogout"
                    onClick={adminLogoutHandler}
                  >
                    Admin Log Out
                  </Link>
                </NavDropdown>
              ) : (
                <Link className="nav-link" to="/admin-login">
                  Admin Login
                </Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
}

export default Header;
