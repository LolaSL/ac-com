import React, { useContext, useEffect, useReducer, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Container, Table, Button, Form, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { Store } from "../Store";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { getError } from "../utils";
import { FaEdit, FaTrash } from "react-icons/fa";

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
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "CREATE_REQUEST":
      return { ...state, loadingCreate: true };
    case "CREATE_SUCCESS":
      return {
        ...state,
        loadingCreate: false,
      };
    case "CREATE_FAIL":
      return { ...state, loadingCreate: false };

    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true, successDelete: false };
    case "DELETE_SUCCESS":
      return {
        ...state,
        loadingDelete: false,
        successDelete: true,
      };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false, successDelete: false };

    case "DELETE_RESET":
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

export default function ProductListPage() {
  const [
    {
      loading,
      error,
      products,
      pages,
      loadingCreate,
      loadingDelete,
      successDelete,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
  });

  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const currentPage = sp.get("page") || 1;

  const { state } = useContext(Store);
  const token = state?.userInfo?.token || state?.adminInfo?.token;

  const [sortedProducts, setSortedProducts] = useState([]);
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get("/api/products/categories");
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (products) {
      let filtered = [...products];

      // Apply search filter
      if (searchQuery) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply category filter
      if (filterCategory !== "all") {
        filtered = filtered.filter((p) => p.category === filterCategory);
      }

      // Apply sorting
      const sorted = filtered.sort((a, b) => {
        const valueA = a[sortColumn];
        const valueB = b[sortColumn];

        if (valueA === undefined || valueB === undefined) {
          return 0;
        }
        if (typeof valueA === "number" && typeof valueB === "number") {
          return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
        }

        if (typeof valueA === "string" && typeof valueB === "string") {
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }

        return 0;
      });

      setSortedProducts(sorted);
    }
  }, [products, sortColumn, sortOrder, searchQuery, filterCategory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(
          `/api/products/admin?page=${currentPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    if (successDelete) {
      dispatch({ type: "DELETE_RESET" });
    } else {
      fetchData();
    }
  }, [currentPage, successDelete, token]);

  const createHandler = async () => {
    if (!token) {
      toast.error("Unauthorized: Please log in as an admin.");
      return;
    }

    if (
      window.confirm(
        "Create a new product? You will be redirected to edit page."
      )
    ) {
      try {
        dispatch({ type: "CREATE_REQUEST" });
        const { data } = await axios.post(
          "/api/products",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success("Product created successfully");
        dispatch({ type: "CREATE_SUCCESS" });
        navigate(`/admin/product/${data.product._id}`);
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "CREATE_FAIL" });
      }
    }
  };

  const deleteHandler = async (product) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
      )
    ) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/products/${product._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Product deleted successfully");
        dispatch({ type: "DELETE_SUCCESS" });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  return (
    <Container className="provider-container">
      <Row className="mb-3 mt-4">
        <Col>
          <h1 className="admin-page-title fs-1">Products Management</h1>
        </Col>
        <Col className="col text-end">
          <div>
            <Button
         type="button"
            className="btn-admin-action"
              onClick={createHandler}
              disabled={loadingCreate}
            >
              <i className="fas fa-plus me-2"></i>
              {loadingCreate ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-3 mt-4">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search by name, brand, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setSearchQuery("");
              setFilterCategory("all");
              setSortColumn("");
            }}
            className="w-100"
          >
            Clear Filters
          </Button>
        </Col>
      </Row>

      {loadingCreate && <LoadingBox></LoadingBox>}
      {loadingDelete && <LoadingBox></LoadingBox>}

      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <div className="table-responsive">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Image</th>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="btn btn-link p-0"
                  >
                    Name{" "}
                    {sortColumn === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("price")}
                    className="btn btn-link p-0"
                  >
                    Price{" "}
                    {sortColumn === "price" &&
                      (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("category")}
                    className="btn btn-link p-0"
                  >
                    Category{" "}
                    {sortColumn === "category" &&
                      (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("brand")}
                    className="btn btn-link p-0"
                  >
                    Brand{" "}
                    {sortColumn === "brand" &&
                      (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("countInStock")}
                    className="btn btn-link p-0"
                  >
                    Stock{" "}
                    {sortColumn === "countInStock" &&
                      (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th style={{ width: "200px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <p className="text-muted">No products found</p>
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => (
                  <tr key={product._id}>
                    <td data-label="Image">
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "cover",
                          borderRadius: "5px",
                        }}
                        onError={(e) =>
                          (e.target.src = "/images/placeholder.png")
                        }
                      />
                    </td>
                    <td data-label="Name">
                      <div className="fw-bold">{product.name}</div>
                      {product.discount > 0 && (
                        <Badge bg="danger" className="mt-1">
                          {product.discount}% OFF
                        </Badge>
                      )}
                    </td>
                    <td data-label="Price">
                      ${product.price?.toFixed(2)}
                      {product.discount > 0 && (
                        <div className="text-success small">
                          $
                          {(
                            (product.price * (100 - product.discount)) /
                            100
                          ).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td data-label="Category">{product.category}</td>
                    <td data-label="Brand">{product.brand}</td>
                    <td data-label="Stock">
                      {product.countInStock > 0 ? (
                        <Badge
                          bg={product.countInStock <= 5 ? "warning" : "success"}
                        >
                          {product.countInStock} in stock
                        </Badge>
                      ) : (
                        <Badge bg="danger">Out of stock</Badge>
                      )}
                    </td>
                    <td data-label="Actions">
                      <Button
                        type="button"
                        className="btn-admin-edit"
                        title="Edit"
                        onClick={() =>
                          navigate(`/admin/product/${product._id}`)
                        }
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        type="button"
                        className="btn-admin-delete"
                        title="Delete"
                        onClick={() => deleteHandler(product)}
                        disabled={loadingDelete}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          <div>
            <nav>
              <ul className="pagination">
                <li
                  className={`page-item ${Number(currentPage) === 1 ? "disabled" : ""}`}
                >
                  <Link
                    className="page-link"
                    to={`/admin/products?page=${Number(currentPage) - 1}`}
                  >
                    &lt;
                  </Link>
                </li>
                {[...Array(pages).keys()].map((x) => (
                  <li
                    key={x + 1}
                    className={`page-item ${
                      x + 1 === Number(currentPage) ? "active" : ""
                    }`}
                  >
                    <Link
                      className="page-link"
                      to={`/admin/products?page=${x + 1}`}
                    >
                      {x + 1}
                    </Link>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    Number(currentPage) === pages ? "disabled" : ""
                  }`}
                >
                  <Link
                    className="page-link"
                    to={`/admin/products?page=${Number(currentPage) + 1}`}
                  >
                    &gt;
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </Container>
  );
}
