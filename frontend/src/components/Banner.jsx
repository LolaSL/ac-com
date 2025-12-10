import React from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";

export default function Banner({ title, imageSrc, linkText, onClick }) {
  return (
    <div className="banner-container position-relative mb-4 my-4 overflow-hidden">
      <Card className="banner-card text-white text-center my-4 border-0 position-relative banner-card rounded-0">
        <Card.Img src={imageSrc} alt="Banner" className="responsive-banner" />
        <Card.ImgOverlay className="d-flex flex-column justify-content-start align-items-center pt-4">
          <Card.Title className="banner-title fs-2 fw-bold">{title}</Card.Title>
        </Card.ImgOverlay>
        <Card.Footer className="banner-footer bg-white text-center">
          <Button
            className="go-to-btn btn-text"
            onClick={onClick}
          >
            <span className="btn-text text-dark text-decoration-none">
              {linkText} <span className="btn-arrow">→</span>
            </span>
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
