import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./NewsletterSignup.css";

export default function NewsletterSignup() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("subscribe");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus({ type: "error", message: t("home.newsletter.invalidEmail") });
      setLoading(false);
      return;
    }

    try {
      const endpoint = mode === "unsubscribe" ? "/api/newsletter/unsubscribe" : "/api/newsletter/subscribe";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "unsubscribe"
            ? { email }
            : {
                email,
                preferences: {
                  newFeatures: true,
                  pricingUpdates: true,
                  industryInsights: true,
                  promotions: false,
                },
              }
        ),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: "success",
          message:
            data.message ||
            (mode === "unsubscribe"
              ? t("home.newsletter.unsubscribeSuccess")
              : t("home.newsletter.subscribeSuccess")),
        });
        setEmail("");
        setTimeout(() => setStatus(null), 5000);
      } else {
        if (response.status === 400 && data.message.includes("already subscribed")) {
          setStatus({ type: "info", message: data.message });
        } else if (response.status === 404 || data.message?.includes("already unsubscribed")) {
          setStatus({ type: "info", message: data.message || "This email is already unsubscribed." });
        } else {
          throw new Error(data.message || `Failed to ${mode}`);
        }
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: t("home.newsletter.genericError", { mode }),
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (nextMode) => {
    setMode(nextMode);
    setStatus(null);
  };

  return (
    <section className="nl-section">
      <div className="nl-container">
        <div className="nl-inner">
          <div className="nl-text">
            <span className="nl-badge">{t("home.newsletter.badge")}</span>
            <h2 className="nl-title">{mode === "unsubscribe" ? t("home.newsletter.titleUnsubscribe") : t("home.newsletter.titleSubscribe")}</h2>
            <p className="nl-desc">
              {mode === "unsubscribe"
                ? t("home.newsletter.descUnsubscribe")
                : t("home.newsletter.descSubscribe")}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="nl-form">
            <div className="nl-mode-switch" role="tablist" aria-label="Newsletter action">
              <button
                type="button"
                className={`nl-mode-btn ${mode === "subscribe" ? "is-active" : ""}`}
                onClick={() => toggleMode("subscribe")}
                disabled={loading}
              >
                {t("home.newsletter.subscribeTab")}
              </button>
              <button
                type="button"
                className={`nl-mode-btn ${mode === "unsubscribe" ? "is-active" : ""}`}
                onClick={() => toggleMode("unsubscribe")}
                disabled={loading}
              >
                {t("home.newsletter.unsubscribeTab")}
              </button>
            </div>
            <div className="nl-input-row">
              <input
                type="email"
                className="nl-input"
                placeholder={t("home.newsletter.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="nl-btn" disabled={loading}>
                {loading ? (mode === "unsubscribe" ? t("home.newsletter.unsubscribing") : t("home.newsletter.subscribing")) : mode === "unsubscribe" ? t("home.newsletter.unsubscribeBtn") : t("home.newsletter.subscribeBtn")}
              </button>
            </div>

            {status && (
              <div className={`nl-alert nl-alert--${status.type}`}>
                {status.message}
                <button className="nl-alert-close" onClick={() => setStatus(null)} type="button">&times;</button>
              </div>
            )}

            <p className="nl-note">
              {t("home.newsletter.note")}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
