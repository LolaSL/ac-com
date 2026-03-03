import axios from "axios";
import React, { useContext, useEffect, useReducer, useState } from "react";
import { toast } from "react-toastify";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Store } from "../Store";
import { getError } from "../utils";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Table,
  Button,
  Form,
  InputGroup,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import { FaSearch, FaEdit, FaTrash, FaPlus, FaUserTie } from "react-icons/fa";
import "./AdminHero.css";
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
    case "CREATE_REQUEST":
      return { ...state, loadingCreate: true };
    case "CREATE_SUCCESS":
      return { ...state, loadingCreate: false, successCreate: true };
    case "CREATE_FAIL":
      return { ...state, loadingCreate: false };
    case "CREATE_RESET":
      return { ...state, loadingCreate: false, successCreate: false };
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
      loadingCreate,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
    serviceProviders: [],
    pages: 1,
    loadingCreate: false,
    successCreate: false,
  });

  const navigate = useNavigate();
  const { state } = useContext(Store);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;
  const { search } = useLocation();

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

  const createHandler = async () => {
    if (window.confirm("Are you sure to create a new service provider?")) {
      try {
        dispatch({ type: "CREATE_REQUEST" });
        const defaultData = {
          name: "New Provider",
          email: `provider${Date.now()}@example.com`,
          password: "defaultPassword123",
          typeOfProvider: "General",
          phone: "000-000-0000",
          company: "Default Company",
          experience: 0,
          portfolio: "",
        };
        const { data } = await axios.post(
          "/api/service-providers/register",
          defaultData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success("Service Provider created successfully");
        dispatch({ type: "CREATE_SUCCESS" });
        navigate(`/admin/manage-service-providers/${data._id}`);
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "CREATE_FAIL" });
      }
    }
  };

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
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaUserTie /></div>
          <h1 className="adm-hero__title">Service Providers</h1>
          <p className="adm-hero__sub">Manage all service provider accounts and assignments.</p>
        </div>
      </div>
      <div className="adm-inner">
        <div className="d-flex justify-content-end mb-4">
          <Button type="button" className="btn-admin-action" onClick={createHandler} disabled={loadingCreate}>
            <FaPlus /> {loadingCreate ? "Creating..." : "Create Service Provider"}
          </Button>
        </div>

      <Row className="mb-4 g-2">
        <Col md={6}>
          <InputGroup className="admin-search-box">
            <InputGroup.Text className="admin-search-icon">
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search by name or email..."
              className="admin-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Form.Select>
        </Col>
      </Row>

      {loadingDelete && <LoadingBox />}
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <div className="table-responsive">
          <Table className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <th>ID</th>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {serviceProviders
                .filter((provider) => {
                  const matchesSearch =
                    provider.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    provider.email
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    (provider.phone &&
                      provider.phone
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()));
                  const matchesStatus =
                    statusFilter === "all" ||
                    (statusFilter === "active" && provider.isActive) ||
                    (statusFilter === "inactive" && !provider.isActive);
                  return matchesSearch && matchesStatus;
                })
                .map((serviceProvider) => (
                  <tr key={serviceProvider._id} className="admin-table-row">
                    <td className="small-text">
                      {serviceProvider._id}
                    </td>
                    <td>{serviceProvider.name}</td>
                    <td>{serviceProvider.email}</td>
                    <td>{serviceProvider.phone || "N/A"}</td>
                    <td>
                      <Badge
                        bg={serviceProvider.isActive ? "success" : "secondary"}
                      >
                        {serviceProvider.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="actions-cell">
                      <Button
                        type="button"
                        className="btn-admin-edit"
                        title="Edit"
                        onClick={() =>
                          navigate(
                            `/admin/manage-service-providers/${serviceProvider._id}`
                          )
                        }
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        type="button"
                        className="btn-admin-delete"
                        title="Delete"
                        onClick={() => deleteHandler(serviceProvider)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
          {serviceProviders.filter((provider) => {
            const matchesSearch =
              provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              provider.email
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              (provider.phone &&
                provider.phone
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()));
            const matchesStatus =
              statusFilter === "all" ||
              (statusFilter === "active" && provider.isActive) ||
              (statusFilter === "inactive" && !provider.isActive);
            return matchesSearch && matchesStatus;
          }).length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted">No service providers found.</p>
            </div>
          )}
          <div>
            <nav>
              <ul className="pagination">
                <li
                  className={`page-item ${Number(currentPage) === 1 ? "disabled" : ""}`}
                >
                  <Link
                    className="page-link"
                    to={`/admin/serviceProviders?page=${Number(currentPage) - 1}`}
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
                      to={`/admin/serviceProviders?page=${x + 1}`}
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
                    to={`/admin/serviceProviders?page=${Number(currentPage) + 1}`}
                  >
                    &gt;
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
