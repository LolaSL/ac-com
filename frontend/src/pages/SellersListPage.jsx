import { useContext, useEffect, useReducer, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Store } from "../Store";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { getError } from "../utils";
import { Container, Table, Button, Form, InputGroup } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import "./SellersListPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        sellers: action.payload.sellers,
        page: action.payload.page,
        totalPages: action.payload.totalPages,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "CREATE_REQUEST":
      return { ...state, loadingCreate: true };
    case "CREATE_SUCCESS":
      return { ...state, loadingCreate: false };
    case "CREATE_FAIL":
      return { ...state, loadingCreate: false };
    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true, successDelete: false };
    case "DELETE_SUCCESS":
      return { ...state, loadingDelete: false, successDelete: true };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false, successDelete: false };
    case "DELETE_RESET":
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

const SellersListPage = () => {
  const [
    { loading, error, sellers, totalPages, loadingCreate, loadingDelete, successDelete },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
    sellers: [],
    totalPages: 1,
  });

  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const currentPage = sp.get("page") || 1;
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/sellers/?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
  }, [currentPage, userInfo, successDelete, token]);

  const createHandler = async () => {
    if (window.confirm("Are you sure to create a new seller?")) {
      try {
        dispatch({ type: "CREATE_REQUEST" });

        const newSeller = {
          name: "Test Seller",
          brand: "Test Brand",
          info: "Test info",
          link: "https://test-link.com",
          companyLink: "https://test-company.com",
          logo: "/images/default-logo.png",
        };

        const { data } = await axios.post("/api/sellers", newSeller, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success("Seller created successfully");
        dispatch({ type: "CREATE_SUCCESS" });
        navigate(`/admin/sellers/${data.seller._id}`);
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "CREATE_FAIL" });
      }
    }
  };

  const deleteHandler = async (seller) => {
    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/sellers/${seller._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Seller deleted successfully");
        dispatch({ type: "DELETE_SUCCESS" });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  return (
    <Container className="admin-page-container">
      <Row className="align-items-center mb-4">
        <Col>
          <h1 className="page-title">Sellers Management</h1>
        </Col>
        <Col className="text-end">
          <Button
            className="btn-admin-action"
            onClick={createHandler}
            disabled={loadingCreate}
          >
            <FaPlus className="me-2" />
            {loadingCreate ? "Creating..." : "Create Seller"}
          </Button>
        </Col>
      </Row>

      <InputGroup className="mb-4 admin-search-box">
        <InputGroup.Text className="admin-search-icon">
          <FaSearch />
        </InputGroup.Text>
        <Form.Control
          placeholder="Search by name, brand..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="admin-search-input"
        />
      </InputGroup>

      {loadingCreate && <LoadingBox />}
      {loadingDelete && <LoadingBox />}

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
        <div className="table-responsive admin-table-wrapper">
          <Table striped bordered hover className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <th>ID</th>
                <th>LOGO</th>
                <th>NAME</th>
                <th>BRAND</th>
                <th>COMPANY LINK</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sellers
                .filter(
                  (seller) =>
                    seller.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    seller.brand
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                )
                .map((seller) => (
                  <tr key={seller._id} className="admin-table-row">
                    <td data-label="ID" className="small-text">
                      {seller._id.substring(0, 8)}...
                    </td>
                    <td data-label="Logo" className="logo-cell">
                      {seller.logo &&
                      seller.logo !== "undefined" &&
                      seller.logo !== "" &&
                      seller.logo.startsWith("/images/") ? (
                        <img
                          src={seller.logo}
                          alt="logo"
                          width="40"
                          height="40"
                          style={{ objectFit: "contain", borderRadius: "4px" }}
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center bg-light"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "4px",
                          }}
                        >
                          <i className="fas fa-building fa-sm text-muted"></i>
                        </div>
                      )}
                    </td>
                    <td data-label="Name">{seller.name}</td>
                    <td data-label="Brand">{seller.brand}</td>
                    <td data-label="Company Link">
                      <a
                        href={seller.companyLink}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-link"
                      >
                        Visit
                      </a>
                    </td>
                    <td className="actions-cell">
                      <Button
                        variant="sm"
                        className="btn-admin-edit"
                        onClick={() => navigate(`/admin/sellers/${seller._id}`)}
                        title="Edit seller"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="sm"
                        className="btn-admin-delete ms-2"
                        onClick={() => deleteHandler(seller)}
                        title="Delete seller"
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>
          <div className="d-flex justify-content-center mt-3">
            <nav>
              <ul className="pagination">
                <li className={`page-item ${Number(currentPage) === 1 ? "disabled" : ""}`}>
                  <Link className="page-link" to={`/admin/sellers?page=${Number(currentPage) - 1}`}>
                    &lt;
                  </Link>
                </li>
                {[...Array(totalPages).keys()].map((x) => (
                  <li
                    key={x + 1}
                    className={`page-item ${x + 1 === Number(currentPage) ? "active" : ""}`}
                  >
                    <Link className="page-link" to={`/admin/sellers?page=${x + 1}`}>
                      {x + 1}
                    </Link>
                  </li>
                ))}
                <li className={`page-item ${Number(currentPage) === totalPages ? "disabled" : ""}`}>
                  <Link className="page-link" to={`/admin/sellers?page=${Number(currentPage) + 1}`}>
                    &gt;
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </Container>
  );
};

export default SellersListPage;
