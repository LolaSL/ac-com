import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Store } from "../Store.js";
import SearchBox from "../components/SearchBox.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import "./Header.css";

function Header({ setSidebarIsOpen, sidebarIsOpen }) {
  const { t } = useTranslation();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo, serviceProviderInfo, adminInfo } = state;

  const [unreadCount, setUnreadCount] = useState(0);
  const navRef = useRef(null);
  const location = useLocation();

  const authToken =
    userInfo?.token || adminInfo?.token || serviceProviderInfo?.token;

  const adminLinks = [
    { to: "/admin/dashboard", label: t("header.dashboard") },
    { to: "/admin/products", label: t("header.products") },
    { to: "/admin/orders", label: t("header.orders") },
    { to: "/admin/users", label: t("header.users") },
    { to: "/admin/manage-service-providers", label: t("header.spManagement") },
    { to: "/admin/payments", label: t("header.spDashboard") },
    { to: "/admin/sellers", label: t("header.sellers") },
    { to: "/admin/sellers/total-dashboard", label: t("header.sellerReferralDashboard") },
    { to: "/admin/blogs-list", label: t("header.blogs") },
    { to: "/admin/all-annotations", label: t("header.userFloorPlans") },
    { to: "/admin/hvac-zone-designer", label: t("header.hvacZoneDesigner") },
    { to: "/admin/newsletter", label: t("header.newsletter") },
    { to: "/admin/security", label: t("header.security") },
  ];

  const serviceProviderLinks = [
    { to: "/serviceprovider/dashboard", label: t("header.dashboard") },
    { to: `/serviceprovider/profile/${serviceProviderInfo?._id || ""}`, label: t("header.myProfile") },
    { to: "/serviceprovider/projects", label: t("header.projects") },
    { to: "/serviceprovider/hours", label: t("header.hours") },
    { to: "/serviceprovider/earnings", label: t("header.earnings") },
    { to: "/serviceprovider/messages", label: t("header.messages") },
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
            <h3>{t("appName")}</h3>
            <p className="handwritten">{t("tagline")}</p>
          </Link>

          <Link to="/" className="navbar-brand me-3 flex-shrink-0 d-none d-lg-block">
            <h3>{t("appName")}</h3>
            <p className="handwritten">{t("tagline")}</p>
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
                      title={t("header.notifications")}
                      aria-label={t("header.notifications")}
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
                        {t("header.cart")}
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
                          {t("header.checkout")}
                        </Badge>
                      ) : (
                        <Badge
                          pill
                          bg="secondary"
                          className="cart-badge-empty"
                        >
                          {t("header.empty")}
                        </Badge>
                      )}
                    </div>
                  )}
                  {!userInfo && !serviceProviderInfo && !adminInfo && (
                    <NavDropdown
                      title={t("header.login")}
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
                        {t("header.userLogin")}
                      </Link>
                      <Link className="dropdown-item" to="/serviceprovider/login">
                        <i className="fas fa-hard-hat me-2"></i>
                        {t("header.serviceProviderLogin")}
                      </Link>
                    </NavDropdown>
                  )}
                  <LanguageSwitcher />
                </Nav>
              </div>

              {(serviceProviderInfo || adminInfo) && (
                <div className="header-role-links-block">
                  {serviceProviderInfo ? (
                    <div
                      className="user-links-row d-flex align-items-center gap-2"
                      style={{ maxWidth: "100%", scrollbarWidth: "thin" }}
                    >
                      <span className="user-dropdown-title flex-shrink-0">
                        <i className="fas fa-hard-hat user-icon"></i>
                        <span className="user-name">{serviceProviderInfo.name}</span>
                      </span>
                      {serviceProviderLinks.map((link) => (
                        <Link key={link.to} to={link.to} className="nav-link text-nowrap px-2 py-1 rounded">
                          {link.label}
                        </Link>
                      ))}
                      <Link
                        className="nav-link text-nowrap px-2 py-1 rounded text-danger"
                        to="#signout"
                        onClick={serviceProviderSignoutHandler}
                      >
                        {t("header.logOut")}
                      </Link>
                    </div>
                  ) : null}
                  {adminInfo ? (
                    <div className="role-links-shell">
                      <div className="user-links-row role-links-row">
                        <span className="user-dropdown-title flex-shrink-0">
                          <i className="fas fa-user-shield user-icon"></i>
                          <span className="user-name">{t("header.admin")}</span>
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
                          {t("header.adminLogOut")}
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
                    {t("header.userProfile")}
                  </Link>
                  <Link
                    to="/measurement"
                    className="nav-link text-nowrap px-2 py-1 rounded d-flex align-items-center"
                  >
                    <span>{t("header.getQuote")}</span>
                    <Badge bg="danger" className="quote-badge-pulse ms-2">{t("footer.new")}</Badge>
                  </Link>
                  <Link to="/orderhistory" className="nav-link text-nowrap px-2 py-1 rounded">
                    {t("header.orderHistory")}
                  </Link>
                  <Link to="/recommendations" className="nav-link text-nowrap px-2 py-1 rounded">
                    <i className="fas fa-thumbs-up me-2"></i>
                    {t("header.recommendations")}
                  </Link>
                  <Link to="/wishlist" className="nav-link text-nowrap px-2 py-1 rounded">
                    <i className="fas fa-heart me-2 heart-icon"></i>
                    {t("header.myWishlist")}
                  </Link>
                  <Link to="/order-messages" className="nav-link text-nowrap px-2 py-1 rounded">
                    {t("header.orderMessages")}
                  </Link>
                  <Link to="/offers" className="nav-link text-nowrap px-2 py-1 rounded">
                    <i className="fas fa-tag me-2"></i>
                    {t("header.specialOffers")}
                  </Link>
                  <Link to="/browsing-history" className="nav-link text-nowrap px-2 py-1 rounded">
                    {t("header.browsingHistory")}
                  </Link>
                  <Link to="/my-reviews" className="nav-link text-nowrap px-2 py-1 rounded">
                    {t("header.myReviews")}
                  </Link>
                  {userInfo.referredBy && (
                    <Link
                      to={`/seller/dashboard/${userInfo.referredBy}`}
                      className="nav-link text-nowrap px-2 py-1 rounded"
                    >
                      <i className="fas fa-chart-line me-2"></i>
                      {t("header.referralDashboard")}
                    </Link>
                  )}
                  <Link
                    className="nav-link text-nowrap px-2 py-1 rounded text-danger"
                    to="#signout"
                    onClick={userSignoutHandler}
                  >
                    {t("header.signOut")}
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
