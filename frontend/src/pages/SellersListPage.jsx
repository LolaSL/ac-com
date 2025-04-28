import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Store } from "../Store";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { getError } from "../utils";
import { Container, Table, Button } from "react-bootstrap";


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

const SellersEditPage = () => {
  const [
    {
      loading,
      error,
      sellers,
      totalPages,
      loadingCreate,
      loadingDelete,
      successDelete,
    },
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
  const { userInfo } = state;

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/sellers/?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
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
  }, [currentPage, userInfo, successDelete]);

  const deleteHandler = async (seller) => {
    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/sellers/${seller._id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
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
    <Container className="provider-container">
      {loadingCreate && <LoadingBox></LoadingBox>}
      {loadingDelete && <LoadingBox></LoadingBox>}

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <div className="table-responsive">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>LOGO</th>
                <th>LINK</th>
                <th>NAME</th>
                <th>BRAND</th>
                <th>INFO</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller._id}>
                  <td data-label="ID">{seller._id}</td>
                  <td data-label="Logo">
                    <img src={seller.logo} alt="logo" width="50" />
                  </td>
                  <td data-label="Link">
                    <a
                      href={seller.companyLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                  </td>
                  <td data-label="Name">{seller.name}</td>
                  <td data-label="Brand">{seller.brand}</td>
                  <td data-label="Info">{seller.info}</td>

                  <td>
                    <Button
                      type="button"
                      variant="light"
                      onClick={() => navigate(`/admin/sellers/${seller._id}`)}
                    >
                      Edit
                    </Button>
                    &nbsp;
                    <Button
                      type="button"
                      variant="light"
                      onClick={() => deleteHandler(seller)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div>
            <nav>
              <ul className="pagination">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <Link
                    className="page-link"
                    to={`/admin/serviceProviders?page=${
                      Number(currentPage) - 1
                    }`}
                  >
                    &lt;
                  </Link>
                </li>
                {[...Array(totalPages).keys()].map((x) => (
                  <li
                    key={x + 1}
                    className={`page-item ${
                      x + 1 === Number(currentPage) ? "active" : ""
                    }`}
                  >
                    <Link
                      className="page-link"
                      to={`/admin/serviceProviders?page=${x + 1}`}
                    >
                      {x + 1}
                    </Link>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <Link
                    className="page-link"
                    to={`/admin/serviceProviders?page=${
                      Number(currentPage) + 1
                    }`}
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
};

export default SellersEditPage;
