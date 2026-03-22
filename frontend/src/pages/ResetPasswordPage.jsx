import Axios from "axios";
import { useContext, useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
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
      <Link to="/" className="auth-home-link">
        <i className="fas fa-home"></i>
        <span>Home</span>
      </Link>
      <Container fluid className="rp-container">
        <div className="rp-wrapper">
          {/* Left Side - Branding */}
          <div className="rp-left">
            <div className="rp-branding">
              <div className="rp-logo-container">
                <i className="fas fa-shield-alt rp-logo-icon"></i>
              </div>
              <h1 className="rp-brand-title">AC-Commerce</h1>
              <h2 className="rp-brand-subtitle">Create New Password</h2>
              <p className="rp-brand-description">
                Choose a strong, secure password to protect your account.
                A good password is the first line of defense.
              </p>

              <div className="rp-tips">
                <div className="rp-tip">
                  <div className="rp-tip-num">
                    <i className="fas fa-lock"></i>
                  </div>
                  <div className="rp-tip-text">
                    <strong>Use 8+ Characters</strong>
                    <span>Longer passwords are harder to crack</span>
                  </div>
                </div>
                <div className="rp-tip">
                  <div className="rp-tip-num">
                    <i className="fas fa-random"></i>
                  </div>
                  <div className="rp-tip-text">
                    <strong>Mix It Up</strong>
                    <span>Combine letters, numbers &amp; symbols</span>
                  </div>
                </div>
                <div className="rp-tip">
                  <div className="rp-tip-num">
                    <i className="fas fa-fingerprint"></i>
                  </div>
                  <div className="rp-tip-text">
                    <strong>Make It Unique</strong>
                    <span>Don&apos;t reuse passwords from other sites</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="rp-right">
            <div className="rp-form-container">
              {success ? (
                <div className="rp-success-card">
                  <i className="fas fa-check-circle rp-success-icon"></i>
                  <h2 className="rp-success-title">Password Updated!</h2>
                  <p className="rp-success-text">
                    Your password has been reset successfully.
                    You&apos;ll be redirected to sign in shortly.
                  </p>
                  <p className="rp-success-hint">
                    Redirecting to sign in
                    <span className="rp-dots">...</span>
                  </p>
                  <Link to="/signin" className="rp-back-link">
                    <i className="fas fa-arrow-left me-2"></i>
                    Go to Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <div className="rp-form-header">
                    <i className="fas fa-lock rp-form-icon"></i>
                    <h2 className="rp-form-title">Reset Password</h2>
                    <p className="rp-form-subtitle">
                      Enter your new password below
                    </p>
                  </div>

                  <Form
                    onSubmit={submitHandler}
                    noValidate
                    className="rp-form"
                  >
                    {formError && (
                      <Alert
                        variant="danger"
                        dismissible
                        onClose={() => setFormError("")}
                        className="rp-error-alert"
                      >
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {formError}
                      </Alert>
                    )}

                    <Form.Group className="rp-form-group">
                      <Form.Label className="rp-form-label">
                        <i className="fas fa-lock me-2"></i>
                        New Password
                      </Form.Label>
                      <div className="rp-input-wrapper">
                        <Form.Control
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="rp-form-input"
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
                        <div className="rp-strength-row">
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
                    </Form.Group>

                    <Form.Group className="rp-form-group">
                      <Form.Label className="rp-form-label">
                        <i className="fas fa-lock me-2"></i>
                        Confirm Password
                      </Form.Label>
                      <div className="rp-input-wrapper">
                        <Form.Control
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="rp-form-input"
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
                            <span className="rp-match-ok">
                              <i className="fas fa-check-circle me-1"></i>
                              Passwords match
                            </span>
                          ) : (
                            <span className="rp-match-err">
                              <i className="fas fa-times-circle me-1"></i>
                              Passwords do not match
                            </span>
                          )}
                        </div>
                      )}
                    </Form.Group>

                    <div className="rp-form-footer">
                      <Link to="/signin" className="rp-signin-link">
                        <i className="fas fa-arrow-left me-1"></i>
                        Back to Sign In
                      </Link>
                    </div>

                    <div className="d-grid">
                      <Button
                        type="submit"
                        className="rp-button"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                            ></span>
                            Resetting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check me-2"></i>
                            Reset Password
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
