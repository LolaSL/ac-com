import React, { useState, useMemo } from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import "./ModalWindow.css";

const ModalWindow = ({ show, onHide, products, addToCart, recommendedBTU }) => {
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  const nextProduct = () => {
    if (currentProductIndex < products.length - 1) {
      setCurrentProductIndex(currentProductIndex + 1);
    }
  };

  const prevProduct = () => {
    if (currentProductIndex > 0) {
      setCurrentProductIndex(currentProductIndex - 1);
    }
  };

  const product = products[currentProductIndex];

  // Calculate sizing status for this product
  const sizingStatus = useMemo(() => {
    if (!product || !recommendedBTU) return "";

    const minAcceptable = recommendedBTU * 0.9;
    const maxAcceptable = recommendedBTU * 1.2;

    if (product.btu < minAcceptable || product.btu > maxAcceptable) {
      return "out-of-range";
    }

    const percentage = (product.btu / recommendedBTU) * 100;
    if (percentage >= 98 && percentage <= 102) {
      return "perfect";
    } else if (percentage > 102) {
      return "oversized";
    } else {
      return "undersized";
    }
  }, [product, recommendedBTU]);

  const getSizingBadge = () => {
    switch (sizingStatus) {
      case "perfect":
        return (
          <Badge bg="success" className="ms-2">
            ✓ Perfect Match
          </Badge>
        );
      case "oversized":
        return (
          <Badge bg="info" className="ms-2">
            📈 Oversized
          </Badge>
        );
      case "undersized":
        return (
          <Badge bg="warning" text="dark" className="ms-2">
            ⚠️ Undersized
          </Badge>
        );
      default:
        return null;
    }
  };

  const discountedPrice = product
    ? (product.price - (product.price * (product.discount || 0)) / 100).toFixed(
        2
      )
    : 0;

  return (
    <Modal show={show} onHide={onHide} className="custom-modal modal-window">
      <Modal.Header closeButton>
        <Modal.Title>
          {product ? product.name : "No Product"}
          {product && getSizingBadge()}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {product ? (
          <div className="product-item">
            <div className="product-image">
              <img
                src={product.image}
                alt={product.name}
                className="img-fluid"
              />
            </div>

            <h5>{product.name}</h5>

            {/* System Type */}
            {product.category && (
              <p className="mb-2">
                <strong>System Type:</strong>{" "}
                <span className="system-type">
                  {product.category.includes("VRF")
                    ? "VRF Heat Recovery"
                    : "Minisplit"}
                </span>
              </p>
            )}

            {/* BTU and Sizing Info */}
            <p className="mb-2">
              <strong>Capacity:</strong> {product.btu} BTU
              {recommendedBTU && (
                <>
                  <br />
                  <small className="text-muted">
                    Recommended: {recommendedBTU} BTU
                    {sizingStatus !== "out-of-range" && (
                      <>
                        {" "}
                        ({((product.btu / recommendedBTU) * 100).toFixed(0)}%)
                      </>
                    )}
                  </small>
                </>
              )}
            </p>

            {/* Coverage Area */}
            {product.areaCoverage && (
              <p className="mb-2">
                <strong>Coverage Area:</strong> {product.areaCoverage} m²
              </p>
            )}

            {/* Energy Efficiency */}
            {product.energyEfficiency && (
              <p className="mb-2">
                <strong>Energy Efficiency:</strong> {product.energyEfficiency}{" "}
                EER
              </p>
            )}

            {/* Brand */}
            {product.brand && (
              <p className="mb-2">
                <strong>Brand:</strong> {product.brand}
              </p>
            )}

            {/* Price */}
            <div className="price-section">
              <strong>Price:</strong>
              <br />
              {product.discount > 0 ? (
                <>
                  <span className="original-price">
                    ${product.price.toFixed(2)}
                  </span>
                  {" → "}
                  <span className="discounted-price">${discountedPrice}</span>
                  <br />
                  <small className="save-text">Save {product.discount}%</small>
                </>
              ) : (
                <span className="current-price">
                  ${product.price.toFixed(2)}
                </span>
              )}
            </div>

            {/* Sizing Status Message */}
            {recommendedBTU && sizingStatus === "perfect" && (
              <div className="alert alert-success" role="alert">
                <small>
                  ✓ <strong>Ideal choice</strong> - This condenser matches your
                  requirement perfectly
                </small>
              </div>
            )}
            {recommendedBTU && sizingStatus === "oversized" && (
              <div className="alert alert-info" role="alert">
                <small>
                  ℹ️{" "}
                  <strong>
                    Oversized by{" "}
                    {((product.btu / recommendedBTU - 1) * 100).toFixed(0)}%
                  </strong>{" "}
                  - Provides extra capacity, good for extreme weather
                </small>
              </div>
            )}
            {recommendedBTU && sizingStatus === "undersized" && (
              <div className="alert alert-warning" role="alert">
                <small>
                  ⚠️{" "}
                  <strong>
                    Undersized by{" "}
                    {((1 - product.btu / recommendedBTU) * 100).toFixed(0)}%
                  </strong>{" "}
                  - May not perform optimally in extreme heat
                </small>
              </div>
            )}

            <Button
              className="go-to-btn btn-text w-100"
              variant="btn-outline"
              onClick={() => addToCart(product)}
            >
              Add to Cart
            </Button>
          </div>
        ) : (
          <p className="no-products">No product available to display.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          className="go-to-btn btn-text"
          variant="btn-outline"
          onClick={onHide}
        >
          Close
        </Button>
        <Button
          className="go-to-btn btn-text"
          variant="btn-outline"
          onClick={prevProduct}
          disabled={currentProductIndex === 0}
        >
          Previous
        </Button>
        <Button
          className="go-to-btn btn-text"
          variant="btn-outline"
          onClick={nextProduct}
          disabled={currentProductIndex === products.length - 1}
        >
          Next
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalWindow;
