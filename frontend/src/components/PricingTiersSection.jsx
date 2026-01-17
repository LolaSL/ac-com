import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import "./PricingTiersSection.css";

export default function PricingTiersSection() {
  const [billingCycle, setBillingCycle] = useState("monthly");

  const pricingTiers = [
    {
      id: 1,
      name: "Starter",
      description: "Perfect for small teams",
      monthlyPrice: 299,
      annualPrice: 2990,
      icon: "🚀",
      features: [
        "Up to 50 projects/month",
        "Basic AI annotations",
        "5 team members",
        "Email support",
        "Standard integrations",
        "Monthly reports",
        "Community access",
      ],
      highlighted: false,
      cta: "Start Free Trial",
    },
    {
      id: 2,
      name: "Professional",
      description: "For growing businesses",
      monthlyPrice: 799,
      annualPrice: 7990,
      icon: "⭐",
      features: [
        "Up to 300 projects/month",
        "Advanced AI annotations",
        "25 team members",
        "Priority support 24/7",
        "Custom integrations",
        "Weekly reports",
        "API access",
        "Custom branding",
        "Advanced analytics",
      ],
      highlighted: true,
      cta: "Start Free Trial",
      badge: "Most Popular",
    },
    {
      id: 3,
      name: "Enterprise",
      description: "For large organizations",
      monthlyPrice: null,
      annualPrice: null,
      icon: "👑",
      features: [
        "Unlimited projects",
        "Premium AI annotations",
        "Unlimited team members",
        "Dedicated support",
        "Full API access",
        "Real-time reports",
        "White-label solution",
        "Custom workflows",
        "On-premise deployment",
        "SLA guarantees",
      ],
      highlighted: false,
      cta: "Contact Sales",
      customPrice: true,
    },
  ];

  const getPrice = (tier) => {
    if (tier.customPrice) return "Custom Pricing";
    const price =
      billingCycle === "monthly" ? tier.monthlyPrice : tier.annualPrice;
    const saving =
      billingCycle === "annual"
        ? Math.round((tier.monthlyPrice * 12 - tier.annualPrice) / 12)
        : 0;
    return {
      price,
      saving,
      period:
        billingCycle === "monthly" ? "/month" : "/month (billed annually)",
    };
  };

  return (
    <section className="pricing-tiers-section">
      <Container>
        <div className="pricing-header text-center mb-5">
          <h2 className="pricing-title">Simple, Transparent Pricing</h2>
          <p className="pricing-subtitle">
            Choose the plan that fits your business needs
          </p>

          {/* Billing Toggle */}
          <div className="billing-toggle mt-4">
            <button
              className={`toggle-btn ${
                billingCycle === "monthly" ? "active" : ""
              }`}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              className={`toggle-btn ${
                billingCycle === "annual" ? "active" : ""
              }`}
              onClick={() => setBillingCycle("annual")}
            >
              Annual
              <span className="save-badge">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <Row>
          {pricingTiers.map((tier) => (
            <Col lg={4} md={6} xs={12} key={tier.id} className="mb-4">
              <div
                className={`pricing-card ${
                  tier.highlighted ? "highlighted" : ""
                }`}
              >
                {tier.badge && <div className="badge-ribbon">{tier.badge}</div>}

                {/* Card Header */}
                <div className="pricing-header-card">
                  <div className="pricing-icon">{tier.icon}</div>
                  <h3 className="pricing-name">{tier.name}</h3>
                  <p className="pricing-description">{tier.description}</p>
                </div>

                {/* Pricing */}
                <div className="pricing-display">
                  {tier.customPrice ? (
                    <div className="custom-price">Custom Pricing</div>
                  ) : (
                    <>
                      <div className="price-amount">
                        ${getPrice(tier).price}
                        <span className="price-period">
                          {getPrice(tier).period}
                        </span>
                      </div>
                      {billingCycle === "annual" &&
                        getPrice(tier).saving > 0 && (
                          <div className="saving-text">
                            Save ${getPrice(tier).saving}/month
                          </div>
                        )}
                    </>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  className={`pricing-cta ${tier.highlighted ? "primary" : ""}`}
                >
                  {tier.cta}
                </button>

                {/* Features List */}
                <div className="features-list">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="feature-item">
                      <span className="feature-icon">✓</span>
                      <span className="feature-text">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* FAQ or Additional Info */}
        <div className="pricing-footer text-center mt-5">
          <h3 className="pricing-footer-title">All plans include</h3>
          <Row className="mt-4">
            <Col md={4} sm={6} xs={12} className="mb-3">
              <div className="included-item">
                <div className="included-icon">🔒</div>
                <p className="included-text">Bank-level security</p>
              </div>
            </Col>
            <Col md={4} sm={6} xs={12} className="mb-3">
              <div className="included-item">
                <div className="included-icon">📱</div>
                <p className="included-text">Mobile app access</p>
              </div>
            </Col>
            <Col md={4} sm={6} xs={12} className="mb-3">
              <div className="included-item">
                <div className="included-icon">🔄</div>
                <p className="included-text">30-day free trial</p>
              </div>
            </Col>
          </Row>
        </div>
      </Container>
    </section>
  );
}
