import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";

const ModalWindow = ({ show, onHide, products, addToCart }) => {
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

  return (
    <Modal show={show} onHide={onHide} className="custom-modal">
      <Modal.Header closeButton>
        <Modal.Title>{product ? product.name : "No Product"}</Modal.Title>
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
            <p>BTU: {product.btu}</p>
            <Button
                   className="go-to-btn btn-text"
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
        <Button      className="go-to-btn btn-text"
            variant="btn-outline" onClick={onHide}>
          Close
        </Button>
        <Button      className="go-to-btn btn-text"
            variant="btn-outline" onClick={prevProduct} disabled={currentProductIndex === 0}>
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
