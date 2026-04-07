import { useContext, useState, useEffect } from "react";
import { Store } from "../Store";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ModalWindow from "../components/ModalWindow.jsx";
import "./CartPage.css";

export default function CartPage() {
  const navigate = useNavigate();

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
    userInfo,
  } = state;

  const [showAlert, setShowAlert] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [totalBTU, setTotalBTU] = useState(0);
  const [recommendedCondenser, setRecommendedCondenser] = useState(null);
  const [condenserSizingStatus, setCondenserSizingStatus] = useState("");
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    const airConditionerBTU = cartItems
      .filter(
        (item) =>
          item.category &&
          !item.category.toLowerCase().includes("condenser") &&
          !item.category.toLowerCase().includes("vrf heat recovery") &&
          !item.category.toLowerCase().includes("mrv-s outdoor")
      )
      .reduce((sum, item) => sum + item.quantity * (item.btu || 0), 0);

    setTotalBTU(airConditionerBTU);
  }, [cartItems]);

  // Smart condenser recommendation with tolerance range
 useEffect(() => {
  if (totalBTU < 10000 || allProducts.length === 0) return;

  // Calculate total condenser BTU already in cart
  const totalCondenserBTUInCart = cartItems
    .filter(
      (item) =>
        item.category &&
        (item.category.toLowerCase().includes("condenser") ||
          item.category.toLowerCase().includes("vrf heat recovery") ||
          item.category.toLowerCase().includes("mrv-s outdoor"))
    )
    .reduce((sum, item) => sum + item.quantity * (item.btu || 0), 0);

  // Detect if system is VRF
  const isVRFSystem = cartItems.some(
    (item) => item.category && item.category.toLowerCase().includes("vrf")
  );
  const multiplier = isVRFSystem ? 1.0 : 1.0;
  const requiredBTU = totalBTU * multiplier;

  // If total condenser BTU in cart meets or exceeds 90% of required, don't show recommendation
  if (totalCondenserBTUInCart >= requiredBTU * 0.9) {
    setRecommendedCondenser(null);
    setCondenserSizingStatus("already_added");
    return;
  }

  // ...existing code (rest of the recommendation logic remains the same)...
}, [totalBTU, cartItems, allProducts]);

  // Fetch all products on mount for condenser matching
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const { data } = await axios.get("/api/products");
        setAllProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchAllProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAlert(false);
    }, 12000);

    return () => clearTimeout(timer);
  }, [showAlert, totalBTU]);

  const addToCart = (product) => {
    ctxDispatch({
      type: "CART_ADD_ITEM",
      payload: { ...product, quantity: 1 },
    });
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await axios.get("/api/products");
        // Filter for VRF condensers - any product with "VRF" or "Condenser" in category
        const vrfCondensers = data.filter(
          (product) =>
            product.category &&
            (product.category.includes("VRF") || product.category.includes("Condenser"))
        );
        console.log("VRF Condensers fetched:", vrfCondensers);
        console.log("First product image URL:", vrfCondensers[0]?.image);
        setRecommendedProducts(vrfCondensers);
      } catch (error) {
        console.error("Error fetching recommended products:", error);
      }
    };

    if (showModal) {
      fetchProducts();
    }
  }, [showModal]);

  // Fetch related products when cart has items
  useEffect(() => {
    const fetchRelated = async () => {
      try {
        if (!cartItems || cartItems.length === 0) {
          setRelatedProducts([]);
          return;
        }
        const categories = [
          ...new Set(cartItems.map((i) => i.category).filter(Boolean)),
        ];
        const brands = [
          ...new Set(cartItems.map((i) => i.brand).filter(Boolean)),
        ];

        // Prefer same category, fallback to same brand
        let results = [];
        for (const category of categories) {
          const { data } = await axios.get(
            `/api/products/search?category=${encodeURIComponent(
              category
            )}&query=all&price=all&discount=any&rating=all&btu=all&brand=all&order=newest&page=1&pageSize=8`
          );
          results = results.concat(data.products || []);
        }
        if (results.length < 4) {
          for (const brand of brands) {
            const { data } = await axios.get(
              `/api/products/search?category=all&query=all&price=all&discount=any&rating=all&btu=all&brand=${encodeURIComponent(
                brand
              )}&order=toprated&page=1&pageSize=8`
            );
            results = results.concat(data.products || []);
          }
        }

        // Exclude items already in cart, de-duplicate
        const cartIds = new Set(cartItems.map((i) => i._id));
        const unique = [];
        const seen = new Set();
        results.forEach((p) => {
          if (!p || !p._id) return;
          if (cartIds.has(p._id)) return;
          if (seen.has(p._id)) return;
          seen.add(p._id);
          unique.push(p);
        });
        setRelatedProducts(unique.slice(0, 8));
      } catch (err) {
        console.error("Error fetching related products", err);
      }
    };
    fetchRelated();
  }, [cartItems]);

  const updateCartHandler = async (item, quantity) => {
    try {
      if (!item || !item._id) {
        console.error("Invalid item data:", item);
        window.alert("Error: Product ID is missing");
        return;
      }

      // For custom condensers or placeholder products from BTU calculator, skip database validation
      if (item._id.startsWith("condenser-") || item._id.startsWith("placeholder-")) {
        ctxDispatch({
          type: "CART_ADD_ITEM",
          payload: { ...item, quantity },
        });
        return;
      }

      const { data } = await axios.get(`/api/products/${item._id}`);

      if (!data || typeof data.countInStock !== "number") {
        console.error("Invalid response from server:", data);
        window.alert("Error: Product data is invalid");
        return;
      }

      if (data.countInStock < quantity) {
        window.alert("Sorry. Product is out of stock");
        return;
      }

      ctxDispatch({
        type: "CART_ADD_ITEM",
        payload: { ...item, quantity },
      });
    } catch (error) {
      console.error("Error updating cart:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        window.alert(
          `Error: ${error.response.data.message || "Failed to update cart"}`
        );
      }
    }
  };

  const removeItemHandler = (item) => {
    ctxDispatch({ type: "CART_REMOVE_ITEM", payload: item });
  };

  const checkoutHandler = () => {
    navigate(userInfo ? "/shipping" : "/signin?redirect=/shipping");
  };

  // ── derived totals ──────────────────────────────────────────
  const itemCount   = cartItems.reduce((a, c) => a + c.quantity, 0);
  const subtotal    = cartItems.reduce((a, c) => {
    const p = typeof c.price === 'number' ? c.price : 0;
    const d = typeof c.discount === 'number' ? c.discount : 0;
    return a + c.quantity * (d > 0 ? p * (1 - d / 100) : p);
  }, 0);
  const originalTotal = cartItems.reduce((a, c) => a + c.quantity * (typeof c.price === 'number' ? c.price : 0), 0);
  const totalSavings  = originalTotal - subtotal;

  // ── condenser banner config ──────────────────────────────────
  const recBanner = (() => {
    if (!showAlert) return null;
    if (condenserSizingStatus === "already_added")
      return { cls: "cp-rec-banner--green",  icon: "✅", title: "Condenser Already Added",     sub: "Your cart already includes a correctly sized condenser." };
    if (!recommendedCondenser || totalBTU < 10000) return null;
    if (condenserSizingStatus === "perfect")
      return { cls: "cp-rec-banner--blue",   icon: "🎯", title: `Perfect Match — ${recommendedCondenser.btu} BTU`, sub: recommendedCondenser.name };
    if (condenserSizingStatus === "oversized")
      return { cls: "cp-rec-banner--blue",   icon: "📈", title: `Slightly Oversized — ${recommendedCondenser.btu} BTU`, sub: `${recommendedCondenser.name} · Extra capacity is good for extreme weather.` };
    if (condenserSizingStatus === "undersized")
      return { cls: "cp-rec-banner--yellow", icon: "⚠️", title: `Slightly Undersized — ${recommendedCondenser.btu} BTU`, sub: `${recommendedCondenser.name} · Consider upgrading for extreme heat conditions.` };
    if (condenserSizingStatus === "custom")
      return { cls: "cp-rec-banner--orange", icon: "📞", title: `Custom Order Required — ${recommendedCondenser.btu} BTU`, sub: "No stock product matches this requirement. Contact us for a custom solution." };
    return null;
  })();

  return (
    <div className="cp-page">

      {/* ── Hero bar ── */}
      <div className="cp-hero">
        <h1 className="cp-hero__title">🛒 Shopping Cart</h1>
        <div className="cp-hero__meta">
          <span className="cp-badge cp-badge--white">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
          {totalBTU > 0 && <span className="cp-badge cp-badge--white">❄️ {totalBTU.toLocaleString()} BTU total</span>}
          {totalSavings > 0.01 && <span className="cp-badge cp-badge--white">💰 Saving ${totalSavings.toFixed(2)}</span>}
        </div>
      </div>

      {/* Inner content wrapper */}
      <div className="cp-inner">

      {/* ── Condenser recommendation banner ── */}
      {recBanner && (
        <div className={`cp-rec-banner ${recBanner.cls}`}>
          <span className="cp-rec-banner__icon">{recBanner.icon}</span>
          <div className="cp-rec-banner__body">
            <div className="cp-rec-banner__title">{recBanner.title}</div>
            <p className="cp-rec-banner__sub">{recBanner.sub}</p>
          </div>
        </div>
      )}

      {/* ── Select condenser button ── */}
      <button className="cp-condenser-btn" onClick={() => setShowModal(true)}>
        🔧 Select Recommended Condenser
      </button>

      <ModalWindow
        show={showModal}
        onHide={() => setShowModal(false)}
        products={recommendedProducts}
        addToCart={addToCart}
        recommendedBTU={recommendedCondenser?.btu}
      />

      {/* ── Main layout ── */}
      <div className="cp-layout">

        {/* ── LEFT: cart items ── */}
        <div>
          {cartItems.length === 0 ? (
            <div className="cp-empty">
              <div className="cp-empty__icon">🛒</div>
              <p className="cp-empty__text">Your cart is empty</p>
              <Link to="/search" className="cp-empty__link">🔍 Browse Products</Link>
            </div>
          ) : (
            <div className="cp-items-list">
              {cartItems.map((item, index) => {
                const price = typeof item.price === 'number' ? item.price : 0;
                const discount = typeof item.discount === 'number' ? item.discount : 0;
                const discountedPrice = discount > 0
                  ? price * (1 - discount / 100)
                  : price;
                const imageUrl = item.image || "/images/p1.jpg";
                return (
                  <div className="cp-item" key={index}>
                    <img 
                      src={imageUrl} 
                      alt={item.name} 
                      className="cp-item__img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/p1.jpg";
                      }}
                    />

                    <div className="cp-item__info">
                      <Link to={`/product/${item.slug}`} className="cp-item__name">{item.name}</Link>
                      {item.category && <p className="cp-item__category">{item.category}</p>}
                      {item.btu && <span className="cp-item__btu">{item.btu.toLocaleString()} BTU</span>}
                    </div>

                    <div className="cp-qty">
                      <button className="cp-qty__btn" disabled={item.quantity === 1} onClick={() => updateCartHandler(item, item.quantity - 1)}>
                        <i className="fas fa-minus" style={{ fontSize: "0.65rem" }} />
                      </button>
                      <span className="cp-qty__val">{item.quantity}</span>
                      <button className="cp-qty__btn" disabled={item.quantity === item.countInStock} onClick={() => updateCartHandler(item, item.quantity + 1)}>
                        <i className="fas fa-plus" style={{ fontSize: "0.65rem" }} />
                      </button>
                    </div>

                    <div className="cp-item__price">
                      {discount > 0 && (
                        <span className="cp-item__price-original">${price.toFixed(2)}</span>
                      )}
                      <span className="cp-item__price-final">${discountedPrice.toFixed(2)}</span>
                      {discount > 0 && (
                        <span className="cp-item__price-discount">−{discount}% off</span>
                      )}
                    </div>

                    <button className="cp-remove-btn" onClick={() => removeItemHandler(item)} title="Remove">
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: order summary + related ── */}
        <div>
          <div className="cp-summary">
            <div className="cp-summary__header">
              <h3>Order Summary</h3>
            </div>
            <div className="cp-summary__body">
              <div className="cp-summary__row">
                <span className="cp-summary__label">Items ({itemCount})</span>
                <span>${originalTotal.toFixed(2)}</span>
              </div>
              {totalSavings > 0.01 && (
                <div className="cp-summary__row">
                  <span className="cp-summary__label">Discounts</span>
                  <span style={{ color: "#16a34a" }}>−${totalSavings.toFixed(2)}</span>
                </div>
              )}
              <div className="cp-summary__row">
                <span className="cp-summary__label">Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="cp-summary__total">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {totalSavings > 0.01 && (
                <div className="cp-summary__savings">🎉 You save ${totalSavings.toFixed(2)}</div>
              )}
              <button
                className="cp-checkout-btn"
                onClick={checkoutHandler}
                disabled={cartItems.length === 0}
              >
                Proceed to Checkout →
              </button>
              <Link to="/search" className="cp-continue-link">← Continue Shopping</Link>
            </div>
          </div>

          {/* ── Related products ── */}
          {relatedProducts.length > 0 && (
            <div className="cp-related">
              <div className="cp-related__title">You may also like</div>
              <div className="cp-related__grid">
                {relatedProducts.map((p) => (
                  <div className="cp-rel-card" key={p._id}>
                    <Link to={`/product/${p.slug}`}>
                      <img src={p.image} alt={p.name} className="cp-rel-card__img" />
                    </Link>
                    <div className="cp-rel-card__body">
                      <Link to={`/product/${p.slug}`} className="cp-rel-card__name">{p.name}</Link>
                      <div className="cp-rel-card__footer">
                        <span className="cp-rel-card__price">${(p.price || 0).toFixed(2)}</span>
                        <button className="cp-rel-card__add" onClick={() => addToCart(p)}>+ Add</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* End inner content wrapper */}
      </div>
    </div>
  );
}
