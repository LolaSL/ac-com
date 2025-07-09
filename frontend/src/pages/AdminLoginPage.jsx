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

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const envUrl = process.env.REACT_APP_API_BASE_URL;
    const API_BASE_URL =
      envUrl && envUrl.startsWith("http") ? envUrl : "http://localhost:5020";

    console.log("Using API_BASE_URL:", API_BASE_URL);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/users/admin/signin`,
        {
          email,
          password,
        }
      );

      console.log("Admin login successful:", data);

      ctxDispatch({ type: "ADMIN_LOGIN", payload: data });
      localStorage.setItem("adminInfo", JSON.stringify(data));

      toast.success("Welcome, Admin!");
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || "Invalid admin credentials");
    }
  };

  return (
    <div className="container small-container">
      <h1 className="my-3">Admin Login</h1>
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
          <Button type="submit" className="go-to-btn btn-text">
            Login as Admin
          </Button>
        </div>
      </form>
    </div>
  );
}
