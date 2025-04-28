import React, { useEffect, useReducer, useState } from "react";
import { Link, useNavigate, useLocation, NavLink } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getError } from "../utils";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Rating from "../components/Rating.jsx";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import Button from "react-bootstrap/Button";
import Product from "../components/Product.jsx";
import { useParams } from "react-router-dom";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        products: action.payload.products,
        page: action.payload.page,
        pages: action.payload.pages,
        countProducts: action.payload.countProducts,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

const prices = [
  { name: "$1 to $50", value: "1-50" },
  { name: "$51 to $200", value: "51-200" },
  { name: "$201 to $1000", value: "201-1000" },
  { name: "$1001 to $10000", value: "1001-10000" },
];

export const ratings = [
  { name: "4stars & up", rating: 4 },
  { name: "3stars & up", rating: 3 },
  { name: "2stars & up", rating: 2 },
  { name: "1stars & up", rating: 1 },
];

const discounts = [
  { name: "Any", value: "any" },
  { name: "No Discount", value: "0" },
  { name: "10% to 20%", value: "10-20" },
  { name: "21% to 30%", value: "21-30" },
  { name: "31% to 40%", value: "31-40" },
  { name: "50%", value: "50" },
];

export default function SearchPage() {
  const { id } = useParams();
  console.log(id);
  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const category = sp.get("category") || "all";
  const query = sp.get("query") || "all";
  const price = sp.get("price") || "all";
  const discount = sp.get("discount") || "0";
  const rating = sp.get("rating") || "all";
  const btu = sp.get("btu") || "all";
  const brand = sp.get("brand") || "all";
  const order = sp.get("order") || "newest";
  const page = sp.get("page") || 1;

  const [{ loading, error, products, pages, countProducts }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: "",
    });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(
          `/api/products/search?page=${page}&query=${query}&category=${category}&price=${price}&discount=${discount}&rating=${rating}&btu=${btu}&brand=${brand}&order=${order}`
        );
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({
          type: "FETCH_FAIL",
          payload: getError(err),
        });
      }
    };
    fetchData();
  }, [category, order, page, price, query, rating, btu, brand, discount]);

  const [categories, setCategories] = useState([]);
  const [brandsList, setBrandsList] = useState([]);

  useEffect(() => {
    const fetchCategoriesAndBrands = async () => {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          axios.get(`/api/products/categories`),
          axios.get(`/api/products/brands`),
        ]);
        setCategories(categoriesData.data);
        setBrandsList(brandsData.data);
      } catch (err) {
        toast.error(getError(err));
      }
    };
    fetchCategoriesAndBrands();
  }, []);

  const getFilterUrl = (filter, skipPathname) => {
    const filterPage = filter.page || page;
    const filterCategory = filter.category || category;
    const filterQuery = filter.query || query;
    const filterRating = filter.rating || rating;
    const filterPrice = filter.price || price;
    const filterDiscount = filter.discount || discount;
    const filterBtu = filter.btu || btu;
    const filterBrand = filter.brand || brand;
    const sortOrder = filter.order || order;
    return `${
      skipPathname ? "" : "/search?"
    }category=${filterCategory}&query=${filterQuery}&price=${filterPrice}&discount=${filterDiscount}&rating=${filterRating}&btu=${filterBtu}&brand=${filterBrand}&order=${sortOrder}&page=${filterPage}`;
  };

  return (
    <div>
      <div className="search">
        <Row className="mt-4 p-4">
          <Col md={3}>
            <h3>AC Unit</h3>
            <div>
              <ul className="all">
                <li>
                  <Link
                    className={`text-decoration-none ${
                      "all" === category ? "text-bold" : ""
                    }`}
                    to={getFilterUrl({ category: "all" })}
                  >
                    Any
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c}>
                    <Link
                      className={`text-decoration-none ${
                        c === category ? "text-bold" : ""
                      }`}
                      to={getFilterUrl({ category: c })}
                    >
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Price</h3>
              <ul>
                <li>
                  <Link
                    className={`text-decoration-none ${
                      "all" === price ? "text-bold" : ""
                    }`}
                    to={getFilterUrl({ price: "all" })}
                  >
                    Any
                  </Link>
                </li>
                {prices.map((p) => (
                  <li key={p.value}>
                    <Link
                      to={getFilterUrl({ price: p.value })}
                      className={`text-decoration-none ${
                        p.value === price ? "text-bold" : ""
                      }`}
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Discount</h3>
              <ul>
                {discounts.map((d) => (
                  <li key={d.value}>
                    <Link
                      to={getFilterUrl({ discount: d.value })}
                      className={`text-decoration-none ${
                        d.value === discount ? "text-bold" : ""
                      }`}
                    >
                      {d.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Brands</h3>
              <ul>
                <li>
                  <Link
                    to={getFilterUrl({ brand: "all" })}
                    className={`text-decoration-none ${
                      brand === "all" ? "text-bold" : ""
                    }`}
                  >
                    Any
                  </Link>
                </li>
                {brandsList.map((b) => (
                  <li key={b}>
                    <Link
                      to={getFilterUrl({ brand: b })}
                      className={`text-decoration-none ${
                        brand === b ? "text-bold" : ""
                      }`}
                    >
                      {b}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Customer Review</h3>
              <ul>
                {ratings.map((r) => (
                  <li key={r.name}>
                    <Link
                      to={getFilterUrl({ rating: "all" })}
                      className={`text-decoration-none ${
                        rating === "all" ? "text-bold" : ""
                      }`}
                    >
                      <Rating caption={" & up"} rating={r.rating}></Rating>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to={getFilterUrl({ rating: "all" })}
                    className={rating === "all" ? "text-bold" : ""}
                  >
                    <Rating caption={" & up"} rating={0}></Rating>
                  </Link>
                </li>
              </ul>
            </div>
          </Col>
          <Col md={9}>
            {loading ? (
              <LoadingBox></LoadingBox>
            ) : error ? (
              <MessageBox variant="danger">{error}</MessageBox>
            ) : (
              <>
                <Row className="justify-content-between mb-3">
                  <Col md={6}>
                    <div>
                      {countProducts === 0 ? "No" : countProducts} Results
                      {query !== "all" && " : " + query}
                      {category !== "all" && " : " + category}
                      {price !== "all" && " : Price " + price}
                      {rating !== "all" && " : Rating " + rating + " & up"}
                      {query !== "all" ||
                      category !== "all" ||
                      rating !== "all" ||
                      btu !== "all" ||
                      brand !== "all" ||
                      price !== "all" ? (
                        <Button
                          variant="light"
                          onClick={() => navigate("/search")}
                        >
                          <i className="fas fa-times-circle"></i>
                        </Button>
                      ) : null}
                    </div>
                  </Col>
                  <Col className="text-end">
                    Sort by{" "}
                    <select
                      value={order}
                      onChange={(e) => {
                        navigate(getFilterUrl({ order: e.target.value }));
                      }}
                    >
                      <option value="newest">Newest Arrivals</option>
                      <option value="lowest">Price: Low to High</option>
                      <option value="highest">Price: High to Low</option>
                      <option value="toprated">Customer Reviews</option>
                      <option value="brand">Brand Name</option>
                    </select>
                  </Col>
                </Row>
                {products.length === 0 && (
                  <MessageBox>No Product Found</MessageBox>
                )}
                <Row className="gy-4">
                  {products.map((product) => (
                    <Col
                      xs={12}
                      md={4}
                      lg={3}
                      key={product._id}
                      className="product-item"
                    >
                      <div className="product-card">
                        <Product product={product}></Product>
                      </div>
                    </Col>
                  ))}
                </Row>
                <div>
                  {[...Array(pages).keys()].map((x) => (
                    <NavLink as={Link} 
                      key={x + 1}
                      className="d-inline-block m-1"
                      to={{
                        pathname: "/search",
                        search: getFilterUrl({ page: x + 1 }).split("?")[1],
                      }}
                    >
                      <Button variant="light">{x + 1}</Button>
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
}
