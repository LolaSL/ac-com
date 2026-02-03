import React, { useContext, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import axios from "axios";

const reducer = (state, action) => {
  switch (action.type) {
    case "UPDATE_REQUEST":
      return { ...state, loadingUpdate: true };
    case "UPDATE_SUCCESS":
      return { ...state, loadingUpdate: false };
    case "UPDATE_FAIL":
      return { ...state, loadingUpdate: false };
    default:
      return state;
  }
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;
  const [name, setName] = useState(userInfo.name);
  const [email, setEmail] = useState(userInfo.email);
  const [phone, setPhone] = useState(userInfo.phone || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatar] = useState(userInfo.avatar || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(userInfo.avatar || "");
  const [{ loadingUpdate }, dispatch] = useReducer(reducer, {
    loadingUpdate: false,
  });

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      dispatch({ type: "UPDATE_REQUEST" });

      let avatarUrl = avatar;
      if (avatarFile) {
        try {
          const formData = new FormData();
          formData.append("image", avatarFile);
          const uploadConfig = {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${userInfo.token}`,
            },
          };
          const { data: uploadData } = await axios.post(
            "/api/upload/avatar",
            formData,
            uploadConfig
          );
          avatarUrl = uploadData.secure_url || uploadData.url;
        } catch (uploadError) {
          console.error("Avatar upload failed:", uploadError);
          toast.error("Failed to upload avatar. Continuing without it.");
          // Continue with profile update even if avatar upload fails
        }
      }

      const updateData = {
        name,
        email,
        phone,
        avatar: avatarUrl,
      };
      if (password) {
        updateData.password = password;
      }

      const { data } = await axios.put("/api/users/profile", updateData, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: "UPDATE_SUCCESS" });
      ctxDispatch({ type: "USER_SIGNIN", payload: data });
      localStorage.setItem("userInfo", JSON.stringify(data));
      setPassword("");
      setConfirmPassword("");
      toast.success("Profile updated successfully! Redirecting...");

      // Navigate to home after a brief delay
      const timer = setTimeout(() => {
        navigate("/");
      }, 2000);

      return () => clearTimeout(timer);
    } catch (err) {
      dispatch({ type: "UPDATE_FAIL" });
      toast.error(getError(err));
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="container small-container">
      <h1 className="my-3 fs-1">User Profile</h1>
      <form onSubmit={submitHandler}>
        {/* Avatar Section */}
        <div className="mb-4 text-center">
          <div className="mb-3">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Profile Avatar"
                roundedCircle
                style={{ width: "150px", height: "150px", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  backgroundColor: "#e9ecef",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "48px",
                  color: "#6c757d",
                }}
              >
                <i className="fas fa-user"></i>
              </div>
            )}
          </div>
          <Form.Group controlId="avatar" className="mb-3">
            <Form.Label>Profile Picture</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <Form.Text className="text-muted">
              Max file size: 5MB. Supported formats: JPG, PNG, GIF
            </Form.Text>
          </Form.Group>
        </div>

        <Form.Group className="mb-3" controlId="name">
          <Form.Label>Name</Form.Label>
          <Form.Control
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="phone">
          <Form.Label>Phone Number</Form.Label>
          <Form.Control
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </Form.Group>

        <hr className="my-4" />
        <h5 className="mb-3">Change Password</h5>
        <Form.Text className="text-muted d-block mb-3">
          Leave blank to keep current password
        </Form.Text>

        <Form.Group className="mb-3" controlId="password">
          <Form.Label>New Password</Form.Label>
          <div className="position-relative">
            <Form.Control
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <Button
              variant="link"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "0",
                border: "none",
                background: "none",
                color: "#6c757d",
              }}
            >
              <i
                className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
              ></i>
            </Button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="d-flex align-items-center gap-2">
                <div
                  style={{
                    flex: 1,
                    height: "8px",
                    backgroundColor: "#e9ecef",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(passwordStrength.strength / 4) * 100}%`,
                      height: "100%",
                      backgroundColor:
                        passwordStrength.color === "danger"
                          ? "#dc3545"
                          : passwordStrength.color === "warning"
                          ? "#ffc107"
                          : passwordStrength.color === "info"
                          ? "#0dcaf0"
                          : "#198754",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <small
                  className={`text-${passwordStrength.color}`}
                  style={{ minWidth: "60px" }}
                >
                  {passwordStrength.label}
                </small>
              </div>
              <Form.Text className="text-muted">
                Use 8+ characters with mix of letters, numbers & symbols
              </Form.Text>
            </div>
          )}
        </Form.Group>

        <Form.Group className="mb-3" controlId="confirmPassword">
          <Form.Label>Confirm New Password</Form.Label>
          <div className="position-relative">
            <Form.Control
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            <Button
              variant="link"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "0",
                border: "none",
                background: "none",
                color: "#6c757d",
              }}
            >
              <i
                className={
                  showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"
                }
              ></i>
            </Button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <Form.Text className="text-danger">
              Passwords do not match
            </Form.Text>
          )}
        </Form.Group>

        <div className="mb-3 d-flex gap-2">
          <Button
            className="btn btn-secondary"
            type="submit"
            disabled={loadingUpdate}
          >
            {loadingUpdate ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Updating...
              </>
            ) : (
              "Update Profile"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
