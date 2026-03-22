import React from "react";
import { useNavigate } from "react-router-dom";
import "./ROICalculatorPreview.css";

export default function ROICalculatorPreview() {
  const navigate = useNavigate();

  return (
    <section className="roi-section">
      <div className="roi-container">
        <div className="roi-inner">
          <span className="roi-badge">ROI Calculator</span>
          <h2 className="roi-title">Calculate Your ROI</h2>
          <p className="roi-subtitle">
            See how much you can save by switching to AC-Commerce
          </p>
          <button className="roi-cta" onClick={() => navigate("/roi-calculator")}>
            <i className="fas fa-calculator me-2" />
            Go to ROI Calculator
          </button>
        </div>
      </div>
    </section>
  );
}
