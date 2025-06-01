

import { useState, useEffect } from "react";
import { Button, Modal, ListGroup } from "react-bootstrap";
// import { PDFDocument } from "pdf-lib";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

const Sidebar = () => {
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
//  const canvasRef = useRef(null);
//   const [file, setFile] = useState(null);
//  const stageRef = useRef(null);
//  const [ setIsSaved] = useState(false); 
  useEffect(() => {
    fetchSavedPdfs();
  }, []);
  
const fetchSavedPdfs = async () => {
  try {
    setError(null);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    const token = userInfo?.token;

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

      // Enhance with download/view URLs
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
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      const token = userInfo?.token;

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
        `Are you sure you want to delete "${
          filename || "this document"
        }"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setSuccessMessage(null);
      setError(null);
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      const token = userInfo?.token;

      if (!token) {
        setError("Authentication token not found. Please log in.");
        return;
      }

      const response = await fetch(`/api/${pdfId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccessMessage("PDF deleted successfully!");
        setSavedPdfs((prev) => prev.filter((pdf) => pdf._id !== pdfId));
        const container = document.getElementById("pdf-container");
        if (container) container.innerHTML = "";
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to delete PDF.");
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
        const padding = 4;
        const fontSize = 14;
        context.font = `${fontSize}px Arial`;
        const textWidth = context.measureText(comment.text).width;

        context.fillStyle = comment.fill || "rgba(226, 218, 228, 0.3)";
        context.fillRect(
          x - padding,
          y - fontSize - padding,
          textWidth + padding * 2,
          fontSize + padding * 2
        );
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = comment.textColor || "#FF1493";
        context.fillText(comment.text, x, y);
      });
    }

    const drawGlobe = (x, y, radius) => {
      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.strokeStyle = "#00008B";
      context.lineWidth = 1.5;
      context.stroke();

      context.strokeStyle = "#808080";
      context.lineWidth = 0.5;
      const numParallels = 2;
      for (let i = 1; i <= numParallels; i++) {
        const yOffset = (i / (numParallels + 1)) * radius * 0.7;
        context.beginPath();
        context.arc(x, y, radius - yOffset, 0, 2 * Math.PI);
        context.stroke();
        context.beginPath();
        context.arc(x, y, radius + yOffset, 0, 2 * Math.PI);
        context.stroke();
      }

      const numMeridians = 4;
      for (let i = 0; i < numMeridians; i++) {
        const angle = (i / numMeridians) * 2 * Math.PI;
        context.beginPath();
        context.ellipse(x, y, radius * 0.35, radius * 0.7, angle, 0, Math.PI);
        context.stroke();
        context.beginPath();
        context.ellipse(
          x,
          y,
          radius * 0.35,
          radius * 0.7,
          angle + Math.PI,
          0,
          Math.PI
        );
        context.stroke();
      }

      context.beginPath();
      context.arc(x, y, radius * 0.7, 0, 2 * Math.PI);
      context.stroke();
      context.beginPath();
      context.moveTo(x - radius * 0.5, y);
      context.lineTo(x + radius * 0.5, y);
      context.stroke();
    };

    const isSaved = true; 
    if (isSaved) {
      const text = "APPROVED";
      const subText = "AC-COMMERCE";
      const padding = 12;
      const fontSize = 17;
      const subFontSize = 13;
      const globeRadius = 20;
      const globeMarginRight = 20;
      const outerLineWidth = 2;

      context.font = `bold ${fontSize}px Arial`;
      const textMetrics = context.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;

      context.font = `normal ${subFontSize}px Arial`;
      const subTextMetrics = context.measureText(subText);
      const subTextWidth = subTextMetrics.width;
      const subTextHeight = subFontSize;

      const totalTextWidth = Math.max(textWidth, subTextWidth);
      const totalContentWidth =
        globeRadius * 2 + globeMarginRight + totalTextWidth;
      const totalHeight = Math.max(globeRadius * 2, textHeight + subTextHeight);
      const outerWidth = totalContentWidth + 2 * padding;
      const outerHeight = totalHeight + 2 * padding;

      const rectX = context.canvas.width - outerWidth - 40;
      const rectY = 80;

      const globeX = rectX + padding + globeRadius;
      const globeY = rectY + padding + globeRadius;

      const textX = globeX + globeRadius + globeMarginRight;
      const textY = rectY + padding + textHeight;
      const subTextX = textX;
      const subTextY = textY + subFontSize;

      context.strokeStyle = "#00008B";
      context.lineWidth = outerLineWidth;
      context.strokeRect(rectX, rectY, outerWidth, outerHeight);

      context.fillStyle = "rgba(252, 252, 243, 0.2)";
      context.fillRect(rectX, rectY, outerWidth, outerHeight);

      drawGlobe(context, globeX, globeY, globeRadius);

      context.fillStyle = "#00008B";
      context.font = `bold ${fontSize}px Arial`;
      context.fillText(text, textX, textY);

      context.fillStyle = "#00008B";
      context.font = `normal ${subFontSize}px Arial`;
      context.fillText(subText, subTextX, subTextY + 5);

      context.setLineDash([]);
    }
    const renderSignature = () => {
      if (isSaved) {
        const text = "APPROVED";
        const subText = "AC-COMMERCE";
        const padding = 12;
        const fontSize = 17;
        const subFontSize = 13;
        const globeRadius = 20;
        const globeMarginRight = 20;
        const outerLineWidth = 2;

        context.font = `bold ${fontSize}px Arial`;
        const textMetrics = context.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        context.font = `normal ${subFontSize}px Arial`;
        const subTextMetrics = context.measureText(subText);
        const subTextWidth = subTextMetrics.width;
        const subTextHeight = subFontSize;

        const totalTextWidth = Math.max(textWidth, subTextWidth);
        const totalContentWidth =
          globeRadius * 2 + globeMarginRight + totalTextWidth;
        const totalHeight = Math.max(
          globeRadius * 2,
          textHeight + subTextHeight
        );
        const outerWidth = totalContentWidth + 2 * padding;
        const outerHeight = totalHeight + 2 * padding;

        const rectX = context.canvas.width - outerWidth - 40;
        const rectY = 80;

        const globeX = rectX + padding + globeRadius;
        const globeY = rectY + padding + globeRadius;

        const textX = globeX + globeRadius + globeMarginRight;
        const textY = rectY + padding + textHeight;
        const subTextX = textX;
        const subTextY = textY + subFontSize;

        context.strokeStyle = "#00008B";
        context.lineWidth = outerLineWidth;
        context.strokeRect(rectX, rectY, outerWidth, outerHeight);

        context.fillStyle = "rgba(252, 252, 243, 0.2)";
        context.fillRect(rectX, rectY, outerWidth, outerHeight);

        drawGlobe(globeX, globeY, globeRadius);

        context.fillStyle = "#00008B";
        context.font = `bold ${fontSize}px Arial`;
        context.fillText(text, textX, textY);

        context.fillStyle = "#00008B";
        context.font = `normal ${subFontSize}px Arial`;
        context.fillText(subText, subTextX, subTextY + 5);

        context.setLineDash([]);
      }
    };

    renderSignature();
  };


