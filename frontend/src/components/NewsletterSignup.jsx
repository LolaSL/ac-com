import React, { useState } from "react";
import { Container, Form, Alert } from "react-bootstrap";
import "./NewsletterSignup.css";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus({
        type: "error",
        message: "Please enter a valid email address",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          preferences: {
            newFeatures: true,
            pricingUpdates: true,
            industryInsights: true,
            promotions: false,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success case
        setStatus({
          type: "success",
          message:
            data.message ||
            "Thanks for subscribing! Check your email for exclusive offers.",
        });
        setEmail("");
        // Clear success message after 5 seconds
        setTimeout(() => setStatus(null), 5000);
      } else {
        // Handle different error cases
        if (
          response.status === 400 &&
          data.message.includes("already subscribed")
        ) {
          setStatus({
            type: "info",
            message: data.message,
          });
        } else {
          throw new Error(data.message || "Failed to subscribe");
        }
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="newsletter-signup-container">
      <section className="newsletter-signup-section ">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h2 className="newsletter-title">Stay Updated</h2>
            <p className="newsletter-description text-center">
              Get exclusive updates on new features, pricing options, and
              industry insights delivered to your inbox
            </p>
          </div>
          <Form onSubmit={handleSubmit} className="newsletter-form">
            <Form.Group className="newsletter-input-group">
              <div className="input-wrapper">
                <Form.Control
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="newsletter-input m-auto"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="newsletter-btn m-auto"
                >
                  {loading ? "Subscribing..." : "Subscribe"}
                </button>
              </div>
            </Form.Group>

            {status && (
              <Alert
                variant={
                  status.type === "success"
                    ? "success"
                    : status.type === "info"
                    ? "info"
                    : "danger"
                }
                className="newsletter-alert"
                dismissible
                onClose={() => setStatus(null)}
              >
                {status.message}
              </Alert>
            )}

            <p className="newsletter-note">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </Form>
        </div>{" "}
      </section>
    </Container>
  );
}
