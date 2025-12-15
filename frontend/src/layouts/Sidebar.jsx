import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import { toast } from "react-toastify";
import { getError } from "../utils.js";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Sidebar({ sidebarIsOpen, setSidebarIsOpen }) {

  const [categories, setCategories] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navigate = useNavigate();
  
  const handleNavigation = (e) => {
    e.preventDefault();
    navigate("/signin?redirect=/uploadfile");
  };
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(`/api/products/categories`);
        setCategories(data);
      } catch (err) {
        toast.error(getError(err));
      }
    };
    fetchCategories();
  }, []);

  const sidebarItems = [
    { path: "/", label: "Home" },
    { path: "/about-us", label: "About Us" },
    { type: "categories", label: "Categories" }, // Categories marker
    { path: "/uploadfile", label: "Get A Quote" },
    { path: "/offers", label: "Offers" },
    { path: "/sellers", label: "Explore Suppliers" },
    { path: "/shipment", label: "Shipment & Delivery" },
    { path: "/returns", label: "Returns" },
    { path: "/privacy-policy", label: "Privacy Policy" },
    { path: "/terms-of-use", label: "Terms of Use" },
    { path: "/cancellation-policy", label: "Cancellation Policy" },
    { path: "/blogs", label: "Blogs" },
    { path: "/contact", label: "Contact Us" },
  ];

  const handleNavClick = () => {
    setSidebarIsOpen(false);
  };

  return (
    <div
      className={
        sidebarIsOpen
          ? "active-nav side-navbar d-flex justify-content-between flex-wrap flex-column"
          : "side-navbar d-flex justify-content-between flex-wrap flex-column"
      }
    >
      <Nav className="flex-column text-white w-100 p-4">
        {sidebarItems.map((item) => (
          <Nav.Item className="search-title me-auto mb-2" key={item.label}>
            {item.type === "categories" ? (
              <NavDropdown
                title={<strong>{item.label}</strong>}
                id="categories-dropdown"
                show={isDropdownOpen}
                onToggle={(isOpen) => setIsDropdownOpen(isOpen)}
              >
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <NavDropdown.Item
                      key={category}
                      as={Link}
                      to={`/search?category=${category}`}
                      onClick={() => {
                        setSidebarIsOpen(false);
                        setIsDropdownOpen(false);
                      }}
                      className="fw-bold"
                    >
                      {category}
                    </NavDropdown.Item>
                  ))
                ) : (
                  <NavDropdown.Item disabled>
                    Loading categories...
                  </NavDropdown.Item>
                )}
              </NavDropdown>
            ) : (
              <Link
                to={item.path}
                className="nav-link-side fw-bold"
                onClick={
                  item.path === "/uploadfile"
                    ? handleNavigation
                    : handleNavClick
                }
              >
                {item.label}
              </Link>
            )}
          </Nav.Item>
        ))}
      </Nav>
    </div>
  );
}

export default Sidebar;
