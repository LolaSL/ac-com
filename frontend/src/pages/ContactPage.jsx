import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FaUser, FaEnvelope, FaPhone, FaGlobe, FaWrench,
  FaClock, FaMapMarkerAlt, FaHeadset, FaComment, FaPaperPlane,
} from "react-icons/fa";
import "./ContactPage.css";

const SERVICE_TYPES = [
  "Product Inquiry", "Order Support", "AC Installation", "AC Repair",
  "AC Maintenance", "Gas Ducted Heating", "Indoor Air Quality",
  "Electrical Service", "Smart Control Automation", "General Question",
];

const EQUIPMENT_AGES = [
  "Less than 1 year", "1 year", "2 years", "3 years", "4 years",
  "5 years", "6 years", "More than 6 years", "I don't have air conditioning",
];

const ContactPage = () => {
  const [fullName,      setFullName]      = useState("");
  const [email,         setEmail]         = useState("");
  const [mobilePhone,   setMobilePhone]   = useState("");
  const [country,       setCountry]       = useState("");
  const [subject,       setSubject]       = useState("");
  const [message,       setMessage]       = useState("");
  const [serviceType,   setServiceType]   = useState("");
  const [equipmentAge,  setEquipmentAge]  = useState("");
  const [loading,       setLoading]       = useState(false);
  const [responseMessage, setResponseMessage] = useState(null);
  const [error,         setError]         = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResponseMessage(null);
    setError(null);
    try {
      const response = await axios.post("/api/contact", {
        fullName, email, mobilePhone, country,
        serviceType, equipmentAge, subject, message,
      });
      setResponseMessage(response.data.message);
      setFullName(""); setEmail(""); setMobilePhone(""); setCountry("");
      setSubject(""); setMessage(""); setServiceType(""); setEquipmentAge("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (responseMessage) { const t = setTimeout(() => setResponseMessage(null), 4000); return () => clearTimeout(t); }
  }, [responseMessage]);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 4000); return () => clearTimeout(t); }
  }, [error]);

  return (
    <div className="ct-page">
      {/* Hero */}
      <div className="ct-hero">
        <div className="ct-hero__inner">
          <div>
            <h1 className="ct-hero__title"><FaHeadset className="ct-hero__icon" /> Contact Us</h1>
            <p className="ct-hero__sub">Our team is here to help — fill out the form and we'll respond promptly.</p>
          </div>
        </div>
      </div>

      {/* Banner image */}
      <div className="ct-banner">
        <img src="/images/contact-us.jpg" alt="Contact Us" className="ct-banner__img" />
      </div>

      <div className="ct-layout">
        {/* ── Form column ── */}
        <div className="ct-form-col">
          {responseMessage && (
            <div className="ct-alert ct-alert--success">✓ {responseMessage}</div>
          )}
          {error && (
            <div className="ct-alert ct-alert--error">⚠️ {error}</div>
          )}

          <form onSubmit={handleSubmit} className="ct-form">
            <div className="ct-grid">
              <div className="ct-field">
                <label className="ct-label"><FaUser className="ct-label__icon" />Full Name</label>
                <input className="ct-input" type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="ct-field">
                <label className="ct-label"><FaEnvelope className="ct-label__icon" />Email Address</label>
                <input className="ct-input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="ct-field">
                <label className="ct-label"><FaPhone className="ct-label__icon" />Mobile Phone</label>
                <input className="ct-input" type="tel" placeholder="+1 (555) 123-4567" value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} required />
              </div>
              <div className="ct-field">
                <label className="ct-label"><FaGlobe className="ct-label__icon" />Country</label>
                <input className="ct-input" type="text" placeholder="Your country" value={country} onChange={e => setCountry(e.target.value)} required />
              </div>
              <div className="ct-field">
                <label className="ct-label"><FaWrench className="ct-label__icon" />Service Type</label>
                <select className="ct-input" value={serviceType} onChange={e => setServiceType(e.target.value)} required>
                  <option value="">Select a service type</option>
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="ct-field">
                <label className="ct-label"><FaClock className="ct-label__icon" />Equipment Age</label>
                <select className="ct-input" value={equipmentAge} onChange={e => setEquipmentAge(e.target.value)} required>
                  <option value="">Select equipment age</option>
                  {EQUIPMENT_AGES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="ct-field ct-field--full">
              <label className="ct-label"><FaComment className="ct-label__icon" />Subject</label>
              <input className="ct-input" type="text" placeholder="What's this about?" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>

            <div className="ct-field ct-field--full">
              <label className="ct-label"><FaPaperPlane className="ct-label__icon" />Message</label>
              <textarea className="ct-input ct-textarea" rows={5} placeholder="Tell us how we can help..." value={message} onChange={e => setMessage(e.target.value)} required />
            </div>

            <button type="submit" className="ct-submit" disabled={loading}>
              {loading
                ? <><span className="ct-spinner" />Sending…</>
                : <><FaPaperPlane style={{ marginRight: 8 }} />Send Message</>}
            </button>
          </form>
        </div>

        {/* ── Info column ── */}
        <div className="ct-info-col">
          <div className="ct-info-card">
            <h3 className="ct-info-card__title">Get in Touch</h3>

            <div className="ct-info-item">
              <div className="ct-info-item__icon"><FaMapMarkerAlt /></div>
              <div>
                <div className="ct-info-item__label">Address</div>
                <div className="ct-info-item__value">1234 Street Name<br />City, State, ZIP Code</div>
              </div>
            </div>

            <div className="ct-info-item">
              <div className="ct-info-item__icon"><FaPhone /></div>
              <div>
                <div className="ct-info-item__label">Phone</div>
                <div className="ct-info-item__value">251 546 9442<br />630 446 8851</div>
              </div>
            </div>

            <div className="ct-info-item">
              <div className="ct-info-item__icon"><FaEnvelope /></div>
              <div>
                <div className="ct-info-item__label">Email</div>
                <div className="ct-info-item__value">
                  <a href="mailto:support@accomhomesupply.com" className="ct-link">support@accomhomesupply.com</a><br />
                  <a href="mailto:sales@accomhomesupply.com" className="ct-link">sales@accomhomesupply.com</a>
                </div>
              </div>
            </div>

            <div className="ct-info-item">
              <div className="ct-info-item__icon"><FaClock /></div>
              <div>
                <div className="ct-info-item__label">Business Hours</div>
                <div className="ct-info-item__value">
                  Mon – Fri: 8:00 AM – 6:00 PM EST<br />
                  Saturday: 9:00 AM – 4:00 PM EST
                </div>
              </div>
            </div>
          </div>

          <div className="ct-info-card ct-info-card--blue">
            <h3 className="ct-info-card__title">Quick Links</h3>
            <Link to="/" className="ct-quick-link">🏠 Home</Link>
            <Link to="/search" className="ct-quick-link">🛒 Products</Link>
            <Link to="/measurement" className="ct-quick-link">💻 Get A Quote</Link>
            <Link to="/roi-calculator" className="ct-quick-link">📊 ROI Calculator</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;