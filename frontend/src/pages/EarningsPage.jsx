import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Badge } from "react-bootstrap";
import { FaDollarSign, FaBoxOpen } from "react-icons/fa";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import "./EarningsPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, earnings: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const EarningsPage = () => {
  const { state } = useContext(Store);
  const { serviceProviderInfo } = state;

  const [{ loading, error, earnings }, dispatch] = useReducer(reducer, {
    earnings: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchEarnings = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const token = serviceProviderInfo?.token;

        if (!token) {
          throw new Error("Not authenticated, please log in");
        }

        const { data } = await axios.get("/api/service-providers/earnings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (error) {
        dispatch({ type: "FETCH_FAIL", payload: getError(error) });
      }
    };

    fetchEarnings();
  }, [serviceProviderInfo?.token]);

  if (loading) return <LoadingBox />;
  if (error) return <MessageBox variant="danger">{error}</MessageBox>;

  return (
    <div className="ep-page">
      <div className="ep-hero">
        <div className="ep-hero__inner">
          <div className="ep-hero__icon"><FaDollarSign /></div>
          <h1 className="ep-hero__title">Earnings</h1>
          <p className="ep-hero__sub">Track your project earnings and payment status.</p>
        </div>
      </div>

      <div className="ep-body">
        {earnings && earnings.length > 0 ? (
          <div className="table-responsive">
            <table className="ep-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project Name</th>
                  <th>Time on Project</th>
                  <th>Amount Earned</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((earning, index) => (
                  <tr key={earning._id || index}>
                    <td data-label="#">{index + 1}</td>
                    <td data-label="Project Name">{earning.projectName?.name ?? "—"}</td>
                    <td data-label="Time on Project">{earning.projectName?.hoursWorked ?? "—"}</td>
                    <td data-label="Amount Earned">${earning.amount}</td>
                    <td data-label="Date">{new Date(earning.date).toLocaleDateString()}</td>
                    <td data-label="Status">
                      <Badge bg={earning.status === "paid" ? "success" : "warning"} text={earning.status === "paid" ? undefined : "dark"}>
                        {earning.status || "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ep-empty">
            <FaBoxOpen className="ep-empty__icon" />
            <p>No earnings data found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsPage;
