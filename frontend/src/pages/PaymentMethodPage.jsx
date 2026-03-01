import { useContext, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CheckoutSteps from "../components/CheckoutSteps.jsx";
import { Store } from "../Store.js";
import { FaCreditCard, FaPaypal, FaMoneyBillWave, FaUniversity } from "react-icons/fa";

const METHODS = [
  { id: "PayPal",       icon: <FaPaypal />,        label: "PayPal",          sub: "Fast & secure via your PayPal account" },
  { id: "Stripe",       icon: <FaCreditCard />,    label: "Credit / Debit Card", sub: "Visa, Mastercard, Amex accepted" },
  { id: "BankTransfer", icon: <FaUniversity />,    label: "Bank Transfer",   sub: "Direct bank wire transfer" },
  { id: "Cash",         icon: <FaMoneyBillWave />, label: "Cash on Delivery", sub: "Pay when your order arrives" },
];

const styles = `
  .pm-page { max-width: 520px; margin: 0 auto; padding: 0 1rem 3rem; animation: pmFade .35s ease; }
  @keyframes pmFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .pm-hero { background: linear-gradient(135deg,#5b6070,#2563a8); border-radius: 0 0 16px 16px; padding: 26px 32px; margin-bottom: 28px; color:#fff; }
  .pm-hero h1 { font-size:1.5rem; font-weight:700; margin:0 0 4px; }
  .pm-hero p  { font-size:.85rem; opacity:.8; margin:0; }
  .pm-card { background:#fff; border-radius:14px; box-shadow:0 2px 12px rgba(0,0,0,.08); padding:20px; margin-bottom:20px; }
  .pm-card__title { font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#6b7280; margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid #f3f4f6; }
  .pm-option { display:flex; align-items:center; gap:14px; padding:14px 16px; border:2px solid #e5e7eb; border-radius:10px; cursor:pointer; transition:border-color .2s,background .2s; margin-bottom:10px; user-select:none; }
  .pm-option:last-child { margin-bottom:0; }
  .pm-option.selected { border-color:#2563a8; background:#eff6ff; }
  .pm-option__icon { font-size:1.4rem; color:#2563a8; width:28px; text-align:center; flex-shrink:0; }
  .pm-option__body { flex:1; }
  .pm-option__label { font-weight:700; font-size:.93rem; color:#1a2744; }
  .pm-option__sub { font-size:.78rem; color:#6b7280; margin-top:2px; }
  .pm-option__radio { width:18px; height:18px; accent-color:#2563a8; flex-shrink:0; }
  .pm-submit { width:100%; background:linear-gradient(135deg,#a8112a,#ec133e); color:#fff; border:none; border-radius:10px; padding:13px; font-size:.95rem; font-weight:700; cursor:pointer; transition:opacity .2s,transform .15s,box-shadow .2s; letter-spacing:.3px; box-shadow:0 4px 14px rgba(236,19,62,.35); }
  .pm-submit:hover { opacity:.9; transform:translateY(-2px); box-shadow:0 6px 20px rgba(236,19,62,.45); }
  .pm-back { display:block; text-align:center; margin-top:10px; font-size:.82rem; color:#6b7280; text-decoration:none; }
  .pm-back:hover { color:#2563a8; }
`;

export default function PaymentMethodScreen() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart: { shippingAddress, paymentMethod } } = state;

  const [selected, setSelected] = useState(paymentMethod || "PayPal");

  useEffect(() => {
    if (!shippingAddress.address) navigate("/shipping");
  }, [shippingAddress, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    ctxDispatch({ type: "SAVE_PAYMENT_METHOD", payload: selected });
    localStorage.setItem("paymentMethod", selected);
    navigate("/placeorder");
  };

  return (
    <div className="pm-page">
      <style>{styles}</style>
      <CheckoutSteps step1 step2 step3 />

      <div className="pm-hero">
        <h1><FaCreditCard style={{marginRight:10}}/>Payment Method</h1>
        <p>Choose how you’d like to pay for your order</p>
      </div>

      <form onSubmit={submitHandler}>
        <div className="pm-card">
          <div className="pm-card__title">💳 Select Payment Method</div>
          {METHODS.map((m) => (
            <label key={m.id} className={`pm-option${selected === m.id ? " selected" : ""}`} onClick={() => setSelected(m.id)}>
              <span className="pm-option__icon">{m.icon}</span>
              <span className="pm-option__body">
                <div className="pm-option__label">{m.label}</div>
                <div className="pm-option__sub">{m.sub}</div>
              </span>
              <input className="pm-option__radio" type="radio" name="payment" value={m.id} checked={selected === m.id} onChange={() => setSelected(m.id)} />
            </label>
          ))}
        </div>

        <button type="submit" className="pm-submit">Continue to Place Order →</button>
        <Link to="/shipping" className="pm-back">← Back to Shipping</Link>
      </form>
    </div>
  );
}


