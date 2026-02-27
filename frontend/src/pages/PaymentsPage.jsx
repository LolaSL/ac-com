import React, { useEffect, useReducer, useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { getError } from "../utils";
import { Store } from "../Store.js";
import { Modal, Button, Form } from "react-bootstrap";
import { FaThumbsUp, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import "./PaymentsPage.css";
const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, payments: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "CREATE_REQUEST":
      return { ...state, loadingCreate: true };
    case "CREATE_SUCCESS":
      return { ...state, loadingCreate: false };
    case "CREATE_FAIL":
      return { ...state, loadingCreate: false };
    case "UPDATE_REQUEST":
      return { ...state, loadingUpdate: true };
    case "UPDATE_SUCCESS":
      return { ...state, loadingUpdate: false };
    case "UPDATE_FAIL":
      return { ...state, loadingUpdate: false };
    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true };
    case "DELETE_SUCCESS":
      return { ...state, loadingDelete: false, successDelete: true };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false };
    case "DELETE_RESET":
      return { ...state, successDelete: false };
    default:
      return state;
  }
};

export default function PaymentsPage() {
  const { state } = useContext(Store);
  const { adminInfo } = state;
  const [
    {
      loading,
      error,
      payments,
      loadingCreate,
      loadingUpdate,
      loadingDelete,
      successDelete,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
  });

  const userInfo = adminInfo;

  // Form state for creating payments
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    serviceProvider: "",
    amount: "",
    currency: "USD",
    paymentMethod: "bank transfer",
    description: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get("/api/users/admin/payments", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    if (userInfo && userInfo.isAdmin) {
      fetchData();
    }
  }, [userInfo, successDelete]);

  const createHandler = async (e) => {
    e.preventDefault();
    if (window.confirm("Are you sure to create this payment?")) {
      try {
        dispatch({ type: "CREATE_REQUEST" });
        const { data } = await axios.post(
          "/api/users/admin/payments",
          paymentData,
          {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }
        );
        toast.success("Payment created successfully");
        dispatch({ type: "CREATE_SUCCESS" });
        dispatch({ type: "FETCH_SUCCESS", payload: [...payments, data] });
        setShowCreateModal(false);
        setPaymentData({
          serviceProvider: "",
          amount: "",
          currency: "USD",
          paymentMethod: "bank transfer",
          description: "",
        });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "CREATE_FAIL" });
      }
    }
  };

  const updateHandler = async (payment) => {
    if (window.confirm("Mark as completed?")) {
      try {
        dispatch({ type: "UPDATE_REQUEST" });
        await axios.put(
          `/api/users/admin/payments/${payment._id}`,
          { status: "completed" },
          {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }
        );
        toast.success("Payment updated successfully");
        dispatch({ type: "UPDATE_SUCCESS" });
        // Refresh data
        const { data } = await axios.get("/api/users/admin/payments", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "UPDATE_FAIL" });
      }
    }
  };

  const deleteHandler = async (payment) => {
    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/users/admin/payments/${payment._id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success("Payment deleted successfully");
        dispatch({ type: "DELETE_SUCCESS" });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  const markMissedHandler = async (payment) => {
    if (window.confirm("Mark this payment as missed?")) {
      try {
        dispatch({ type: "UPDATE_REQUEST" });
        await axios.put(
          `/api/users/admin/payments/${payment._id}`,
          { status: "missed" },
          {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }
        );
        toast.success("Payment marked as missed");
        dispatch({ type: "UPDATE_SUCCESS" });
        // Refresh data
        const { data } = await axios.get("/api/users/admin/payments", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "UPDATE_FAIL" });
      }
    }
  };

  return (
    <div>
      <div className="row mb-4">
        <h1 className="page-title">Payments to Service Providers</h1>
        <div className="col text-end">
          <div>
            <button
                 type="button"
            className="btn-admin-action"
              onClick={() => setShowCreateModal(true)}
            >   <i className="fas fa-plus me-2"></i>
              Create Payment
            </button>
          </div>
        </div>
      </div>

      {loadingCreate && <LoadingBox />}
      {loadingUpdate && <LoadingBox />}
      {loadingDelete && <LoadingBox />}

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Service Provider</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment Method</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{payment._id}</td>
                  <td>{payment.serviceProvider?.name || "N/A"}</td>
                  <td>${payment.amount}</td>
                  <td>{payment.status}</td>
                  <td>{payment.paymentMethod}</td>
                  <td>{payment.description}</td>
                  <td>
                    {payment.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          className="me-1 payment-btn payment-btn-success"
                          onClick={() => updateHandler(payment)}
                          title="Mark Completed"
                        >
                          <FaThumbsUp />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="payment-btn payment-btn-danger"
                          onClick={() => deleteHandler(payment)}
                          title="Delete payment"
                        >
                          <FaTrash />
                        </Button>
                      </>
                    )}
                    {payment.status === "completed" && (
                      <>
                        <Button
                          size="sm"
                          variant="warning"
                          className="me-1 payment-btn payment-btn-warning"
                          onClick={() => markMissedHandler(payment)}
                          title="Mark as Missed"
                        >
                          <FaExclamationTriangle />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="payment-btn payment-btn-danger"
                          onClick={() => deleteHandler(payment)}
                          title="Delete payment"
                        >
                          <FaTrash />
                        </Button>
                      </>
                    )}
                    {payment.status === "missed" && (
                      <Button
                        size="sm"
                        variant="danger"
                        className="payment-btn payment-btn-danger"
                        onClick={() => deleteHandler(payment)}
                        title="Delete payment"
                      >
                        <FaTrash />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Payment Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Payment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={createHandler}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Service Provider Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="serviceprovider@example.com"
                value={paymentData.serviceProvider}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    serviceProvider: e.target.value,
                  })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="100.00"
                value={paymentData.amount}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, amount: e.target.value })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Currency</Form.Label>
              <Form.Select
                value={paymentData.currency}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, currency: e.target.value })
                }
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Payment Method</Form.Label>
              <Form.Select
                value={paymentData.paymentMethod}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    paymentMethod: e.target.value,
                  })
                }
              >
                <option value="bank transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="cash">Cash</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Payment description"
                value={paymentData.description}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    description: e.target.value,
                  })
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loadingCreate}>
              {loadingCreate ? "Creating..." : "Create Payment"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
