import React from "react";
import { useTranslation } from "react-i18next";
import "./TestimonialsSection.css";

export default function TestimonialsSection() {
  const { t } = useTranslation();
  const items = t("home.testimonials.items", { returnObjects: true });
  const testimonials = [
    { name: "John Martinez", company: "Martinez Cooling Solutions", rating: 5, image: "👨‍💼", role: items[0].role, text: items[0].text },
    { name: "Sarah Chen", company: "Tech Campus Inc.", rating: 5, image: "👩‍💼", role: items[1].role, text: items[1].text },
    { name: "Mike Thompson", company: "Thompson Developments", rating: 5, image: "👨‍🔧", role: items[2].role, text: items[2].text },
  ];

  const statLabels = t("home.testimonials.stats", { returnObjects: true });
  const stats = [
    { value: "60%", label: statLabels[0].label, icon: "fas fa-chart-line" },
    { value: "50%", label: statLabels[1].label, icon: "fas fa-bolt" },
    { value: "4.8/5", label: statLabels[2].label, icon: "fas fa-star" },
  ];

  return (
    <section className="ts-section">
      <div className="ts-container">
        <div className="ts-header">
          <span className="ts-badge">{t("home.testimonials.badge")}</span>
          <h2 className="ts-title">{t("home.testimonials.title")}</h2>
          <p className="ts-subtitle">{t("home.testimonials.subtitle")}</p>
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
