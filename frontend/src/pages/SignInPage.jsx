import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { useContext, useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import { getError } from "../utils.js";
import "./SignInPage.css";

export default function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirectInUrl = new URLSearchParams(search).get("redirect");
  const redirect = redirectInUrl || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;

  const googleSignIn = useGoogleLogin({
    flow: 'implicit',
    ux_mode: 'redirect',
    redirect_uri: window.location.origin + '/signin',
    onSuccess: async (tokenResponse) => {
      try {
        const { data } = await Axios.post("/api/users/google-auth", {
          access_token: tokenResponse.access_token,
        });
        ctxDispatch({ type: "USER_SIGNIN", payload: data });
        localStorage.setItem("userInfo", JSON.stringify(data));
        navigate(redirect || "/");
        toast.success(t("auth.signInGoogleSuccess"));
      } catch (err) {
        toast.error(getError(err));
      }
    },
    onError: () => toast.error(t("auth.signInGoogleError")),
  });

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await Axios.post("/api/users/signin", {
        email,
        password,
      });
      ctxDispatch({ type: "USER_SIGNIN", payload: data });
      localStorage.setItem("userInfo", JSON.stringify(data));
      navigate(redirect || "/");
      toast.success(t("auth.signInSuccess"));
    } catch (err) {
      setError(getError(err));
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
    <div className="signin-page">
      <Link to="/" className="auth-home-link">
        <i className="fas fa-home"></i>
        <span>{t("auth.home")}</span>
      </Link>
      <Container fluid className="signin-container">
        <div className="signin-wrapper">
          {/* Left Side - Branding */}
          <div className="signin-left">
            <div className="signin-branding">
              <div className="signin-logo-container">
                <i className="fas fa-snowflake signin-logo-icon"></i>
              </div>
              <h1 className="signin-brand-title">{t("appName")}</h1>
              <h2 className="signin-brand-subtitle">{t("auth.welcomeBack")}</h2>
              <p className="signin-brand-description">
              {t("auth.signInDescription")}
              </p>
   
              <div className="signin-features">
                  <div className="signin-feature-item">
                  <i className="fas fa-ruler-combined"></i>
                  <span>{t("auth.featureMeasurement")}</span>
                </div>
                <div className="signin-feature-item">
                  <i className="fas fa-shopping-cart"></i>
                  <span>{t("auth.featureSmartShopping")}</span>
                </div>
                <div className="signin-feature-item">
                  <i className="fas fa-truck"></i>
                  <span>{t("auth.featureFastDelivery")}</span>
                </div>
           
                <div className="signin-feature-item">
                  <i className="fas fa-headset"></i>
                  <span>{t("auth.featureSupport")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="signin-right">
            <div className="signin-form-container">
              <div className="signin-form-header">
                <i className="fas fa-user-circle signin-form-icon"></i>
                <h2 className="signin-form-title">{t("auth.userLoginTitle")}</h2>
                <p className="signin-form-subtitle">
                  {t("auth.signInSubtitle")}
                </p>
              </div>

              <Form
                onSubmit={submitHandler}
                noValidate
                className="signin-form"
              >
                {error && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setError("")}
                    className="signin-error-alert"
                  >
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </Alert>
                )}

                <Form.Group controlId="email" className="signin-form-group">
                  <Form.Label className="signin-form-label">
                    <i className="fas fa-envelope me-2"></i>
                    {t("auth.emailAddress")}
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="signin-form-input"
                  />
                </Form.Group>

                <Form.Group controlId="password" className="signin-form-group">
                  <Form.Label className="signin-form-label">
                    <i className="fas fa-lock me-2"></i>
                    {t("auth.password")}
                  </Form.Label>
                  <div className="signin-password-wrapper">
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className="signin-form-input"
                    />
                    <button
                      type="button"
                      className="signin-toggle-pw"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      <i
                        className={
                          showPassword ? "fas fa-eye-slash" : "fas fa-eye"
                        }
                      ></i>
                    </button>
                  </div>
                </Form.Group>

                <div className="signin-forgot-row">
                  <div className="signin-new-customer">
                    <span>{t("auth.newCustomer")} </span>
                    <Link
                      to={`/signup?redirect=${redirect}`}
                      className="signin-signup-link"
                    >
                      {t("auth.createYourAccount")}
                    </Link>
                  </div>
                  <Link to="/forget-password" className="signin-forgot-link">
                    {t("auth.forgotPassword")}
                  </Link>
                </div>

                <div className="d-grid">
                  <Button
                    type="submit"
                    className="signin-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        {t("auth.signingIn")}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        {t("auth.signIn")}
                      </>
                    )}
                  </Button>
                </div>
              </Form>

              <div className="signin-divider">
                <span>{t("auth.orContinueWith")}</span>
              </div>
              <div className="signin-google-wrap">
                <button className="google-icon-btn" onClick={() => googleSignIn()} title="Sign in with Google">
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
