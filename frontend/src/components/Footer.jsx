import React from "react";
import NavLink from "react-bootstrap/NavLink";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  const handleNavigation = (e) => {
    e.preventDefault();
    navigate("/signin?redirect=/uploadfile");
  };

  return (
    <>
      <footer className="container-fluid ">
        <Row className="bg-secondary text-white p-4">
          <Col className="col-md-6 col-lg-5 col-12 ft-1">
            <div>
              {" "}
              <i className="fa-solid fa-air-conditioner"></i>
              <h3>
                <span>AC</span> Commerce
              </h3>
              <p className="handwritten">Cooling Solutions For Every Space</p>
            </div>
            <p>
              {" "}
              We believe in the power of innovation to revolutionize the way we
              control and manage our indoor and outdoor spaces.
            </p>

            <div className="footer-icons d-flex mb-4">
              <NavLink
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa-brands fa-facebook"></i>
              </NavLink>
              <NavLink
                href="https://www.twitter.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa-brands fa-twitter"></i>
              </NavLink>
              <NavLink
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa-brands fa-instagram"></i>
              </NavLink>
              <NavLink
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa-brands fa-linkedin-in"></i>
              </NavLink>
            </div>
          </Col>
          <Col className="col-md-6 col-lg-3 col-12 ft-2 mb-4">
            <h5>Quick Links</h5>
            <NavLink className="text-white" href="/">
              Home
            </NavLink>
            <NavLink className="text-white" href="/about-us">
              About Us
            </NavLink>
            <NavLink className="text-white" href="/products">
              Products
            </NavLink>
            <NavLink
              className="text-white"
              href="/uploadfile"
              onClick={handleNavigation}
            >
              Get A Quote
            </NavLink>
            <NavLink
              className="text-white"
              href="/offers"
            >
              Offers
            </NavLink>
            <NavLink className="text-white" href="/sellers">
            Explore Suppliers
            </NavLink>
       

            <NavLink className="text-white" href="/blogs">
              Blogs
            </NavLink>
          </Col>
          <Col className="col-md-6 col-lg-4 col-12 ft-3">
            <h5>Contact</h5>
            <p className="contact-item">
              <i className="fa-solid fa-phone-volume"></i>
              <a href="tel:+12515469442"> (251) 546 9442</a>,
              <a href="tel:+16304468851"> (630) 446 8851</a>
            </p>
            <p className="contact-item">
              <i className="fa-solid fa-envelope"></i>
              <a href="mailto:info@example.com"> info@example.com</a>,
              <a href="mailto:contact@example.com"> contact@example.com</a>
            </p>
            <p className="contact-item">
              <i className="fa-solid fa-paper-plane"></i> 1234 Street Name
            </p>
            <p className="contact-item">
              <i className="fa-solid fa-paper-plane"></i> City, State, Zip Code
            </p>
          </Col>

          <div className="last-footer bg-secondary">
            <p className="text-center">
              &copy; {new Date().getFullYear()} AC Commerce. All rights reserved
            </p>
          </div>
        </Row>
      </footer>
    </>
  );
};

export default Footer;
