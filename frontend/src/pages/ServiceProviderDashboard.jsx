import React, { useContext, useEffect, useReducer } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { toast } from "react-toastify";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { FaFolderOpen, FaCheckCircle, FaSpinner, FaDollarSign,
         FaClock, FaEnvelope, FaUserEdit, FaMapMarkerAlt,
         FaStar, FaExternalLinkAlt } from "react-icons/fa";
import "./ServiceProviderDashboard.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":  return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":  return { ...state, loading: false, data: action.payload };
    case "FETCH_FAIL":     return { ...state, loading: false, error: action.payload };
    default:               return state;
  }
};

const STATUS_COLORS = { Available: "#22c55e", Busy: "#f59e0b", "On Leave": "#ef4444" };
const BAR_COLORS    = ["#2563a8", "#1a3c5e", "#3b82f6", "#60a5fa", "#93c5fd",
                        "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa"];

export default function ServiceProviderDashboard() {
  const navigate = useNavigate();
  const { state: ctxState } = useContext(Store);
  const { serviceProviderInfo } = ctxState;

  const [{ loading, error, data }, dispatch] = useReducer(reducer, {
    loading: true, error: "", data: null,
  });

  useEffect(() => {
    if (!serviceProviderInfo) { navigate("/serviceprovider/login"); return; }
    const fetchDashboard = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data: res } = await axios.get("/api/service-providers/dashboard", {
          headers: { Authorization: `Bearer ${serviceProviderInfo.token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: res });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
        toast.error(getError(err));
      }
    };
    fetchDashboard();
  }, [serviceProviderInfo, navigate]);

  if (loading) return <div className="spd-loader"><div className="spd-spinner" /></div>;
  if (error)   return <div className="spd-error">⚠️ {error}</div>;
  if (!data)   return null;

  const { sp, stats, earningsByProject, recentProjects } = data;

  const initials = sp?.name
    ? sp.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "SP";

  const statusColor = STATUS_COLORS[sp?.availabilityStatus] || "#868d9c";

  const kpiCards = [
    { label: "Total Projects",  value: stats.totalProjects, icon: <FaFolderOpen />, color: "#2563a8" },
    { label: "Completed",       value: stats.completed,     icon: <FaCheckCircle />, color: "#22c55e" },
    { label: "In Progress",     value: stats.inProgress,    icon: <FaSpinner />,    color: "#f59e0b" },
    { label: "Total Earned",    value: `$${stats.totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                                                             icon: <FaDollarSign />, color: "#a855f7" },
  ];

  return (
    <div className="spd-page">

      {/* ── Hero ── */}
      <div className="spd-hero">
        <div className="spd-hero__banner" />
        <div className="spd-hero__body">
          <div className="spd-avatar">{initials}</div>
          <div className="spd-hero__info">
            <div className="spd-hero__top">
              <h1 className="spd-hero__name">{sp?.name}</h1>
              <span
                className="spd-status-badge"
                style={{ background: statusColor + "22", color: statusColor, borderColor: statusColor + "55" }}
              >
                <span className="spd-status-dot" style={{ background: statusColor }} />
                {sp?.availabilityStatus || "Available"}
              </span>
            </div>

            <div className="spd-hero__meta">
              {sp?.typeOfProvider && <span className="spd-meta-item">🔧 {sp.typeOfProvider}</span>}
              {sp?.experience     && <span className="spd-meta-item">⏳ {sp.experience} yrs exp</span>}
              {sp?.location       && <span className="spd-meta-item"><FaMapMarkerAlt /> {sp.location}</span>}
              {sp?.rating > 0     && <span className="spd-meta-item spd-rating"><FaStar /> {sp.rating.toFixed(1)}</span>}
            </div>

            {sp?.bio && <p className="spd-hero__bio">{sp.bio}</p>}

            {sp?.skills?.length > 0 && (
              <div className="spd-skills">
                {sp.skills.map(skill => (
                  <span key={skill} className="spd-skill-chip">{skill}</span>
                ))}
              </div>
            )}

            <div className="spd-hero__actions">
              <Link to={`/serviceprovider/profile/${sp?._id}`} className="spd-action-btn spd-action-btn--primary">
                <FaUserEdit /> Edit Profile
              </Link>
              {sp?.portfolio?.startsWith('http') && (
                <a href={sp.portfolio} target="_blank" rel="noreferrer" className="spd-action-btn spd-action-btn--outline">
                  <FaExternalLinkAlt /> Portfolio
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="spd-kpi-grid">
        {kpiCards.map(card => (
          <div key={card.label} className="spd-kpi-card" style={{ "--accent": card.color }}>
            <div className="spd-kpi-icon">{card.icon}</div>
            <div className="spd-kpi-body">
              <div className="spd-kpi-value">{card.value}</div>
              <div className="spd-kpi-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="spd-main-grid">

        {/* Earnings Chart */}
        <div className="spd-card spd-chart-card">
          <h2 className="spd-card__title">💰 Earnings by Project</h2>
          {earningsByProject.length === 0 ? (
            <div className="spd-empty">No earnings data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={earningsByProject} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="project"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={(v) => [`$${v.toLocaleString()}`, "Amount"]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {earningsByProject.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Links */}
        <div className="spd-card spd-quick-card">
          <h2 className="spd-card__title">⚡ Quick Links</h2>
          <div className="spd-quick-links">
            <Link to="/serviceprovider/projects"  className="spd-quick-link"><FaFolderOpen /> My Projects</Link>
            <Link to="/serviceprovider/earnings"  className="spd-quick-link"><FaDollarSign /> Earnings</Link>
            <Link to="/serviceprovider/hours"     className="spd-quick-link"><FaClock />     Hours Worked</Link>
            <Link to="/serviceprovider/messages"  className="spd-quick-link"><FaEnvelope />  Messages</Link>
          </div>

          {/* Hours summary */}
          <div className="spd-hours-box">
            <div className="spd-hours-value">{stats.totalHours}<span className="spd-hours-unit"> hrs</span></div>
            <div className="spd-hours-label">Total Hours Logged</div>
          </div>
        </div>
      </div>

      {/* ── Recent Projects ── */}
      <div className="spd-card spd-projects-card">
        <h2 className="spd-card__title">📋 Recent Projects</h2>
        {recentProjects.length === 0 ? (
          <div className="spd-empty">No projects assigned yet.</div>
        ) : (
          <div className="spd-table-wrap">
            <table className="spd-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Due Date</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map(p => (
                  <tr key={p._id}>
                    <td className="spd-td-name">{p.name}</td>
                    <td>{p.client}</td>
                    <td>{new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td>{p.hoursWorked}</td>
                    <td>
                      <span className={`spd-status-chip spd-status-chip--${p.status === "Completed" ? "green" : p.status === "In Progress" ? "amber" : "grey"}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
