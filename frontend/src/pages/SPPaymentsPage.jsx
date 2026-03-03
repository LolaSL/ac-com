import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Badge } from "react-bootstrap";
import { FaMoneyBillWave, FaBoxOpen, FaCheckCircle, FaClock, FaTimesCircle, FaExclamationCircle } from "react-icons/fa";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import "./SPPaymentsPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return { ...state, payments: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const STATUS_META = {
  completed: { label: "Completed", bg: "success",  Icon: FaCheckCircle },
  pending:   { label: "Pending",   bg: "warning",  Icon: FaClock },
  failed:    { label: "Failed",    bg: "danger",   Icon: FaTimesCircle },
  missed:    { label: "Missed",    bg: "secondary", Icon: FaExclamationCircle },
};

const SPPaymentsPage = () => {
  const { state } = useContext(Store);
  const { serviceProviderInfo } = state;

  const [{ loading, error, payments }, dispatch] = useReducer(reducer, {
    payments: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchPayments = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const token = serviceProviderInfo?.token;
        if (!token) throw new Error("Not authenticated, please log in");

        const { data } = await axios.get("/api/service-providers/payments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    fetchPayments();
  }, [serviceProviderInfo?.token]);

  if (loading) return <LoadingBox />;
  if (error) return <MessageBox variant="danger">{error}</MessageBox>;

  const totalPaid    = payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="spp-page">
      {/* ── Hero ── */}
      <div className="spp-hero">
        <div className="spp-hero__inner">
          <div className="spp-hero__icon"><FaMoneyBillWave /></div>
          <h1 className="spp-hero__title">My Payments</h1>
          <p className="spp-hero__sub">Track all payments issued to you by the platform admin.</p>
        </div>
      </div>

      <div className="spp-body">

        {/* ── Summary cards ── */}
        {payments.length > 0 && (
          <div className="spp-summary">
            <div className="spp-summary-card spp-summary-card--green">
              <FaCheckCircle className="spp-summary-icon" />
              <div>
                <div className="spp-summary-value">${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <div className="spp-summary-label">Total Received</div>
              </div>
            </div>
            <div className="spp-summary-card spp-summary-card--amber">
              <FaClock className="spp-summary-icon" />
              <div>
                <div className="spp-summary-value">${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <div className="spp-summary-label">Pending</div>
              </div>
            </div>
            <div className="spp-summary-card spp-summary-card--blue">
              <FaMoneyBillWave className="spp-summary-icon" />
              <div>
                <div className="spp-summary-value">{payments.length}</div>
                <div className="spp-summary-label">Total Payments</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        {payments.length > 0 ? (
          <div className="table-responsive">
            <table className="spp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Description</th>
                  <th>Paid At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => {
                  const meta = STATUS_META[payment.status] || STATUS_META.pending;
                  return (
                    <tr key={payment._id || index}>
                      <td data-label="#">{index + 1}</td>
                      <td data-label="Amount" className="spp-amount">
                        ${payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td data-label="Method">{payment.paymentMethod || "—"}</td>
                      <td data-label="Transaction ID">
                        <span className="spp-txn">{payment.transactionId || "—"}</span>
                      </td>
                      <td data-label="Description">{payment.description || "—"}</td>
                      <td data-label="Paid At">
                        {payment.paidAt
                          ? new Date(payment.paidAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td data-label="Status">
                        <Badge
                          bg={meta.bg}
                          text={meta.bg === "warning" ? "dark" : undefined}
                          className="spp-badge"
                        >
                          <meta.Icon className="spp-badge-icon" /> {meta.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="spp-empty">
            <FaBoxOpen className="spp-empty__icon" />
            <p>No payments found. Payments will appear here once processed by admin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SPPaymentsPage;
