import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import { toast } from "react-toastify";
import { getError } from "../utils.js";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store.js";

function Sidebar({ sidebarIsOpen, setSidebarIsOpen }) {
  const { state } = useContext(Store);
  const isAdmin = !!state?.adminInfo && !!state?.adminInfo.token;
  const userInfo = state?.userInfo;

  const [categories, setCategories] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navigate = useNavigate();

  const handleNavigation = (e, redirectPath) => {
    e.preventDefault();
    if (!userInfo) {
      navigate(`/signin?redirect=${redirectPath}`);
    } else {
      setSidebarIsOpen(false);
    }
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
    { path: "/sellers", label: "Our Network" },
    { type: "categories", label: "Categories" }, // Categories marker
    { path: "/uploadfile", label: "Get A Quote" },
    { path: "/roi-calculator", label: "ROI Calculator" },
    { path: "/offers", label: "Offers" },
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
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1040,
            transition: "opacity 0.3s ease",
          }}
        ></div>
      )}
      <div
        className={sidebarIsOpen ? "sidebar-modal active" : "sidebar-modal"}
        style={{
          position: "fixed",
          top: 0,
          left: sidebarIsOpen ? 0 : "-300px",
          width: "300px",
          height: "100%",
          backgroundColor: "#868d9c",
          zIndex: 1050,
          transition: "left 0.3s ease",
          boxShadow: sidebarIsOpen ? "2px 0 10px rgba(0,0,0,0.3)" : "none",
          overflowY: "auto",
        }}
      >
        <div className="d-flex justify-content-end p-3">
          <button
            className="btn btn-light btn-sm"
            onClick={() => setSidebarIsOpen(false)}
            style={{ borderRadius: "50%", width: "40px", height: "40px" }}
          >
            ×
          </button>
        </div>
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
                  to={item.path === "/roi-calculator" ? "#" : item.path}
                  className="nav-link-side fw-bold"
                  onClick={(e) => {
                    if (item.path === "/uploadfile") {
                      handleNavigation(e, "/uploadfile");
                    } else if (item.path === "/roi-calculator") {
                      handleNavigation(e, "/roi-calculator");
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
