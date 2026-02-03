import React from "react";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./AboutUs.css";
const AboutUs = () => {
  return (
    <Container className="site-container-about mt-4 p-4">
      <h1 className="about-us mb-4 fs-1">About Us</h1>
      <article className="about mt-4 mb-4">
        <div
          className="responsive-image-about rounded mb-3"
          style={{
            backgroundImage: `url("/images/about-us.jpg")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            width: "100%",
            paddingTop: "56.25%",
          }}
        ></div>

        <h3 className="about-paragraph p-2">
          <strong className="fs-4">AC-Com Home Supply</strong> is a
          comprehensive e-commerce platform specializing in HVAC equipment and
          services. We combine an extensive online marketplace for air
          conditioning products with innovative tools for system planning,
          design, and professional service connections.
        </h3>
        <h3 className="about-paragraph mt-4 pb-2">
          Our platform offers a complete HVAC solution: browse and purchase
          premium air conditioning equipment, calculate precise BTU requirements
          for any space, design and annotate floor plans with AC unit
          placements, and connect with certified service providers for
          installation and maintenance — all in one place.
        </h3>
        <h3 className="about-paragraph mt-4 pb-4">
          What sets AC-Com Home Supply apart is our integrated approach. We're
          not just a product retailer or a design tool — we're a complete HVAC
          ecosystem that empowers homeowners, contractors, and businesses to
          make informed decisions, streamline their projects, and access
          everything they need from a single trusted platform.
        </h3>
      </article>
      <article className="about mt-4 mb-4">
        <h3 className="about-paragraph mt-4">
          <strong className="fs-4 mb-2">
            Our Measurement Service System process is straightforward:
          </strong>
          <ul className="mt-2">
            <li>Upload your architectural plan ( PDF file)</li>
            <li>
              Place the created air conditioning unit with a relevant comment on
              the uploaded architectural plan.
            </li>
            <li>
              Save AC architectural plan — complete with a digital signature
              from a certified air conditioning engineer.
            </li>
            <li>
              Complete a brief set of BTU Calculator guided questions regarding
              the property’s specifications and user preferences.
            </li>
            <li>
              {" "}
              Receive BTU results from BTU table: the list of recommended air
              conditioning products chosen by your preferences, BTU, and
              recommended outdoor condenser.
            </li>
          </ul>
        </h3>
      </article>
      <article className="about mt-4 mb-4">
        <h3 className="goals-paragraph  mt-2 pb-4">
          <strong className="fs-4 mb-2">Why Choose AC-Com Home Supply: </strong>
          <ul className="mt-2">
            <li>
              <strong>Complete HVAC Marketplace:</strong> Access hundreds of
              premium air conditioning products from leading manufacturers with
              competitive pricing and detailed product information.
            </li>
            <li>
              <strong>Professional Design Tools:</strong> Create and save
              professional floor plan annotations using simple rectangular
              shapes with text labels to mark AC unit placements and add
              relevant comments.
            </li>
            <li>
              <strong>Smart Planning:</strong> Use our BTU Calculator to make
              data-driven decisions about the right equipment for your specific
              needs.
            </li>
            <li>
              <strong>Trusted Service Network:</strong> Connect with verified
              HVAC service providers for installation, maintenance, and repairs
              through our secure platform.
            </li>
            <li>
              <strong>Streamlined Experience:</strong> From product research to
              purchase to installation — everything you need in one unified
              platform.
            </li>
            <li>
              <strong>Transparency & Support:</strong> Track orders, communicate
              with sellers and service providers, and receive dedicated customer
              support throughout your journey.
            </li>
          </ul>
        </h3>
        <h3 className="goals-paragraph  mt-2 pb-4">
          Traditionally, purchasing HVAC equipment and coordinating installation
          required navigating multiple vendors, contractors, and service
          providers. AC-Com Home Supply transforms this fragmented process into
          a seamless experience, saving you time and money while providing
          professional-grade tools and expert support every step of the way.
        </h3>{" "}
      </article>
      <article className="about mt-4 mb-4">
        <h3 className="goals-paragraph  mt-2 pb-4">
          <strong className="fs-4 mb-2">Who We Serve: </strong>
          <ul className="mt-2">
            <li>
              <strong>Homeowners:</strong> DIY enthusiasts and property owners
              looking to purchase quality HVAC equipment and plan their
              projects.
            </li>
            <li>
              <strong>HVAC Contractors:</strong> Professional installers seeking
              reliable equipment sources and project management tools.
            </li>
            <li>
              <strong>Service Providers:</strong> Certified technicians offering
              installation, maintenance, and repair services through our
              platform.
            </li>
            <li>
              <strong>Architects & Designers:</strong> Professionals integrating
              HVAC planning into their projects with our annotation tools.
            </li>
            <li>
              <strong>Property Managers:</strong> Managing HVAC needs across
              multiple properties with centralized ordering and service
              coordination.
            </li>
            <li>
              <strong>Renovation Specialists:</strong> Contractors modernizing
              properties with updated cooling systems.
            </li>
            <li>
              <strong>Commercial Buyers:</strong> Businesses purchasing HVAC
              equipment for offices, retail spaces, and facilities.
            </li>
          </ul>
        </h3>
      </article>
      <div className=" mt-4 mb-4">
        <Link to="/" className="go-to-btn btn-text">
          Back to Home
        </Link>
      </div>
    </Container>
  );
};

export default AboutUs;
