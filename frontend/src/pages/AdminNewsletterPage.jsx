import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaEnvelope, FaPaperPlane, FaUsers, FaUserMinus, FaChartLine, FaEye } from "react-icons/fa";
import "./AdminHero.css";
import "./AdminNewsletterPage.css";

const TEMPLATES = [
  { key: "welcome",       label: "Welcome",              icon: "🎉", desc: "Welcome new subscribers to the platform" },
  { key: "newProducts",   label: "New Products",          icon: "🆕", desc: "Announce new HVAC products in the catalog" },
  { key: "seasonalDeals", label: "Seasonal Deals",        icon: "🏷️", desc: "Promote seasonal discounts and bundles" },
  { key: "maintenance",   label: "Maintenance Reminder",  icon: "🔧", desc: "Remind customers about AC maintenance" },
  { key: "btuCalculator", label: "BTU Calculator",        icon: "📐", desc: "Promote the BTU calculator tool" },
  { key: "roiInsights",   label: "ROI Insights",          icon: "📊", desc: "Highlight ROI calculator and savings" },
  { key: "hvacDesign",    label: "HVAC Design Tool",      icon: "📄", desc: "Upload floor plans and design HVAC layouts" },
  { key: "engineerReview",label: "Engineer Review",       icon: "👷", desc: "Professional engineer checks your design" },
  { key: "smartBtuSizing",label: "Smart BTU Sizing",      icon: "🏠", desc: "BTU-calculated AC & condenser recommendations" },
];

export default function AdminNewsletterPage() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { adminInfo, userInfo } = state;
  const authInfo = adminInfo || userInfo;

  const [stats, setStats] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!authInfo?.token) {
      navigate("/signin");
      return;
    }
    const loadData = async () => {
      try {
        const h = { Authorization: `Bearer ${authInfo.token}` };
        const [statsRes, subsRes] = await Promise.all([
          axios.get("/api/newsletter/admin/stats", { headers: h }),
          axios.get("/api/newsletter/admin/subscribers?status=active&limit=200", { headers: h }),
        ]);
        setStats(statsRes.data);
        setSubscribers(subsRes.data.subscribers);
      } catch (err) {
        toast.error("Failed to load newsletter data");
      } finally {
        setLoadingStats(false);
        setLoadingSubs(false);
      }
    };
    loadData();
  }, [authInfo, navigate]);

  const headers = { Authorization: `Bearer ${authInfo?.token}` };

  const handleTemplateSelect = (key) => {
    setSelectedTemplate(key);
    setResult(null);
    const t = TEMPLATES.find((t) => t.key === key);
    if (t) {
      setSubject(`AC Commerce — ${t.label}`);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter a subject line");
      return;
    }

    const confirmed = window.confirm(
      `Send "${subject}" to ${stats?.active || 0} active subscribers?`
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);
    try {
      const { data } = await axios.post(
        "/api/newsletter/admin/send",
        { subject, template: selectedTemplate },
        { headers }
      );
      setResult(data);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send newsletter");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="adm-page">
      {/* Hero */}
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaEnvelope /></div>
          <h1 className="adm-hero__title">Newsletter Manager</h1>
          <p className="adm-hero__sub">Send professional emails to your subscribers</p>
        </div>
      </div>

      <div className="adm-inner">
        {/* Stats Cards */}
        <div className="nl-stats-grid">
          <div className="nl-stat-card nl-stat-active">
            <div className="nl-stat-icon"><FaUsers /></div>
            <div className="nl-stat-info">
              <span className="nl-stat-number">{loadingStats ? "—" : stats?.active || 0}</span>
              <span className="nl-stat-label">Active Subscribers</span>
            </div>
          </div>
          <div className="nl-stat-card nl-stat-unsub">
            <div className="nl-stat-icon"><FaUserMinus /></div>
            <div className="nl-stat-info">
              <span className="nl-stat-number">{loadingStats ? "—" : stats?.unsubscribed || 0}</span>
              <span className="nl-stat-label">Unsubscribed</span>
            </div>
          </div>
          <div className="nl-stat-card nl-stat-recent">
            <div className="nl-stat-icon"><FaChartLine /></div>
            <div className="nl-stat-info">
              <span className="nl-stat-number">{loadingStats ? "—" : stats?.recentSubscribers || 0}</span>
              <span className="nl-stat-label">Last 30 Days</span>
            </div>
          </div>
          <div className="nl-stat-card nl-stat-total">
            <div className="nl-stat-icon"><FaEnvelope /></div>
            <div className="nl-stat-info">
              <span className="nl-stat-number">{loadingStats ? "—" : stats?.total || 0}</span>
              <span className="nl-stat-label">Total All-Time</span>
            </div>
          </div>
        </div>

        {/* Compose Section */}
        <div className="nl-compose-card">
          <h2 className="nl-section-title">
            <FaPaperPlane className="nl-section-icon" />
            Compose Newsletter
          </h2>

          {/* Template Grid */}
          <label className="nl-label">Choose a Template</label>
          <div className="nl-template-grid">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                className={`nl-template-btn ${selectedTemplate === t.key ? "nl-template-active" : ""}`}
                onClick={() => handleTemplateSelect(t.key)}
              >
                <span className="nl-template-emoji">{t.icon}</span>
                <strong className="nl-template-name">{t.label}</strong>
                <span className="nl-template-desc">{t.desc}</span>
              </button>
            ))}
          </div>

          {/* Subject */}
          <label className="nl-label" style={{ marginTop: "1.5rem" }}>Subject Line</label>
          <input
            className="nl-subject-input"
            type="text"
            placeholder="Email subject line..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          {/* Send Button */}
          <button
            className="nl-send-btn"
            disabled={sending || !selectedTemplate || !subject.trim()}
            onClick={handleSend}
          >
            {sending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Sending to {stats?.active || 0} subscribers...
              </>
            ) : (
              <>
                <FaPaperPlane className="me-2" />
                Send to {stats?.active || 0} Active Subscribers
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className={`nl-result ${result.failed > 0 ? "nl-result-warn" : "nl-result-ok"}`}>
              <strong>{result.sent}</strong> delivered, <strong>{result.failed}</strong> failed out of <strong>{result.total}</strong> subscribers.
              {result.errors && (
                <details style={{ marginTop: "0.5rem" }}>
                  <summary>View errors</summary>
                  <ul style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    {result.errors.map((e, i) => (
                      <li key={i}>{e.email}: {e.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Subscribers List */}
        <div className="nl-subscribers-card">
          <div className="nl-subscribers-header" onClick={() => setShowSubscribers(!showSubscribers)}>
            <h2 className="nl-section-title" style={{ marginBottom: 0 }}>
              <FaEye className="nl-section-icon" />
              Active Subscribers ({subscribers.length})
            </h2>
            <button className="nl-toggle-btn">
              {showSubscribers ? "Hide" : "Show"}
            </button>
          </div>

          {showSubscribers && (
            <div className="nl-subscribers-table-wrap">
              {loadingSubs ? (
                <p className="text-center py-3">Loading...</p>
              ) : subscribers.length === 0 ? (
                <p className="text-center py-3 text-muted">No active subscribers yet</p>
              ) : (
                <table className="nl-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Email</th>
                      <th>Subscribed</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub, i) => (
                      <tr key={sub._id}>
                        <td data-label="#">{i + 1}</td>
                        <td data-label="Email">{sub.email}</td>
                        <td data-label="Subscribed">{new Date(sub.subscriptionDate).toLocaleDateString()}</td>
                        <td data-label="Source">{sub.source || "website"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
