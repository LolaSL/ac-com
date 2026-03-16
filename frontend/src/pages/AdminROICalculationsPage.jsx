import React, { useEffect, useState, useContext } from "react";
import {
  Table,
  Spinner,
  Alert,
  Badge,
  Button,
  Form,
  Row,
  Col,
  Modal,
  Pagination,
} from "react-bootstrap";
import axios from "axios";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { FaTrash, FaEye, FaFilePdf, FaChartBar } from "react-icons/fa";
import "./AdminHero.css";
import jsPDF from "jspdf";

const SERVICE_TYPES = [
  "All",
  "AC Installation",
  "AC Repair",
  "AC Maintenance",
  "Gas Ducted Heating",
  "Indoor Air Quality",
  "Smart Control Automation",
  "Electrical Service",
];

const PROPERTY_LABELS = {
  "residential-single": "Single",
  "residential-multi": "Multi",
  "industrial-commercial": "Commercial",
};

/**
 * Returns true when a saved calculation originated from the BTU Calculator.
 * Checks three signals:
 *   1. btuProjectData subdocument has a meaningful totalBTU value
 *   2. Calculation name starts with "BTU Project:"
 *   3. Description contains "BTU Project:"
 */
const isBtuSourced = (calc) => {
  if (calc?.btuProjectData?.totalBTU > 0) return true;
  if (calc?.name?.startsWith("BTU Project:")) return true;
  if (calc?.description?.includes("BTU Project:")) return true;
  return false;
};

