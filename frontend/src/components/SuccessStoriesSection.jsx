import React, { useState } from "react";
import { Container, Row, Col, Card, Modal } from "react-bootstrap";
import DemoRequestForm from "./DemoRequestForm";
import "./SuccessStoriesSection.css";

export default function SuccessStoriesSection() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const successStories = [
    {
      id: 1,
      company: "Premier HVAC Solutions",
      title: "35% Cost Reduction in 6 Months",
      image: "🏢",
      beforeMetrics: { projects: "12/month", time: "14 days", cost: "$18,000" },
      afterMetrics: { projects: "18/month", time: "9 days", cost: "$11,700" },
      testimonial:
        "AC Commerce transformed how we manage projects. The design tools alone cut our quoting time in half. We've increased profitability by nearly 40%.",
      author: "James Mitchell",
      role: "CEO",
      rating: 5,
    },
    {
      id: 2,
      company: "Thermal Comfort Inc.",
      title: "2x Project Volume Growth",
      image: "📊",
      beforeMetrics: { projects: "8/month", time: "16 days", cost: "$22,000" },
      afterMetrics: { projects: "16/month", time: "8 days", cost: "$14,000" },
      testimonial:
        "The platform's AI annotation and BTU calculation features are game-changers. We've doubled our project volume without hiring additional staff.",
      author: "Sarah Chen",
      role: "Operations Manager",
      rating: 5,
    },
    {
      id: 3,
      company: "Climate Control Specialists",
      title: "50% Faster Installations",
      image: "⚡",
      beforeMetrics: { projects: "10/month", time: "12 days", cost: "$16,000" },
      afterMetrics: { projects: "15/month", time: "6 days", cost: "$11,200" },
      testimonial:
        "The integration with our scheduling system was seamless. Customer satisfaction increased significantly thanks to faster turnarounds.",
      author: "Michael Rodriguez",
      role: "Technical Director",
      rating: 5,
    },
  ];

  return (
    <section className="success-stories-section">
      <Container>
        <div className="stories-header text-center mb-5">
          <h2 className="stories-title">Success Stories</h2>
          <p className="stories-subtitle">
            Real results from leading HVAC companies
          </p>
        </div>

        <Row>
          {successStories.map((story) => (
            <Col lg={4} md={6} xs={12} key={story.id} className="mb-4">
              <Card className="story-card">
                <Card.Body className="story-body">
                  {/* Header */}
                  <div className="story-header">
                    <div className="story-image">{story.image}</div>
                    <div className="story-company">{story.company}</div>
                    <div className="story-achievement">{story.title}</div>
                  </div>

                  {/* Metrics Comparison */}
                  <div className="metrics-comparison">
                    <div className="metrics-column">
                      <div className="metrics-label">Before</div>
                      <div className="metric-item">
                        <span className="metric-icon">📈</span>
                        <span className="metric-value">
                          {story.beforeMetrics.projects}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-icon">⏱️</span>
                        <span className="metric-value">
                          {story.beforeMetrics.time}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-icon">💰</span>
                        <span className="metric-value">
                          {story.beforeMetrics.cost}
                        </span>
                      </div>
                    </div>

                    <div className="metrics-arrow">→</div>

                    <div className="metrics-column">
                      <div className="metrics-label after">After</div>
                      <div className="metric-item highlight">
                        <span className="metric-icon">📈</span>
                        <span className="metric-value">
                          {story.afterMetrics.projects}
                        </span>
                      </div>
                      <div className="metric-item highlight">
                        <span className="metric-icon">⏱️</span>
                        <span className="metric-value">
                          {story.afterMetrics.time}
                        </span>
                      </div>
                      <div className="metric-item highlight">
                        <span className="metric-icon">💰</span>
                        <span className="metric-value">
                          {story.afterMetrics.cost}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial */}
                  <div className="testimonial-section">
                    <p className="testimonial-text">"{story.testimonial}"</p>

                    <div className="testimonial-author">
                      <div className="author-info">
                        <div className="author-name">{story.author}</div>
                        <div className="author-role">{story.role}</div>
                      </div>
                      <div className="author-rating">
                        {[...Array(story.rating)].map((_, i) => (
                          <span key={i} className="star">
                            ⭐
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Call to Action */}
        <div className="stories-cta text-center mt-5">
          <h3 className="cta-text">Ready to Join Our Success Stories?</h3>
          <button
            className="stories-button"
            onClick={() => setShowDemoModal(true)}
          >
            Schedule a Demo
          </button>
        </div>
      </Container>

      {/* Demo Request Modal */}
      <Modal
        show={showDemoModal}
        onHide={() => setShowDemoModal(false)}
        className="top-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Schedule a Demo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DemoRequestForm onClose={() => setShowDemoModal(false)} />
        </Modal.Body>
      </Modal>
    </section>
  );
}
