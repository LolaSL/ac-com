import React, { useState, useEffect } from "react";
import { Container, Form, Button, Alert, Image } from "react-bootstrap";
import axios from "axios";
import { Link } from "react-router-dom";
import "./ContactPage.css";
const ContactPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [country, setCountry] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [equipmentAge, setEquipmentAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResponseMessage(null);
    setError(null);

    try {
      const response = await axios.post("/api/contact", {
        fullName,
        email,
        mobilePhone,
        country,
        serviceType,
        equipmentAge,
        subject,
        message,
      });
      setResponseMessage(response.data.message);
      setFullName("");
      setEmail("");
      setMobilePhone("");
      setCountry("");
      setSubject("");
      setMessage("");
      setServiceType("");
      setEquipmentAge("");
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setError(error.response?.data?.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (responseMessage) {
      const timer = setTimeout(() => {
        setResponseMessage(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [responseMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <Container>
      <h1 className="contacts-title mt-4 mb-2 fs-1">Contact Us</h1>

      <p
        className="lead mb-4 fs-4 text-break ps-5"
        style={{ lineHeight: 1.7, maxWidth: 700 }}
      >
        Have questions about our products or services?
        <br />
        Need help with your order?
        <br />
        <span className="fw-semibold">Our team is here to assist you.</span>
        <br />
        Fill out the form below and we’ll get back to you as soon as possible.
      </p>

      <div>
        <Image
          src="/images/contact-us.jpg"
          alt="Contact Us"
          className="responsive-image-contact rounded mt-4"
        />
      </div>
      <Form onSubmit={handleSubmit} className="contact-form">
        {responseMessage && <Alert variant="success">{responseMessage}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form.Group controlId="formName" className="mt-2 mb-2">
          <Form.Label>Full Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="formEmail" className="mt-2 mb-2">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="formMobilePhone" className="mt-2 mb-2">
          <Form.Label>Mobile Phone Number</Form.Label>
          <Form.Control
            type="tel"
            placeholder="Enter your mobile phone number"
            value={mobilePhone}
            onChange={(e) => setMobilePhone(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="formCountry" className="mt-2 mb-2">
          <Form.Label>Country</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter your country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="formServiceType" className="mt-2 mb-2">
          <Form.Label>Service Type</Form.Label>
          <Form.Select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            required
          >
            <option value="">Select a service type</option>
            <option value="Product Inquiry">Product Inquiry</option>
            <option value="Order Support">Order Support</option>
            <option value="AC Installation">AC Installation</option>
            <option value="AC Repair">AC Repair</option>
            <option value="AC Maintenance">AC Maintenance</option>
            <option value="Gas Ducted Heating">Gas Ducted Heating</option>
            <option value="Indoor Air Quality">Indoor Air Quality</option>
            <option value="Electrical Service">Electrical Service</option>
            <option value="Smart Control Automation">
              Smart Control Automation
            </option>
            <option value="General Question">General Question</option>
          </Form.Select>
        </Form.Group>

        <Form.Group controlId="formEquipmentAge" className="mt-2 mb-2">
          <Form.Label>Equipment Age</Form.Label>
          <Form.Select
            value={equipmentAge}
            onChange={(e) => setEquipmentAge(e.target.value)}
            required
          >
            <option value="">Select equipment age</option>
            <option value="Less than 1 year">Less than 1 year</option>
            <option value="1 year">1 year</option>
            <option value="2 years">2 years</option>
            <option value="3 years">3 years</option>
            <option value="4 years">4 years</option>
            <option value="5 years">5 years</option>
            <option value="6 years">6 years</option>
            <option value="More than 6 years">More than 6 years</option>
            <option value="I don't have air conditioning">
              I don’t have air conditioning
            </option>
          </Form.Select>
        </Form.Group>

        <Form.Group controlId="formSubject" className="mt-2 mb-2">
          <Form.Label>Subject</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter the subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="formMessage" className="mt-2 mb-2">
          <Form.Label>Message</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Enter your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </Form.Group>

        <Button
          variant="success"
          type="submit"
          className="mt-4 mb-4"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </Button>

        <h2 className="mb-5 text-center">Get in Touch</h2>

        <div className="contact-info">
          <div className="secondary-item">
            <i className="fas fa-map-marker-alt"></i>
            <p>
              1234 Street Name
              <br />
              City, State, ZIP Code
            </p>
          </div>

          <div className="secondary-item">
            <i className="fas fa-phone-alt"></i>
            <p>
              251 546 9442
              <br />
              630 446 8851
            </p>
          </div>

          <div className="secondary-item">
            <i className="fas fa-envelope"></i>
            <p>
              <strong>General Inquiries:</strong> support@accomhomesupply.com
              <br />
              <strong>Sales:</strong> sales@accomhomesupply.com
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-muted mb-0">
            <strong>Business Hours</strong>
            <br />
            Monday – Friday: 8:00 AM – 6:00 PM EST
            <br />
            Saturday: 9:00 AM – 4:00 PM EST
          </p>
        </div>
      </Form>

      <div className="mt-4 mb-4 me-4">
        <Link to="/" className="go-to-btn btn-text">
          Back to Home
        </Link>
      </div>
    </Container>
  );
};

export default ContactPage;
