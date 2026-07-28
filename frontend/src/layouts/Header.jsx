import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import axios from "axios";
import { Store } from "../Store.js";
import SearchBox from "../components/SearchBox.jsx";
import "./Header.css";

function Header({ setSidebarIsOpen, sidebarIsOpen }) {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo, serviceProviderInfo, adminInfo } = state;

  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navRef = useRef(null);
  const location = useLocation();

  const authToken =
    userInfo?.token || adminInfo?.token || serviceProviderInfo?.token;

  // Fetch unread notifications count for the bell badge
  useEffect(() => {
    let cancelled = false;

    const fetchUnread = async () => {
      if (!authToken) {
        setUnreadCount(0);
        return;
      }
      try {
        const { data } = await axios.get("/api/notifications", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!cancelled && Array.isArray(data)) {
          setUnreadCount(data.filter((n) => !n.isRead).length);
        }
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };

    fetchUnread();
    // Poll every 60s so the badge stays fresh without being aggressive
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authToken, location.pathname]);

  // Close dropdowns on outside click/touch (mobile fix for onMouseLeave)
  useEffect(() => {
    const handleOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setProviderDropdownOpen(false);
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, []);

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
      <Navbar className="navbar" expand="lg" ref={navRef}>
        <Container fluid className="header-container">
          <Button
            variant="secondary"
            onClick={() => setSidebarIsOpen(!sidebarIsOpen)}
            className="btn-toggle me-4 w-auto"
          >
            <i className="fas fa-bars"></i>
          </Button>

          <Link to="/" className="navbar-brand me-4">
            <h3>AC-Commerce</h3>
            <p className="handwritten">Cooling Solutions For Every Space</p>
          </Link>

          <Navbar.Toggle aria-controls="basic-navbar-nav" className="account-toggler">
            <i className="fas fa-user-circle"></i>
            <i className="fas fa-chevron-down chevron"></i>
          </Navbar.Toggle>
          <Navbar.Collapse
            id="basic-navbar-nav"
            className="justify-content-start"
          >
            <div className="header-nav-stack w-100">
              <div className="header-top-row">
                <div className="flex-grow-1 me-3 search-wrapper">
                  <SearchBox />
                </div>
                <Nav className="header-top-actions align-items-center gap-3 ms-auto me-4">
                  {authToken && (
                    <Link
                      to={adminInfo ? "/admin/dashboard/notification" : "/notifications"}
                      className={`notification-bell${
                        location.pathname === "/notifications" ||
                        location.pathname === "/admin/dashboard/notification"
                          ? " active-link"
                          : ""
                      }`}
                      title="Notifications"
                      aria-label="Notifications"
                    >
                      <i className="fas fa-bell"></i>
                      {unreadCount > 0 && (
                        <span className="notification-bell-badge">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <div className="d-flex align-items-center gap-1 cart-wrapper">
                    <Link
                      to="/cart"
                      className={`text-decoration-none d-flex nav-link cart-link${location.pathname === '/cart' ? ' active-link' : ''}`}
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
                        className="cart-badge-checkout"
                      >
                        Checkout
                      </Badge>
                    ) : (
                      <Badge
                        pill
                        bg="secondary"
                        className="cart-badge-empty"
                      >
                        Empty
                      </Badge>
                    )}
                  </div>
                  {serviceProviderInfo ? (
                    <div className="user-links-row d-flex align-items-center gap-2">
                      <span className="user-dropdown-title flex-shrink-0">
                        <i className="fas fa-hard-hat user-icon"></i>
                        <span className="user-name">{serviceProviderInfo.name}</span>
                      </span>
                      <Link to="/serviceprovider/dashboard" className="nav-link text-nowrap px-2 py-1 rounded">
                        Dashboard
                      </Link>
                      <Link
                        to={`/serviceprovider/profile/${serviceProviderInfo._id}`}
                        className="nav-link text-nowrap px-2 py-1 rounded"
                      >
                        My Profile
                      </Link>
                      <Link to="/serviceprovider/projects" className="nav-link text-nowrap px-2 py-1 rounded">
                        Projects
                      </Link>
                      <Link to="/serviceprovider/hours" className="nav-link text-nowrap px-2 py-1 rounded">
                        Hours
                      </Link>
                      <Link to="/serviceprovider/earnings" className="nav-link text-nowrap px-2 py-1 rounded">
                        Earnings
                      </Link>
                      <Link to="/serviceprovider/messages" className="nav-link text-nowrap px-2 py-1 rounded">
                        Messages
                      </Link>
                      <Link
                        className="nav-link text-nowrap px-2 py-1 rounded text-danger"
                        to="#signout"
                        onClick={serviceProviderSignoutHandler}
                      >
                        Log Out
                      </Link>
                    </div>
                  ) : null}
                  {adminInfo ? (
                    <div className="user-links-row d-flex align-items-center gap-2">
                      <span className="user-dropdown-title flex-shrink-0">
                        <i className="fas fa-user-shield user-icon"></i>
                        <span className="user-name">Admin</span>
                      </span>
                      <Link to="/admin/dashboard" className="nav-link text-nowrap px-2 py-1 rounded">
                        Dashboard
                      </Link>
                      <Link to="/admin/products" className="nav-link text-nowrap px-2 py-1 rounded">
                        Products
                      </Link>
                      <Link to="/admin/orders" className="nav-link text-nowrap px-2 py-1 rounded">
                        Orders
                      </Link>
                      <Link to="/admin/users" className="nav-link text-nowrap px-2 py-1 rounded">
                        Users
                      </Link>
                      <Link to="/admin/manage-service-providers" className="nav-link text-nowrap px-2 py-1 rounded">
                        Service Providers
                      </Link>
                      <Link to="/admin/payments" className="nav-link text-nowrap px-2 py-1 rounded">
                        Service Providers Dashboard
                      </Link>
                      <Link to="/admin/sellers" className="nav-link text-nowrap px-2 py-1 rounded">
                        Sellers
                      </Link>
                      <Link to="/admin/sellers/total-dashboard" className="nav-link text-nowrap px-2 py-1 rounded">
                        Seller Referral Dashboard
                      </Link>
                      <Link to="/admin/blogs-list" className="nav-link text-nowrap px-2 py-1 rounded">
                        Blogs
                      </Link>
                      <Link to="/admin/all-annotations" className="nav-link text-nowrap px-2 py-1 rounded">
                        User Floor Plans
                      </Link>
                      <Link to="/admin/hvac-zone-designer" className="nav-link text-nowrap px-2 py-1 rounded">
                        HVAC Zone Designer
                      </Link>
                      <Link to="/admin/newsletter" className="nav-link text-nowrap px-2 py-1 rounded">
                        Newsletter
                      </Link>
                      <Link to="/admin/security" className="nav-link text-nowrap px-2 py-1 rounded">
                        Security (MFA)
                      </Link>
                      <Link
                        className="nav-link text-nowrap px-2 py-1 rounded text-danger"
                        to="#adminlogout"
                        onClick={adminLogoutHandler}
                      >
                        Admin Log Out
                      </Link>
                    </div>
                  ) : null}
                  {!userInfo && !serviceProviderInfo && !adminInfo && (
                    <NavDropdown
                      title="Login"
                      id="login-nav-dropdown"
                      align="end"
                      className="login-dropdown"
                    >
                      <Link
                        className="dropdown-item flex"
                        to={`/signin?redirect=${encodeURIComponent(
                          location.pathname + location.search
                        )}`}
                      >
                        <i className="fas fa-user me-2"></i>
                        User Login
                      </Link>
                      <Link className="dropdown-item" to="/serviceprovider/login">
                        <i className="fas fa-hard-hat me-2"></i>
                        Service Provider Login
                      </Link>
                    </NavDropdown>
                  )}
                </Nav>
              </div>

              {userInfo ? (
                <div
                  className="user-links-row d-flex align-items-center gap-2"
                  style={{ maxWidth: "100%", scrollbarWidth: "thin" }}
                >
                  <span className="user-dropdown-title flex-shrink-0">
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

                  <Link to="/profile" className="nav-link text-nowrap px-2 py-1 rounded">
                    User Profile
                  </Link>
                  <Link
                    to="/measurement"
                    className="nav-link text-nowrap px-2 py-1 rounded d-flex align-items-center"
                  >
                    <span>Get A Quote</span>
                    <Badge bg="danger" className="quote-badge-pulse ms-2">NEW</Badge>
                  </Link>
                  <Link to="/orderhistory" className="nav-link text-nowrap px-2 py-1 rounded">
                    Order History
                  </Link>
                  <Link to="/recommendations" className="nav-link text-nowrap px-2 py-1 rounded">
                    <i className="fas fa-thumbs-up me-2"></i>
                    Recommendations
                  </Link>
                  <Link to="/wishlist" className="nav-link text-nowrap px-2 py-1 rounded">
                    <i className="fas fa-heart me-2 heart-icon"></i>
                    My Wishlist
                  </Link>
                  <Link to="/order-messages" className="nav-link text-nowrap px-2 py-1 rounded">
                    Order Messages
                  </Link>
                  <Link to="/offers" className="nav-link text-nowrap px-2 py-1 rounded">
                    <i className="fas fa-tag me-2"></i>
                    Special Offers
                  </Link>
                  <Link to="/browsing-history" className="nav-link text-nowrap px-2 py-1 rounded">
                    Browsing History
                  </Link>
                  <Link to="/my-reviews" className="nav-link text-nowrap px-2 py-1 rounded">
                    My Reviews
                  </Link>
                  {userInfo.referredBy && (
                    <Link
                      to={`/seller/dashboard/${userInfo.referredBy}`}
                      className="nav-link text-nowrap px-2 py-1 rounded"
                    >
                      <i className="fas fa-chart-line me-2"></i>
                      Referral Dashboard
                    </Link>
                  )}
                  <Link
                    className="nav-link text-nowrap px-2 py-1 rounded text-danger"
                    to="#signout"
                    onClick={userSignoutHandler}
                  >
                    Sign Out
                  </Link>
                </div>
              ) : null}
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
}

export default Header;
