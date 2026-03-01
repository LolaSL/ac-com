import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./AboutUs.css";

const AboutUs = () => {
  const steps = [
    {
      icon: "fas fa-file-upload",
      title: "Upload Your Floor Plan",
      text: "Upload any architectural PDF — residential suite, office, or commercial space. The plan is rendered directly in the browser at full resolution.",
    },
    {
      icon: "fas fa-drafting-compass",
      title: "Annotate AC Placements",
      text: "Place labelled AC unit rectangles on the plan, add comments, draw VRF refrigerant lines, and overlay ducted HVAC elements. Supports Standard, VRF-Ducted, and VRF-Ductless system configurations.",
    },
    {
      icon: "fas fa-hard-hat",
      title: "Engineer Review",
      text: "A certified HVAC engineer opens your submitted plan, adds professional annotations for both ducted and ductless VRF modes, and signs off with a digital signature — producing a verified 2-page review PDF.",
    },
    {
      icon: "fas fa-file-pdf",
      title: "Save & Download",
      text: "Download your completed engineer-reviewed plan as a PDF with all annotations, comments, system lines, and the engineer's digital stamp baked in.",
    },
    {
      icon: "fas fa-calculator",
      title: "BTU Calculator",
      text: "Answer guided questions about your property — room size, insulation, climate — and receive a recommended BTU rating along with a curated list of matching indoor units and outdoor condensers.",
    },
    {
      icon: "fas fa-chart-line",
      title: "ROI Calculator",
      text: "Compare traditional HVAC purchasing costs against AC-Com pricing. Estimate labour savings, efficiency gains, and project payback periods across residential, commercial, and industrial property types.",
    },
  ];

  const features = [
    {
      icon: "fas fa-store",
      title: "Complete HVAC Marketplace",
      text: "Hundreds of mini-split ACs, VRF condensers, indoor units, and accessories from leading manufacturers — with ratings, dimensions, energy ratings, and discounts.",
    },
    {
      icon: "fas fa-pencil-ruler",
      title: "Professional Annotation Tools",
      text: "Browser-based PDF annotation with coloured rectangles, text comments, VRF refrigerant lines, ducted air diffusers, and real-time canvas overlays.",
    },
    {
      icon: "fas fa-user-check",
      title: "Certified Engineer Sign-off",
      text: "Every submitted plan is reviewed by a qualified engineer who adds system-specific notes and a digital signature — giving you a document suitable for permits and contractors.",
    },
    {
      icon: "fas fa-tools",
      title: "Trusted Service Network",
      text: "Connect directly with verified HVAC service providers for installation, maintenance, and emergency repairs through our integrated messaging and booking system.",
    },
    {
      icon: "fas fa-hand-holding-usd",
      title: "Affiliate Seller Programme",
      text: "Industry professionals and businesses can list products on the marketplace, earn commission through referrals, access a dedicated seller dashboard, and track their earnings in real time.",
    },
    {
      icon: "fas fa-bell",
      title: "Orders, Notifications & Support",
      text: "Track orders end-to-end, receive payment and delivery reminders, communicate with sellers via built-in messaging, and access dedicated customer support at every stage.",
    },
  ];

  const audiences = [
    { icon: "fas fa-home", label: "Homeowners", desc: "Plan and purchase the right HVAC system for your property." },
    { icon: "fas fa-building", label: "Commercial Buyers", desc: "Outfit offices, retail spaces, and facilities efficiently." },
    { icon: "fas fa-wrench", label: "HVAC Contractors", desc: "Source equipment and manage project plans in one place." },
    { icon: "fas fa-compass", label: "Architects & Designers", desc: "Integrate HVAC layouts directly into architectural workflows." },
    { icon: "fas fa-shield-alt", label: "Service Providers", desc: "Offer installation, maintenance, and repair through the platform." },
    { icon: "fas fa-tags", label: "Affiliate Sellers", desc: "Partner with AC-Com and grow revenue through the marketplace." },
  ];

  return (
    <Container className="site-container-about mt-4 p-4">
      {/* Hero */}
      <h1 className="page-title mb-3">About AC-Com</h1>
      <div
        className="responsive-image-about rounded mb-4"
        style={{
          backgroundImage: `url("/images/about-us.jpg")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          width: "100%",
          paddingTop: "40%",
        }}
      />

      {/* Intro */}
      <article className="about-section">
        <p className="about-lead">
          <strong>AC-Com Home Supply</strong> is a full-stack HVAC marketplace that combines product commerce with
          professional-grade planning tools. Whether you're buying a mini-split, designing a
          VRF system for a multi-room property, or getting a certified engineer to review your
          floor plan — everything happens in one platform.
        </p>
        <p className="about-lead">
          We replace the fragmented process of juggling multiple vendors, contractors, and
          design consultants with a single, integrated workflow — from first measurement to
          final sign-off.
        </p>
      </article>

      {/* How It Works */}
      <article className="about-section">
        <h2 className="about-section-title">How It Works</h2>
        <Row className="g-3">
          {steps.map((s, i) => (
            <Col key={i} xs={12} sm={6} lg={4}>
              <Card className="about-step-card h-100">
                <Card.Body>
                  <div className="about-step-number">{i + 1}</div>
                  <div className="about-step-icon">
                    <i className={s.icon} />
                  </div>
                  <Card.Title className="about-step-title">{s.title}</Card.Title>
                  <Card.Text className="about-step-text">{s.text}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </article>

      {/* Why AC-Com */}
      <article className="about-section">
        <h2 className="about-section-title">Why AC-Com</h2>
        <Row className="g-3">
          {features.map((f, i) => (
            <Col key={i} xs={12} sm={6} lg={4}>
              <Card className="about-feature-card h-100">
                <Card.Body>
                  <div className="about-feature-icon">
                    <i className={f.icon} />
                  </div>
                  <Card.Title className="about-feature-title">{f.title}</Card.Title>
                  <Card.Text className="about-feature-text">{f.text}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </article>

      {/* Who We Serve */}
      <article className="about-section">
        <h2 className="about-section-title">Who We Serve</h2>
        <Row className="g-3">
          {audiences.map((a, i) => (
            <Col key={i} xs={6} sm={4} lg={2}>
              <div className="about-audience-tile">
                <i className={`${a.icon} about-audience-icon`} />
                <div className="about-audience-label">{a.label}</div>
                <div className="about-audience-desc">{a.desc}</div>
              </div>
            </Col>
          ))}
        </Row>
      </article>

      <div className="mt-5 mb-4">
        <Link to="/" className="home-btn">
          🏠 Home
        </Link>
      </div>
    </Container>
  );
};

export default AboutUs;

