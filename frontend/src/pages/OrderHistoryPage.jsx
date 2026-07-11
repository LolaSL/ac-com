import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import { Store } from "../Store.js";
import { getError } from "../utils";
import Button from "react-bootstrap/esm/Button";
import { Link, useLocation } from "react-router-dom";
import { Table, Badge } from "react-bootstrap";
import { FaHistory, FaBoxOpen, FaEye } from "react-icons/fa";
import "./OrderHistoryPage.css";

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
    default:
      return state;
  }
};

export default function OrderHistoryPage() {
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;

  const navigate = useNavigate();
  const { search } = useLocation();
  const [{ loading, error, orders, pages }, dispatch] = useReducer(reducer, {
    loading: true,
    error: "",
  });

  const sp = new URLSearchParams(search);
  const currentPage = sp.get("page") || 1;

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get(
          `/api/orders/mine?page=${currentPage}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (error) {
        dispatch({
          type: "FETCH_FAIL",
          payload: getError(error),
        });
      }
    };
    fetchData();
  }, [userInfo, currentPage, token]);

  return (
    <div className="oh-page">
      <div className="oh-hero">
        <div className="oh-hero__inner">
          <div className="oh-hero__icon"><FaHistory /></div>
          <h1 className="oh-hero__title">Order History</h1>
          <p className="oh-hero__sub">Track and manage all your past orders.</p>
        </div>
      </div>
      <div className="oh-inner">
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : orders?.length === 0 ? (
        <div className="oh-empty">
          <FaBoxOpen className="oh-empty__icon" />
          <h4>No orders yet</h4>
          <p>Once you place an order, it will appear here.</p>
          <Button variant="primary" onClick={() => navigate('/products')}>Shop Now</Button>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <Table className="oh-table" hover>
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td data-label="Order Ref">
                      <span className="oh-order-ref">{order._id}</span>
                    </td>
                    <td data-label="Date">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td data-label="Total">
                      <strong>${order.totalPrice.toFixed(2)}</strong>
                    </td>
                    <td data-label="Payment">
                      {order.isCancelled ? (
                        <Badge bg="danger">Cancelled&nbsp;{order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString() : ''}</Badge>
                      ) : order.isPaid ? (
                        <Badge bg="success">Paid &nbsp;{new Date(order.paidAt).toLocaleDateString()}</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">Pending</Badge>
                      )}
                    </td>
                    <td data-label="Delivery">
                      {order.isCancelled ? (
                        <Badge bg="danger">Cancelled</Badge>
                      ) : order.isDelivered ? (
                        <Badge bg="primary">Delivered &nbsp;{new Date(order.deliveredAt).toLocaleDateString()}</Badge>
                      ) : (
                        <Badge bg="secondary">Not Shipped</Badge>
                      )}
                    </td>
                    <td>
                      <Button
                        type="button"
                        className="btn-admin-edit"
                        title="View Details"
                        onClick={() => navigate(`/order/${order._id}`)}
                      >
                        <FaEye />
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
                <li
                  className={`page-item ${Number(currentPage) === 1 ? "disabled" : ""}`}
                >
                  <Link
                    className="page-link"
                    to={`/orderhistory?page=${Number(currentPage) - 1}`}
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
                      to={`/orderhistory?page=${x + 1}`}
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
                    to={`/orderhistory?page=${Number(currentPage) + 1}`}
                  >
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