export default function AdminROICalculationsPage() {
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  // Admin pages use adminInfo token; fall back to userInfo for admin users
  // who are also logged in as regular users.
  const token = adminInfo?.token || userInfo?.token;
  const isAdminUser = !!(adminInfo || userInfo?.isAdmin);

  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters & sort
  const [filterService, setFilterService] = useState("All");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");

  // Detail modal
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const headers = { authorization: `Bearer ${token}` };

  const fetchAll = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(
        `/api/roi-calculations/admin/all?page=${p}`,
        { headers }
      );
      setCalculations(data.calculations || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load calculations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminUser) {
      fetchAll(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this calculation?")) return;
    try {
      await axios.delete(`/api/roi-calculations/${id}`, { headers });
      setCalculations((prev) => prev.filter((c) => c._id !== id));
      setTotal((t) => t - 1);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleView = (calc) => {
    setSelected(calc);
    setShowDetail(true);
  };

  // Apply client-side filter + sort to the current page data
  const displayed = calculations
    .filter((c) => {
      const matchService =
        filterService === "All" || c.serviceType === filterService;
      const matchSearch =
        !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.userId?.email?.toLowerCase().includes(search.toLowerCase());
      return matchService && matchSearch;
    })
    .sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (sortField === "createdAt") {
        av = new Date(av);
        bv = new Date(bv);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  // Quick PDF for a single calc (admin view)
  const handleExportPDF = (calc) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFillColor(0, 102, 255);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("AC-COMMERCE — Admin ROI Report", margin, 20);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 30);
    doc.text(`Calculation: ${calc.name}`, margin, 38);
    doc.setTextColor(0, 0, 0);
    y = 55;

    const row = (label, value) => {
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.text(`${label}:`, margin, y);
      doc.setFont(undefined, "normal");
      doc.text(String(value ?? "—"), margin + 55, y);
      y += 7;
    };

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("User", margin, y);
    y += 8;
    row("Name", calc.userId?.name);
    row("Email", calc.userId?.email);

    y += 4;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Parameters", margin, y);
    y += 8;
    row("Service Type", calc.serviceType);
    row("Property Type", PROPERTY_LABELS[calc.propertyType] || calc.propertyType);
    row("Project Value", `$${Number(calc.projectSize).toLocaleString()}`);
    row("Installation Time", `${calc.installationTime} days`);
    row("Team Size", `${calc.teamSize} people`);
    row("Projects / Month", calc.projectsPerMonth);
    row("Analysis Period", `${calc.monthsToAnalyze} months`);

    y += 4;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Results", margin, y);
    y += 8;
    row("Savings / Project", `$${Number(calc.savingsPerProject || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
    row("Savings %", `${calc.savingsPercentage}%`);
    row("Total Period Savings", `$${Number(calc.annualSavings || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
    row("ROI", `${calc.roi}%`);
    row("Payback Period", `${calc.paybackMonths} months`);

    if (isBtuSourced(calc)) {
      y += 4;
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("BTU Project Data", margin, y);
      y += 8;
      row("Total BTU", Number(calc.btuProjectData?.totalBTU || 0).toLocaleString("de-DE"));
      row("Rooms", calc.btuProjectData?.numberOfRooms ?? "—");
      row("Equipment Cost", `$${Number(calc.btuProjectData?.estimatedProjectCost || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page 1 of 1`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" }
    );

    const filename = `Admin_ROI_${calc.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(doc.output("blob"));
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`Downloaded: ${filename}`);
  };

  const roiBadge = (roi) => {
    const v = parseFloat(roi);
    if (v >= 100) return <Badge bg="success">{roi}%</Badge>;
    if (v >= 50) return <Badge bg="warning" text="dark">{roi}%</Badge>;
    return <Badge bg="danger">{roi}%</Badge>;
  };

  const paybackBadge = (months) => {
    if (months <= 6) return <Badge bg="success">{months} mo</Badge>;
    if (months <= 12) return <Badge bg="warning" text="dark">{months} mo</Badge>;
    return <Badge bg="danger">{months} mo</Badge>;
  };

  if (!isAdminUser) {
    return (
      <div className="adm-page">
        <div className="adm-inner">
          <Alert variant="danger">Admin access required.</Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaChartBar /></div>
          <h1 className="adm-hero__title">ROI Calculations</h1>
          <p className="adm-hero__sub">Review and manage all saved ROI calculations across users.</p>
        </div>
      </div>
      <div className="adm-inner">
        <p className="text-muted mb-4">
          {total} calculation{total !== 1 ? "s" : ""} in total
        </p>

      {/* Filters */}
      <Row className="mb-3 g-2 align-items-end">
        <Col md={4}>
          <Form.Control
            placeholder="Search by name, user name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md="auto">
          <Button variant="outline-secondary" onClick={() => fetchAll(page)}>
            ↻ Refresh
          </Button>
        </Col>
      </Row>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : displayed.length === 0 ? (
        <Alert variant="info">No calculations found.</Alert>
      ) : (
        <>
          <div className="table-responsive">
            <Table striped bordered hover size="sm" className="align-middle">
              <thead className="table-dark">
                <tr>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("name")}
                  >
                    Name{sortIcon("name")}
                  </th>
                  <th>User</th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("serviceType")}
                  >
                    Service{sortIcon("serviceType")}
                  </th>
                  <th>Property</th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("projectSize")}
                  >
                    Project $
                    {sortIcon("projectSize")}
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("roi")}
                  >
                    ROI{sortIcon("roi")}
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("paybackMonths")}
                  >
                    Payback{sortIcon("paybackMonths")}
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("annualSavings")}
                  >
                    Total Savings{sortIcon("annualSavings")}
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("createdAt")}
                  >
                    Created{sortIcon("createdAt")}
                  </th>
                  <th>BTU</th>
                  <th style={{ whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((calc) => (
                  <tr key={calc._id}>
                    <td data-label="Name">
                      <strong>{calc.name}</strong>
                      {calc.isPinned && (
                        <Badge bg="secondary" className="ms-1">
                          📌
                        </Badge>
                      )}
                    </td>
                    <td data-label="User">
                      <div>{calc.userId?.name || "—"}</div>
                      <small className="text-muted">
                        {calc.userId?.email || "—"}
                      </small>
                    </td>
                    <td data-label="Service">{calc.serviceType}</td>
                    <td data-label="Property">
                      <Badge bg="light" text="dark">
                        {PROPERTY_LABELS[calc.propertyType] || calc.propertyType}
                      </Badge>
                    </td>
                    <td data-label="Project $">${Number(calc.projectSize).toLocaleString()}</td>
                    <td data-label="ROI">{roiBadge(calc.roi)}</td>
                    <td data-label="Payback">{paybackBadge(calc.paybackMonths)}</td>
                    <td data-label="Total Savings">
                      $
                      {Number(calc.annualSavings || 0).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td data-label="Created">
                      {new Date(calc.createdAt).toLocaleDateString()}
                    </td>
                    <td data-label="BTU" className="text-center">
                      {isBtuSourced(calc) ? (
                        <Badge bg="info">
                          {Number(calc.btuProjectData?.totalBTU || 0).toLocaleString("de-DE")} BTU
                        </Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td data-label="Actions" style={{ whiteSpace: "nowrap" }}>
                      <div className="d-flex gap-1">
                      <Button
                        type="button"
                        className="btn-admin-view"
                        title="View details"
                        onClick={() => handleView(calc)}
                      >
                        <FaEye />
                      </Button>
                      <Button
                        type="button"
                        className="btn-admin-pdf"
                        title="Export PDF"
                        onClick={() => handleExportPDF(calc)}
                      >
                        <FaFilePdf />
                      </Button>
                      <Button
                        type="button"
                        className="btn-admin-delete"
                        title="Delete"
                        onClick={() => handleDelete(calc._id)}
                      >
                        <FaTrash />
                      </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <Pagination className="justify-content-center mt-3">
              <Pagination.First
                disabled={page === 1}
                onClick={() => setPage(1)}
              />
              <Pagination.Prev
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              {[...Array(pages)].map((_, i) => (
                <Pagination.Item
                  key={i + 1}
                  active={page === i + 1}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                disabled={page === pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              />
              <Pagination.Last
                disabled={page === pages}
                onClick={() => setPage(pages)}
              />
            </Pagination>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal
        show={showDetail}
        onHide={() => setShowDetail(false)}
        size="lg"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selected?.name}{" "}
            <small className="text-muted fs-6">
              — {selected?.userId?.name} ({selected?.userId?.email})
            </small>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <>
              {/* Parameters */}
              <h6 className="fw-bold border-bottom pb-1 mb-2">Parameters</h6>
              <Row className="g-1 mb-3">
                {[
                  ["Service Type", selected.serviceType],
                  ["Property Type", PROPERTY_LABELS[selected.propertyType] || selected.propertyType],
                  ["Project Value", `$${Number(selected.projectSize).toLocaleString()}`],
                  ["Installation Time", `${selected.installationTime} days`],
                  ["Team Size", `${selected.teamSize} people`],
                  ["Projects / Month", selected.projectsPerMonth],
                  ["Analysis Period", `${selected.monthsToAnalyze} months`],
                  ["Equipment Age", selected.equipmentAge || "—"],
                ].map(([label, value]) => (
                  <Col xs={6} key={label}>
                    <div className="d-flex justify-content-between border rounded px-2 py-1 bg-light">
                      <small className="text-muted">{label}</small>
                      <small className="fw-bold">{value}</small>
                    </div>
                  </Col>
                ))}
              </Row>

              {/* Results */}
              <h6 className="fw-bold border-bottom pb-1 mb-2">Results</h6>
              <Row className="g-1 mb-3">
                {[
                  ["Savings / Project", `$${Number(selected.savingsPerProject || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`],
                  ["Savings %", `${selected.savingsPercentage}%`],
                  ["Total Savings", `$${Number(selected.annualSavings || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`],
                  ["ROI", `${selected.roi}%`],
                  ["Payback Period", `${selected.paybackMonths} months`],
                ].map(([label, value]) => (
                  <Col xs={6} key={label}>
                    <div className="d-flex justify-content-between border rounded px-2 py-1 bg-light">
                      <small className="text-muted">{label}</small>
                      <small className="fw-bold">{value}</small>
                    </div>
                  </Col>
                ))}
              </Row>

              {/* BTU Project Data */}
              {isBtuSourced(selected) && (
                <>
                  <h6 className="fw-bold border-bottom pb-1 mb-2">BTU Project Data</h6>
                  <Row className="g-1 mb-3">
                    {[
                      ["Total BTU", Number(selected.btuProjectData?.totalBTU || 0).toLocaleString("de-DE") || "—"],
                      ["Rooms", selected.btuProjectData?.numberOfRooms ?? "—"],
                      ["Sq. Footage", selected.btuProjectData?.totalSquareFootage ? `${selected.btuProjectData.totalSquareFootage} m²` : "—"],
                      ["Equipment Cost", `$${Number(selected.btuProjectData?.estimatedProjectCost || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`],
                      ["Install Days", selected.btuProjectData?.estimatedInstallationDays ?? "—"],
                    ].map(([label, value]) => (
                      <Col xs={6} key={label}>
                        <div className="d-flex justify-content-between border rounded px-2 py-1 bg-light">
                          <small className="text-muted">{label}</small>
                          <small className="fw-bold">{value}</small>
                        </div>
                      </Col>
                    ))}
                  </Row>

                  {/* Recommended units */}
                  {selected.btuProjectData?.recommendedUnits?.length > 0 && (
                    <>
                      <h6 className="fw-bold border-bottom pb-1 mb-2">Recommended Units</h6>
                      <Table size="sm" bordered className="mb-3">
                        <thead className="table-light">
                          <tr>
                            <th>Unit</th>
                            <th>BTU</th>
                            <th>Qty</th>
                            <th>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.btuProjectData.recommendedUnits.map((u, i) => (
                            <tr key={i}>
                              <td>{u.name}</td>
                              <td>{Number(u.btu || 0).toLocaleString()}</td>
                              <td>{u.quantity ?? 1}</td>
                              <td>${Number(u.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )}
                </>
              )}

              {/* Description & Tags */}
              {selected.description && (
                <>
                  <h6 className="fw-bold border-bottom pb-1 mb-2">Description</h6>
                  <p className="text-muted small mb-3">{selected.description}</p>
                </>
              )}
              {selected.tags?.length > 0 && (
                <div className="mb-2">
                  {selected.tags.map((t) => (
                    <Badge key={t} bg="secondary" className="me-1">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-muted small mb-0">
                Created:{" "}
                {new Date(selected.createdAt).toLocaleString()}
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-info"
            onClick={() => handleExportPDF(selected)}
          >
            <FaFilePdf className="me-1" /> Export PDF
          </Button>
          <Button variant="secondary" onClick={() => setShowDetail(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      </div>
    </div>
  );
}
