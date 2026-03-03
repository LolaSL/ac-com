import React, { useContext, useEffect, useReducer, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Store } from "../Store";
import { getError } from "../utils";
import { FaClock, FaBoxOpen, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import "./HoursPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, earnings: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "UPDATE_HOURS":
      return {
        ...state,
        earnings: state.earnings.map(e =>
          e._id === action.payload.earningId
            ? {
                ...e,
                hoursWorked: action.payload.hours,
                projectName: e.projectName
                  ? { ...e.projectName, hoursWorked: action.payload.hours }
                  : e.projectName,
              }
            : e
        ),
      };
    default:
      return state;
  }
};

const HoursPage = () => {
  const { state } = useContext(Store);
  const { serviceProviderInfo } = state;

  const [{ loading, error, earnings }, dispatch] = useReducer(reducer, {
    earnings: [],
    loading: true,
    error: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId]   = useState(null);

  useEffect(() => {
    const fetchEarnings = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const token = serviceProviderInfo?.token;
        if (!token) throw new Error("Not authenticated, please log in");

        const { data } = await axios.get("/api/service-providers/earnings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    fetchEarnings();
  }, [serviceProviderInfo?.token]);

  const startEdit = (earning) => {
    const current = earning.hoursWorked ?? earning.projectName?.hoursWorked ?? 0;
    setEditingId(earning._id);
    setEditValue(String(current));
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(""); };

  const saveHours = async (earning) => {
    const hours = Number(editValue);
    if (isNaN(hours) || hours < 0) {
      toast.error("Please enter a valid number of hours.");
      return;
    }
    const projectId = earning.projectName?._id;
    if (!projectId) {
      toast.error("Project reference missing — cannot update hours.");
      return;
    }
    setSavingId(earning._id);
    try {
      await axios.patch(
        `/api/service-providers/projects/${projectId}/hours`,
        { hoursWorked: hours },
        { headers: { Authorization: `Bearer ${serviceProviderInfo.token}` } }
      );
      dispatch({ type: "UPDATE_HOURS", payload: { earningId: earning._id, hours } });
      toast.success("Hours updated successfully.");
      setEditingId(null);
      setEditValue("");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSavingId(null);
    }
  };

  const totalHours = earnings.reduce(
    (sum, e) => sum + (e.hoursWorked ?? e.projectName?.hoursWorked ?? 0),
    0
  );

  if (loading) return <LoadingBox />;
  if (error) return <MessageBox variant="danger">{error}</MessageBox>;

  return (
    <div className="hp-page">
      <div className="hp-hero">
        <div className="hp-hero__inner">
          <div className="hp-hero__icon"><FaClock /></div>
          <h1 className="hp-hero__title">Hours Worked</h1>
          <p className="hp-hero__sub">
            View and update time logged across your projects.
            {earnings.length > 0 && (
              <span className="hp-hero__total"> Total: <strong>{totalHours} hrs</strong></span>
            )}
          </p>
        </div>
      </div>

      <div className="hp-body">
        {earnings && earnings.length > 0 ? (
          <div className="table-responsive">
            <table className="hp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project Name</th>
                  <th>Hours Worked</th>
                  <th>Date</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((earning, index) => {
                  const hours     = earning.hoursWorked ?? earning.projectName?.hoursWorked ?? "—";
                  const isEditing = editingId === earning._id;
                  const isSaving  = savingId  === earning._id;

                  return (
                    <tr key={earning._id || index}>
                      <td data-label="#">{index + 1}</td>
                      <td data-label="Project Name">{earning.projectName?.name ?? "—"}</td>
                      <td data-label="Hours Worked">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="hp-hours-input"
                            autoFocus
                          />
                        ) : (
                          <span className="hp-hours-value">{hours}</span>
                        )}
                      </td>
                      <td data-label="Date">{new Date(earning.date).toLocaleDateString()}</td>
                      <td data-label="Edit">
                        {isEditing ? (
                          <div className="hp-edit-actions">
                            <button
                              className="hp-btn hp-btn--save"
                              onClick={() => saveHours(earning)}
                              disabled={isSaving}
                              title="Save"
                            >
                              {isSaving ? "…" : <FaCheck />}
                            </button>
                            <button
                              className="hp-btn hp-btn--cancel"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              title="Cancel"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="hp-btn hp-btn--edit"
                            onClick={() => startEdit(earning)}
                            title="Edit hours"
                            disabled={!earning.projectName?._id}
                          >
                            <FaEdit />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="hp-empty">
            <FaBoxOpen className="hp-empty__icon" />
            <p>No hours data found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HoursPage;
