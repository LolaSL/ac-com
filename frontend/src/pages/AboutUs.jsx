import React from "react";
import { Container } from "react-bootstrap";
const AboutUs = () => {
  return (
    <Container className="site-container-about mt-4 p-4">
      <article className="about mt-4 mb-4">
        <div
          className="p-5 text-center responsive-image-about rounded mb-3"
          style={{
            backgroundImage: `url("/images/about-us1.jpg")`,
            MaxHeight: "100%",
          }}
        ></div>
        <h3 className="about-paragraph p-2">
          <strong>AC Commerce</strong> is a cutting-edge platform designed to
          fully automate the planning and design process for air conditioning
          systems — eliminating the need for professional intervention in the
          early stages.
        </h3>
        <h3 className="about-paragraph mt-4 pb-2">
          Our platform delivers precise, efficient, and professionally validated
          air conditioning plans for any property by automatically generating
          digitally signed designs tailored to the specific requirements of each
          project.
        </h3>
        <h3 className="about-paragraph mt-4 pb-4">
          While there are numerous platforms dedicated to architectural and
          engineering planning, none currently address the specialized needs of
          air conditioning system design without requiring the involvement of a
          licensed professional. AC Commerce bridges this gap by offering a
          comprehensive, user-friendly solution.
        </h3>
      </article>
      <article className="about mt-4 mb-4">
        <h3 className="about-paragraph mt-4">
          <strong>
            Our Measurement Service System process is straightforward:
          </strong>
          <ul>
            <li>Upload your architectural plan ( PDF file)</li>
            <li>
              Place created air conditioning unit with relevant comment on the
              uploaded architectural plan.
            </li>
            <li>
              Save AC architectural plan — complete with a digital signature
              from a certified air conditioning engineer
            </li>
            <li>
              Complete a short set of guided questions of BTU Calculator
              regarding the property’s specifications and user preferences.
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
          <strong>With AC Commenrce, users can</strong>
          <ul>
            <li>Generate air conditioning system layouts.</li>
            <li>Share professional-grade visual designs.</li>
            <li>Conduct price comparisons.</li>
            <li>
              Facilitate the acquisition of required equipment — all within a
              single streamlined platform.
            </li>
          </ul>
        </h3>
        <h3 className="goals-paragraph  mt-2 pb-4">
          Traditionally, the planning and design of air conditioning systems
          have been exclusively handled by professionals — a process often
          characterized by high costs, extended timelines, and significant
          effort from both service providers and clients. AC Commerce redefines
          this process by delivering substantial cost savings and reducing
          project turnaround times for both consumers and industry
          professionals.
        </h3>{" "}
      </article>
      <article className="about mt-4 mb-4">
        <h3 className="goals-paragraph  mt-2 pb-4">
          <strong>Our Target Audience</strong>
          <ul>
            <li>Contractors</li>
            <li>Architects</li>
            <li>Air Conditioning Consultants</li>
            <li>Air Conditioning Contractors</li>
            <li>Renovation Specialists</li>
            <li>Air Conditioning Retailers</li>
            <li>Property Owners</li>
          </ul>
        </h3>
      </article>
    </Container>
  );
};

export default AboutUs;
