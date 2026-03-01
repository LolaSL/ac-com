import React, { useContext, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import axios from 'axios';
import { FaCamera, FaEye, FaEyeSlash, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';
import './ProfilePage.css';

const reducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_REQUEST': return { ...state, loadingUpdate: true };
    case 'UPDATE_SUCCESS': return { ...state, loadingUpdate: false };
    case 'UPDATE_FAIL':    return { ...state, loadingUpdate: false };
    default:               return state;
  }
};

const getStrength = (pass) => {
  let s = 0;
  if (pass.length >= 8) s++;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) s++;
  if (/d/.test(pass)) s++;
  if (/[^a-zA-Zd]/.test(pass)) s++;
  const map = [
    { pct: 0,   label: '',       color: '' },
    { pct: 25,  label: 'Weak',   color: '#ef4444' },
    { pct: 50,  label: 'Fair',   color: '#f59e0b' },
    { pct: 75,  label: 'Good',   color: '#3b82f6' },
    { pct: 100, label: 'Strong', color: '#22c55e' },
  ];
  return map[s];
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;

  const [name,            setName]            = useState(userInfo.name);
  const [email,           setEmail]           = useState(userInfo.email);
  const [phone,           setPhone]           = useState(userInfo.phone || '');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [showPwSection,   setShowPwSection]   = useState(false);
  const [avatar]                              = useState(userInfo.avatar || '');
  const [avatarFile,      setAvatarFile]      = useState(null);
  const [avatarPreview,   setAvatarPreview]   = useState(userInfo.avatar || '');

  const [{ loadingUpdate }, dispatch] = useReducer(reducer, { loadingUpdate: false });

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const strength = getStrength(password);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password && password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      dispatch({ type: 'UPDATE_REQUEST' });
      let avatarUrl = avatar;
      if (avatarFile) {
        try {
          const formData = new FormData();
          formData.append('image', avatarFile);
          const { data: uploaded } = await axios.post('/api/upload/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userInfo.token}` },
          });
          avatarUrl = uploaded.secure_url || uploaded.url;
        } catch { toast.error('Avatar upload failed — continuing without it.'); }
      }
      const payload = { name, email, phone, avatar: avatarUrl };
      if (password) payload.password = password;
      const { data } = await axios.put('/api/users/profile', payload, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: 'UPDATE_SUCCESS' });
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      localStorage.setItem('userInfo', JSON.stringify(data));
      setPassword(''); setConfirmPassword('');
      toast.success('Profile updated successfully!');
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      dispatch({ type: 'UPDATE_FAIL' });
      toast.error(getError(err));
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-hero">
        <div className="pp-hero__banner" />
        <div className="pp-hero__body">
          <div className="pp-avatar-wrap" onClick={() => fileRef.current?.click()} title="Change photo">
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" className="pp-avatar" />
              : <div className="pp-avatar-initials">{initials}</div>
            }
            <div className="pp-avatar-edit-btn"><FaCamera /></div>
            <input ref={fileRef} type="file" accept="image/*" className="pp-avatar-file-input" onChange={handleAvatarChange} />
          </div>
          <div className="pp-hero__info">
            <h1 className="pp-hero__name">{name || 'Your Name'}</h1>
            <div className="pp-hero__badges">
              <span className="pp-badge pp-badge--blue"><FaEnvelope /> {email}</span>
              {phone && <span className="pp-badge pp-badge--grey"><FaPhone /> {phone}</span>}
              {userInfo.isAdmin && <span className="pp-badge pp-badge--green">&#9881;&#65039; Admin</span>}
            </div>
          </div>
        </div>
        <p className="pp-upload-hint pb-2" onClick={() => fileRef.current?.click()}>
          <FaCamera style={{ marginRight: 4 }} /> Click avatar to change photo &middot; Max 5 MB
        </p>
      </div>

      <form onSubmit={submitHandler}>
        <div className="pp-card">
          <h2 className="pp-card__title">&#9999;&#65039; Personal Information</h2>
          <div className="pp-grid">
            <Form.Group controlId="ppName">
              <Form.Label className="pp-label"><FaUser style={{ marginRight: 5 }} />Full Name</Form.Label>
              <Form.Control value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="pp-input" required />
            </Form.Group>
            <Form.Group controlId="ppEmail">
              <Form.Label className="pp-label"><FaEnvelope style={{ marginRight: 5 }} />Email Address</Form.Label>
              <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="pp-input" required />
            </Form.Group>
            <Form.Group controlId="ppPhone">
              <Form.Label className="pp-label"><FaPhone style={{ marginRight: 5 }} />Phone Number</Form.Label>
              <Form.Control type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className="pp-input" />
            </Form.Group>
          </div>
        </div>

        <div className="pp-card">
          <button type="button" className="pp-password-toggle" onClick={() => setShowPwSection(!showPwSection)}>
            {showPwSection ? '▲ Hide' : '▼ Change Password'}
          </button>
          {showPwSection && (
            <div className="pp-grid">
              <Form.Group controlId="ppPassword">
                <Form.Label className="pp-label">New Password</Form.Label>
                <div className="pp-input-wrap">
                  <Form.Control type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" className="pp-input" style={{ paddingRight: 38 }} />
                  <button type="button" className="pp-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {password && (
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <div className="pp-strength-bar">
                      <div className="pp-strength-fill" style={{ width: strength.pct + '%', background: strength.color }} />
                    </div>
                    <small style={{ color: strength.color, minWidth: 50, fontWeight: 600 }}>{strength.label}</small>
                  </div>
                )}
              </Form.Group>
              <Form.Group controlId="ppConfirmPassword">
                <Form.Label className="pp-label">Confirm Password</Form.Label>
                <div className="pp-input-wrap">
                  <Form.Control type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="pp-input" style={{ paddingRight: 38 }} />
                  <button type="button" className="pp-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && <small className="text-danger d-block mt-1">Passwords do not match</small>}
                {confirmPassword && password === confirmPassword && password && <small className="text-success d-block mt-1">&#10003; Passwords match</small>}
              </Form.Group>
            </div>
          )}
        </div>

        <div className="pp-footer">
          <Button type="submit" disabled={loadingUpdate} className="pp-save-btn">
            {loadingUpdate ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : '💾 Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}