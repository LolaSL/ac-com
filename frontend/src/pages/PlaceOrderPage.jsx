import Axios from "axios";
import { useContext, useEffect, useReducer } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getError } from "../utils";
import { Store } from "../Store";
import CheckoutSteps from "../components/CheckoutSteps";
import { FaTruck, FaCreditCard, FaShoppingBag, FaEdit } from "react-icons/fa";

const styles = `
  .po-page { max-width:1100px; margin:0 auto; padding:0 1rem 3rem; animation:poFade .35s ease; }
  @keyframes poFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .po-hero { background:linear-gradient(135deg,#5b6070,#2563a8); border-radius:0 0 16px 16px; padding:26px 32px; margin-bottom:28px; color:#fff; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
  .po-hero h1 { font-size:1.5rem; font-weight:700; margin:0 0 3px; }
  .po-hero p  { font-size:.85rem; opacity:.8; margin:0; }
  .po-layout { display:grid; grid-template-columns:1fr 320px; gap:22px; align-items:start; }
  @media(max-width:860px){ .po-layout{ grid-template-columns:1fr; } }
  .po-card { background:#fff; border-radius:14px; box-shadow:0 2px 12px rgba(0,0,0,.08); padding:22px 24px; margin-bottom:18px; }
  .po-card__header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #f3f4f6; }
  .po-card__title { font-size:.82rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#6b7280; display:flex; align-items:center; gap:7px; }
  .po-edit-link { display:inline-flex; align-items:center; gap:4px; font-size:.78rem; font-weight:600; color:#2563a8; text-decoration:none; background:#eff6ff; border-radius:6px; padding:3px 10px; transition:background .15s; }
  .po-edit-link:hover { background:#dbeafe; color:#1d4ed8; }
  .po-info-line { font-size:.88rem; color:#374151; margin-bottom:4px; }
  .po-info-line strong { color:#1a2744; }
  .po-coord { display:inline-block; background:#f1f5f9; border-radius:6px; padding:2px 8px; font-size:.78rem; color:#6b7280; margin-top:4px; }
  .po-method-badge { display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:8px; padding:6px 14px; font-size:.88rem; font-weight:700; }
  .po-items { display:flex; flex-direction:column; gap:10px; }
  .po-item { display:grid; grid-template-columns:64px 1fr auto auto; align-items:center; gap:12px; padding:10px; border-radius:10px; background:#fafafa; border:1px solid #f3f4f6; }
  .po-item__img { width:64px; height:64px; object-fit:contain; border-radius:8px; background:#fff; border:1px solid #e5e7eb; padding:3px; }
  .po-item__name { font-size:.85rem; font-weight:700; color:#1a2744; text-decoration:none; display:block; }
  .po-item__name:hover { color:#2563a8; }
  .po-item__cat { font-size:.75rem; color:#6b7280; margin-top:2px; }
  .po-item__qty { font-size:.82rem; color:#6b7280; white-space:nowrap; }
  .po-item__price { text-align:right; white-space:nowrap; }
  .po-item__price-orig { font-size:.75rem; color:#9ca3af; text-decoration:line-through; display:block; }
  .po-item__price-val { font-size:.9rem; font-weight:700; color:#1a2744; }
  .po-item__disc { font-size:.72rem; color:#16a34a; font-weight:600; }
  .po-summary { background:#fff; border-radius:16px; box-shadow:0 2px 12px rgba(0,0,0,.08); overflow:hidden; position:sticky; top:80px; }
  .po-summary__hdr { background:linear-gradient(135deg,#1a3c5e,#2563a8); padding:16px 20px; color:#fff; }
  .po-summary__hdr h3 { margin:0; font-size:1rem; font-weight:700; }
  .po-summary__body { padding:20px; }
  .po-summary__row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:.88rem; color:#374151; border-bottom:1px solid #f3f4f6; }
  .po-summary__row:last-of-type { border-bottom:none; }
  .po-summary__lbl { color:#6b7280; }
  .po-summary__total { display:flex; justify-content:space-between; align-items:center; padding:14px 0 6px; font-weight:700; font-size:1.15rem; color:#1a2744; border-top:2px solid #e5e7eb; margin-top:6px; }
  .po-place-btn { width:100%; background:linear-gradient(135deg,#a8112a,#ec133e); color:#fff; border:none; border-radius:10px; padding:13px; font-size:.95rem; font-weight:700; cursor:pointer; transition:opacity .2s,transform .15s,box-shadow .2s; letter-spacing:.3px; box-shadow:0 4px 14px rgba(236,19,62,.35); margin-top:6px; }
  .po-place-btn:hover:not(:disabled) { opacity:.9; transform:translateY(-2px); box-shadow:0 6px 20px rgba(236,19,62,.45); }
  .po-place-btn:disabled { opacity:.45; cursor:default; }
  .po-spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; margin-right:8px; }
  @keyframes spin { to{transform:rotate(360deg)} }
`;

