import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUniversalAccess, FaLock, FaTimes } from "react-icons/fa";
import "./CookieConsent.css";

const STORAGE_KEY = "cookieConsent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState({
    analytics: true,
    personalization: true,
    marketing: false,
  });

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, analytics: true, personalization: true, marketing: true }));
    setVisible(false);
    setShowModal(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, ...settings }));
    setVisible(false);
    setShowModal(false);
  };

  const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!visible) return null;

  return (
    <>
      {/* Banner */}
      <div className="cookie-banner" role="alert" aria-live="polite">
        <FaUniversalAccess className="cookie-banner__icon" />
        <div className="cookie-banner__text">
          <span>
            AC Commerce uses cookies and similar technologies to keep our
            platform running smoothly, remember your preferences, and help us
            understand how you interact with our site. We may share anonymised
            usage data with trusted analytics partners to improve our services.
            By continuing to use AC Commerce, you agree to our use of cookies as
            described in our{" "}
            <Link to="/privacy-policy" className="cookie-banner__link">
              Cookie &amp; Privacy Policy
            </Link>
            . You can adjust your preferences at any time.
          </span>
        </div>
        <div className="cookie-banner__actions">
          <button className="cookie-banner__btn--outline" onClick={() => setShowModal(true)}>
            Cookie Settings
          </button>
          <button className="cookie-banner__btn" onClick={handleAcceptAll}>
            I Understand
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="cookie-modal__overlay" role="dialog" aria-modal="true" aria-label="Cookie Settings">
          <div className="cookie-modal">
            <div className="cookie-modal__header">
              <h5 className="cookie-modal__title">Cookie Settings</h5>
              <button className="cookie-modal__close" onClick={() => setShowModal(false)} aria-label="Close">
                <FaTimes />
              </button>
            </div>
            <div className="cookie-modal__body">
              <p className="cookie-modal__desc">
                Manage your cookie preferences below. Essential cookies are always active as they are required for the site to function.
              </p>

              {/* Essential */}
              <div className="cookie-modal__row">
                <div className="cookie-modal__info">
                  <strong>Essential Cookies</strong>
                  <p>Required for authentication, cart, and core features. Cannot be disabled.</p>
                </div>
                <div className="cookie-modal__toggle cookie-modal__toggle--locked">
                  <FaLock size={13} />&nbsp;Always On
                </div>
              </div>

              {/* Analytics */}
              <div className="cookie-modal__row">
                <div className="cookie-modal__info">
                  <strong>Analytics Cookies</strong>
                  <p>Help us understand how visitors use the site so we can improve it.</p>
                </div>
                <label className="cookie-modal__switch">
                  <input type="checkbox" checked={settings.analytics} onChange={() => toggle("analytics")} />
                  <span className="cookie-modal__slider" />
                </label>
              </div>

              {/* Personalization */}
              <div className="cookie-modal__row">
                <div className="cookie-modal__info">
                  <strong>Personalization Cookies</strong>
                  <p>Allow us to remember your preferences and tailor content to you.</p>
                </div>
                <label className="cookie-modal__switch">
                  <input type="checkbox" checked={settings.personalization} onChange={() => toggle("personalization")} />
                  <span className="cookie-modal__slider" />
                </label>
              </div>

              {/* Marketing */}
              <div className="cookie-modal__row">
                <div className="cookie-modal__info">
                  <strong>Marketing Cookies</strong>
                  <p>Used to track visits and deliver relevant ads. Data may be shared with partners.</p>
                </div>
                <label className="cookie-modal__switch">
                  <input type="checkbox" checked={settings.marketing} onChange={() => toggle("marketing")} />
                  <span className="cookie-modal__slider" />
                </label>
              </div>
            </div>

            <div className="cookie-modal__footer">
              <button className="cookie-banner__btn--outline" onClick={handleSaveSettings}>
                Save My Settings
              </button>
              <button className="cookie-banner__btn" onClick={handleAcceptAll}>
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
