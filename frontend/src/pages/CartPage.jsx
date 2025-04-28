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

export default function CartPage() {
  const navigate = useNavigate();

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
  } = state;

  const [showAlert, setShowAlert] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [totalBTU, setTotalBTU] = useState(0);


  useEffect(() => {
   
    const airConditionerBTU = cartItems
      .filter((item) => item.category !== "Outdoor Condenser") 
      .reduce((sum, item) => sum + item.quantity * (item.btu || 0), 0);
  
    setTotalBTU(airConditionerBTU); 
  }, [cartItems]);
  const recommendedCondenser = totalBTU ? (totalBTU * 0.8).toFixed(0) : 0;  

  useEffect(() => {
  
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 6000);
  
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
        const { data } = await axios.get(
          "/api/products?category=Outdoor%20Condenser"
        );
        setRecommendedProducts(data);
      } catch (error) {
        console.error("Error fetching recommended products:", error);
      }
    };

    if (showModal) {
      fetchProducts();
    }
  }, [showModal]);

  const updateCartHandler = async (item, quantity) => {
    try {
      if (!item || !item._id) {
        console.error("Invalid item data:", item);
        window.alert("Error: Product ID is missing");
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
        const { data } = await axios.get(
          "/api/products?category=Outdoor%20Condenser"
        );
        const condensers = data.filter(
          (product) => product.category === "Outdoor Condenser"
        );

        setRecommendedProducts(condensers);

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
      <h1>Shopping Cart</h1>
      <div className="p-4">
        {showAlert && (
          <div className="bg-info p-3 mb-3 text-center">
            <strong>
    Recommended Condenser: {recommendedCondenser}
  </strong>
          </div>
        )}
      </div>
      <Button
        variant="primary"
        onClick={() => setShowModal(true)}
        className="btn btn-secondary mb-4"
      >
        Select a Recommended Condenser
      </Button>
      <ModalWindow
        show={showModal}
        onHide={() => setShowModal(false)}
        products={recommendedProducts}
        addToCart={addToCart}
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
                      </Col>
                      <Col md={3}>
                        <Button
                          onClick={() =>
                            updateCartHandler(item, item.quantity - 1)
                          }
                          variant="light"
                          disabled={item.quantity === 1}
                          className="btn-icon"
                        >
                          <i className="fas fa-minus-circle icon-color"></i>
                        </Button>{" "}
                        <span>{item.quantity}</span>{" "}
                        <Button
                          variant="light"
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
                          variant="light"
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
        </Col>
      </Row>
    </div>
  );
}