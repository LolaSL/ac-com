import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import "./TestimonialsSection.css";

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "John Martinez",
      role: "HVAC Contractor",
      company: "Martinez Cooling Solutions",
      text: "This platform has transformed how we quote projects. We've cut our turnaround time in half and increased our project volume by 60%.",
      rating: 5,
      image: "👨‍💼",
    },
    {
      name: "Sarah Chen",
      role: "Facility Manager",
      company: "Tech Campus Inc.",
      text: "The Engineering powered design tool is incredibly accurate. Our installation went smoothly thanks to the detailed specifications provided.",
      rating: 5,
      image: "👩‍💼",
    },
    {
      name: "Mike Thompson",
      role: "Real Estate Developer",
      company: "Thompson Developments",
      text: "Outstanding platform! Finding certified installers was never easier. The project management tools saved us thousands in coordination costs.",
      rating: 5,
      image: "👨‍🔧",
    },
  ];

  return (
    <section className="testimonials-section py-5">
      <Container>
        <Row className="mb-5 text-center">
          <Col>
            <h2 className="section-title">What Our Customers Say</h2>
            <p className="text-muted lead">
              Real results from industry professionals
            </p>
          </Col>
        </Row>

        <Row>
          {testimonials.map((testimonial, index) => (
            <Col md={4} sm={6} xs={12} key={index} className="mb-4">
              <div className="testimonial-card">
                {/* Rating */}
                <div className="testimonial-rating">
                  {"⭐".repeat(testimonial.rating)}
                </div>

                {/* Quote */}
                <p className="testimonial-quote">"{testimonial.text}"</p>

                {/* Author */}
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{testimonial.image}</div>
                  <div>
                    <h6 className="testimonial-name">{testimonial.name}</h6>
                    <small className="testimonial-role">
                      {testimonial.role}
                    </small>
                    <br />
                    <small className="testimonial-company">
                      {testimonial.company}
                    </small>
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Stats from testimonials */}
        <Row className="stats-section">
          <Col md={4} xs={12} className="mb-3">
            <h4 className="stat-number">60%</h4>
            <p className="stat-description">Increase in Project Volume</p>
          </Col>
          <Col md={4} xs={12} className="mb-3">
            <h4 className="stat-number">50%</h4>
            <p className="stat-description">Faster Quote Turnaround</p>
          </Col>
          <Col md={4} xs={12} className="mb-3">
            <h4 className="stat-number">4.8/5</h4>
            <p className="stat-description">Average Customer Rating</p>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
