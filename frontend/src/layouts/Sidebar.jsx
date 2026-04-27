import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import { toast } from "react-toastify";
import { getError } from "../utils.js";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store.js";
import "./Sidebar.css";

function Sidebar({ sidebarIsOpen, setSidebarIsOpen }) {
  const { state } = useContext(Store);
  const isAdmin = !!state?.adminInfo && !!state?.adminInfo.token;
  const userInfo = state?.userInfo;

  const [categories, setCategories] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navigate = useNavigate();

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
    { path: "/sellers", label: "Our Suppliers" },
    { path: "/advanced-ac", label: "Advanced AC" },
    { type: "categories", label: "Categories" }, // Categories marker
    { path: "/measurement", label: "Get A Quote" },
    // { path: "/roi-calculator", label: "ROI Calculator" },
    { path: "/offers", label: "Special Offers" },
    { path: "/shipment", label: "Shipment & Delivery" },
    { path: "/returns", label: "Returns" },
    { path: "/privacy-policy", label: "Privacy Policy" },
    { path: "/terms-of-use", label: "Terms of Use" },
    { path: "/cancellation-policy", label: "Cancellation Policy" },
    { path: "/blogs", label: "Blogs" },
    { path: "/contact", label: "Contact Us" },
    ...(isAdmin
      ? [] // Removed admin-only All Annotated PDFs link from Sidebar
      : []),
  ];

  const handleNavClick = () => {
    setSidebarIsOpen(false);
  };

  return (
    <>
      {sidebarIsOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarIsOpen(false)}
        ></div>
      )}
      <div
        className={sidebarIsOpen ? "sidebar-modal active" : "sidebar-modal"}
      >
        <Nav className="flex-column text-white w-100 p-3">
          {sidebarItems.map((item) => (
            <Nav.Item className="sidebar-nav-item" key={item.label}>
              {item.type === "categories" ? (
                <div className="sidebar-accordion">
                  <button
                    className="sidebar-accordion-toggle"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    aria-expanded={isDropdownOpen}
                  >
                    <span>Categories</span>
                    <i
                      className={`fas fa-chevron-${
                        isDropdownOpen ? "up" : "down"
                      } sidebar-chevron`}
                    ></i>
                  </button>
                  {isDropdownOpen && (
                    <div className="sidebar-accordion-body">
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <Link
                            key={category}
                            to={`/search?category=${category}`}
                            className="sidebar-accordion-item"
                            onClick={() => {
                              setSidebarIsOpen(false);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <i className="fas fa-tag sidebar-tag-icon"></i>
                            {category}
                          </Link>
                        ))
                      ) : (
                        <span className="sidebar-accordion-item text-white-50">
                          Loading…
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path === "/roi-calculator" ? "#" : item.path}
                  className="nav-link-side fw-bold"
                  onClick={(e) => {
                    if (item.path === "/measurement") {
                      e.preventDefault();
                      if (!userInfo) {
                        navigate(`/signin?redirect=/measurement`);
                      } else {
                        navigate("/measurement");
                      }
                      setSidebarIsOpen(false);
                    } else if (item.path === "/roi-calculator") {
                      e.preventDefault();
                      if (!userInfo) {
                        navigate(`/signin?redirect=/roi-calculator`);
                      } else {
                        navigate("/roi-calculator");
                      }
                      setSidebarIsOpen(false);
                    } else {
                      handleNavClick();
                      if (item.path !== "#") {
                        navigate(item.path);
                      }
                    }
                  }}
                >
                  {item.label}
                </Link>
              )}
            </Nav.Item>
          ))}
        </Nav>
      </div>
    </>
  );
}

export default Sidebar;
