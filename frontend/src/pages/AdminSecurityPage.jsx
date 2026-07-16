import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";

export default function AdminSecurityPage() {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { adminInfo } = state;

  const authHeader = {
    headers: { Authorization: `Bearer ${adminInfo?.token}` },
  };

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [setupData, setSetupData] = useState(null); // { qrDataUrl, base32 }
  const [enrollCode, setEnrollCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(
          "/api/users/admin/mfa/status",
          authHeader
        );
        setEnabled(!!data.enabled);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Unable to load MFA status"
        );
      } finally {
        setLoading(false);
      }
    };
    if (adminInfo?.token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminInfo?.token]);

  const startSetup = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(
        "/api/users/admin/mfa/setup",
        {},
        authHeader
      );
      setSetupData(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start MFA setup");
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(
        "/api/users/admin/mfa/enable",
        { totp: enrollCode.trim() },
        authHeader
      );
      setEnabled(true);
      setSetupData(null);
      setEnrollCode("");
      // Reflect mfaEnabled in cached admin info
      const updated = { ...adminInfo, mfaEnabled: true };
      localStorage.setItem("adminInfo", JSON.stringify(updated));
      ctxDispatch({ type: "ADMIN_LOGIN", payload: updated });
      toast.success("MFA enabled successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const disableMfa = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(
        "/api/users/admin/mfa/disable",
        { password: disablePassword, totp: disableCode.trim() },
        authHeader
      );
      setEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      const updated = { ...adminInfo, mfaEnabled: false };
      localStorage.setItem("adminInfo", JSON.stringify(updated));
      ctxDispatch({ type: "ADMIN_LOGIN", payload: updated });
      toast.success("MFA disabled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to disable MFA");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: 720 }}>
      <h2 className="mb-4">
        <i className="fas fa-shield-alt me-2"></i>
        Admin Security
      </h2>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Two-Factor Authentication (TOTP)</Card.Title>
          <Card.Text className="text-muted">
            Protect your admin account with a time-based one-time password
            from an authenticator app such as Google Authenticator, Authy, or
            1Password.
          </Card.Text>

          {enabled ? (
            <Alert variant="success" className="mb-3">
              <i className="fas fa-check-circle me-2"></i>
              MFA is <strong>enabled</strong> on your account.
            </Alert>
          ) : (
            <Alert variant="warning" className="mb-3">
              <i className="fas fa-exclamation-triangle me-2"></i>
              MFA is <strong>not enabled</strong>. We strongly recommend
              turning it on.
            </Alert>
          )}

          {!enabled && !setupData && (
            <Button onClick={startSetup} disabled={busy} variant="primary">
              {busy ? "Preparing…" : "Set up MFA"}
            </Button>
          )}

          {!enabled && setupData && (
            <div>
              <p>
                Scan this QR code with your authenticator app, then enter the
                6-digit code it generates to confirm.
              </p>
              <div className="text-center mb-3">
                <img
                  src={setupData.qrDataUrl}
                  alt="MFA QR code"
                  style={{ maxWidth: 220 }}
                />
              </div>
              <p className="text-muted small">
                Can't scan? Enter this secret manually:{" "}
                <code>{setupData.base32}</code>
              </p>
              <Form onSubmit={confirmSetup}>
                <Form.Group className="mb-3">
                  <Form.Label>Authenticator code</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={enrollCode}
                    onChange={(e) =>
                      setEnrollCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="6-digit code"
                    autoFocus
                  />
                </Form.Group>
                <Button
                  type="submit"
                  variant="success"
                  disabled={busy || enrollCode.length !== 6}
                >
                  {busy ? "Verifying…" : "Confirm & Enable"}
                </Button>{" "}
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => {
                    setSetupData(null);
                    setEnrollCode("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </Form>
            </div>
          )}

          {enabled && (
            <Form onSubmit={disableMfa} className="mt-3">
              <p className="text-muted small">
                To disable MFA, confirm with your password and a current code.
              </p>
              <Form.Group className="mb-3">
                <Form.Label>Current password</Form.Label>
                <Form.Control
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  autoComplete="current-password"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Authenticator code</Form.Label>
                <Form.Control
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="6-digit code"
                />
              </Form.Group>
              <Button
                type="submit"
                variant="danger"
                disabled={
                  busy || !disablePassword || disableCode.length !== 6
                }
              >
                {busy ? "Disabling…" : "Disable MFA"}
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
