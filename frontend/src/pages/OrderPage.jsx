import axios from "axios";
import { useContext, useEffect, useReducer } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useNavigate, useParams, Link } from "react-router-dom";
import LoadingBox from "../components/LoadingBox";
import { Store } from "../Store";
import { getError } from "../utils";
import { toast } from "react-toastify";
import printJS from "print-js";
import "./OrderPage.css";

function printOrder() {
  const orderContainer = document.querySelector("#order-container");
  if (!orderContainer) return;

  const clone = orderContainer.cloneNode(true);

  // Remove interactive / non-print elements
  clone
    .querySelectorAll("button, .op-paypal, .op-deliver, .op-print-btn, .op-summary")
    .forEach((el) => el.remove());

  // Replace <a> tags with plain spans (keep text content)
  clone.querySelectorAll("a").forEach((a) => {
    const span = document.createElement("span");
    span.textContent = a.textContent;
    span.style.color = "#2563a8";
    a.replaceWith(span);
  });

  const orderNumber = clone.querySelector(".op-hero__id")?.textContent?.trim() || "";

  // Build a standalone summary table from the live DOM (not cloned, which had summary removed)
  const liveRows = document.querySelectorAll(".op-summary__row");
  let summaryRows = "";
  liveRows.forEach((row) => {
    const cells = row.querySelectorAll("span");
    if (cells.length === 2) {
      const isTotalRow = row.classList.contains("op-summary__row--total");
      summaryRows += `<tr style="font-weight:${isTotalRow ? "700" : "400"}; border-top:${isTotalRow ? "2px solid #e5e7eb" : "none"}">
        <td style="padding:6px 0; color:#555">${cells[0].textContent}</td>
        <td style="padding:6px 0; text-align:right; color:${isTotalRow ? "#1a2b4b" : "#555"}">${cells[1].textContent}</td>
      </tr>`;
    }
  });

  const printHTML = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; max-width:720px; margin:0 auto; color:#333; background:#fff;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#5b6070,#2563a8); border-radius:0 0 16px 16px; padding:2rem 2rem 1.5rem; color:#fff; margin-bottom:1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <div style="font-size:0.75rem; opacity:0.7; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:4px;">Order Receipt</div>
            <div style="font-size:1.5rem; font-weight:700;">Order <span style="font-family:monospace; opacity:0.85;">#${orderNumber}</span></div>
          </div>
          <div style="font-size:0.78rem; opacity:0.8; text-align:right;">
            Printed: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      <!-- Content -->
      ${clone.querySelector(".op-grid > div:first-child")?.innerHTML || clone.innerHTML}

      <!-- Summary table -->
      <div style="background:#fff; border-radius:14px; border:1.5px solid #e5e7eb; padding:1.5rem; margin-top:1.5rem; page-break-inside:avoid;">
        <div style="font-size:1rem; font-weight:700; color:#1a2b4b; margin-bottom:1rem; padding-bottom:0.5rem; border-bottom:1.5px solid #f0f1f5;">
          Order Summary
        </div>
        <table style="width:100%; border-collapse:collapse;">
          ${summaryRows}
        </table>
      </div>

      <!-- Footer -->
      <div style="text-align:center; margin-top:2rem; padding-top:1rem; border-top:1px solid #e5e7eb; font-size:0.78rem; color:#aaa;">
        Thank you for your order — AC Commerce
      </div>
    </div>
  `;

  printJS({
    printable: printHTML,
    type: "raw-html",
    style: `
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
      body { margin: 0; padding: 20px; background: #fff; }
      .op-hero { display: none; }
      .op-card {
        background: #fff;
        border: 1.5px solid #e5e7eb;
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 1rem;
        page-break-inside: avoid;
      }
      .op-card__title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #1a2b4b;
        margin: 0 0 0.6rem;
        padding-bottom: 0.5rem;
        border-bottom: 1.5px solid #f0f1f5;
      }
      .op-card__body { font-size: 0.88rem; line-height: 1.7; margin: 0 0 0.5rem; color: #444; }
      .op-label { font-weight: 600; color: #1a2b4b; }
      .op-status {
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 500;
        margin-top: 0.5rem;
        display: inline-block;
      }
      .op-status--success { background: #d1fae5; color: #065f46; }
      .op-status--warning { background: #fef3c7; color: #92400e; }
      .op-method-badge {
        background: #eff6ff;
        color: #2563a8;
        border-radius: 20px;
        padding: 2px 12px;
        font-size: 0.82rem;
        font-weight: 600;
        display: inline-block;
      }
      .op-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 0;
        border-bottom: 1px solid #f0f1f5;
      }
      .op-item:last-child { border-bottom: none; }
      .op-item__img {
        width: 54px;
        height: 54px;
        object-fit: cover;
        border-radius: 8px;
        border: 1.5px solid #e5e7eb;
        flex-shrink: 0;
      }
      .op-item__info { flex: 1; }
      .op-item__name { font-size: 0.88rem; font-weight: 600; color: #1a2b4b; display: block; }
      .op-item__cat { font-size: 0.75rem; color: #888; }
      .op-item__meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
      .op-item__qty { font-size: 0.8rem; color: #666; }
      .op-item__price { font-size: 0.92rem; font-weight: 700; color: #1a2b4b; }
      .op-badge {
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: inline-block;
        margin-left: 6px;
      }
      .op-badge--green { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
      .op-badge--yellow { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
      .op-badge--grey { background: #f3f4f6; color: #555; border: 1px solid #d1d5db; }
    `,
    documentTitle: `Order ${orderNumber}`,
  });
}

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, order: action.payload, error: "" };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "PAY_REQUEST":
      return { ...state, loadingPay: true };
    case "PAY_SUCCESS":
      return { ...state, loadingPay: false, successPay: true };
    case "PAY_FAIL":
      return { ...state, loadingPay: false };
    case "PAY_RESET":
      return { ...state, loadingPay: false, successPay: false };
    case "DELIVER_REQUEST":
      return { ...state, loadingDeliver: true };
    case "DELIVER_SUCCESS":
      return { ...state, loadingDeliver: false, successDeliver: true };
    case "DELIVER_FAIL":
      return { ...state, loadingDeliver: false };
    case "DELIVER_RESET":
      return { ...state, loadingDeliver: false, successDeliver: false };
    default:
      return state;
  }
}

export default function OrderPage() {
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state || {};
  const token = userInfo?.token || adminInfo?.token;
  const isAdmin = userInfo?.isAdmin || adminInfo?.isAdmin;

  const navigate = useNavigate();
  const params = useParams();
  const { id: orderId } = params;

  const [
    {
      loading,
      error,
      order,
      successPay,
      loadingPay,
      loadingDeliver,
      successDeliver,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    order: {},
    error: "",
    successPay: false,
    loadingPay: false,
    loadingDeliver: false,
    successDeliver: false,
  });

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchOrder = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/orders/${orderId}`, {
          headers: { authorization: `Bearer ${token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    if (
      !order._id ||
      successPay ||
      successDeliver ||
      (order._id && order._id !== orderId)
    ) {
      fetchOrder();
      if (successPay) dispatch({ type: "PAY_RESET" });
      if (successDeliver) dispatch({ type: "DELIVER_RESET" });
    } else {
      const loadPaypalScript = async () => {
        try {
          const { data: clientId } = await axios.get("/api/keys/paypal", {
            headers: { authorization: `Bearer ${token}` },
          });
          paypalDispatch({
            type: "resetOptions",
            value: {
              "client-id": clientId,
              currency: "USD",
            },
          });
          paypalDispatch({ type: "setLoadingStatus", value: "pending" });
        } catch (err) {
          toast.error("Failed to load PayPal script");
        }
      };
      loadPaypalScript();
    }
  }, [
    order,
    orderId,
    token,
    navigate,
    successPay,
    successDeliver,
    paypalDispatch,
  ]);

  async function deliverOrderHandler() {
    try {
      dispatch({ type: "DELIVER_REQUEST" });
      const { data } = await axios.put(
        `/api/orders/${order._id}/deliver`,
        {},
        {
          headers: { authorization: `Bearer ${token}` },
        }
      );
      dispatch({ type: "DELIVER_SUCCESS", payload: data });
      toast.success("Order is delivered");
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: "DELIVER_FAIL" });
    }
  }

  function createOrder(data, actions) {
    const roundedTotal = Math.round(order.totalPrice * 100) / 100;
    return actions.order
      .create({
        purchase_units: [{ amount: { value: roundedTotal.toFixed(2) } }],
      })
      .then((orderID) => orderID);
  }

  function onApprove(data, actions) {
    return actions.order.capture().then(async function (details) {
      try {
        dispatch({ type: "PAY_REQUEST" });
        const { data } = await axios.put(
          `/api/orders/${order._id}/pay`,
          details,
          {
            headers: { authorization: `Bearer ${token}` },
          }
        );
        dispatch({ type: "PAY_SUCCESS", payload: data });
        toast.success("Order is paid");
      } catch (err) {
        dispatch({ type: "PAY_FAIL", payload: getError(err) });
        toast.error(getError(err));
      }
    });
  }

  function onError(err) {
    toast.error(getError(err));
  }

  if (!token) return null;

  if (loading) {
    return <LoadingBox></LoadingBox>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: "3rem auto", padding: "1rem 1.5rem", background: "#fee2e2", color: "#991b1b", borderRadius: 12, fontWeight: 500 }}>
        {error}
      </div>
    );
  }

  if (!order || !order.shippingAddress) {
    return <LoadingBox></LoadingBox>;
  }

  return (
    <div className="op-page" id="order-container">
        <div className="op-hero">
          <div className="op-hero__inner">
            <div className="op-hero__title">
              <span>Order</span>
              <span className="op-hero__id">#{orderId}</span>
            </div>
            <div className="op-hero__badges">
              {order.isPaid ? (
                <span className="op-badge op-badge--green">✓ Paid</span>
              ) : (
                <span className="op-badge op-badge--yellow">⏳ Unpaid</span>
              )}
              {order.isDelivered ? (
                <span className="op-badge op-badge--green">✓ Delivered</span>
              ) : (
                <span className="op-badge op-badge--grey">🚚 Pending Delivery</span>
              )}
            </div>
          </div>
        </div>

        <div className="op-grid">
          {/* Left column */}
          <div>
            {/* Shipping */}
            <div className="op-card">
              <h3 className="op-card__title">📦 Shipping</h3>
              <p className="op-card__body">
                <span className="op-label">Name: </span>{order.shippingAddress.fullName}<br />
                <span className="op-label">Address: </span>
                {order.shippingAddress.address}, {order.shippingAddress.city},{" "}
                {order.shippingAddress.postalCode}, {order.shippingAddress.country}
              </p>
              {order.shippingAddress.location?.lat && (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://maps.google.com?q=${order.shippingAddress.location.lat},${order.shippingAddress.location.lng}`}
                  className="op-map-link"
                >
                  📍 {order.shippingAddress.location.lat}, {order.shippingAddress.location.lng}
                </a>
              )}
              {order.isDelivered ? (
                <div className="op-status op-status--success">
                  ✓ Delivered on{" "}
                  {new Date(order.deliveredAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              ) : (
                <div className="op-status op-status--warning">Not Delivered Yet</div>
              )}
            </div>

            {/* Payment */}
            <div className="op-card">
              <h3 className="op-card__title">💳 Payment</h3>
              <p className="op-card__body">
                <span className="op-label">Method: </span>
                <span className="op-method-badge">{order.paymentMethod}</span>
              </p>
              {order.isPaid ? (
                <div className="op-status op-status--success">
                  ✓ Paid on{" "}
                  {new Date(order.paidAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              ) : (
                <div className="op-status op-status--warning">Awaiting Payment</div>
              )}
            </div>

            {/* Items */}
            <div className="op-card">
              <h3 className="op-card__title">🛒 Items ({order.orderItems.length})</h3>
              <div className="op-items">
                {order.orderItems.map((item) => (
                  <div key={item._id} className="op-item">
                    <img src={item.image} alt={item.name} className="op-item__img" />
                    <div className="op-item__info">
                      <Link to={`/product/${item.slug}`} className="op-item__name">
                        {item.name}
                      </Link>
                      {item.category && (
                        <span className="op-item__cat">{item.category}</span>
                      )}
                    </div>
                    <div className="op-item__meta">
                      <span className="op-item__qty">× {item.quantity}</span>
                      <span className="op-item__price">${item.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Summary */}
          <div>
            <div className="op-summary">
              <h3 className="op-summary__title">Order Summary</h3>
              <div className="op-summary__rows">
                <div className="op-summary__row">
                  <span>Items</span><span>${order.itemsPrice.toFixed(2)}</span>
                </div>
                <div className="op-summary__row">
                  <span>Shipping</span><span>${order.shippingPrice.toFixed(2)}</span>
                </div>
                <div className="op-summary__row">
                  <span>Tax</span><span>${order.taxPrice.toFixed(2)}</span>
                </div>
                <div className="op-summary__row op-summary__row--total">
                  <span>Total</span><span>${order.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {order.isPaid && (
                <button className="op-print-btn" onClick={printOrder}>
                  🖨️ Print Order
                </button>
              )}

              {!order.isPaid && !isAdmin && (
                <div className="op-paypal">
                  <p className="op-paypal__label">Pay with PayPal</p>
                  {isPending ? (
                    <LoadingBox />
                  ) : (
                    <PayPalButtons
                      createOrder={createOrder}
                      onApprove={onApprove}
                      onError={onError}
                    />
                  )}
                  {loadingPay && <LoadingBox />}
                </div>
              )}

              {isAdmin === true && order.isPaid && !order.isDelivered && (
                <div className="op-deliver">
                  {loadingDeliver && <LoadingBox />}
                  <button className="op-deliver-btn" onClick={deliverOrderHandler}>
                    Mark as Delivered
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
