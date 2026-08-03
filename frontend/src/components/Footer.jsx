import React, { useContext } from "react";
import NavLink from "react-bootstrap/NavLink";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Store } from "../Store";
import "./Footer.css";

const Footer = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
            <h4>{t("appName")}</h4>
            <hr />
            <p>
             {t("footer.about")}
            </p>
            <h5 className="follow-us">{t("footer.followUs")}</h5>
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
            <h5>{t("footer.quickLinks")}</h5>
            <hr />
            <NavLink className="text-white d-block" href="/">
              {t("footer.home")}
            </NavLink>
            <NavLink className="text-white d-block" href="/products">
              {t("footer.products")}
            </NavLink>
            <NavLink className="text-white d-block" href="/search">
              {t("footer.categories")}
            </NavLink>
            <NavLink
              className="text-white d-block"
              href="/measurement"
              onClick={(e) => handleNavigation(e, "/measurement")}
            >
              {t("footer.getQuote")} <Badge bg="danger" className="quote-badge-pulse ms-1">{t("footer.new")}</Badge>
            </NavLink>
            {/* <NavLink
              className="text-white d-block"
              href="#"
              onClick={(e) => handleNavigation(e, "/roi-calculator")}
            >
              ROI Calculator
            </NavLink> */}
            <NavLink className="text-white d-block" href="/offers">
              {t("footer.specialOffers")}
            </NavLink>
          </Col>
          <Col xs={12} sm={6} lg={2} className="ft-2">
            <h5>{t("footer.policies")}</h5>
            <hr />

            <NavLink className="text-white d-block" href="/shipment">
              {t("footer.shipmentDelivery")}
            </NavLink>

            <NavLink className="text-white d-block" href="/returns">
              {t("footer.returns")}
            </NavLink>
            <NavLink className="text-white d-block" href="/privacy-policy">
              {t("footer.privacyPolicy")}
            </NavLink>
            <NavLink className="text-white d-block" href="/terms-of-use">
              {t("footer.termsOfUse")}
            </NavLink>
            <NavLink className="text-white d-block" href="/cancellation-policy">
              {t("footer.cancellationPolicy")}
            </NavLink>
          </Col>
          <Col xs={12} sm={6} lg={2} className="ft-2">
            <h5>{t("footer.companyInfo")}</h5>
            <hr />
            <NavLink className="text-white d-block" href="/about-us">
              {t("footer.aboutUs")}
            </NavLink>
            <NavLink className="text-white d-block" href="/sellers">
             {t("footer.ourSuppliers")}
            </NavLink>
            <NavLink className="text-white d-block" href="/advanced-ac">
              {t("footer.advancedAc")}
            </NavLink>
            <NavLink className="text-white d-block" href="/blogs">
              {t("footer.blogs")}
            </NavLink>
            <NavLink className="text-white d-block" href="/contact">
              {t("footer.contactUs")}
            </NavLink>
          </Col>
          <Col xs={12} sm={6} lg={2} className="ft-3">
            <h5>{t("footer.companyAddress")}</h5>
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
                <a
                  href="mailto:accomhomesupply.support@gmail.com"
                  onClick={(e) => {
                    // On large screens, open Gmail web since no desktop mail client may be set
                    if (window.innerWidth > 768) {
                      e.preventDefault();
                      window.open('https://mail.google.com/mail/?view=cm&fs=1&to=accomhomesupply.support@gmail.com&su=Support%20Request', '_blank', 'noopener,noreferrer');
                    }
                  }}
                >{t("footer.defaultMail")}</a>
                {" | "}
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=accomhomesupply.support@gmail.com&su=Support%20Request"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    // On mobile, use mailto instead of Gmail web interface
                    if (window.innerWidth <= 768) {
                      e.preventDefault();
                      window.location.href = 'mailto:accomhomesupply.support@gmail.com';
                    }
                  }}
                >
                  {t("footer.gmail")}
                </a>
              </span>
            </div>

            <p className="contact-item">
              <i className="fa-solid fa-paper-plane"></i> {t("footer.addressLine1")}
            </p>
            <p className="contact-item">
              <i className="fa-solid fa-paper-plane"></i> {t("footer.addressLine2")}
            </p>
          </Col>
        </Row>
        <div className="text-center">
          <Row className="d-flex justify-content-center">
            <div className="last-footer text-center">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </div>
            <div className="footer-disclaimer">
              {t("footer.disclaimer")}
            </div>
          </Row>
        </div>
      </footer>
    </>
  );
};

export default Footer;
