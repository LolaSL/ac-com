import { useContext, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CheckoutSteps from "../components/CheckoutSteps.jsx";
import { Store } from "../Store.js";
import { FaCreditCard, FaPaypal, FaMoneyBillWave, FaUniversity } from "react-icons/fa";
import "./PaymentMethodPage.css";

const METHODS = [
  { id: "PayPal",       icon: <FaPaypal />,        label: "PayPal",          sub: "Fast & secure via your PayPal account" },
  { id: "Stripe",       icon: <FaCreditCard />,    label: "Credit / Debit Card", sub: "Visa, Mastercard, Amex accepted" },
  { id: "BankTransfer", icon: <FaUniversity />,    label: "Bank Transfer",   sub: "Direct bank wire transfer" },
  { id: "Cash",         icon: <FaMoneyBillWave />, label: "Cash on Delivery", sub: "Pay when your order arrives" },
];

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