//   const saveAsPDF = async () => {
// if (!file || file.type !== "application/pdf") {
//   alert("The selected file is not a PDF.");
//   return;
// }
//     if (file && file.type === "application/pdf") {
//       const arrayBuffer = await file.arrayBuffer();
//       const pdfDoc = await PDFDocument.load(arrayBuffer);
//       const page = pdfDoc.getPages()[0];
//       const { width, height } = page.getSize();
//       const pdfCanvas = canvasRef.current;
//       const stage = stageRef.current;

//       if (pdfCanvas && stage) {
//         const tempCanvas = document.createElement("canvas");
//         tempCanvas.width = width;
//         tempCanvas.height = height;
//         const tempContext = tempCanvas.getContext("2d");
//         tempContext.drawImage(pdfCanvas, 0, 0, width, height);
//         stage.draw();

//         const layer = stage.getChildren()[0];

//         if (layer) {
//           tempContext.drawImage(layer.getCanvas()._canvas, 0, 0, width, height);
//         }

//         const imageData = tempCanvas.toDataURL();
//         const pngImage = await pdfDoc.embedPng(imageData);

//         page.drawImage(pngImage, { x: 0, y: 0, width, height });

//         const pdfBytes = await pdfDoc.save();
//         const blob = new Blob([pdfBytes], { type: "application/pdf" });
//         const link = document.createElement("a");
//         link.href = URL.createObjectURL(blob);
//         link.download = "annotated-pdf.pdf";
//         link.click();
//         setIsSaved(true);
//              setFile(null);
//       }

//     } else {
//       alert("The selected file is not a PDF.");
//     }
//   };
  return (
    <>
      <Button className="sidebar-toggle" onClick={toggleSidebar}>
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
                    className="d-flex justify-content-between align-items-center"
                  >
                    <Button
                      variant="links"
                      onClick={() =>
                        viewPdfWithAnnotations(pdf._id, pdf.filename)
                      }
                      className="p-2 text-left"
                    >
                      {pdf.filename || "Untitled Document"}
                    </Button>
                    <small className="text-muted">
            Saved: {new Date(pdf.createdAt).toLocaleString()}
                    </small>
                    
                    <Button
                      variant="danger"
                      className="p-2 me-2"
                      onClick={() => handleDeletePdf(pdf._id, pdf.filename)}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
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
          <Button variant="secondary" onClick={toggleSidebar}>
            Close
          </Button>
          {/* <Button variant="secondary" onClick={saveAsPDF}>
            Save As PDF
          </Button> */}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Sidebar;
