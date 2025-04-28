import React from "react";
import { Link } from "react-router-dom";
import Image from "react-bootstrap/Image";

export default function Banner({ title, imageSrc, paragraph, linkTo, linkText}) {
  return (
    <div className="banner-container position-relative mb-4 my-4">
      <div className="text-center text-white position-absolute top-50 start-50 translate-middle">
        <h1 className="banner-title mb-3">{title}</h1>
        <p className="banner-paragraph mb-4 fw-bold">{paragraph}</p>
        <Link to={linkTo} className="btn btn-secondary  btn-banner">
          {linkText}
        </Link>
      </div>
      <Image
        className="w-100 responsive-banner"
        src={imageSrc}
        alt="Banner"
      />
    </div>
  );
}
