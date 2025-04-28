import axios from "axios";
import React, { useContext, useEffect, useReducer } from "react";
import { toast } from "react-toastify";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Store } from "../Store";
import { getError } from "../utils";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Container, Table, Button } from "react-bootstrap";
const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        serviceProviders: action.payload.serviceProviders,
        pages: action.payload.pages,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true, successDelete: false };
    case "DELETE_SUCCESS":
      return { ...state, loadingDelete: false, successDelete: true };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false };
    case "DELETE_RESET":
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

export default function ServiceProviderList() {
  const [
    {
      loading,
      error,
      serviceProviders = [],
      loadingDelete,
      successDelete,
      pages,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
    serviceProviders: [],
    pages: 1,
  });

  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;
  const { search } = useLocation();
  const { token } = userInfo;

  const sp = new URLSearchParams(search);
  const currentPage = sp.get("page") || 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(
          `/api/service-providers?page=${currentPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    if (token) {
      fetchData();
    } else {
      console.error("Token is missing or invalid");
    }

    if (successDelete) {
      dispatch({ type: "DELETE_RESET" });
      fetchData();
    }
  }, [currentPage, successDelete, token]);

  const deleteHandler = async (serviceProvider) => {
    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/service-providers/${serviceProvider._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Service Provider deleted successfully");
        dispatch({ type: "DELETE_SUCCESS" });
      } catch (error) {
        toast.error(getError(error));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  return (
    <Container className="provider-container">
      <h1>Service Providers</h1>

      {loadingDelete && <LoadingBox />}
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
                <th>NAME</th>
                <th>EMAIL</th>
                <th>IS ADMIN</th>
                <th>IS ACTIVE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {serviceProviders.map((serviceProvider) => (
                <tr key={serviceProvider._id}>
                  <td data-label="ID">{serviceProvider._id}</td>
                  <td data-label="Name">{serviceProvider.name}</td>
                  <td data-label="Email">{serviceProvider.email}</td>
                  <td data-label="Is Admin">
                    {serviceProvider.isAdmin ? "YES" : "NO"}
                  </td>
                  <td data-label="Is Active">
                    {serviceProvider.isActive ? "YES" : "NO"}
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="light"
                      onClick={() =>
                        navigate(
                          `/admin/manage-service-providers/${serviceProvider._id}`
                        )
                      }
                    >
                      Edit
                    </Button>
                    &nbsp;
                    <Button
                      type="button"
                      variant="light"
                      onClick={() => deleteHandler(serviceProvider)}
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
                    to={`/admin/serviceProviders?page=${currentPage - 1}`}
                  >
                    &lt;
                  </Link>
                </li>
                {[...Array(pages).keys()].map((x) => (
                  <li
                    key={x + 1}
                    className={`page-item ${
                      x + 1 === currentPage ? "active" : ""
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
                    currentPage === pages ? "disabled" : ""
                  }`}
                >
                  <Link
                    className="page-link"
                    to={`/admin/serviceProviders?page=${currentPage + 1}`}
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
