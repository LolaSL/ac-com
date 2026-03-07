import React from "react";
import { Link } from "react-router-dom";
import { FaInfoCircle } from "react-icons/fa";
import "./AboutUs.css";

const AboutUs = () => {
  const steps = [
    {
      icon: "fas fa-file-upload",
      title: "Upload Your Floor Plan",
      text: "Upload any architectural PDF — residential suite, office, or commercial space. The plan is rendered directly in the browser at high resolution.",
    },
    {
      icon: "fas fa-drafting-compass",
      title: "Mark AC Placements",
      text: "Place labelled AC unit rectangles on the plan - add comments (ac-1, ac-2...etc) and condenser (outdoor unit rectangle) placement. Save your work on the cloud.",
    },
    {
      icon: "fas fa-hard-hat",
      title: "Engineer Review",
      text: "After making an order submission, a certified HVAC engineer opens your submitted plan, adds professional VRF refrigerant lines, and signs off with a digital signature — producing a verified 2-page review PDF. Supports Standard, VRF-Ducted, and VRF-Ductless system configurations. Symbols of ducted HVAC elements/accessories for both ducted and ductless VRF modes-comming soon",
    },
    {
      icon: "fas fa-file-pdf",
      title: "Save & Download",
      text: "Download your completed engineer-reviewed plan as a PDF with all ac rectangles, outdoor unit -condenser rectangle, comments, system lines, and the engineer's digital stamp baked in.",
    },
    {
      icon: "fas fa-calculator",
      title: "BTU Calculator",
      text: "Answer guided questions about your property — room size, insulation, climate — and receive a recommended BTU rating along with a curated list of matching indoor units and outdoor condensers.",
    },
    {
      icon: "fas fa-chart-line",
      title: "Return on Investment (ROI) Calculator",
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
      text: "Browser-based PDF notifications with coloured rectangles, text comments, VRF refrigerant lines, (ducted air diffusers -comming soon).",
    },
    {
      icon: "fas fa-user-check",
      title: "Certified Engineer Sign-off",
      text: "Every submitted plan is reviewed by a qualified engineer who adds system-specific notes and a digital signature — giving you a document suitable for permits and contractors.",
    },
    {
      icon: "fas fa-tools",
      title: "Trusted Service Network",
      text: "Connect directly with verified HVAC service providers for installation, maintenance, and  repairs through our integrated messaging and booking system.",
    },
    {
      icon: "fas fa-hand-holding-usd",
      title: "Affiliate Seller Programme",
      text: "Industry professionals and businesses can list products on the marketplace, earn commission through referrals, (access a dedicated seller dashboard and track their earnings in real time - comming soon).",
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
    <div className="au-page">
      {/* Hero */}
      <div className="au-hero">
        <div className="au-hero__inner">
          <div className="au-hero__icon"><FaInfoCircle /></div>
          <h1 className="au-hero__title">About AC-Com</h1>
          <p className="au-hero__sub">Your complete HVAC marketplace — from first measurement to final sign-off.</p>
        </div>
      </div>

      {/* Banner image */}
      <div className="au-banner">
        <img src="/images/about-us.jpg" alt="About AC-Com" className="au-banner__img" />
      </div>

      <div className="au-inner">
        {/* Intro */}
        <div className="au-card au-intro">
          <p className="au-lead">
            <strong>AC-Com Home Supply</strong> is HVAC marketplace that combines product commerce with
            professional-grade planning tools. Whether you're buying a mini-split, designing a
            VRF system for a multi-room property, or getting a certified engineer to review your
            floor plan — everything happens in one platform.
          </p>
          <p className="au-lead au-lead--last">
            We replace the fragmented process of juggling multiple vendors, contractors, and
            design consultants with a single, integrated workflow — from first measurement to
            final sign-off.
          </p>
        </div>

        {/* How It Works */}
        <section className="au-section">
          <h2 className="au-section__title">How It Works</h2>
          <div className="au-grid au-grid--3">
            {steps.map((s, i) => (
              <div key={i} className="au-card au-step-card">
                <div className="au-step__number">{i + 1}</div>
                <div className="au-step__icon"><i className={s.icon} /></div>
                <h3 className="au-step__title">{s.title}</h3>
                <p className="au-step__text">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why AC-Com */}
        <section className="au-section">
          <h2 className="au-section__title">Why AC-Com</h2>
          <div className="au-grid au-grid--3">
            {features.map((f, i) => (
              <div key={i} className="au-card au-feature-card">
                <div className="au-feature__icon"><i className={f.icon} /></div>
                <h3 className="au-feature__title">{f.title}</h3>
                <p className="au-feature__text">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who We Serve */}
        <section className="au-section">
          <h2 className="au-section__title">Who We Serve</h2>
          <div className="au-grid au-grid--6">
            {audiences.map((a, i) => (
              <div key={i} className="au-audience-tile">
                <i className={`${a.icon} au-audience__icon`} />
                <div className="au-audience__label">{a.label}</div>
                <div className="au-audience__desc">{a.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="au-home-row">
          <Link to="/" className="home-btn">🏠 Home</Link>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;

  