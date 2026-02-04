import React from "react";
import Spinner from "react-bootstrap/Spinner";
import "./LoadingBox.css";

export default function LoadingBox() {
  return (
    <div className="loading-box">
      <Spinner animation="border" role="status" className="loading-spinner">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}
