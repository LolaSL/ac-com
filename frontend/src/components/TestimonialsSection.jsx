import React from "react";
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

  const stats = [
    { value: "60%", label: "Increase in Project Volume", icon: "fas fa-chart-line" },
    { value: "50%", label: "Faster Quote Turnaround", icon: "fas fa-bolt" },
    { value: "4.8/5", label: "Average Customer Rating", icon: "fas fa-star" },
  ];

  return (
    <section className="ts-section">
      <div className="ts-container">
        <div className="ts-header">
          <span className="ts-badge">Testimonials</span>
          <h2 className="ts-title">What Our Customers Say</h2>
          <p className="ts-subtitle">Real results from industry professionals</p>
        </div>

        <div className="ts-grid">
          {testimonials.map((t, i) => (
            <div className="ts-card" key={i}>
              <div className="ts-card-accent" />
              <div className="ts-stars">
                {Array.from({ length: t.rating }, (_, j) => (
                  <i className="fas fa-star" key={j} />
                ))}
              </div>
              <p className="ts-quote">&ldquo;{t.text}&rdquo;</p>
              <div className="ts-author">
                <div className="ts-avatar">{t.image}</div>
                <div className="ts-author-info">
                  <span className="ts-name">{t.name}</span>
                  <span className="ts-role">{t.role}</span>
                  <span className="ts-company">{t.company}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ts-stats">
          {stats.map((s, i) => (
            <div className="ts-stat" key={i}>
              <i className={`${s.icon} ts-stat-icon`} />
              <span className="ts-stat-value">{s.value}</span>
              <span className="ts-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
