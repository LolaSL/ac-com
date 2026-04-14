import Axios from "axios";
import { useContext, useEffect, useReducer } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getError } from "../utils";
import { Store } from "../Store";
import CheckoutSteps from "../components/CheckoutSteps";
import { FaTruck, FaCreditCard, FaShoppingBag, FaEdit } from "react-icons/fa";
import "./PlaceOrderPage.css";

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
    <div className="po-page-wrapper">
    <div className="po-page">
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
    </div>
  );
}
