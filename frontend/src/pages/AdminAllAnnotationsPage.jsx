import { useEffect, useState, useContext } from "react";
import { Table, Spinner, Alert, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store.js";
import { FaEye } from "react-icons/fa";

const AdminAllAnnotationsPage = () => {
  const { state } = useContext(Store);
  const token = state?.adminInfo?.token;
  const navigate = useNavigate();
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllAnnotations = async () => {
      if (!token) {
        setError("Admin not authenticated.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/all-annotations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          // Try to parse JSON first, otherwise fallback to text for better diagnostics
          let errorBody = null;
          try {
            errorBody = await response.json();
          } catch (e) {
            try {
              errorBody = await response.text();
            } catch (e2) {
              errorBody = null;
            }
          }
          const serverMsg =
            errorBody && errorBody.message
              ? errorBody.message
              : errorBody || response.statusText;
          throw new Error(
            `Failed to fetch annotations (status ${response.status}): ${serverMsg}`
          );
        }
        const data = await response.json();
        setAnnotations(data);
      } catch (err) {
        setError(err.message || "Error fetching annotations");
      } finally {
        setLoading(false);
      }
    };
    fetchAllAnnotations();
  }, [token]);

  return (
    <div className="container mt-4">
      <h1 className="admin-page-title fs-1 mb-4"> Users Drawings Management</h1>
      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Filename</th>
              <th>User ID</th>
              <th>PDF ID</th>
              <th>Created At</th>
              <th>Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {annotations.map((a) => (
              <tr key={a._id}>
                <td>{a.filename}</td>
                <td>{a.userId}</td>
                <td>{a.pdfId}</td>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
                <td>{a.isPaid ? "Yes" : "No"}</td>
                <td>
                  <Button
                    type="button"
                    className="btn-admin-edit"
                    title="View Details"
                    onClick={() => navigate(`/admin/engineer-view/${a._id}`)}
                  >
                    <FaEye />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default AdminAllAnnotationsPage;
