import { useEffect, useState, useContext, useMemo } from "react";
import { Table, Spinner, Alert, Button, Form, InputGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store.js";
import { FaEye, FaPencilRuler, FaSearch } from "react-icons/fa";
import "./AdminHero.css";

const AdminAllAnnotationsPage = () => {
  const { state } = useContext(Store);
  const token = state?.adminInfo?.token;
  const navigate = useNavigate();
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | name
  const [paidFilter, setPaidFilter] = useState('all'); // all | paid | unpaid

  const filteredAnnotations = useMemo(() => {
    let result = annotations;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          (a.filename || '').toLowerCase().includes(q) ||
          (a.userId || '').toLowerCase().includes(q)
      );
    }

    // Paid filter
    if (paidFilter === 'paid') result = result.filter((a) => a.isPaid);
    if (paidFilter === 'unpaid') result = result.filter((a) => !a.isPaid);

    // Sort
    return [...result].sort((a, b) => {
      if (sortBy === 'name') return (a.filename || '').localeCompare(b.filename || '');
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });
  }, [annotations, searchQuery, sortBy, paidFilter]);

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
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaPencilRuler /></div>
          <h1 className="adm-hero__title">Users Drawings Management</h1>
          <p className="adm-hero__sub">View and manage all user annotation projects.</p>
        </div>
      </div>
      <div className="adm-inner">
      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && (
        <>
          {/* Filter & Sort toolbar */}
          <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
            <InputGroup style={{ maxWidth: '300px' }}>
              <InputGroup.Text><FaSearch /></InputGroup.Text>
              <Form.Control
                placeholder="Search filename or user ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Form.Select
              style={{ maxWidth: '150px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A-Z</option>
            </Form.Select>
            <Form.Select
              style={{ maxWidth: '140px' }}
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </Form.Select>
            <small className="text-muted ms-auto">
              {filteredAnnotations.length} of {annotations.length} drawings
            </small>
          </div>

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
            {filteredAnnotations.length > 0 ? (
              filteredAnnotations.map((a) => (
              <tr key={a._id}>
                <td data-label="Filename">{a.filename}</td>
                <td data-label="User ID">{a.userId}</td>
                <td data-label="PDF ID">{a.pdfId}</td>
                <td data-label="Created At">{new Date(a.createdAt).toLocaleString()}</td>
                <td data-label="Paid">{a.isPaid ? "Yes" : "No"}</td>
                <td data-label="Actions">
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
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center text-muted py-3">
                  No drawings match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        </>
      )}  
      </div>
    </div>
  );
};

export default AdminAllAnnotationsPage;
