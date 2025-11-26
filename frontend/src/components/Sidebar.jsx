import { useState, useEffect, useContext } from "react";
import { Button, Modal, ListGroup } from "react-bootstrap";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";
import { Store } from "../Store.js";
import SaveAsPDF from "./SaveAsPDF.jsx";

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

const Sidebar = () => {
  const { state } = useContext(Store);
  const token = state?.userInfo?.token || state?.adminInfo?.token;
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [selectedAnnotations, setSelectedAnnotations] = useState(null);

  const fetchSavedPdfs = async () => {
    if (!token) return setError("User not authenticated.");
    try {
      setError(null);
      const response = await fetch("/api/user-annotations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch saved PDFs");
      }
      const data = await response.json();
      const enhancedData = data.map((item) => ({
        ...item,
        pdfUrl: `/api/annotations/pdf/${item._id}`,
        isPaid: item.isPaid ?? false,
      }));
      setSavedPdfs(enhancedData);
      console.log("Saved PDFs:", enhancedData);
    } catch (err) {
      console.error(err);
      setError("Error fetching saved PDFs. Please try again.");
    }
  };

  useEffect(() => {
    if (isOpen) fetchSavedPdfs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setSelectedPdf(null);
      setSelectedPdfFile(null);
      setSelectedAnnotations(null);
      setError(null);
    }
  };
  const overlayAnnotations = (context, annotations) => {
    const canvasWidth = context.canvas.width;
    const canvasHeight = context.canvas.height;

    if (annotations?.rectangles) {
      annotations.rectangles.forEach((rect) => {
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
    }

    if (annotations?.lines) {
      const lineReductionFactor = 0.985;
      annotations.lines.forEach((line) => {
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
    }

    if (annotations?.comments) {
      annotations.comments.forEach((comment) => {
        const x = comment.xPercent * canvasWidth;
        const y = comment.yPercent * canvasHeight;
        const padding = 10;
        const fontSize = 17;
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
    }
  };

  const viewPdfWithAnnotations = async (pdf) => {
    if (!token) return setError("User not authenticated.");
    try {
      if (pdf.isPaid) {
        //alert if isPaid===true annotated pdf file renders
        alert("You need to pay to view this PDF with annotations.");
        return;
      }

      setSelectedPdf(pdf);
      const pdfResponse = await fetch(`/api/annotated-pdf/${pdf._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
      }
      const pdfBlob = await pdfResponse.blob();
      const pdfFile = new File([pdfBlob], pdf.filename || "untitled.pdf", {
        type: "application/pdf",
      });
      setSelectedPdfFile(pdfFile);

      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      const annotationsResponse = await fetch(`/api/annotations/${pdf._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!annotationsResponse.ok) {
        throw new Error(
          `Failed to fetch annotations: ${annotationsResponse.status}`
        );
      }
      const annotationsData = await annotationsResponse.json();
      setSelectedAnnotations(annotationsData);
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

      page.render({ canvasContext: context, viewport }).promise.then(() => {
        if (annotationsData) {
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
          overlayAnnotations(overlayContext, annotationsData);
        }
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF. See console for details.");
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
        className="go-to-btn btn-text w-auto"
        size="sm"
        variant="btn-outline"
        onClick={toggleSidebar}
      >
        {isOpen ? "Close Saved PDFs" : "Open Saved PDFs"}
      </Button>

      <Modal
        show={isOpen}
        onHide={toggleSidebar}
        dialogClassName="custom-modal-width"
      >
        <Modal.Header closeButton>
          <Modal.Title>Saved Documents</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <p className="text-danger">{error}</p>}
          <div
            style={{
              width: "100%",
              height: "80vh",

              border: "1px solid #ccc",
              overflow: "auto",
              marginTop: "1rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
            }}
          >
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
                      disabled={pdf.isPaid} // disable if not paid
                      className="p-2 text-left go-to-btn btn-text d-flex align-items-center"
                    >
                      <FaFilePdf />
                      {pdf.filename || "Untitled Document"}
                      {pdf.isPaid && <FaLock />}
                    </Button>
                    <small className=" text-muted">
                      Saved: {new Date(pdf.createdAt).toLocaleString()}
                    </small>
                    <div className="d-flex align-items-center">
                      <Button
                        variant="danger"
                        className="p-1 ms-2"
                        onClick={() => handleDeletePdf(pdf._id, pdf.filename)}
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

            {selectedPdfFile && (
              <SaveAsPDF
                file={selectedPdfFile}
                isPaid={selectedPdf?.isPaid}
                pdfId={selectedPdf?._id}
                token={token}
                annotations={selectedAnnotations}
              />
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
