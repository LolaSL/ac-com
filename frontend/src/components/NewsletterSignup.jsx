import React, { useState } from "react";
import "./NewsletterSignup.css";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus({ type: "error", message: "Please enter a valid email address" });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setStatus({
          type: "success",
          message: data.message || "Thanks for subscribing! Check your email for exclusive offers.",
        });
        setEmail("");
        setTimeout(() => setStatus(null), 5000);
      } else {
        if (response.status === 400 && data.message.includes("already subscribed")) {
          setStatus({ type: "info", message: data.message });
        } else {
          throw new Error(data.message || "Failed to subscribe");
        }
      }
    } catch (error) {
      setStatus({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="nl-section">
      <div className="nl-container">
        <div className="nl-inner">
          <div className="nl-text">
            <span className="nl-badge">Newsletter</span>
            <h2 className="nl-title">Stay Updated</h2>
            <p className="nl-desc">
              Get exclusive updates on new features, pricing options, and industry insights delivered to your inbox
            </p>
          </div>
          <form onSubmit={handleSubmit} className="nl-form">
            <div className="nl-input-row">
              <input
                type="email"
                className="nl-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="nl-btn" disabled={loading}>
                {loading ? "Subscribing..." : "Subscribe"}
              </button>
            </div>

            {status && (
              <div className={`nl-alert nl-alert--${status.type}`}>
                {status.message}
                <button className="nl-alert-close" onClick={() => setStatus(null)} type="button">&times;</button>
              </div>
            )}

            <p className="nl-note">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
