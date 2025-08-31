import React, { useState } from "react";
import { Container, Modal, Row, Col, Form, Button } from "react-bootstrap";

const ModalCalculator = () => {
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [areaFeet, setAreaFeet] = useState(0);
  const [areaMeters, setAreaMeters] = useState(0);
  const [measurementSystem, setMeasurementSystem] = useState("meters");
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const CONSTANT = {
    CONVERT_FEET_TO_METERS: 0.092903,
  };
  const calculateArea = (e) => {
    e.preventDefault();
    const h = parseFloat(height);
    const w = parseFloat(width);
    if (isNaN(h) || isNaN(w)) return;

    const area = h * w;
    setAreaFeet(
      measurementSystem === "feet"
        ? area
        : area / CONSTANT.CONVERT_FEET_TO_METERS
    );
    setAreaMeters(
      measurementSystem === "meters"
        ? area
        : area * CONSTANT.CONVERT_FEET_TO_METERS
    );
  };

  return (
    <>
      <div>
        <Button   className="go-to-btn btn-text me-2 my-2"
        variant="btn-outline"onClick={handleShow}>
        Square Feet/Meters Calculator
        </Button>
      </div>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Convert Square Feet/Meters </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            <Form className="btu-form">
              <h3 className="mt-4 mb-4 text-center title">Square Feet/Meters Calculator</h3>
              <Row className="my-4">
                <Col xs={12} md={6} lg={12}>
                  <Form.Group controlId="measurementSystem">
                    <Form.Label className="fw-bold">Calculate Area </Form.Label>
                    <Form.Control
                      as="select"
                      value={measurementSystem}
                      onChange={(e) => setMeasurementSystem(e.target.value)}
                    >
                      <option value="meters">Square Meters (m²)</option>
                      <option value="feet">Square Feet (ft²)</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
              </Row>
              <Row className="my-4">
                <Col xs={12} md={6} lg={12}>
                  <Form.Group controlId="height">
                    <Form.Label>
                      Height ({measurementSystem === "meters" ? "m" : "ft"}):
                    </Form.Label>
                    <Form.Control
                      type="number"
                      placeholder={`Enter height in ${
                        measurementSystem === "meters" ? "meters" : "feet"
                      }`}
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="my-4">
                <Col xs={12} md={6} lg={12}>
                  <Form.Group controlId="width">
                    <Form.Label>
                      Width ({measurementSystem === "meters" ? "m" : "ft"}):
                    </Form.Label>
                    <Form.Control
                      type="number"
                      placeholder={`Enter width in ${
                        measurementSystem === "meters" ? "meters" : "feet"
                      }`}
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button
                variant="primary"
                onClick={calculateArea}
                className="btn-calculate mt-2 mb-4 w-70"
              >
                Calculate Area
              </Button>
              {areaFeet > 0 && (
                <div className="result mt-4 mb-4">
                  <h3 className="mb-3 mt-3">Results:</h3>
                  <p>Area in Square Feet: {areaFeet.toFixed(2)} sq ft</p>
                  <p>Area in Square Meters: {areaMeters.toFixed(2)} sq m</p>
                </div>
              )}
            </Form>
          </Container>
        </Modal.Body>{" "}
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalCalculator;
