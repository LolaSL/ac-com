import Axios from "axios";
import { useContext, useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Store } from "../Store";
import { getError } from "../utils";
import "./ResetPasswordPage.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  const { state } = useContext(Store);
  const { userInfo } = state;

  const getPasswordStrength = (pass) => {
    if (!pass) return { strength: 0, label: "", color: "" };
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[^a-zA-Z\d]/.test(pass)) strength++;

    const levels = [
      { strength: 0, label: "", color: "" },
      { strength: 1, label: "Weak", color: "#ef4444" },
      { strength: 2, label: "Fair", color: "#f59e0b" },
      { strength: 3, label: "Good", color: "#06b6d4" },
      { strength: 4, label: "Strong", color: "#10b981" },
    ];
    return levels[strength];
  };

  useEffect(() => {
    if (userInfo || !token) {
      navigate("/");
    }
  }, [navigate, userInfo, token]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setFormError("");
    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await Axios.post("/api/users/reset-password", {
        password,
        token,
      });
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => {
        navigate("/signin");
      }, 3000);
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp-page">
      {/* Left Panel */}
      <div className="rp-left">
        <div className="rp-left-content">
          <div className="rp-icon-circle">
            <i className="fas fa-shield-alt"></i>
          </div>
          <h1 className="rp-brand">AC-Commerce</h1>
          <p className="rp-tagline">Create a strong, secure password</p>

          <div className="rp-tips">
            <div className="rp-tip">
              <div className="rp-tip-icon">
                <i className="fas fa-lock"></i>
              </div>
              <div>
                <strong>Use 8+ Characters</strong>
                <p>Longer passwords are harder to crack</p>
              </div>
            </div>
            <div className="rp-tip">
              <div className="rp-tip-icon">
                <i className="fas fa-random"></i>
              </div>
              <div>
                <strong>Mix It Up</strong>
                <p>Combine letters, numbers &amp; symbols</p>
              </div>
            </div>
            <div className="rp-tip">
              <div className="rp-tip-icon">
                <i className="fas fa-fingerprint"></i>
              </div>
              <div>
                <strong>Make It Unique</strong>
                <p>Don't reuse passwords from other sites</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="rp-right">
        <div className="rp-form-container">
          {success ? (
            <div className="rp-success">
              <div className="rp-success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h2>Password Updated!</h2>
              <p>Your password has been reset successfully.</p>
              <p className="rp-redirect-text">
                Redirecting to sign in<span className="rp-dots">...</span>
              </p>
            </div>
          ) : (
            <>
              <div className="rp-form-header">
                <div className="rp-header-icon">
                  <i className="fas fa-lock"></i>
                </div>
                <h2>Reset Password</h2>
                <p>Enter your new password below</p>
              </div>

              <Form onSubmit={submitHandler}>
                <div className="rp-field">
                  <label className="rp-label">New Password</label>
                  <div className="rp-input-wrapper">
                    <i className="fas fa-lock rp-input-icon"></i>
                    <input
                      className="rp-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="rp-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                    </button>
                  </div>
                  {password && (
                    <div className="rp-strength">
                      <div className="rp-strength-bar">
                        <div
                          className="rp-strength-fill"
                          style={{
                            width: `${(getPasswordStrength(password).strength / 4) * 100}%`,
                            backgroundColor: getPasswordStrength(password).color,
                          }}
                        />
                      </div>
                      <span
                        className="rp-strength-label"
                        style={{ color: getPasswordStrength(password).color }}
                      >
                        {getPasswordStrength(password).label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rp-field">
                  <label className="rp-label">Confirm Password</label>
                  <div className="rp-input-wrapper">
                    <i className="fas fa-lock rp-input-icon"></i>
                    <input
                      className="rp-input"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="rp-eye-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className="rp-match-indicator">
                      {password === confirmPassword ? (
                        <span className="rp-match">
                          <i className="fas fa-check-circle"></i> Passwords match
                        </span>
                      ) : (
                        <span className="rp-no-match">
                          <i className="fas fa-times-circle"></i> Passwords do not match
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {formError && (
                  <Alert variant="danger" dismissible onClose={() => setFormError("")} className="rp-alert">
                    <i className="fas fa-exclamation-circle me-2"></i>{formError}
                  </Alert>
                )}

                <button
                  type="submit"
                  className="rp-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      Reset Password
                    </>
                  )}
                </button>
              </Form>

              <div className="rp-footer-link">
                <Link to="/signin">
                  <i className="fas fa-arrow-left me-1"></i> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
