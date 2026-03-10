import React, { useState, useContext } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store";
import "./ROICalculatorSection.css";

export default function ROICalculatorSection() {
  const [propertyType, setPropertyType] = useState("residential-single");
  const [projectSize, setProjectSize] = useState(5000);
  const [installationTime, setInstallationTime] = useState(7);
  const [teamSize, setTeamSize] = useState(3);
  const [numberOfUnits, setNumberOfUnits] = useState(1);
  const [maintenanceFrequency, setMaintenanceFrequency] = useState(1);
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;

  // Property type configurations
  const propertyConfigs = {
    "residential-single": {
      label: "Residential (Single Unit)",
      description: "Apartment, villa, or individual property",
      costMultiplier: { traditional: 0.15, acCommerce: 0.08 },
      laborCost: { traditional: 500, acCommerce: 300 },
      timeReductionFactor: 0.6,
      minProjectSize: 1000,
      maxProjectSize: 50000,
      minInstallationTime: 1,
      maxInstallationTime: 30,
    },
    "residential-multi": {
      label: "Residential (Multi-Unit)",
      description: "Multi-flat development with bulk pricing",
      costMultiplier: { traditional: 0.12, acCommerce: 0.05 },
      laborCost: { traditional: 400, acCommerce: 200 },
      timeReductionFactor: 0.65, // Better efficiency with multiple units
      minProjectSize: 10000,
      maxProjectSize: 500000,
      minInstallationTime: 14,
      maxInstallationTime: 180,
    },
    "industrial-commercial": {
      label: "Industrial/Commercial Property",
      description: "Large-scale buildings with complex systems",
      costMultiplier: { traditional: 0.18, acCommerce: 0.09 },
      laborCost: { traditional: 800, acCommerce: 400 },
      timeReductionFactor: 0.7, // Best efficiency at scale
      minProjectSize: 50000,
      maxProjectSize: 1000000,
      minInstallationTime: 30,
      maxInstallationTime: 365,
    },
  };

  const config = propertyConfigs[propertyType];

  // Calculation logic for ROI based on property type
  const calculateROI = () => {
    const equipmentTrad = projectSize * config.costMultiplier.traditional;
    const laborTrad =
      installationTime * config.laborCost.traditional * teamSize;
    const maintenanceTrad =
      propertyType === "industrial-commercial"
        ? projectSize * 0.05 * maintenanceFrequency
        : 0;

    const equipmentAcc = projectSize * config.costMultiplier.acCommerce;
    const laborAcc = installationTime * config.laborCost.acCommerce * teamSize;
    const maintenanceAcc =
      propertyType === "industrial-commercial"
        ? projectSize * 0.02 * maintenanceFrequency
        : 0;

    let baseTradCost = equipmentTrad + laborTrad + maintenanceTrad;
    let baseAccCost = equipmentAcc + laborAcc + maintenanceAcc;

    // Apply multi-unit adjustments
    let totalTradCost = baseTradCost;
    let totalAccCost = baseAccCost;

    if (propertyType === "residential-multi") {
      const coordinationOverhead = 1.05;
      totalTradCost = baseTradCost * numberOfUnits * coordinationOverhead;
      totalAccCost = baseAccCost * numberOfUnits * coordinationOverhead * 0.9;
    }

    return {
      equipmentTrad,
      laborTrad,
      maintenanceTrad,
      equipmentAcc,
      laborAcc,
      maintenanceAcc,
      baseTradCost,
      baseAccCost,
      traditionalCost: totalTradCost,
      acCommerceCost: totalAccCost,
    };
  };

  const breakdown = calculateROI();
  const { traditionalCost, acCommerceCost } = breakdown;
  const savings = traditionalCost - acCommerceCost;
  const roi = ((savings / acCommerceCost) * 100).toFixed(1);
  const timeReduction = (
    (1 - (installationTime * config.timeReductionFactor) / installationTime) *
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
          <h2 className="section-title">Calculate Your ROI</h2>
          <p className="roi-subtitle">
            See how much you can save by switching to AC-Commerce
          </p>
        </div>

        <Row className="align-items-center">
          {/* Calculator Form */}
          <Col lg={6} md={12} className="mb-4 mb-lg-0">
            <Card className="calculator-card">
              <Card.Body>
                <Form>
                  {/* Property Type Selector */}
                  <Form.Group className="mb-4">
                    <Form.Label className="calculator-label">
                      Property Type
                    </Form.Label>
                    <Form.Select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="calculator-select"
                    >
                      <option value="residential-single">
                        Residential (Single Unit)
                      </option>
                      <option value="residential-multi">
                        Residential (Multi-Unit)
                      </option>
                      <option value="industrial-commercial">
                        Industrial/Commercial Property
                      </option>
                    </Form.Select>
                    <small className="text-muted">{config.description}</small>
                  </Form.Group>

                  {/* Project Size Slider */}
                  <Form.Group className="mb-4">
                    <Form.Label className="calculator-label">
                      {propertyType === "industrial-commercial"
                        ? "Total Project Value"
                        : "Average Project Value"}
                    </Form.Label>
                    <div className="slider-container">
                      <Form.Range
                        value={projectSize}
                        onChange={(e) => setProjectSize(Number(e.target.value))}
                        min={config.minProjectSize}
                        max={config.maxProjectSize}
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
                      {propertyType === "industrial-commercial"
                        ? "Implementation Time (days)"
                        : "Average Installation Time (days)"}
                    </Form.Label>
                    <div className="slider-container">
                      <Form.Range
                        value={installationTime}
                        onChange={(e) =>
                          setInstallationTime(Number(e.target.value))
                        }
                        min={config.minInstallationTime}
                        max={config.maxInstallationTime}
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

                  {/* Multi-Unit Selector (for residential-multi) */}
                  {propertyType === "residential-multi" && (
                    <Form.Group className="mb-4">
                      <Form.Label className="calculator-label">
                        Number of Units
                      </Form.Label>
                      <div className="slider-container">
                        <Form.Range
                          value={numberOfUnits}
                          onChange={(e) =>
                            setNumberOfUnits(Number(e.target.value))
                          }
                          min={2}
                          max={100}
                          step={1}
                          className="calculator-slider"
                        />
                        <div className="slider-value">
                          {numberOfUnits} units
                        </div>
                      </div>
                    </Form.Group>
                  )}

                  {/* Maintenance Frequency (for industrial-commercial) */}
                  {propertyType === "industrial-commercial" && (
                    <Form.Group className="mb-4">
                      <Form.Label className="calculator-label">
                        Annual Maintenance Cycles
                      </Form.Label>
                      <div className="slider-container">
                        <Form.Range
                          value={maintenanceFrequency}
                          onChange={(e) =>
                            setMaintenanceFrequency(Number(e.target.value))
                          }
                          min={1}
                          max={12}
                          step={1}
                          className="calculator-slider"
                        />
                        <div className="slider-value">
                          {maintenanceFrequency}x per year
                        </div>
                      </div>
                    </Form.Group>
                  )}

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
                <div className="result-label">
                  {propertyType === "residential-multi"
                    ? `Annual Savings (${numberOfUnits} units)`
                    : propertyType === "industrial-commercial"
                    ? "Annual Savings"
                    : "Annual Savings"}
                </div>
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
                  <span className="breakdown-label">AC-Commerce Platform:</span>
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
                {propertyType === "residential-multi" && (
                  <div className="breakdown-item info">
                    <span className="breakdown-label">Per Unit Savings:</span>
                    <span className="breakdown-cost info">
                      $
                      {(savings / numberOfUnits).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                )}
                {propertyType === "industrial-commercial" && (
                  <div className="breakdown-item info">
                    <span className="breakdown-label">
                      Maintenance Cost Savings:
                    </span>
                    <span className="breakdown-cost info">
                      $
                      {(
                        (projectSize * 0.05 - projectSize * 0.02) *
                        maintenanceFrequency
                      ).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="savings-breakdown mt-4">
                <h5 className="breakdown-title">
                  Cost Breakdown (Per Project)
                </h5>

                <div className="breakdown-section">
                  <h6 className="breakdown-subtitle">Traditional Method</h6>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Equipment Cost:</span>
                    <span className="breakdown-cost">
                      $
                      {breakdown.equipmentTrad.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Labor Cost:</span>
                    <span className="breakdown-cost">
                      $
                      {breakdown.laborTrad.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  {propertyType === "industrial-commercial" && (
                    <div className="breakdown-item">
                      <span className="breakdown-label">
                        Maintenance/Cycle:
                      </span>
                      <span className="breakdown-cost">
                        $
                        {breakdown.maintenanceTrad.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="breakdown-item breakdown-total">
                    <span className="breakdown-label">
                      <strong>Total per Project:</strong>
                    </span>
                    <span className="breakdown-cost">
                      <strong>
                        $
                        {breakdown.baseTradCost.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="breakdown-section mt-3">
                  <h6 className="breakdown-subtitle">AC-Commerce Platform</h6>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Equipment Cost:</span>
                    <span className="breakdown-cost highlight-green">
                      $
                      {breakdown.equipmentAcc.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Labor Cost:</span>
                    <span className="breakdown-cost highlight-green">
                      $
                      {breakdown.laborAcc.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  {propertyType === "industrial-commercial" && (
                    <div className="breakdown-item">
                      <span className="breakdown-label">
                        Maintenance/Cycle:
                      </span>
                      <span className="breakdown-cost highlight-green">
                        $
                        {breakdown.maintenanceAcc.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="breakdown-item breakdown-total">
                    <span className="breakdown-label">
                      <strong>Total per Project:</strong>
                    </span>
                    <span className="breakdown-cost highlight-green">
                      <strong>
                        $
                        {breakdown.baseAccCost.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
