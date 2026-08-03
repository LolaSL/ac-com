import React from "react";
import { useTranslation } from "react-i18next";
import "./ValuePropositionSection.css";

export default function ValuePropositionSection() {
  const { t } = useTranslation();
  const items = t("home.value.items", { returnObjects: true });
  const icons = [
    "fas fa-dollar-sign",
    "fas fa-clock",
    "fas fa-check-circle",
    "fas fa-chart-line",
    "fas fa-globe",
    "fas fa-mobile-alt",
  ];
  const colors = ["#34d399", "#67e8f9", "#3b82f6", "#fbbf24", "#f472b6", "#a78bfa"];
  const values = items.map((item, idx) => ({
    icon: icons[idx],
    title: item.title,
    description: item.description,
    color: colors[idx],
  }));

  return (
    <section className="vp-section">
      <div className="vp-container">
        <div className="vp-header">
          <span className="vp-badge">{t("home.value.badge")}</span>
          <h2 className="vp-title">{t("home.value.title")}</h2>
          <p className="vp-subtitle">
            {t("home.value.subtitle")}
          </p>
        </div>

        <div className="vp-grid">
          {values.map((value, index) => (
            <div className="vp-card" key={index}>
              <div className="vp-icon-wrap" style={{ color: value.color }}>
                <i className={value.icon} />
              </div>
              <h5 className="vp-card-title">{value.title}</h5>
              <p className="vp-card-desc">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
