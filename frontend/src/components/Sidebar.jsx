import { useState, useEffect, useContext } from "react";
import { Button, Modal, ListGroup } from "react-bootstrap";
import { toast } from "react-toastify";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist";
import { Store } from "../Store";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

const Sidebar = () => {
  const { state } = useContext(Store);
  const token = state?.userInfo?.token || state?.adminInfo?.token;

  const [savedPdfs, setSavedPdfs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchSavedPdfs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSavedPdfs = async () => {
    try {
      setError(null);
      if (!token) {
        console.warn("User not authenticated, skipping fetch.");
        return;
      }

      const response = await fetch("/api/user-annotations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        const enhancedData = data.map((item) => ({
          ...item,
          pdfUrl: `/api/annotations/pdf/${item._id}`,
        }));

        setSavedPdfs(enhancedData);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to fetch saved PDFs.");
      }
    } catch (error) {
      console.error("Error fetching saved PDFs:", error);
      setError("Error fetching saved PDFs. Please try again.");
    }
  };

  const toggleSidebar = () => {
    if (!isOpen) {
      fetchSavedPdfs();
    }
    setIsOpen(!isOpen);
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
    }
  };

  const viewPdfWithAnnotations = async (pdfId) => {
    try {
      if (!token) {
        console.error("Authentication token not found.");
        return;
      }

      const pdfResponse = await fetch(`/api/annotated-pdf/${pdfId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!pdfResponse.ok) {
        console.error(
          `Failed to fetch PDF with ID ${pdfId}:`,
          pdfResponse.status
        );
        return;
      }

      const pdfBlob = await pdfResponse.blob();
      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      const annotationsResponse = await fetch(`/api/annotations/${pdfId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!annotationsResponse.ok) {
        console.error(
          `Failed to fetch annotations for PDF ID ${pdfId}:`,
          annotationsResponse.status
        );
        window.URL.revokeObjectURL(pdfUrl);
        return;
      }

      const annotationsData = await annotationsResponse.json();
      renderPdfWithAnnotations(pdfUrl, annotationsData);
    } catch (error) {
      console.error(
        `Error viewing PDF with annotations for ID ${pdfId}:`,
        error
      );
    }
  };

  const handleDeletePdf = async (pdfId, filename) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${filename || "this document"}"?`
      )
    ) {
      return;
    }

    try {
      setSuccessMessage(null);
      setError(null);
      if (!token) {
        setError("Authentication token not found. Please log in.");
        return;
      }

      const response = await fetch(`/api/annotations/${pdfId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("PDF deleted successfully!");
        setSavedPdfs((prev) => prev.filter((pdf) => pdf._id !== pdfId));
        const container = document.getElementById("pdf-container");
        if (container) container.innerHTML = "";
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete PDF.");
      }
    } catch (error) {
      setError("Error deleting PDF. Please try again.");
    }
  };

  const renderPdfWithAnnotations = (pdfUrl, annotations) => {
    const container = document.getElementById("pdf-container");
    if (!container) return;
    container.innerHTML = "";

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then((pdf) => {
      pdf.getPage(1).then((page) => {
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        container.appendChild(canvas);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        page.render(renderContext).promise.then(() => {
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
          overlayAnnotations(overlayContext, annotations);
        });
      });
    });
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

        const angle = rect.rotation % 360;
        const normalizedRotation = angle === 90 || angle === -270 ? 90 : 0;
        const rotationAngle = normalizedRotation * (Math.PI / 180);

        const rotatedWidth = normalizedRotation === 90 ? height : width;
        const rotatedHeight = normalizedRotation === 90 ? width : height;

        const centerX = x + rotatedWidth / 2;
        const centerY = y + rotatedHeight / 2;

        context.save();
        context.translate(centerX, centerY);
        context.rotate(rotationAngle);

        context.beginPath();
        context.rect(-width / 2, -height / 2, width, height);
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

  return (
    <>
      <Button
        className="go-to-btn btn-text me-2 my-2"
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
          {successMessage && <p className="text-success">{successMessage}</p>}
          <div
            style={{
              width: "100%",
              height: "80vh",
              border: "1px solid #ccc",
              overflow: "auto",
              marginTop: "1rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "left",
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
                      variant="btn-outline"
                      onClick={() =>
                        viewPdfWithAnnotations(pdf._id, pdf.filename)
                      }
                      className="p-2 text-left go-to-btn btn-text"
                    >
                      {pdf.filename || "Untitled Document"}
                    </Button>
                    <small className="text-muted">
                      Saved: {new Date(pdf.createdAt).toLocaleString()}
                    </small>
                    <div className="d-flex align-items-center">
                      <Button
                        variant="danger"
                        className="p-1"
                        onClick={() => handleDeletePdf(pdf._id, pdf.filename)}
                      >
                        <i className="fas fa-trash"></i>
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
            <div
              id="pdf-container"
              style={{ flexGrow: 1, marginTop: "1rem" }}
            ></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="go-to-btn btn-text"
            variant="btn-outline"
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
