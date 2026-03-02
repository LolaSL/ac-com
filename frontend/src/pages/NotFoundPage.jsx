import React from "react";
import { Link } from "react-router-dom";
import { FaExclamationTriangle, FaHome } from "react-icons/fa";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return (
    <div className="nf-page">
      <div className="nf-hero">
        <div className="nf-hero__inner">
          <div className="nf-hero__icon"><FaExclamationTriangle /></div>
          <h1 className="nf-hero__title">404 — Page Not Found</h1>
          <p className="nf-hero__sub">The page you're looking for doesn't exist or has been moved.</p>
        </div>
      </div>
      <div className="nf-inner">
        <p className="nf-message">
          Check the URL for typos, or head back to a page that exists.
        </p>
        <Link to="/" className="nf-home-btn">
          <FaHome className="me-2" />Go to Homepage
        </Link>
      </div>
    </div>
  );
}
