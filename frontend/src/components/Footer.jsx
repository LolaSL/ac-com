import React, { useContext } from "react";
import NavLink from "react-bootstrap/NavLink";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store";
import "./Footer.css";

const Footer = () => {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const userInfo = state?.userInfo;

  const handleNavigation = (e, redirectPath) => {
    e.preventDefault();
    if (!userInfo) {
      navigate(`/signin?redirect=${redirectPath}`);
    } else {
      navigate(redirectPath);
    }
  };

  return (
    <>
      <footer className="container-fluid footer">
        <Row className="text-white p-4 g-4 justify-content-between">
          <Col xs={12} sm={6} lg={2} className="ft-1">
            <h4>AC-Commerce</h4>
            <hr />
            <p>
              We believe innovation transforms how we manage indoor and outdoor
              spaces.
            </p>
            <h5 className="follow-us">Follow Us</h5>
            <div className="footer-icons d-flex gap-2">
              <NavLink href="https://www.facebook.com" target="_blank">
                <i className="fa-brands fa-facebook"></i>
              </NavLink>
              <NavLink href="https://www.twitter.com" target="_blank">
                <i className="fa-brands fa-twitter"></i>
              </NavLink>
              <NavLink href="https://www.instagram.com" target="_blank">
                <i className="fa-brands fa-instagram"></i>
              </NavLink>
              <NavLink href="https://www.linkedin.com" target="_blank">
                <i className="fa-brands fa-linkedin-in"></i>
              </NavLink>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={2} className="ft-2">
            <h5>Quick Links</h5>
            <hr />
            <NavLink className="text-white d-block" href="/">
              Home
            </NavLink>
            <NavLink className="text-white d-block" href="/products">
              Products
            </NavLink>
            <NavLink className="text-white d-block" href="/search">
              Categories
            </NavLink>
            <NavLink
              className="text-white d-block"
              href="/measurement"
              onClick={(e) => handleNavigation(e, "/measurement")}
            >
              Get A Quote
            </NavLink>
            <NavLink
              className="text-white d-block"
              href="#"
              onClick={(e) => handleNavigation(e, "/roi-calculator")}
            >
              ROI Calculator
            </NavLink>
            <NavLink className="text-white d-block" href="/offers">
              Special Offers
            </NavLink>
          </Col>
          <Col xs={12} sm={6} lg={2} className="ft-2">
            <h5>Policies</h5>
            <hr />

            <NavLink className="text-white d-block" href="/shippment">
              Shipment & Delivery
            </NavLink>

            <NavLink className="text-white d-block" href="/returns">
              Returns
            </NavLink>
            <NavLink className="text-white d-block" href="/privacy-policy">
              Privacy Policy
            </NavLink>
            <NavLink className="text-white d-block" href="/terms-of-use">
              Terms of Use
            </NavLink>
            <NavLink className="text-white d-block" href="/cancellation-policy">
              Cancellation Policy
            </NavLink>
          </Col>
          <Col xs={12} sm={6} lg={2} className="ft-2">
            <h5>Company Info</h5>
            <hr />
            <NavLink className="text-white d-block" href="/about-us">
              About Us
            </NavLink>
            <NavLink className="text-white d-block" href="/sellers">
              Our Network
            </NavLink>
            <NavLink className="text-white d-block" href="/blogs">
              Blogs
            </NavLink>
            <NavLink className="text-white d-block" href="/contact">
              Contact Us
            </NavLink>
          </Col>
          <Col xs={12} sm={6} lg={2} className="ft-3">
            <h5>Company Address</h5>
            <hr />
            <p className="contact-item">
              <i className="fa-solid fa-phone-volume"></i>
              <a href="tel:+12515469442"> (251) 546 9442</a>
            </p>
            <p className="contact-item">
              <i className="fa-solid fa-phone-volume"></i>
              <a href="tel:+16304468851"> (630) 446 8851</a>
            </p>
            <div className="contact-item">
              <i className="fa-solid fa-envelope"></i>{" "}
              <span>
                <a href="mailto:support@accomhomesupply.com">Default Mail</a>
                {" | "}
                <a
                  href="https://mail.google.com/mail/?view=cm&to=support@accomhomesupply.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Gmail
                </a>
              </span>
            </div>

            <p className="contact-item">
              <i className="fa-solid fa-paper-plane"></i> 1234 Street Name
            </p>
            <p className="contact-item">
              <i className="fa-solid fa-paper-plane"></i> City, State, Zip Code
            </p>
          </Col>
        </Row>
        <div className="text-center">
          <Row className="d-flex justify-content-center">
            <div className="last-footer text-center">
              &copy; {new Date().getFullYear()} AC-Commerce. All rights reserved
            </div>
            <div className="footer-disclaimer">
              Brand names and logos are property of their respective owners. AC-Commerce is not affiliated with or endorsed by any brand displayed on this site.
            </div>
          </Row>
        </div>
      </footer>
    </>
  );
};

export default Footer;
