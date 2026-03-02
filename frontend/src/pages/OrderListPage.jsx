import axios from "axios";
import React, { useContext, useEffect, useReducer, useState } from "react";
import { toast } from "react-toastify";
import {
  Table,
  Button,
  Form,
  InputGroup,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Store } from "../Store";
import { getError } from "../utils";
import { Link } from "react-router-dom";
import { FaSearch, FaEye, FaTrash, FaClipboardList } from "react-icons/fa";
import "./OrderListPage.css";
import "./AdminHero.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        orders: action.payload.orders,
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

export default function OrderListPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state || {};
  const token = userInfo?.token || adminInfo?.token;

  const [
    { loading, error, orders, loadingDelete, successDelete, pages },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
  });

  const sp = new URLSearchParams(search);
  const currentPage = sp.get("page") || 1;

  // Initialize filters from URL on first load
  const initialSearchQuery = sp.get("q") || "";
  const initialStatusFilter = (() => {
    const s = sp.get("status");
    return ["paid", "pending", "delivered", "not-delivered"].includes(s)
      ? s
      : "all";
  })();
  const sortParam = sp.get("sort") || "createdAt:desc";
  let initialSortColumn = "createdAt";
  let initialSortOrder = "desc";
  if (sortParam.includes(":")) {
    const [col, ord] = sortParam.split(":");
    initialSortColumn = col || "createdAt";
    initialSortOrder = ord === "asc" ? "asc" : "desc";
  } else if (sortParam) {
    initialSortColumn = sortParam;
    initialSortOrder = "asc";
  }
  const initialDateFrom = sp.get("dateFrom") || "";
  const initialDateTo = sp.get("dateTo") || "";

  const buildQueryString = (pageValue) => {
    const params = new URLSearchParams();
    params.set("page", pageValue);

    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    if (statusFilter === "paid") params.set("status", "paid");
    else if (statusFilter === "pending") params.set("status", "pending");
    else if (statusFilter === "delivered") params.set("status", "delivered");
    else if (statusFilter === "not-delivered")
      params.set("status", "not-delivered");

    const isFullDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (isFullDate(dateFrom)) params.set("dateFrom", dateFrom);
    if (isFullDate(dateTo)) params.set("dateTo", dateTo);

    const sortKey = `${sortColumn}:${sortOrder}`;
    params.set("sort", sortKey);

    return params.toString();
  };

  const [sortedOrders, setSortedOrders] = useState([]);
  const [sortColumn, setSortColumn] = useState(initialSortColumn);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  useEffect(() => {
    if (!token) {
      navigate("/signin");
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!orders) return;
    setSortedOrders(orders);
  }, [orders]);

  // Keep URL in sync when filters/sort change
  useEffect(() => {
    const qs = buildQueryString(currentPage);
    navigate(`/admin/orders/?${qs}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, dateFrom, dateTo, sortColumn, sortOrder]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });

        const params = new URLSearchParams();
        params.set("page", currentPage);

        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        }

        if (statusFilter === "paid") params.set("status", "paid");
        else if (statusFilter === "pending") params.set("status", "pending");
        else if (statusFilter === "delivered")
          params.set("status", "delivered");
        else if (statusFilter === "not-delivered")
          params.set("status", "not-delivered");

        const isFullDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
        if (isFullDate(dateFrom)) params.set("dateFrom", dateFrom);
        if (isFullDate(dateTo)) params.set("dateTo", dateTo);

        const sortKey = `${sortColumn}:${sortOrder}`;
        params.set("sort", sortKey);

        const { data } = await axios.get(`/api/orders/?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        dispatch({ type: "FETCH_SUCCESS", payload: data });
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
  }, [
    token,
    successDelete,
    currentPage,
    searchQuery,
    statusFilter,
    dateFrom,
    dateTo,
    sortColumn,
    sortOrder,
  ]);

  const deleteHandler = async (order) => {
    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/orders/${order._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Order deleted successfully");
        dispatch({ type: "DELETE_SUCCESS" });
      } catch (err) {
        toast.error(getError(err));
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

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortColumn("createdAt");
    setSortOrder("desc");
    const params = new URLSearchParams();
    params.set("page", 1);
    params.set("sort", "createdAt:desc");
    navigate(`/admin/orders/?${params.toString()}`, { replace: true });
  };

  // Auto-format YYYY-MM-DD as user types in large-screen text inputs
  const formatDateInput = (value) => {
    const digits = (value || "").replace(/\D/g, "");
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    if (digits.length <= 4) return y;
    if (digits.length <= 6) return `${y}-${m}`;
    return `${y}-${m}-${d}`;
  };

  const onDateFromTextChange = (e) => {
    setDateFrom(formatDateInput(e.target.value).slice(0, 10));
  };
  const onDateToTextChange = (e) => {
    setDateTo(formatDateInput(e.target.value).slice(0, 10));
  };

  const padDate = (s) => {
    if (!s) return s;
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return s;
    const [, y, mo, d] = m;
    const mm = mo.padStart(2, "0");
    const dd = d.padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const onDateFromTextBlur = () => {
    setDateFrom((prev) => padDate(prev));
  };
  const onDateToTextBlur = () => {
    setDateTo((prev) => padDate(prev));
  };

  return (
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaClipboardList /></div>
          <h1 className="adm-hero__title">Orders Management</h1>
          <p className="adm-hero__sub">View, filter and manage all customer orders.</p>
        </div>
      </div>
      <div className="adm-inner">
        <Row className="mb-4 g-2 admin-toolbar">
        <Col md={5} lg={3}>
          <InputGroup className="admin-search-box">
            <InputGroup.Text className="admin-search-icon">
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search by ID, customer, or total (e.g. $953.63)"
              className="admin-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={2} lg={2}>
          <Form.Select
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Orders</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="not-delivered">Not Delivered</option>
          </Form.Select>
        </Col>
        {/* Small/medium screens: native date picker */}
        <Col md={2} className="d-lg-none">
          <InputGroup className="admin-search-box">
            <InputGroup.Text>From</InputGroup.Text>
            <Form.Control
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={2} className="d-lg-none">
          <InputGroup className="admin-search-box">
            <InputGroup.Text>To</InputGroup.Text>
            <Form.Control
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </InputGroup>
        </Col>
        {/* Large screens: text inputs without calendar */}
        <Col lg={3} className="d-none d-lg-block">
          <InputGroup className="admin-search-box">
            <InputGroup.Text>From</InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="YYYY-MM-DD"
              inputMode="numeric"
              pattern="\\d{4}-\\d{2}-\\d{2}"
              title="Use YYYY-MM-DD format"
              maxLength={10}
              value={dateFrom}
              onChange={onDateFromTextChange}
              onBlur={onDateFromTextBlur}
              style={{ minWidth: 160 }}
            />
          </InputGroup>
        </Col>
        <Col lg={3} className="d-none d-lg-block">
          <InputGroup className="admin-search-box">
            <InputGroup.Text>To</InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="YYYY-MM-DD"
              inputMode="numeric"
              pattern="\\d{4}-\\d{2}-\\d{2}"
              title="Use YYYY-MM-DD format"
              maxLength={10}
              value={dateTo}
              onChange={onDateToTextChange}
              onBlur={onDateToTextBlur}
              style={{ minWidth: 160 }}
            />
          </InputGroup>
        </Col>
        <Col md={1} lg={1}>
          <Button
            variant="outline-secondary"
            className="w-100"
            onClick={clearFilters}
          >
            Clear
          </Button>
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
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("_id")}
                >
                  ID {sortColumn === "_id" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th>TRANSACTION ID</th>
                <th>CUSTOMER</th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("createdAt")}
                >
                  DATE{" "}
                  {sortColumn === "createdAt" &&
                    (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("totalPrice")}
                >
                  TOTAL{" "}
                  {sortColumn === "totalPrice" &&
                    (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("paidAt")}
                >
                  PAID{" "}
                  {sortColumn === "paidAt" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("deliveredAt")}
                >
                  DELIVERED{" "}
                  {sortColumn === "deliveredAt" &&
                    (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => (
                <tr key={order._id} className="admin-table-row">
                  <td className="small-text" data-label="ID">
                    {order._id}
                  </td>
                  <td data-label="TRANSACTION ID">
                    {order.paymentResult?.id || "-"}
                  </td>
                  <td data-label="CUSTOMER">
                    {order.user ? order.user.name : "DELETED USER"}
                  </td>
                  <td data-label="DATE">
                    {order.createdAt && order.createdAt.substring(0, 10)}
                  </td>
                  <td data-label="TOTAL">
                    ${(order.totalPrice ?? 0).toFixed(2)}
                  </td>
                  <td data-label="PAID">
                    <Badge bg={order.isPaid ? "success" : "danger"}>
                      {order.isPaid && order.paidAt
                        ? order.paidAt.substring(0, 10)
                        : "Pending"}
                    </Badge>
                  </td>
                  <td data-label="DELIVERED">
                    <Badge bg={order.isDelivered ? "success" : "warning"}>
                      {order.isDelivered && order.deliveredAt
                        ? order.deliveredAt.substring(0, 10)
                        : "Not Delivered"}
                    </Badge>
                  </td>
                  <td className="actions-cell" data-label="ACTIONS">
                    <Button
                      type="button"
                      className="btn-admin-edit"
                      title="View Details"
                      onClick={() => {
                        navigate(`/order/${order._id}`);
                      }}
                    >
                      <FaEye />
                    </Button>
                    <Button
                      type="button"
                      className="btn-admin-delete"
                      title="Delete"
                      onClick={() => deleteHandler(order)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {sortedOrders.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted">No orders found.</p>
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
                    to={`/admin/orders/?${buildQueryString(
                      Number(currentPage) - 1
                    )}`}
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
                      to={`/admin/orders/?${buildQueryString(x + 1)}`}
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
                    to={`/admin/orders/?${buildQueryString(
                      Number(currentPage) + 1
                    )}`}
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
