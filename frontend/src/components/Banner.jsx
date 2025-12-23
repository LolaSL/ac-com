import React from "react";

export default function Banner({
  title,
  imageSrc,
  linkText,
  onClick,
  description,
}) {
  return (
    <div className="banner-wrapper position-relative">
      <img src={imageSrc} alt="Banner" className="banner-image" />
      <div className="banner-overlay d-flex flex-column justify-content-center align-items-center">
        <div className="overlay-gradient"></div>
        <h1 className="banner-title fs-1 fw-bold mb-3 position-relative z-index-1">
          {title}
        </h1>
        {description && (
          <p className="banner-description fs-5 mb-4 position-relative z-index-1 text-center ">
            {description}
          </p>
        )}
        <button
          className="go-to-btn btn-text btn-lg position-relative z-index-1"
          onClick={onClick}
        >
          <span className="btn-text text-danger text-decoration-none">
            {linkText} <span className="btn-arrow">→</span>
          </span>
        </button>
      </div>
    </div>
  );
}
