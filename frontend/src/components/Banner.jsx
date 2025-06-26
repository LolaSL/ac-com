import React from "react";
import { Link } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";

export default function Banner({ title, imageSrc, linkTo, linkText }) {
  return (
    <div className="banner-container position-relative mb-4 my-4">
      <Card className=" banner-card text-white text-center my-4 border-0 position-relative banner-card rounded-0">
        <Card.Img src={imageSrc} alt="Banner" className="responsive-banner" />
      <Card.ImgOverlay className="d-flex flex-column justify-content-start align-items-center pt-4">
          <Card.Title className=" banner-title fs-2 fw-bold ">
            {title}
          </Card.Title>
        </Card.ImgOverlay>
        <Card.Footer className="banner-footer bg-white text-center">
          <Button variant="light" className="go-to-btn btn-text">
            <Link
              to={linkTo}
              className="btn-text text-decoration-none text-dark"
            >
              {linkText} <span className="btn-arrow">→</span>
            </Link>
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
