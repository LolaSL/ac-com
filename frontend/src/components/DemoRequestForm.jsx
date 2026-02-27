import React, { useState } from "react";
import { Container, Form, Modal, Button, Row, Col } from "react-bootstrap";
import "./DemoRequestForm.css";

export default function DemoRequestForm({ onClose }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    projectSize: "",
    preferredDate: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.company
    ) {
      setStatus({
        type: "error",
        message: "Please fill in all required fields",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/demo-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit demo request");
      }

      setStatus({
        type: "success",
        message:
          "Demo scheduled successfully! Check your email for confirmation details.",
      });

      // Reset form and close modal after success
      setTimeout(() => {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          company: "",
          phone: "",
          projectSize: "",
          preferredDate: "",
        });
        if (onClose) {
          onClose();
        } else {
          setShowModal(false);
        }
        setStatus(null);
      }, 2000);
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to schedule demo. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!onClose && (
        <>
          {/* Demo CTA Section */}
          <section className="demo-request-section">
            <Container>
              <div className="demo-content">
                <div className="demo-text">
                  <h2 className="section-title">See It In Action</h2>
                  <p className="demo-description">
                    Watch how AC Commerce can transform your business with a
                    personalized 30-minute demo
                  </p>

                  <div className="demo-features">
                    <div className="feature">
                      <span className="feature-icon">✓</span>
                      <span>Personalized walkthrough</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">✓</span>
                      <span>Custom ROI analysis</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">✓</span>
                      <span>Integration overview</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">✓</span>
                      <span>Q&A with expert</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="demo-btn-primary"
                  onClick={() => setShowModal(true)}
                >
                  Schedule Your Demo
                </Button>
              </div>
            </Container>
          </section>

          {/* Modal Form */}
          <Modal
            show={showModal}
            onHide={() => setShowModal(false)}
            centered
            className="demo-modal"
            size="lg"
          >
            <Modal.Header closeButton className="demo-modal-header">
              <Modal.Title className="demo-modal-title">
                Schedule a Demo
              </Modal.Title>
            </Modal.Header>

            <Modal.Body className="demo-modal-body">
              {status ? (
                <div className={`status-message ${status.type}`}>
                  <div className="status-icon">
                    {status.type === "success" ? "✓" : "!"}
                  </div>
                  <p>{status.message}</p>
                </div>
              ) : (
                <Form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <Form.Group className="form-col">
                      <Form.Label className="demo-label">
                        First Name *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                        className="demo-input"
                        disabled={loading}
                      />
                    </Form.Group>

                    <Form.Group className="form-col">
                      <Form.Label className="demo-label">
                        Last Name *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        className="demo-input"
                        disabled={loading}
                      />
                    </Form.Group>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="demo-label">Email *</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@company.com"
                      className="demo-input"
                      disabled={loading}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="demo-label">Company *</Form.Label>
                    <Form.Control
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Your Company"
                      className="demo-input"
                      disabled={loading}
                    />
                  </Form.Group>

                  <div className="form-row">
                    <Form.Group className="form-col">
                      <Form.Label className="demo-label">Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="(555) 123-4567"
                        className="demo-input"
                        disabled={loading}
                      />
                    </Form.Group>

                    <Form.Group className="form-col">
                      <Form.Label className="demo-label">
                        Project Size
                      </Form.Label>
                      <Form.Select
                        name="projectSize"
                        value={formData.projectSize}
                        onChange={handleInputChange}
                        className="demo-input"
                        disabled={loading}
                      >
                        <option value="">Select project size</option>
                        <option value="startup">
                          Startup (1-10 projects/month)
                        </option>
                        <option value="small">
                          Small (10-50 projects/month)
                        </option>
                        <option value="medium">
                          Medium (50-200 projects/month)
                        </option>
                        <option value="large">
                          Large (200+ projects/month)
                        </option>
                      </Form.Select>
                    </Form.Group>
                  </div>

                  <Form.Group className="mb-4">
                    <Form.Label className="demo-label">
                      Preferred Demo Date
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="preferredDate"
                      value={formData.preferredDate}
                      onChange={handleInputChange}
                      className="demo-input"
                      disabled={loading}
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="demo-submit-btn"
                    size="sm"
                  >
                    {loading ? "Scheduling..." : "Schedule Demo"}
                  </Button>
                </Form>
              )}
            </Modal.Body>
          </Modal>
        </>
      )}

      {onClose && (
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="demo-label">First Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="demo-input"
                  disabled={loading}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="demo-label">Last Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="demo-input"
                  disabled={loading}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="demo-label">Email *</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="john@company.com"
              className="demo-input"
              disabled={loading}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="demo-label">Company *</Form.Label>
            <Form.Control
              type="text"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              placeholder="Your Company"
              className="demo-input"
              disabled={loading}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="demo-label">Phone</Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
              className="demo-input"
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="demo-label">Project Size</Form.Label>
            <Form.Select
              name="projectSize"
              value={formData.projectSize}
              onChange={handleInputChange}
              className="demo-input"
              disabled={loading}
            >
              <option value="">Select project size</option>
              <option value="1-5">1-5 projects/month</option>
              <option value="6-15">6-15 projects/month</option>
              <option value="16-30">16-30 projects/month</option>
              <option value="30+">30+ projects/month</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="demo-label">Preferred Date</Form.Label>
            <Form.Control
              type="date"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleInputChange}
              className="demo-input"
              disabled={loading}
            />
          </Form.Group>

          <Button
            type="submit"
            disabled={loading}
            className="demo-submit-btn"
            size="sm"
          >
            {loading ? "Scheduling..." : "Schedule Demo"}
          </Button>
        </Form>
      )}

      {/* Status Messages */}
      {status && (
        <div className={`status-message ${status.type}`}>{status.message}</div>
      )}
    </>
  );
}
