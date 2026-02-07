import { useContext, useState, useEffect } from "react";
import { Store } from "../Store";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import MessageBox from "../components/MessageBox";
import ListGroup from "react-bootstrap/ListGroup";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Image from "react-bootstrap/Image";
import ModalWindow from "../components/ModalWindow.jsx";
import "./CartPage.css";

export default function CartPage() {
  const navigate = useNavigate();

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
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

    // Check if a condenser is already in the cart
    const condenserAlreadyInCart = cartItems.some(
      (item) =>
        item.category &&
        (item.category.toLowerCase().includes("condenser") ||
          item.category.toLowerCase().includes("vrf heat recovery") ||
          item.category.toLowerCase().includes("mrv-s outdoor"))
    );

    // If condenser already in cart, don't show recommendation
    if (condenserAlreadyInCart) {
      setRecommendedCondenser(null);
      setCondenserSizingStatus("already_added");
      return;
    }

    // Detect if system is VRF or minisplit
    const isVRFSystem = cartItems.some(
      (item) => item.category && item.category.toLowerCase().includes("vrf")
    );
    const multiplier = isVRFSystem ? 1.0 : 0.8;
    const requiredBTU = totalBTU * multiplier;

    // Define acceptable range: 90-120%
    const minAcceptable = requiredBTU * 0.9;
    const maxAcceptable = requiredBTU * 1.2;

    // Get all available condensers
    const availableCondensers = allProducts.filter(
      (p) =>
        (p.category && p.category.toLowerCase().includes("condenser")) ||
        (p.category && p.category.toLowerCase().includes("vrf"))
    );

    const suitableCondensers = availableCondensers.filter(
      (c) => c.btu >= minAcceptable && c.btu <= maxAcceptable
    );

    let condenser = null;
    let status = "";

    if (suitableCondensers.length > 0) {
      // Find closest match
      condenser = suitableCondensers.reduce((closest, current) => {
        const closestDiff = Math.abs(closest.btu - requiredBTU);
        const currentDiff = Math.abs(current.btu - requiredBTU);
        return currentDiff < closestDiff ? current : closest;
      });

      const percentage = (condenser.btu / requiredBTU) * 100;
      if (percentage >= 98 && percentage <= 102) {
        status = "perfect";
      } else if (percentage > 102) {
        status = "oversized";
      } else {
        status = "undersized";
      }
    } else {
      status = "custom";
      condenser = {
        _id: "custom",
        name: "Custom Condenser Required",
        btu: Math.round(requiredBTU),
      };
    }

    setRecommendedCondenser(condenser);
    setCondenserSizingStatus(status);
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
        // Filter for all outdoor unit types
        const outdoorUnits = data.filter(
          (product) =>
            product.category === "Outdoor Condenser" ||
            product.category === "VRF Heat Recovery" ||
            product.category === "MRV-S Outdoor"
        );
        setRecommendedProducts(outdoorUnits);
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

      // For custom condensers created by BTU calculator, skip database validation
      if (item._id.startsWith("condenser-")) {
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
    navigate("/signin?redirect=/shipping");
  };
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await axios.get("/api/products");
        // Filter for all outdoor unit types
        const outdoorUnits = data.filter(
          (product) =>
            product.category === "Outdoor Condenser" ||
            product.category === "VRF Heat Recovery" ||
            product.category === "MRV-S Outdoor"
        );

        setRecommendedProducts(outdoorUnits);
      } catch (error) {
        console.error("Error fetching recommended products:", error);
      }
    };

    if (showModal) {
      fetchProducts();
    }
  }, [showModal]);

  return (
    <div className="p-4">
      <h1 className="fs-1">Shopping Cart</h1>
      <div className="p-4">
        {showAlert && condenserSizingStatus === "already_added" && (
          <div
            className="p-3 mb-3 text-center rounded"
            style={{
              backgroundColor: "#d4edda",
            }}
          >
            <span className="badge bg-success">✓ Condenser Already Added</span>
            <p className="small text-muted mb-0 mt-1">
              You have a condenser in your cart. No additional recommendation
              needed.
            </p>
          </div>
        )}
        {showAlert &&
          recommendedCondenser &&
          totalBTU >= 10000 &&
          condenserSizingStatus !== "already_added" && (
            <div
              className="p-3 mb-3 text-center rounded"
              style={{
                backgroundColor:
                  condenserSizingStatus === "custom" ? "#fff3cd" : "#f0f8ff",
              }}
            >
              <strong className="text-primary fs-5">
                Recommended Condenser: {recommendedCondenser.btu} BTU
              </strong>
              {condenserSizingStatus === "perfect" && (
                <div className="mt-2">
                  <span className="badge bg-success">✓ Perfect Match</span>
                  <p className="small text-muted mb-0 mt-1">
                    {recommendedCondenser.name} - {recommendedCondenser.btu} BTU
                  </p>
                </div>
              )}
              {condenserSizingStatus === "oversized" && (
                <div className="mt-2">
                  <span className="badge bg-info">📈 Slightly Oversized</span>
                  <p className="small text-muted mb-0 mt-1">
                    {recommendedCondenser.name} - {recommendedCondenser.btu} BTU
                    <br />
                    <em>
                      Provides extra capacity - good for extreme weather
                      conditions
                    </em>
                  </p>
                </div>
              )}
              {condenserSizingStatus === "undersized" && (
                <div className="mt-2">
                  <span className="badge bg-warning text-dark">
                    ⚠️ Slightly Undersized
                  </span>
                  <p className="small text-muted mb-0 mt-1">
                    {recommendedCondenser.name} - {recommendedCondenser.btu} BTU
                    <br />
                    <em>
                      May not cool effectively in extreme heat - consider next
                      size up if available
                    </em>
                  </p>
                </div>
              )}
              {condenserSizingStatus === "custom" && (
                <div className="mt-2">
                  <span className="badge bg-warning text-dark">
                    📞 Custom Order Required
                  </span>
                  <p className="small text-muted mb-0 mt-1">
                    No stock product matches your {recommendedCondenser.btu} BTU
                    requirement
                    <br />
                    <em>Please contact us for a custom solution</em>
                  </p>
                </div>
              )}
            </div>
          )}
      </div>
      <Button
        variant="primary"
        onClick={() => setShowModal(true)}
        className="go-to-btn btn-text mb-4"
      >
        Select a Recommended Condenser
      </Button>
      <ModalWindow
        show={showModal}
        onHide={() => setShowModal(false)}
        products={recommendedProducts}
        addToCart={addToCart}
        recommendedBTU={recommendedCondenser?.btu}
      />
      <Row>
        <Col md={8}>
          {cartItems.length === 0 ? (
            <MessageBox>
              Cart is empty.{" "}
              <Link to="/products" className="link-cart">
                Go Shopping
              </Link>
            </MessageBox>
          ) : (
            <ListGroup>
              {cartItems.map((item, index) => {
                const discountedPrice =
                  item.discount > 0
                    ? item.price * (1 - item.discount / 100)
                    : item.price;
                return (
                  <ListGroup.Item key={index}>
                    <Row className="align-items-center">
                      <Col md={4}>
                        <Image
                          src={item.image}
                          alt={item.name}
                          className="img-fluid rounded cart-thumbnail"
                        ></Image>{" "}
                        <Link
                          className="nav-link-product"
                          to={`/product/${item.slug}`}
                        >
                          {item.name}
                        </Link>
                        {item.category && <p>{item.category}</p>}
                        {item.btu && <p className="text-muted small">{item.btu} BTU</p>}
                      </Col>
                      <Col md={3}>
                        <Button
                          onClick={() =>
                            updateCartHandler(item, item.quantity - 1)
                          }
                          disabled={item.quantity === 1}
                          className="btn-icon"
                        >
                          <i className="fas fa-minus-circle icon-color"></i>
                        </Button>{" "}
                        <span>{item.quantity}</span>{" "}
                        <Button
                          onClick={() =>
                            updateCartHandler(item, item.quantity + 1)
                          }
                          disabled={item.quantity === item.countInStock}
                          className="btn-icon"
                        >
                          <i className="fas fa-plus-circle icon-color"></i>
                        </Button>
                      </Col>

                      <Col md={3}>
                        {item.discount > 0 ? (
                          <>
                            <span
                              className="text-muted"
                              style={{ textDecoration: "line-through" }}
                            >
                              ${item.price.toFixed(2)}
                            </span>{" "}
                            <span className="ms-2">
                              ${discountedPrice.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span>${item.price.toFixed(2)}</span>
                        )}
                      </Col>
                      <Col md={2}>
                        <Button
                          onClick={() => removeItemHandler(item)}
                          className="btn-trash"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <h3>
                    Subtotal ({cartItems.reduce((a, c) => a + c.quantity, 0)}{" "}
                    items): $
                    {cartItems
                      .reduce(
                        (a, c) =>
                          a +
                          (c.discount > 0
                            ? c.quantity * c.price * (1 - c.discount / 100)
                            : c.quantity * c.price),
                        0
                      )
                      .toFixed(2)}
                  </h3>
                </ListGroup.Item>
                <ListGroup.Item>
                  <div className="d-grid">
                    <Button
                      type="button"
                      variant="secondary"
                      className="go-to-btn btn-text"
                      onClick={checkoutHandler}
                      disabled={cartItems.length === 0}
                    >
                      Proceed to Checkout
                    </Button>
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
          {cartItems.length > 0 && relatedProducts.length > 0 && (
            <div className="mt-4">
              <h5>Recommended for your cart</h5>
              <Row>
                {relatedProducts.map((p) => (
                  <Col key={p._id} sm={6} className="mb-3">
                    <Card className="h-100">
                      <Link to={`/product/${p.slug}`}>
                        <Image
                          src={p.image}
                          alt={p.name}
                          style={{
                            width: "100%",
                            height: 140,
                            objectFit: "contain",
                          }}
                        />
                      </Link>
                      <Card.Body>
                        <Link
                          to={`/product/${p.slug}`}
                          className="text-decoration-none"
                        >
                          <div
                            className="fw-semibold"
                            style={{ minHeight: 40 }}
                          >
                            {p.name}
                          </div>
                        </Link>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <span className="fw-bold">
                            ${(p.price || 0).toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => addToCart(p)}
                          >
                            Add
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
}