const reducer = (state, action) => {
  switch (action.type) {
    case "CREATE_REQUEST":
      return { ...state, loading: true };
    case "CREATE_SUCCESS":
      return { ...state, loading: false };
    case "CREATE_FAIL":
      return { ...state, loading: false };
    default:
      return state;
  }
};

export default function PlaceOrderPage() {
  const navigate = useNavigate();

  const [{ loading }, dispatch] = useReducer(reducer, {
    loading: false,
  });

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo } = state;

  const round2 = (num) => Math.round(num * 100 + Number.EPSILON) / 100;

  cart.itemsPrice = cart.cartItems?.length
    ? round2(
        cart.cartItems.reduce(
          (a, c) => a + c.quantity * (c.price * (1 - (c.discount || 0) / 100)),
          0
        )
      )
    : 0;
  const getShippingPrice = (itemsPrice, items) => {
    if (itemsPrice > 5000) return round2(100);
    if (itemsPrice > 2000) return round2(50);
    if (itemsPrice > 500) return round2(25);
    return round2(10);
  };

  cart.shippingPrice = getShippingPrice(cart.itemsPrice, cart.cartItems);
  cart.taxPrice = round2(0.15 * cart.itemsPrice);
  cart.totalPrice = cart.itemsPrice + cart.shippingPrice + cart.taxPrice;

  const placeOrderHandler = async () => {
    try {
      dispatch({ type: "CREATE_REQUEST" });

      // Validate all orderItems have required fields
      const hasInvalidItems = cart.cartItems.some(item => !item.slug || !item.name || !item.image);
      if (hasInvalidItems) {
        const invalidItems = cart.cartItems.filter(item => !item.slug || !item.name || !item.image);
        console.error("Invalid cart items:", invalidItems);
        toast.error("Cart contains items with missing information. Please clear cart and re-add items.");
        dispatch({ type: "CREATE_FAIL" });
        return;
      }

  console.log("Sending order with items:", cart.cartItems.length);

      const { data } = await Axios.post(
        "/api/orders",
        {
          orderItems: cart.cartItems,
          shippingAddress: cart.shippingAddress,
          paymentMethod: cart.paymentMethod,
          itemsPrice: cart.itemsPrice,
          shippingPrice: cart.shippingPrice,
          taxPrice: cart.taxPrice,
          totalPrice: cart.totalPrice,
        },
        {
          headers: {
            authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      if (!data.order || !data.order._id) {
        console.error("Invalid response structure:", data);
        toast.error("Order created but missing ID. Please contact support.");
        dispatch({ type: "CREATE_FAIL" });
        return;
      }

      ctxDispatch({ type: "CART_CLEAR" });
      dispatch({ type: "CREATE_SUCCESS" });
      localStorage.removeItem("cartItems");
      
      navigate(`/order/${data.order._id}`);
    } catch (err) {
      dispatch({ type: "CREATE_FAIL" });
      const errorMessage = err.response?.data?.message || getError(err);
      console.error("Order placement error:", err);
      console.error("Error response:", err.response?.data);
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    if (!cart.paymentMethod) {
      navigate("/payment");
    }
  }, [cart.cartItems, cart.itemsPrice, cart.paymentMethod, navigate]);

  return (
    <div className="po-page">
      <style>{styles}</style>
      <CheckoutSteps step1 step2 step3 step4 />

      <div className="po-hero">
        <div>
          <h1>🛍️ Review Your Order</h1>
          <p>Check everything looks right before placing your order</p>
        </div>
      </div>

      <div className="po-layout">
        {/* ── LEFT column ── */}
        <div>
          {/* Shipping */}
          <div className="po-card">
            <div className="po-card__header">
              <span className="po-card__title"><FaTruck /> Shipping Address</span>
              <Link to="/shipping" className="po-edit-link"><FaEdit /> Edit</Link>
            </div>
            <p className="po-info-line"><strong>{cart.shippingAddress.fullName}</strong></p>
            <p className="po-info-line">{cart.shippingAddress.address}, {cart.shippingAddress.city}, {cart.shippingAddress.postalCode}, {cart.shippingAddress.country}</p>
            {cart.shippingAddress.location?.lat && (
              <span className="po-coord">📌 {cart.shippingAddress.location.lat.toFixed(4)}, {cart.shippingAddress.location.lng.toFixed(4)}</span>
            )}
          </div>

          {/* Payment */}
          <div className="po-card">
            <div className="po-card__header">
              <span className="po-card__title"><FaCreditCard /> Payment Method</span>
              <Link to="/payment" className="po-edit-link"><FaEdit /> Edit</Link>
            </div>
            <span className="po-method-badge">💳 {cart.paymentMethod}</span>
          </div>

          {/* Items */}
          <div className="po-card">
            <div className="po-card__header">
              <span className="po-card__title"><FaShoppingBag /> Order Items ({cart.cartItems.reduce((a,c)=>a+c.quantity,0)})</span>
              <Link to="/cart" className="po-edit-link"><FaEdit /> Edit</Link>
            </div>
            <div className="po-items">
              {cart.cartItems.map((item, index) => {
                const discounted = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
                return (
                  <div className="po-item" key={index}>
                    <img src={item.image} alt={item.name} className="po-item__img" />
                    <div>
                      <Link to={`/product/${item.slug}`} className="po-item__name">{item.name}</Link>
                      {item.category && <div className="po-item__cat">{item.category}</div>}
                    </div>
                    <span className="po-item__qty">× {item.quantity}</span>
                    <div className="po-item__price">
                      {item.discount > 0 && <span className="po-item__price-orig">${item.price.toFixed(2)}</span>}
                      <span className="po-item__price-val">${discounted.toFixed(2)}</span>
                      {item.discount > 0 && <span className="po-item__disc">−{item.discount}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT column: summary ── */}
        <div className="po-summary">
          <div className="po-summary__hdr"><h3>Order Summary</h3></div>
          <div className="po-summary__body">
            <div className="po-summary__row">
              <span className="po-summary__lbl">Items</span>
              <span>${cart.itemsPrice.toFixed(2)}</span>
            </div>
            <div className="po-summary__row">
              <span className="po-summary__lbl">Shipping</span>
              <span>${cart.shippingPrice.toFixed(2)}</span>
            </div>
            <div className="po-summary__row">
              <span className="po-summary__lbl">Tax (15%)</span>
              <span>${cart.taxPrice.toFixed(2)}</span>
            </div>
            <div className="po-summary__total">
              <span>Total</span>
              <span>${cart.totalPrice.toFixed(2)}</span>
            </div>
            <button
              className="po-place-btn"
              onClick={placeOrderHandler}
              disabled={cart.cartItems.length === 0 || loading}
            >
              {loading ? <><span className="po-spinner" />Placing Order…</> : "🛒 Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
