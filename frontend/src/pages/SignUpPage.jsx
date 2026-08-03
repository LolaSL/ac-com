import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { useContext, useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import "./SignUpPage.css";

export default function SignUpPage() {
  const { t } = useTranslation();
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
      { strength: 1, label: t("auth.pwWeak"), color: "danger" },
      { strength: 2, label: t("auth.pwFair"), color: "warning" },
      { strength: 3, label: t("auth.pwGood"), color: "info" },
      { strength: 4, label: t("auth.pwStrong"), color: "success" },
    ];
    return levels[strength];
  };

  const pwStrength = getPasswordStrength(password);

  const googleSignUp = useGoogleLogin({
    flow: 'implicit',
    ux_mode: 'redirect',
    redirect_uri: window.location.origin + '/signup',
    onSuccess: async (tokenResponse) => {
      try {
        const { data } = await Axios.post("/api/users/google-auth", {
          access_token: tokenResponse.access_token,
        });
        ctxDispatch({ type: "USER_SIGNIN", payload: data });
        localStorage.setItem("userInfo", JSON.stringify(data));
        toast.success(t("auth.signUpGoogleSuccess"));
        navigate(redirect || "/");
      } catch (err) {
        toast.error(getError(err));
      }
    },
    onError: () => toast.error(t("auth.signUpGoogleError")),
  });

  const submitHandler = async (e) => {
    e.preventDefault();
    setFormError("");
    if (password !== confirmPassword) {
      setFormError(t("auth.passwordsNoMatch"));
      return;
    }
    if (password.length < 6) {
      setFormError(t("auth.passwordTooShort"));
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
      toast.success(t("auth.signUpSuccess"));
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
        <span>{t("auth.home")}</span>
      </Link>
      <Container fluid className="signup-container">
        <div className="signup-wrapper">
          {/* Left Side - Branding */}
          <div className="signup-left">
            <div className="signup-branding">
              <div className="signup-logo-container">
                <i className="fas fa-user-plus signup-logo-icon"></i>
              </div>
              <h1 className="signup-brand-title">{t("appName")}</h1>
              <h2 className="signup-brand-subtitle">{t("auth.joinUsToday")}</h2>
              <p className="signup-brand-description">
                {t("auth.signUpDescription")}
              </p>

              <div className="signup-features">
                <div className="signup-feature-item">
                  <i className="fas fa-bolt"></i>
                  <span>{t("auth.featureInstantQuotes")}</span>
                </div>
                <div className="signup-feature-item">
                  <i className="fas fa-chart-line"></i>
                  <span>{t("auth.featureRoiCalculator")}</span>
                </div>
                <div className="signup-feature-item">
                  <i className="fas fa-ruler-combined"></i>
                  <span>{t("auth.featureBtuSizing")}</span>
                </div>
                <div className="signup-feature-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>{t("auth.featureSecureAccount")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Sign Up Form */}
          <div className="signup-right">
            <div className="signup-form-container">
              <div className="signup-form-header">
                <i className="fas fa-id-card signup-form-icon"></i>
                <h2 className="signup-form-title">{t("auth.createAccountTitle")}</h2>
                <p className="signup-form-subtitle">
                  {t("auth.signUpSubtitle")}
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
                    {t("auth.fullName")}
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
                    {t("auth.emailAddress")}
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
                    {t("auth.password")}
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
                    {t("auth.confirmPassword")}
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
                      {t("auth.passwordsNoMatch")}
                    </small>
                  )}
                </Form.Group>

                <div className="signup-action-row">
                  <div className="signup-have-account">
                    <span>{t("auth.alreadyHaveAccount")} </span>
                    <Link
                      to={`/signin?redirect=${redirect}`}
                      className="signup-signin-link"
                    >
                      {t("auth.signIn")}
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
                        {t("auth.creatingAccount")}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-rocket me-2"></i>
                        {t("auth.createAccountButton")}
                      </>
                    )}
                  </Button>
                </div>
              </Form>

              <div className="signin-divider">
                <span>{t("auth.orContinueWith")}</span>
              </div>
              <div className="signin-google-wrap">
                <button className="google-icon-btn" onClick={() => googleSignUp()} title="Sign up with Google">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="22" height="22">
                    <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.09-6.09C34.46 3.1 29.5 1 24 1 14.82 1 7.07 6.48 3.64 14.18l7.08 5.5C12.4 13.62 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.67c-.55 2.97-2.2 5.48-4.67 7.17l7.19 5.59C43.17 37.28 46.5 31.36 46.5 24.5z"/>
                    <path fill="#FBBC05" d="M10.72 28.32A14.6 14.6 0 0 1 9.5 24c0-1.5.26-2.95.72-4.32l-7.08-5.5A23.93 23.93 0 0 0 0 24c0 3.87.92 7.53 2.54 10.77l8.18-6.45z"/>
                    <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.5-4.94l-7.19-5.59c-1.89 1.27-4.31 2.03-6.31 2.03-6.26 0-11.6-4.12-13.28-9.68l-8.18 6.45C7.07 41.52 14.82 47 24 47z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                </button>
              </div>

            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
