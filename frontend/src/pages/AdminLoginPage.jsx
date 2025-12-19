import axios from "axios";
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import Button from "react-bootstrap/Button";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { dispatch: ctxDispatch } = useContext(Store);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast.error("Email and password are required");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await axios.post(`/api/users/admin/signin`, {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      ctxDispatch({ type: "ADMIN_LOGIN", payload: data });
      localStorage.setItem("adminInfo", JSON.stringify(data));

      toast.success("Welcome, Admin!");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid admin credentials");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h1 className="admin-login-title">Admin Portal</h1>
          <p className="admin-login-subtitle">Secure Administration</p>
          <form onSubmit={handleAdminLogin}>
            <div className="mb-3">
              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <Button
                type="submit"
                className="go-to-btn btn-text"
                disabled={submitting}
              >
                {submitting ? "Signing in..." : "Login as Admin"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
