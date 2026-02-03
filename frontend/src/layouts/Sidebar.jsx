import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
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
        ></div>
      )}
      <div
        className={sidebarIsOpen ? "sidebar-modal active" : "sidebar-modal"}
      >
        <div className="d-flex justify-content-end p-3">
          <button
            className="btn btn-light btn-sm sidebar-close-btn"
            onClick={() => setSidebarIsOpen(false)}
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
                      e.preventDefault();
                      if (!userInfo) {
                        navigate(`/signin?redirect=/uploadfile`);
                      } else {
                        navigate("/uploadfile");
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
