import axios from "axios";
import React, { useContext, useEffect, useReducer, useState } from "react";
import {
  Table,
  Button,
  Form,
  InputGroup,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Store } from "../Store";
import { getError } from "../utils";
import { FaEdit, FaTrash, FaSearch, FaUsers } from "react-icons/fa";
import "./UserListPage.css";
import "./AdminHero.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        users: action.payload.users,
        page: action.payload.page,
        pages: action.payload.pages,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true, successDelete: false };
    case "DELETE_SUCCESS":
      return {
        ...state,
        loadingDelete: false,
        successDelete: true,
      };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false };
    case "DELETE_RESET":
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

export default function UserListPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;

  const [
    { loading, error, users = [], pages, loadingDelete, successDelete },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
    users: [],
    pages: 1,
  });

  const sp = new URLSearchParams(search);
  const currentPage = sp.get("page") || 1;

  const [sortedUsers, setSortedUsers] = useState([]);
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [adminFilter, setAdminFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/users?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        dispatch({ type: "FETCH_SUCCESS", payload: data });
        setSortedUsers(data.users || []);
      } catch (err) {
        dispatch({
          type: "FETCH_FAIL",
          payload: getError(err),
        });
      }
    };
    if (successDelete) {
      dispatch({ type: "DELETE_RESET" });
    } else {
      fetchData();
    }
  }, [userInfo, successDelete, currentPage, token]);

  useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      let filtered = [...users].filter((user) => {
        const matchSearch =
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchAdmin =
          adminFilter === "all" ||
          (adminFilter === "admin" && user.isAdmin) ||
          (adminFilter === "user" && !user.isAdmin);
        return matchSearch && matchAdmin;
      });

      const sorted = filtered.sort((a, b) => {
        if (!a[sortColumn] || !b[sortColumn]) return 0;
        return sortOrder === "asc"
          ? a[sortColumn].localeCompare(b[sortColumn])
          : b[sortColumn].localeCompare(a[sortColumn]);
      });
      setSortedUsers(sorted);
    } else {
      setSortedUsers([]);
    }
  }, [users, sortColumn, sortOrder, searchQuery, adminFilter]);

  const deleteHandler = async (user) => {
    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/users/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("User deleted successfully");
        dispatch({ type: "DELETE_SUCCESS" });
      } catch (error) {
        toast.error(getError(error));
        dispatch({
          type: "DELETE_FAIL",
        });
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
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaUsers /></div>
          <h1 className="adm-hero__title">Users Management</h1>
          <p className="adm-hero__sub">Manage registered users, roles and account details.</p>
        </div>
      </div>
      <div className="adm-inner">
        <Row className="mb-4 g-3">
        <Col md={6}>
          <InputGroup className="admin-search-box">
            <InputGroup.Text className="admin-search-icon">
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </InputGroup>
        </Col>
        <Col md={6}>
          <Form.Select
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            className="admin-filter-select"
          >
            <option value="all">All Users</option>
            <option value="admin">Admins Only</option>
            <option value="user">Regular Users</option>
          </Form.Select>
        </Col>
      </Row>

      {loadingDelete && <LoadingBox />}
      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
        <div className="table-responsive admin-table-wrapper">
          <Table striped bordered hover className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <th>
                  <button type="button" onClick={() => handleSort("_id")}>
                    ID{" "}
                    {sortColumn === "_id" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort("name")}>
                    NAME{" "}
                    {sortColumn === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort("email")}>
                    EMAIL{" "}
                    {sortColumn === "email" &&
                      (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>ROLE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user._id} className="admin-table-row">
                  <td data-label="ID" className="small-text">
                    {user._id.substring(0, 8)}...
                  </td>
                  <td data-label="Name">{user.name}</td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Role">
                    <Badge bg={user.isAdmin ? "danger" : "secondary"}>
                      {user.isAdmin ? "Admin" : "User"}
                    </Badge>
                  </td>
                  <td className="actions-cell">
                    <Button
                      variant="sm"
                      className="btn-admin-edit"
                      onClick={() => navigate(`/admin/user/${user._id}`)}
                      title="Edit user"
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      variant="sm"
                      className="btn-admin-delete ms-2"
                      onClick={() => deleteHandler(user)}
                      title="Delete user"
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
                  <Link className="page-link" to={`/admin/users?page=${Number(currentPage) - 1}`}>
                    &lt;
                  </Link>
                </li>
                {[...Array(pages).keys()].map((x) => (
                  <li
                    key={x + 1}
                    className={`page-item ${x + 1 === Number(currentPage) ? "active" : ""}`}
                  >
                    <Link className="page-link" to={`/admin/users?page=${x + 1}`}>
                      {x + 1}
                    </Link>
                  </li>
                ))}
                <li className={`page-item ${Number(currentPage) === pages ? "disabled" : ""}`}>
                  <Link className="page-link" to={`/admin/users?page=${Number(currentPage) + 1}`}>
                    &gt;
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
      </>
      )}
      </div>
    </div>
  );
}
