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

  const [unreadCount, setUnreadCount] = useState(0);
  const navRef = useRef(null);
  const location = useLocation();

  const authToken =
    userInfo?.token || adminInfo?.token || serviceProviderInfo?.token;

  const adminLinks = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/manage-service-providers", label: "SP Management" },
    { to: "/admin/payments", label: "SP Dashboard" },
    { to: "/admin/sellers", label: "Sellers" },
    { to: "/admin/sellers/total-dashboard", label: "Seller Referral Dashboard" },
    { to: "/admin/blogs-list", label: "Blogs" },
    { to: "/admin/all-annotations", label: "User Floor Plans" },
    { to: "/admin/hvac-zone-designer", label: "HVAC Zone Designer" },
    { to: "/admin/newsletter", label: "Newsletter" },
    { to: "/admin/security", label: "Security (MFA)" },
  ];

  const serviceProviderLinks = [
    { to: "/serviceprovider/dashboard", label: "Dashboard" },
    { to: `/serviceprovider/profile/${serviceProviderInfo?._id || ""}`, label: "My Profile" },
    { to: "/serviceprovider/projects", label: "Projects" },
    { to: "/serviceprovider/hours", label: "Hours" },
    { to: "/serviceprovider/earnings", label: "Earnings" },
    { to: "/serviceprovider/messages", label: "Messages" },
  ];

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
    const handleOutside = () => {
      // No-op: dropdown state is no longer used after switching to visible button rows.
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
    <header
      className={`header-nav${
        userInfo || serviceProviderInfo || adminInfo ? " has-auth-links" : ""
      }`}
    >
      <Navbar className="navbar" expand="lg" ref={navRef}>
        <Container fluid className="header-container">
          <Button
            variant="secondary"
            onClick={() => setSidebarIsOpen(!sidebarIsOpen)}
            className="btn-toggle me-3 w-auto flex-shrink-0"
          >
            <i className="fas fa-bars"></i>
          </Button>

          <Link to="/" className="navbar-brand me-3 flex-shrink-1 d-lg-none">
            <h3>AC-Commerce</h3>
            <p className="handwritten">Cooling Solutions For Every Space</p>
          </Link>

          <Link to="/" className="navbar-brand me-3 flex-shrink-0 d-none d-lg-block">
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
                  {!adminInfo && !serviceProviderInfo && (
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
                  )}
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

              {(serviceProviderInfo || adminInfo) && (
                <div className="header-role-links-block">
                  {serviceProviderInfo ? (
                    <div className="role-links-shell">
                      <div className="user-links-row role-links-row">
                        <span className="user-dropdown-title flex-shrink-0">
                          <i className="fas fa-hard-hat user-icon"></i>
                          <span className="user-name">{serviceProviderInfo.name}</span>
                        </span>
                        {serviceProviderLinks.slice(0, 3).map((link) => (
                          <Link key={link.to} to={link.to} className="nav-link text-nowrap px-2 py-1 rounded">
                            {link.label}
                          </Link>
                        ))}
                      </div>
                      <div className="user-links-row role-links-row">
                        {serviceProviderLinks.slice(3).map((link) => (
                          <Link key={link.to} to={link.to} className="nav-link text-nowrap px-2 py-1 rounded">
                            {link.label}
                          </Link>
                        ))}
                        <Link
                          className="nav-link text-nowrap px-2 py-1 rounded text-danger"
                          to="#signout"
                          onClick={serviceProviderSignoutHandler}
                        >
                          Log Out
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {adminInfo ? (
                    <div className="role-links-shell">
                      <div className="user-links-row role-links-row">
                        <span className="user-dropdown-title flex-shrink-0">
                          <i className="fas fa-user-shield user-icon"></i>
                          <span className="user-name">Admin</span>
                        </span>
                        {adminLinks.slice(0, 7).map((link) => (
                          <Link key={link.to} to={link.to} className="nav-link text-nowrap px-2 py-1 rounded">
                            {link.label}
                          </Link>
                        ))}
                      </div>
                      <div className="user-links-row role-links-row">
                        {adminLinks.slice(7).map((link) => (
                          <Link key={link.to} to={link.to} className="nav-link text-nowrap px-2 py-1 rounded">
                            {link.label}
                          </Link>
                        ))}
                        <Link
                          className="nav-link text-nowrap px-2 py-1 rounded text-danger"
                          to="#adminlogout"
                          onClick={adminLogoutHandler}
                        >
                          Admin Log Out
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

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
