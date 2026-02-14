import { useState, useEffect, useContext, useCallback } from "react";
import { Button, Modal, ListGroup } from "react-bootstrap";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";
import { Store } from "../Store.js";
// import SaveAsPDF from "./SaveAsPDF.jsx";
import "./Sidebar.css";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

// SVG icons
const FaFilePdf = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    width="20"
    height="20"
    fill="currentColor"
    className="me-2 text-primary"
  >
    <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z" />
  </svg>
);

const FaLock = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    width="20"
    height="20"
    fill="currentColor"
    className="ms-2 text-danger"
  >
    <path d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z" />
  </svg>
);

const FaTrash = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    width="20"
    height="20"
    fill="currentColor"
  >
    <path d="M135.2 17.7C140.9 6.8 152.6 0 165.2 0H282.8c12.6 0 24.3 6.8 30 17.7L384 80H448c6.9 0 12.5 5.6 12.5 12.5s-5.6 12.5-12.5 12.5H0C-6.9 105-12.5 99.4-12.5 92.5S-6.9 80 0 80H64L135.2 17.7zM192 256c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v160c0 4.4-3.6 8-8 8h-32c-4.4 0-8-3.6-8-8V256zm-64 0c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v160c0 4.4-3.6 8-8 8h-32c-4.4 0-8-3.6-8-8V256zm192 0c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v160c0 4.4-3.6 8-8 8h-32c-4.4 0-8-3.6-8-8V256zM56.8 208.5c-.3-4.5-4.1-7.8-8.6-7.8H8.6C3.9 200.7 0 204.6 0 209.3s3.9 8.6 8.6 8.6H48.2c4.5 0 8.3-3.3 8.6-7.8z" />
  </svg>
);

/**
 * Draws HVAC elements (ducts and diffusers) on the canvas context.
 * @param {CanvasRenderingContext2D} context - Canvas 2D context to draw on.
 * @param {Object} hvacAnnotations - Object with ducts and diffusers arrays.
 */

