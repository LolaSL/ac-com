import React from "react";
import { Container, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./ROICalculatorPreview.css";

export default function ROICalculatorPreview() {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/roi-calculator");
  };

  return (
    <section className="roi-calculator-section">
      <Container>
        <div className="roi-header text-center mb-5">
          <h2 className="roi-title">Calculate Your ROI</h2>
          <p className="roi-subtitle">
            See how much you can save by switching to AC Commerce
          </p>
          <Button
            variant="primary"
            size="lg"
            className="calculator-cta mt-4"
            onClick={handleNavigate}
          >
            Go to ROI Calculator
          </Button>
        </div>
      </Container>
    </section>
  );
}
