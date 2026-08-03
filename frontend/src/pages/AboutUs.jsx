import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaInfoCircle } from "react-icons/fa";
import "./AboutUs.css";

const STEP_ICONS = [
  "fas fa-file-upload",
  "fas fa-drafting-compass",
  "fas fa-hard-hat",
  "fas fa-file-pdf",
  "fas fa-calculator",
  "fas fa-chart-line",
];

const FEATURE_ICONS = [
  "fas fa-store",
  "fas fa-pencil-ruler",
  "fas fa-user-check",
  "fas fa-tools",
  "fas fa-bell",
  "fas fa-hand-holding-usd",
];

const AUDIENCE_ICONS = [
  "fas fa-home",
  "fas fa-building",
  "fas fa-wrench",
  "fas fa-compass",
  "fas fa-shield-alt",
  "fas fa-tags",
];

const AboutUs = () => {
  const { t } = useTranslation();

  const steps = t("aboutUs.steps", { returnObjects: true }).map((s, i) => ({
    ...s,
    icon: STEP_ICONS[i],
  }));

  const features = t("aboutUs.features", { returnObjects: true }).map((f, i) => ({
    ...f,
    icon: FEATURE_ICONS[i],
  }));

  const audiences = t("aboutUs.audiences", { returnObjects: true }).map((a, i) => ({
    ...a,
    icon: AUDIENCE_ICONS[i],
  }));

  return (
    <div className="au-page">
      {/* Hero */}
      <div className="au-hero">
        <div className="au-hero__inner">
          <div className="au-hero__icon"><FaInfoCircle /></div>
          <h1 className="au-hero__title">{t("aboutUs.hero.title")}</h1>
          <p className="au-hero__sub">{t("aboutUs.hero.subtitle")}</p>
        </div>
      </div>

      {/* Banner image */}
      <div className="au-banner">
        <img src="/images/about-us.jpg" alt="About AC-Commerce" className="au-banner__img" />
      </div>

      <div className="au-inner">
        {/* Intro */}
        <div className="au-card au-intro">
          <p className="au-lead">
            <strong>{t("aboutUs.intro.p1Bold")}</strong>{t("aboutUs.intro.p1Rest")}
          </p>
          <p className="au-lead au-lead--last">
            {t("aboutUs.intro.p2")}
          </p>
        </div>

        {/* How It Works */}
        <section className="au-section">
          <h2 className="au-section__title">{t("aboutUs.howItWorksTitle")}</h2>
          <div className="au-grid au-grid--3">
            {steps.map((s, i) => (
              <div key={i} className="au-card au-step-card">
                <div className="au-step__number">{i + 1}</div>
                <div className="au-step__icon"><i className={s.icon} /></div>
                <h3 className="au-step__title">{s.title}</h3>
                <p className="au-step__text">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why AC-Commerce */}
        <section className="au-section">
          <h2 className="au-section__title">{t("aboutUs.whyTitle")}</h2>
          <div className="au-grid au-grid--3">
            {features.map((f, i) => (
              <div key={i} className="au-card au-feature-card">
                <div className="au-feature__icon"><i className={f.icon} /></div>
                <h3 className="au-feature__title">{f.title}</h3>
                <p className="au-feature__text">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who We Serve */}
        <section className="au-section">
          <h2 className="au-section__title">{t("aboutUs.whoWeServeTitle")}</h2>
          <div className="au-grid au-grid--6">
            {audiences.map((a, i) => (
              <div key={i} className="au-audience-tile">
                <i className={`${a.icon} au-audience__icon`} />
                <div className="au-audience__label">{a.label}</div>
                <div className="au-audience__desc">{a.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="au-home-row">
          <Link to="/" className="home-btn">🏠 {t("auth.home")}</Link>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;

  