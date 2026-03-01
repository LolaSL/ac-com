import React, { useContext, useReducer, useState, useEffect } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import "./ServiceProviderProfile.css";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const reducer = (state, action) => {
  switch (action.type) {
    case "UPDATE_REQUEST":  return { ...state, loadingUpdate: true };
    case "UPDATE_SUCCESS":  return { ...state, loadingUpdate: false };
    case "UPDATE_FAIL":     return { ...state, loadingUpdate: false };
    default:                return state;
  }
};

export default function ServiceProviderProfile() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { serviceProviderInfo } = state;

  const [name,               setName]               = useState(serviceProviderInfo?.name || "");
  const [typeOfProvider,     setTypeOfProvider]     = useState(serviceProviderInfo?.typeOfProvider || "");
  const [experience,         setExperience]         = useState(serviceProviderInfo?.experience || "");
  const [email,              setEmail]              = useState(serviceProviderInfo?.email || "");
  const [bio,                setBio]                = useState(serviceProviderInfo?.bio || "");
  const [location,           setLocation]           = useState(serviceProviderInfo?.location || "");
  const [skillsInput,        setSkillsInput]        = useState((serviceProviderInfo?.skills || []).join(", "));
  const [availabilityStatus, setAvailabilityStatus] = useState(serviceProviderInfo?.availabilityStatus || "Available");
  const [socialLinkedin,     setSocialLinkedin]     = useState(serviceProviderInfo?.socialLinks?.linkedin || "");
  const [socialInstagram,    setSocialInstagram]    = useState(serviceProviderInfo?.socialLinks?.instagram || "");
  const [password,           setPassword]           = useState("");
  const [confirmPassword,    setConfirmPassword]    = useState("");
  const [showPassword,       setShowPassword]       = useState(false);

  const [{ loadingUpdate }, dispatch] = useReducer(reducer, { loadingUpdate: false });

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!serviceProviderInfo?._id) {
      toast.error("Service Provider information is missing or you are not logged in.");
      return;
    }
    try {
      const { data } = await axios.put(
        `/api/service-providers/profile/${serviceProviderInfo._id}`,
        {
          name, typeOfProvider, experience, email,
          bio, location,
          skills: skillsInput.split(",").map(s => s.trim()).filter(Boolean),
          availabilityStatus,
          socialLinks: { linkedin: socialLinkedin, instagram: socialInstagram },
          password: password || undefined,
        },
        { headers: { Authorization: `Bearer ${serviceProviderInfo.token}` } }
      );
      dispatch({ type: "UPDATE_SUCCESS" });
      ctxDispatch({ type: "SERVICE_PROVIDER_LOGIN", payload: data });
      localStorage.setItem("serviceProviderInfo", JSON.stringify(data));
      toast.success("Profile updated successfully");
      navigate("/serviceprovider/dashboard");
    } catch (err) {
      dispatch({ type: "UPDATE_FAIL" });
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (!serviceProviderInfo) navigate("/serviceprovider/login");
  }, [serviceProviderInfo, navigate]);

  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "SP";

  const STATUS_COLORS = { Available: "#22c55e", Busy: "#f59e0b", "On Leave": "#ef4444" };
  const statusColor = STATUS_COLORS[availabilityStatus] || "#868d9c";

  return (
    <div className="sp-profile-page">
      {/* Hero */}
      <div className="sp-profile-hero">
        <div className="sp-profile-hero__banner" />
        <div className="sp-profile-hero__body">
          <div className="sp-profile-avatar">{initials}</div>
          <div className="sp-profile-hero__info">
            <h1 className="sp-profile-hero__name">{name || "Your Name"}</h1>
            <div className="sp-profile-hero__badges">
              {typeOfProvider && (
                <span className="sp-profile-badge sp-profile-badge--blue">🔧 {typeOfProvider}</span>
              )}
              {experience && (
                <span className="sp-profile-badge sp-profile-badge--grey">⏳ {experience} yrs</span>
              )}
              <span
                className="sp-profile-badge"
                style={{ background: statusColor + "22", color: statusColor, borderColor: statusColor + "55" }}
              >
                {availabilityStatus}
              </span>
            </div>
            <div className="sp-profile-hero__actions mt-2">
              <Link to="/serviceprovider/dashboard" className="spd-action-btn spd-action-btn--outline" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="sp-profile-form-card">
        <h2 className="sp-profile-form-title">✏️ Edit Profile</h2>
        <Form onSubmit={submitHandler}>

          {/* Basic info */}
          <div className="sp-profile-form-grid">
            <Form.Group controlId="spName">
              <Form.Label className="sp-form-label">Full Name</Form.Label>
              <Form.Control value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name" className="sp-input" required />
            </Form.Group>
            <Form.Group controlId="spEmail">
              <Form.Label className="sp-form-label">Email</Form.Label>
              <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" className="sp-input" required />
            </Form.Group>
            <Form.Group controlId="spProfession">
              <Form.Label className="sp-form-label">Profession / Type</Form.Label>
              <Form.Control value={typeOfProvider} onChange={e => setTypeOfProvider(e.target.value)}
                placeholder="e.g. HVAC Technician" className="sp-input" required />
            </Form.Group>
            <Form.Group controlId="spExperience">
              <Form.Label className="sp-form-label">Years of Experience</Form.Label>
              <Form.Control value={experience} onChange={e => setExperience(e.target.value)}
                placeholder="e.g. 5" className="sp-input" required />
            </Form.Group>
            <Form.Group controlId="spLocation">
              <Form.Label className="sp-form-label">Location</Form.Label>
              <Form.Control value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. New York, NY" className="sp-input" />
            </Form.Group>
            <Form.Group controlId="spAvailability">
              <Form.Label className="sp-form-label">Availability Status</Form.Label>
              <Form.Select value={availabilityStatus} onChange={e => setAvailabilityStatus(e.target.value)} className="sp-input">
                <option>Available</option>
                <option>Busy</option>
                <option>On Leave</option>
              </Form.Select>
            </Form.Group>
          </div>

          {/* Bio */}
          <Form.Group controlId="spBio" className="mt-3">
            <Form.Label className="sp-form-label">Bio</Form.Label>
            <Form.Control as="textarea" rows={3} value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Brief description of your expertise and experience…" className="sp-input" />
          </Form.Group>

          {/* Skills */}
          <Form.Group controlId="spSkills" className="mt-3">
            <Form.Label className="sp-form-label">Skills <small className="text-muted">(comma-separated)</small></Form.Label>
            <Form.Control value={skillsInput} onChange={e => setSkillsInput(e.target.value)}
              placeholder="e.g. HVAC Design, AutoCAD, Load Calculation" className="sp-input" />
          </Form.Group>

          {/* Social links */}
          <div className="sp-profile-form-grid mt-3">
            <Form.Group controlId="spLinkedin">
              <Form.Label className="sp-form-label">LinkedIn URL</Form.Label>
              <Form.Control value={socialLinkedin} onChange={e => setSocialLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourname" className="sp-input" />
            </Form.Group>
            <Form.Group controlId="spInstagram">
              <Form.Label className="sp-form-label">Instagram URL</Form.Label>
              <Form.Control value={socialInstagram} onChange={e => setSocialInstagram(e.target.value)}
                placeholder="https://instagram.com/yourhandle" className="sp-input" />
            </Form.Group>
          </div>

          {/* Password section */}
          <div className="sp-profile-password-section">
            <button type="button" className="sp-password-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "▲ Hide" : "▼ Change Password"}
            </button>
            {showPassword && (
              <div className="sp-profile-form-grid mt-3">
                <Form.Group controlId="spPassword">
                  <Form.Label className="sp-form-label">New Password</Form.Label>
                  <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current" className="sp-input" />
                </Form.Group>
                <Form.Group controlId="spConfirmPassword">
                  <Form.Label className="sp-form-label">Confirm Password</Form.Label>
                  <Form.Control type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password" className="sp-input" />
                </Form.Group>
              </div>
            )}
          </div>

          <div className="sp-profile-form-footer">
            <Button type="submit" disabled={loadingUpdate} className="sp-save-btn">
              {loadingUpdate ? "Saving…" : "💾 Save Changes"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
