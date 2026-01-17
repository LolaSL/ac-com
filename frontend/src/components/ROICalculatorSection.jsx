import React, { useState, useContext } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store";
import "./ROICalculatorSection.css";

export default function ROICalculatorSection() {
  const [projectSize, setProjectSize] = useState(5000);
  const [installationTime, setInstallationTime] = useState(7);
  const [teamSize, setTeamSize] = useState(3);
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;

  // Calculation logic for ROI
  const traditionalCost =
    projectSize * 0.15 + installationTime * 500 * teamSize;
  const acCommerceCost = projectSize * 0.08 + installationTime * 300 * teamSize;
  const savings = traditionalCost - acCommerceCost;
  const roi = ((savings / acCommerceCost) * 100).toFixed(1);
  const timeReduction = (
    (1 - (installationTime * 0.6) / installationTime) *
    100
  ).toFixed(0);

  const handleGetDetailedReport = () => {
    if (!userInfo) {
      navigate("/signin?redirect=/roi-calculator");
      return;
    }

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
        </div>

        <Row className="align-items-center">
          {/* Calculator Form */}
          <Col lg={6} md={12} className="mb-4 mb-lg-0">
            <Card className="calculator-card">
              <Card.Body>
                <Form>
                  {/* Project Size Slider */}
                  <Form.Group className="mb-4">
                    <Form.Label className="calculator-label">
                      Average Project Value
                    </Form.Label>
                    <div className="slider-container">
                      <Form.Range
                        value={projectSize}
                        onChange={(e) => setProjectSize(Number(e.target.value))}
                        min={1000}
                        max={50000}
                        step={1000}
                        className="calculator-slider"
                      />
                      <div className="slider-value">
                        ${projectSize.toLocaleString()}
                      </div>
                    </div>
                  </Form.Group>

                  {/* Installation Time */}
                  <Form.Group className="mb-4">
                    <Form.Label className="calculator-label">
                      Average Installation Time (days)
                    </Form.Label>
                    <div className="slider-container">
                      <Form.Range
                        value={installationTime}
                        onChange={(e) =>
                          setInstallationTime(Number(e.target.value))
                        }
                        min={1}
                        max={30}
                        step={1}
                        className="calculator-slider"
                      />
                      <div className="slider-value">
                        {installationTime} days
                      </div>
                    </div>
                  </Form.Group>

                  {/* Team Size */}
                  <Form.Group className="mb-4">
                    <Form.Label className="calculator-label">
                      Team Size
                    </Form.Label>
                    <div className="slider-container">
                      <Form.Range
                        value={teamSize}
                        onChange={(e) => setTeamSize(Number(e.target.value))}
                        min={1}
                        max={20}
                        step={1}
                        className="calculator-slider"
                      />
                      <div className="slider-value">{teamSize} people</div>
                    </div>
                  </Form.Group>

                  <Button
                    variant="primary"
                    size="lg"
                    className="calculator-cta w-100"
                    onClick={handleGetDetailedReport}
                  >
                    Get Detailed ROI Report
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Results Display */}
          <Col lg={6} md={12}>
            <div className="results-container">
              <div className="result-card primary-result">
                <div className="result-icon">💰</div>
                <div className="result-value">
                  $
                  {savings.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <div className="result-label">Annual Savings</div>
              </div>

              <Row>
                <Col md={6} xs={12} className="mb-3">
                  <div className="result-card secondary-result">
                    <div className="result-icon">📈</div>
                    <div className="result-value">{roi}%</div>
                    <div className="result-label">ROI Increase</div>
                  </div>
                </Col>
                <Col md={6} xs={12} className="mb-3">
                  <div className="result-card secondary-result">
                    <div className="result-icon">⏱️</div>
                    <div className="result-value">{timeReduction}%</div>
                    <div className="result-label">Time Saved</div>
                  </div>
                </Col>
              </Row>

              <div className="savings-breakdown">
                <h5 className="breakdown-title">Cost Comparison</h5>
                <div className="breakdown-item">
                  <span className="breakdown-label">Traditional Method:</span>
                  <span className="breakdown-cost traditional">
                    $
                    {traditionalCost.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">AC Commerce Platform:</span>
                  <span className="breakdown-cost platform">
                    $
                    {acCommerceCost.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="breakdown-item highlight">
                  <span className="breakdown-label">You Save:</span>
                  <span className="breakdown-cost savings">
                    $
                    {savings.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
