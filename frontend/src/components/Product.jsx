import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import Rating from "./Rating.jsx";
import axios from "axios";
import { useContext } from "react";
import { Store } from "../Store.js";
import Image from "react-bootstrap/Image";

function Product(props) {
  const { product } = props;
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
  } = state;

  const addToCartHandler = async (item) => {
    const existItem = cartItems.find((x) => x._id === product._id);
    const quantity = existItem ? existItem.quantity + 1 : 1;
    const { data } = await axios.get(`/api/products/${item._id}`);
    if (data.countInStock < quantity) {
      window.alert("Sorry. Product is out of stock");
      return;
    }
    ctxDispatch({
      type: "CART_ADD_ITEM",
      payload: { ...item, quantity },
    });
  };

  return (
    <Card>
      <Link to={`/product/${product.slug}`}>
        <Image src={product.image} className="responsive" alt={product.name} />
      </Link>

      <Card.Body>
        <Link
          to={`/product/${product.slug}`}
          className="card-link text-secondary"
        >
          <Card.Title>{product.name}</Card.Title>
        </Link>
        <Rating rating={product.rating} numReviews={product.numReviews} />
        <Card.Text>
          <span className={product.discount > 0 ? "original-price" : ""}>
            ${product.price.toFixed(2)}
          </span>
          {product.discount > 0 && (
            <span className="sale-badge">
              On Sale! Save {product.discount}%
            </span>
          )}
          {product.discount > 0 && (
            <span className="discounted-price">
              ${((product.price * (100 - product.discount)) / 100).toFixed(2)}
            </span>
          )}
        </Card.Text>
        {product.countInStock === 0 ? (
          <Button className="btn-out-of-stock" variant="secondary" disabled>
            Out of stock
          </Button>
        ) : (
          <Button
            className="btn btn-secondary"
            onClick={() => addToCartHandler(product)}
          >
            Add to cart
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

export default Product;
