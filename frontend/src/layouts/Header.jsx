import React, {  useContext } from "react";
import { Link } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import { Store } from "../Store.js";
import SearchBox from "../components/SearchBox.jsx";

function Header({ setSidebarIsOpen, sidebarIsOpen }) {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo, serviceProviderInfo, adminInfo } = state;

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
        <Container>
          <Button
            variant="secondary"
            onClick={() => setSidebarIsOpen(!sidebarIsOpen)}
            className="btn-toggle me-4"
          >
            <i className="fas fa-bars"></i>
          </Button>
          
          <Link to="/" className="navbar-brand">
            <h3>AC Commerce</h3>
            <p className="handwritten">Cooling Solutions For Every Space</p>
          </Link>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <div className="flex-grow-1 me-3">
              <SearchBox />
            </div>

            <Nav className="ms-auto me-4">
              {/* Cart Link */}
              <Link to="/cart" className="nav-link">
                Cart
                {cart.cartItems.length > 0 && (
                  <Badge pill bg="danger">
                    {cart.cartItems.reduce((a, c) => a + c.quantity, 0)}
                  </Badge>
                )}
              </Link>

              {/* User Menu */}
              {userInfo ? (
                <NavDropdown title={userInfo.name} id="basic-nav-dropdown">
                  <Link to="/profile" className="dropdown-item">
                    User Profile
                  </Link>
                  <Link to="/orderhistory" className="dropdown-item">
                    Order History
                  </Link>
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
                <Link className="nav-link" to="/signin">
                  User Login
                </Link>
              )}

              {/* Service Provider Menu */}
              {serviceProviderInfo ? (
                <NavDropdown
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

              {/* Admin Menu */}
              {adminInfo ? (
                <NavDropdown title="Admin" id="admin-nav-dropdown">
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
                  <Link to="/admin/sellers" className="dropdown-item">
                    Sellers
                  </Link>
                  <Link to="/admin/blogs-list" className="dropdown-item">
                    Blogs
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