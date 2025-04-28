import React, { useState, useEffect } from "react";
import { Container, Form, Button, Alert, Image } from "react-bootstrap";
import axios from "axios";

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
      <div>
        <Image
          src="/images/contact.jpg"
          alt="Contact Us"
          className="responsive-image-contact rounded mt-4"
        />
      </div>
      <div className="contact-form">
        <h1 className="text-center contact-title fw-bold mt-4 mb-4">
          Contact Us
        </h1>

        {responseMessage && <Alert variant="success">{responseMessage}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit} className="contact-form">
          <Form.Group controlId="formName" className="mt-2 mb-2">
            <Form.Label>Full Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="formEmail" className="mt-2 mb-2">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="formMobilePhone" className="mt-2 mb-2">
            <Form.Label>Mobile Phone</Form.Label>
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
              <option value="">Select service type</option>
              <option value="AC Installation">AC Installation</option>
              <option value="AC Repair">AC Repair</option>
              <option value="AC Maintenance">AC Maintenance</option>
              <option value="Gas Ducted Heating">Gas Ducted Heating</option>
              <option value="Indoor Air Quality">Indoor Air Quality</option>
              <option value="Electrical Service">Electrical Service</option>
              <option value="Smart Control Automation">
                Smart Control Automation
              </option>
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
              <option value="Don't have air conditioning">
                Don't have air conditioning
              </option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="formSubject" className="mt-2 mb-2">
            <Form.Label>Subject</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter subject"
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
            className="mt-4 mb-4 btn btn-success"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </Form>
        <div className="contact-info">
          <div className="secondary-item">
            <i className="fas fa-map-marker-alt"></i>
            <p>
              1234 Street Name
              <br />
              City, State, Zip Code
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
              info@example.com
              <br />
              contact@example.com
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ContactPage;
