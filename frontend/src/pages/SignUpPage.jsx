import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { useContext, useEffect, useState } from "react";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import "./SignUpPage.css";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirectInUrl = new URLSearchParams(search).get("redirect");
  const redirect = redirectInUrl ? redirectInUrl : "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const { state, dispatch: ctxDispatch } = useContext(Store);
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
      { strength: 1, label: "Weak", color: "danger" },
      { strength: 2, label: "Fair", color: "warning" },
      { strength: 3, label: "Good", color: "info" },
      { strength: 4, label: "Strong", color: "success" },
    ];
    return levels[strength];
  };

  const pwStrength = getPasswordStrength(password);

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
      let ref = new URLSearchParams(search).get("ref");
      if (!ref) {
        ref = localStorage.getItem("referralCode");
      }
      const { data } = await Axios.post(
        `/api/users/signup${ref ? `?ref=${ref}` : ""}`,
        { name, email, password }
      );

      ctxDispatch({ type: "USER_SIGNIN", payload: data });
      localStorage.setItem("userInfo", JSON.stringify(data));
      if (ref) {
        localStorage.removeItem("referralCode");
      }
      toast.success("Account created successfully!");
      navigate(redirect || "/");
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  return (
    <div className="signup-page">
      <Link to="/" className="auth-home-link">
        <i className="fas fa-home"></i>
        <span>Home</span>
      </Link>
      <Container fluid className="signup-container">
        <div className="signup-wrapper">
          {/* Left Side - Branding */}
          <div className="signup-left">
            <div className="signup-branding">
              <div className="signup-logo-container">
                <i className="fas fa-user-plus signup-logo-icon"></i>
              </div>
              <h1 className="signup-brand-title">AC-Commerce</h1>
              <h2 className="signup-brand-subtitle">Join Us Today</h2>
              <p className="signup-brand-description">
                Create your free account and unlock the full HVAC experience —
                smart design tools, personalized recommendations, and seamless
                order management.
              </p>

              <div className="signup-features">
                <div className="signup-feature-item">
                  <i className="fas fa-bolt"></i>
                  <span>Instant Quotes</span>
                </div>
                <div className="signup-feature-item">
                  <i className="fas fa-chart-line"></i>
                  <span>ROI Calculator</span>
                </div>
                <div className="signup-feature-item">
                  <i className="fas fa-ruler-combined"></i>
                  <span>BTU Sizing</span>
                </div>
                <div className="signup-feature-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Secure Account</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Sign Up Form */}
          <div className="signup-right">
            <div className="signup-form-container">
              <div className="signup-form-header">
                <i className="fas fa-id-card signup-form-icon"></i>
                <h2 className="signup-form-title">Create Account</h2>
                <p className="signup-form-subtitle">
                  Fill in your details to get started
                </p>
              </div>

              <Form
                onSubmit={submitHandler}
                noValidate
                className="signup-form"
              >
                {formError && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setFormError("")}
                    className="signup-error-alert"
                  >
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {formError}
                  </Alert>
                )}

                <Form.Group controlId="name" className="signup-form-group">
                  <Form.Label className="signup-form-label">
                    <i className="fas fa-user me-2"></i>
                    Full Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="John Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="signup-form-input"
                  />
                </Form.Group>

                <Form.Group controlId="email" className="signup-form-group">
                  <Form.Label className="signup-form-label">
                    <i className="fas fa-envelope me-2"></i>
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="signup-form-input"
                  />
                </Form.Group>

                <Form.Group controlId="password" className="signup-form-group">
                  <Form.Label className="signup-form-label">
                    <i className="fas fa-lock me-2"></i>
                    Password
                  </Form.Label>
                  <div className="signup-password-wrapper">
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="signup-form-input"
                    />
                    <button
                      type="button"
                      className="signup-toggle-pw"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                    </button>
                  </div>
                  {password && (
                    <div className="signup-pw-strength">
                      <div className="signup-pw-strength-track">
                        <div
                          className="signup-pw-strength-fill"
                          style={{
                            width: `${(pwStrength.strength / 4) * 100}%`,
                            backgroundColor:
                              pwStrength.color === "danger"
                                ? "#dc3545"
                                : pwStrength.color === "warning"
                                ? "#ffc107"
                                : pwStrength.color === "info"
                                ? "#0dcaf0"
                                : "#198754",
                          }}
                        />
                      </div>
                      <small className={`text-${pwStrength.color} signup-pw-strength-label`}>
                        {pwStrength.label}
                      </small>
                    </div>
                  )}
                </Form.Group>

                <Form.Group controlId="confirmPassword" className="signup-form-group">
                  <Form.Label className="signup-form-label">
                    <i className="fas fa-lock me-2"></i>
                    Confirm Password
                  </Form.Label>
                  <div className="signup-password-wrapper">
                    <Form.Control
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="signup-form-input"
                    />
                    <button
                      type="button"
                      className="signup-toggle-pw"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <small className="text-danger d-block mt-1">
                      Passwords do not match
                    </small>
                  )}
                </Form.Group>

                <div className="signup-action-row">
                  <div className="signup-have-account">
                    <span>Already have an account? </span>
                    <Link
                      to={`/signin?redirect=${redirect}`}
                      className="signup-signin-link"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>

                <div className="d-grid">
                  <Button
                    type="submit"
                    className="signup-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Creating account...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-rocket me-2"></i>
                        Create Account
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