const Sidebar = () => {
  const { state } = useContext(Store);
  const token = state?.userInfo?.token || state?.adminInfo?.token;
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [engineerAnnotations, setEngineerAnnotations] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [selectedAnnotations, setSelectedAnnotations] = useState(null);
  const [showHVAC, setShowHVAC] = useState(false);
  const [activeTab, setActiveTab] = useState("my-annotations"); // "my-annotations" or "engineer-reviews"
  // eslint-disable-next-line no-unused-vars
  const [currentPdfType, setCurrentPdfType] = useState(null); // "user" or "engineer"
  const [engineerAnnotationsLoading, setEngineerAnnotationsLoading] =
    useState(false);

  // Determine user role
  const isAdmin = !!state?.adminInfo && !!state?.adminInfo.token;
  const userId = state?.userInfo?._id || state?.adminInfo?._id;

  // const isUser = !!state?.userInfo && !!state?.userInfo.token;

  const fetchSavedPdfs = useCallback(async () => {
    if (!token) {
      setError("User not authenticated.");
      return;
    }

    try {
      setError(null);
      let response;
      response = await fetch("/api/user-annotations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch saved PDFs");
      }
      const data = await response.json();
      const enhancedData = data.map((item) => ({
        ...item,
        pdfUrl: `/annotated-pdf/${item._id}`,
        isPaid: item.isPaid ?? false,
      }));
      setSavedPdfs(enhancedData);
      console.log("Saved PDFs:", enhancedData);
    } catch (err) {
      console.error("Error fetching PDFs:", err);
      setError(err.message || "Error fetching saved PDFs. Please try again.");
    }
  }, [token]);

  const fetchEngineerAnnotations = useCallback(async () => {
    if (!token || !userId) {
      console.log("Missing token or userId for engineer annotations fetch");
      return;
    }

    try {
      setEngineerAnnotationsLoading(true);
      console.log(`Fetching engineer annotations for user: ${userId}`);
      const response = await fetch(`/api/engineer-annotations/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log(
          `Engineer annotations fetch failed: ${response.status}`,
          errorData
        );
        setEngineerAnnotations([]);
        setEngineerAnnotationsLoading(false);
        // Fallback: if a specific user annotation is selected, try fetching by userAnnotationId
        if (selectedPdf?._id) {
          try {
            const fallbackRes = await fetch(
              `/api/engineer-annotations/by-user-annotation/${selectedPdf._id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              console.log(
                "Fallback engineer annotations by userAnnotationId:",
                fallbackData
              );
              setEngineerAnnotations(fallbackData || []);
            }
          } catch (e) {
            console.log("Fallback engineer annotations fetch error:", e);
          }
        }
        return;
      }
      const data = await response.json();
      console.log("Engineer annotations fetched successfully:", data);
      setEngineerAnnotations(data || []);
      setEngineerAnnotationsLoading(false);
    } catch (err) {
      console.error("Error fetching engineer annotations:", err);
      setEngineerAnnotations([]);
      setEngineerAnnotationsLoading(false);
    }
  }, [token, userId, selectedPdf]);
  useEffect(() => {
    if (isOpen) {
      fetchSavedPdfs();
      fetchEngineerAnnotations();
    } else {
      // reset selected PDF and errors when sidebar is closed
      setSelectedPdf(null);
      setSelectedPdfFile(null);
      setSelectedAnnotations(null);
      setError(null);
    }
  }, [isOpen, fetchSavedPdfs, fetchEngineerAnnotations]);

  // Ensure engineer reviews refresh if needed, but data is fetched on open
  // Removed separate useEffect for activeTab to avoid redundant fetches

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const overlayAnnotations = (context, annotations) => {
    const canvasWidth = context.canvas.width;
    const canvasHeight = context.canvas.height;

    // rectangles
    annotations?.rectangles?.forEach((rect) => {
      const x = rect.xPercent * canvasWidth;
      const y = rect.yPercent * canvasHeight;
      const width = rect.widthPercent * canvasWidth;
      const height = rect.heightPercent * canvasHeight;
      const angle = (rect.rotation || 0) * (Math.PI / 180);

      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.beginPath();
      context.rect(0, 0, width, height);
      context.fillStyle = rect.fill || "rgba(20, 205, 230, 0.4)";
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = rect.stroke || "black";
      context.stroke();
      context.restore();
    });

    // lines
    annotations?.lines?.forEach((line) => {
      const lineReductionFactor = 0.985;
      context.beginPath();
      const points = line.points.map((val, idx) =>
        idx % 2 === 0
          ? val * canvasWidth * lineReductionFactor
          : val * canvasHeight * lineReductionFactor
      );
      context.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        context.lineTo(points[i], points[i + 1]);
      }
      context.lineWidth = line.strokeWidth || 2;
      context.strokeStyle = line.stroke || "black";
      context.stroke();
    });

    // comments
    annotations?.comments?.forEach((comment) => {
      const x = comment.xPercent * canvasWidth;
      const y = comment.yPercent * canvasHeight;
      const padding = 6;
      const fontSize = 12;
      const text = comment.text;

      context.font = `bold ${fontSize}px Arial`;
      const textWidth = context.measureText(text).width;
      const textHeight = fontSize;

      context.fillStyle = comment.fill || "rgba(226, 218, 228, 0.3)";
      context.fillRect(
        x - padding,
        y - textHeight - padding,
        textWidth + padding * 2,
        textHeight + padding * 2
      );

      context.strokeStyle = "black";
      context.lineWidth = 1;
      context.strokeRect(
        x - padding,
        y - textHeight - padding,
        textWidth + padding * 2,
        textHeight + padding * 2
      );

      context.fillStyle = comment.textColor || "#FF1493";
      context.fillText(text, x, y);
    });
  };

  const overlayHVAC = (context, hvacAnnotations) => {
    const canvasWidth = context.canvas.width;
    const canvasHeight = context.canvas.height;

    // ducts
    hvacAnnotations?.ducts?.forEach((duct) => {
      const x = duct.xPercent * canvasWidth;
      const y = duct.yPercent * canvasHeight;
      const width = 40;
      const height = 20;
      const angle = (duct.rotation || 0) * (Math.PI / 180);

      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.beginPath();
      context.rect(0, 0, width, height);
      context.fillStyle = "rgba(255, 255, 0, 0.5)"; // semi-transparent yellow
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "orange";
      context.stroke();
      context.restore();
    });

    // diffusers
    hvacAnnotations?.diffusers?.forEach((diffuser) => {
      const x = diffuser.xPercent * canvasWidth;
      const y = diffuser.yPercent * canvasHeight;
      const size = (diffuser.sizePercent || 0.04) * (canvasWidth / 1.5); // match SaveAsPDF default

      context.beginPath();
      context.arc(x, y, size / 2, 0, 2 * Math.PI);
      context.fillStyle = "rgba(0, 255, 0, 0.5)"; // semi-transparent green
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "lime";
      context.stroke();
    });
  };

  // Remove HVAC overlay from rendering
  useEffect(() => {
    if (!selectedAnnotations || !selectedPdfFile) return;

    const container = document.getElementById("pdf-container");
    if (!container) return;

    const overlayCanvas = container.querySelector("canvas:nth-child(2)"); // overlay canvas
    if (!overlayCanvas) return;

    const context = overlayCanvas.getContext("2d");
    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // redraw normal annotations
    overlayAnnotations(context, selectedAnnotations);

    // draw HVAC layer if toggled
    if (showHVAC) {
      overlayHVAC(
        context,
        selectedAnnotations.hvac || { ducts: [], diffusers: [] }
      );
    }
  }, [showHVAC, selectedAnnotations, selectedPdfFile]);

  const viewPdfWithAnnotations = async (pdf) => {
    console.log("Viewing PDF:", pdf);
    if (!token) return setError("User not authenticated.");
    try {
      if (pdf.isPaid) {
        alert("You need to pay to view this PDF with annotations.");
        return;
      }

      setCurrentPdfType("user");
      setSelectedPdf(pdf);
      const pdfResponse = await fetch(`/api/annotated-pdf/${pdf._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pdfResponse.ok)
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
      const pdfBlob = await pdfResponse.blob();
      const pdfFile = new File([pdfBlob], pdf.filename || "untitled.pdf", {
        type: "application/pdf",
      });
      setSelectedPdfFile(pdfFile);

      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      const annotationsResponse = await fetch(`/api/annotations/${pdf._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!annotationsResponse.ok)
        throw new Error(
          `Failed to fetch annotations: ${annotationsResponse.status}`
        );
      const annotationsData = await annotationsResponse.json();
      // Backend may return either the annotations object directly or a wrapper
      // like { annotations, isPaid, acType }. Normalize to annotations object.
      const normalizedAnnotations =
        annotationsData && annotationsData.annotations
          ? annotationsData.annotations
          : annotationsData;
      console.log("Fetched annotations for", pdf._id, normalizedAnnotations);
      setSelectedAnnotations(normalizedAnnotations);

      const container = document.getElementById("pdf-container");
      if (!container) return;
      container.innerHTML = "";

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      container.appendChild(canvas);

      await page.render({ canvasContext: context, viewport }).promise;

      // overlay annotations (use normalizedAnnotations so we always pass
      // the actual annotations object — not a wrapper returned by backend)
      if (normalizedAnnotations) {
        const overlayCanvas = document.createElement("canvas");
        overlayCanvas.width = viewport.width;
        overlayCanvas.height = viewport.height;
        overlayCanvas.style.position = "absolute";
        overlayCanvas.style.top = "0";
        overlayCanvas.style.left = "0";
        overlayCanvas.style.pointerEvents = "none";
        container.style.position = "relative";
        container.appendChild(overlayCanvas);

        const overlayContext = overlayCanvas.getContext("2d");
        // draw the normalized annotations immediately
        overlayAnnotations(overlayContext, normalizedAnnotations);
        // HVAC overlay if enabled
        if (showHVAC) {
          overlayHVAC(
            overlayContext,
            normalizedAnnotations.hvac || { ducts: [], diffusers: [] }
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF. See console for details.");
    }
  };

  const viewEngineerAnnotationPdf = async (engineerAnnotation) => {
    console.log("Viewing engineer annotation:", engineerAnnotation);
    if (!token) return setError("User not authenticated.");
    try {
      setCurrentPdfType("engineer");
      setSelectedPdf(engineerAnnotation);
      const pdfResponse = await fetch(
        `/api/engineer-annotations/annotated-pdf/${engineerAnnotation._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!pdfResponse.ok)
        throw new Error(`Failed to fetch engineer PDF: ${pdfResponse.status}`);
      const pdfBlob = await pdfResponse.blob();
      const pdfFile = new File(
        [pdfBlob],
        engineerAnnotation.filename || "untitled.pdf",
        {
          type: "application/pdf",
        }
      );
      setSelectedPdfFile(pdfFile);

      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      const annotationsResponse = await fetch(
        `/api/engineer-annotations/${engineerAnnotation._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!annotationsResponse.ok)
        throw new Error(
          `Failed to fetch engineer annotations: ${annotationsResponse.status}`
        );
      const annotationsData = await annotationsResponse.json();
      const normalizedAnnotations =
        annotationsData && annotationsData.annotations
          ? annotationsData.annotations
          : annotationsData;
      console.log(
        "Fetched engineer annotations for",
        engineerAnnotation._id,
        normalizedAnnotations
      );
      setSelectedAnnotations(normalizedAnnotations);

      const container = document.getElementById("pdf-container");
      if (!container) return;
      container.innerHTML = "";

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      const scale = 1.5;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        container.appendChild(canvas);

        await page.render({ canvasContext: context, viewport }).promise;

        // overlay annotations only on the first page for now, or adjust as needed
        if (pageNum === 1 && normalizedAnnotations) {
          const overlayCanvas = document.createElement("canvas");
          overlayCanvas.width = viewport.width;
          overlayCanvas.height = viewport.height;
          overlayCanvas.style.position = "absolute";
          overlayCanvas.style.top = `${
            (pageNum - 1) * (viewport.height + 10)
          }px`; // adjust positioning
          overlayCanvas.style.left = "0";
          overlayCanvas.style.pointerEvents = "none";
          container.style.position = "relative";
          container.appendChild(overlayCanvas);

          const overlayContext = overlayCanvas.getContext("2d");
          overlayAnnotations(overlayContext, normalizedAnnotations);
          // HVAC overlay if enabled
          if (showHVAC) {
            overlayHVAC(
              overlayContext,
              normalizedAnnotations.hvac || { ducts: [], diffusers: [] }
            );
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(
        "Failed to load engineer annotation PDF. See console for details."
      );
    }
  };

  const handleDeletePdf = async (pdfId, filename) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    if (!token) return setError("User not authenticated.");

    try {
      const response = await fetch(`/api/annotations/${pdfId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete PDF.");
      }
      toast.success("PDF deleted successfully!");
      setSavedPdfs((prev) => prev.filter((pdf) => pdf._id !== pdfId));
      const container = document.getElementById("pdf-container");
      if (container) container.innerHTML = "";
      setSelectedPdf(null);
      setSelectedPdfFile(null);
      setSelectedAnnotations(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={toggleSidebar}
        className="go-to-btn btn-text w-auto "
      >
        <FaFilePdf /> {isOpen ? "Close Saved PDFs" : "Open Saved PDFs"}
      </Button>

      <Modal
        show={isOpen}
        onHide={toggleSidebar}
        dialogClassName="custom-modal-width"
      >
        <Modal.Body>
          {error && <p className="text-danger">{error}</p>}

          {/* Tab navigation */}
          <div className="d-flex gap-2 mb-3">
            <Button
              variant={
                activeTab === "my-annotations" ? "primary" : "outline-primary"
              }
              className="go-to-btn btn-text w-auto"
              size="sm"
              onClick={() => {
                setActiveTab("my-annotations");
                setSelectedPdf(null);
                setSelectedPdfFile(null);
                setSelectedAnnotations(null);
                setCurrentPdfType(null);
                const container = document.getElementById("pdf-container");
                if (container) container.innerHTML = "";
              }}
            >
              My Annotations
            </Button>
            <Button
              variant={
                activeTab === "engineer-reviews" ? "primary" : "outline-primary"
              }
              size="sm"
              className="go-to-btn btn-text w-auto"
              onClick={() => {
                setActiveTab("engineer-reviews");
                setSelectedPdf(null);
                setSelectedPdfFile(null);
                setSelectedAnnotations(null);
                setCurrentPdfType(null);
                const container = document.getElementById("pdf-container");
                if (container) container.innerHTML = "";
              }}
            >
              Engineer Reviews
            </Button>
          </div>

          <div
            style={{
              width: "100%",
              maxHeight: "70vh",
              border: "1px solid #ccc",
              overflow: "auto",
              marginTop: "1rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
            }}
          >
            {/* MY ANNOTATIONS TAB */}
            {activeTab === "my-annotations" && (
              <>
                {savedPdfs.length > 0 ? (
                  <ListGroup className="w-100">
                    {savedPdfs.map((pdf) => (
                      <ListGroup.Item
                        key={pdf._id}
                        className="d-flex justify-content-between align-items-center pdf-drawing"
                      >
                        <Button
                          variant="btn-outline w-auto"
                          size="sm"
                          onClick={() => viewPdfWithAnnotations(pdf)}
                          disabled={pdf.isPaid}
                          className="p-2 text-left go-to-btn btn-text d-flex align-items-center"
                        >
                          <FaFilePdf />
                          {pdf.filename || "Untitled Document"}
                          {pdf.isPaid && <FaLock />}
                        </Button>
                        <small className="text-muted">
                          Saved: {new Date(pdf.createdAt).toLocaleString()}
                        </small>
                        <div className="d-flex align-items-center">
                          <Button
                            variant="danger"
                            className="p-1 ms-2"
                            onClick={() =>
                              handleDeletePdf(pdf._id, pdf.filename)
                            }
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <p className="text-danger fs-4 text-center mt-4">
                    No saved documents yet.
                  </p>
                )}
              </>
            )}

            {/* ENGINEER REVIEWS TAB (READ-ONLY) */}
            {activeTab === "engineer-reviews" && (
              <>
                {engineerAnnotationsLoading ? (
                  <p className="text-muted fs-4 text-center mt-4">
                    Loading engineer reviews...
                  </p>
                ) : engineerAnnotations.length > 0 ? (
                  <ListGroup className="w-100">
                    {engineerAnnotations.map((annotation) => (
                      <ListGroup.Item
                        key={annotation._id}
                        className="d-flex justify-content-between align-items-center pdf-drawing"
                      >
                        <div className="flex-grow-1">
                          <Button
                            variant="btn-outline w-auto"
                            size="sm"
                            onClick={() =>
                              viewEngineerAnnotationPdf(annotation)
                            }
                            className="p-2 text-left go-to-btn btn-text d-flex align-items-center w-100"
                          >
                            <FaFilePdf />
                            <span className="ms-2">
                              {annotation.filename || "Untitled Document"}
                            </span>
                          </Button>
                          <small className="text-muted d-block mt-1">
                            System: vrf
                            ducted/ductless | Engineer:{" "}
                            {annotation.engineerId?.name || "Unknown"} |
                            Reviewed:{" "}
                            {new Date(annotation.createdAt).toLocaleString()}
                          </small>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <p className="text-info fs-4 text-center mt-4">
                    No engineer reviews yet.
                  </p>
                )}
              </>
            )}

            {/* SaveAsPDF only shown for My Annotations tab (user's own PDFs) */}
             {/* {activeTab === "my-annotations" &&
              selectedPdfFile &&
              currentPdfType === "user" && (
                <SaveAsPDF
                  file={selectedPdfFile}
                  isPaid={selectedPdf?.isPaid}
                  pdfId={selectedPdf?._id}
                  token={token}
                  annotations={selectedAnnotations}
                  annotationType="user"
                />
              )} */}

            {/* SaveAsPDF for Engineer Reviews tab (engineer/admin annotations) */}
            {/* {activeTab === "engineer-reviews" &&
              selectedPdfFile &&
              currentPdfType === "engineer" && (
                <SaveAsPDF
                  file={selectedPdfFile}
                  isPaid={false}
                  pdfId={selectedPdf?._id}
                  token={token}
                  annotations={selectedAnnotations}
                  annotationType="engineer"
                />
              )} */}

            {/* HVAC toggle button and legend for admins/engineers only */}
            {isAdmin && selectedPdfFile && (
              <Button
                variant="outline-primary"
                size="sm"
                className="mb-2"
                onClick={() => setShowHVAC((prev) => !prev)}
              >
                {showHVAC ? "Hide HVAC Layer" : "Show HVAC Layer"}
              </Button>
            )}
            {isAdmin && selectedPdfFile && (
              <div className="mb-2">
                <strong>Legend:</strong>
                <span className="ms-2" style={{ color: "orange" }}>
                  ■ Ducts (Yellow/Orange)
                </span>
                <span className="ms-3" style={{ color: "lime" }}>
                  ● Diffusers (Green/Lime)
                </span>
                <span className="ms-3" style={{ color: "red" }}>
                  — Refrigerant Lines (Red/Blue)
                </span>
              </div>
            )}

            <div
              id="pdf-container"
              style={{ flexGrow: 1, marginTop: "1rem", position: "relative" }}
            ></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="go-to-btn btn-text w-auto"
            variant="btn-outline"
            size="sm"
            onClick={toggleSidebar}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Sidebar;
