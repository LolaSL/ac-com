import { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { Spinner, Alert, Button } from "react-bootstrap";
import { Store } from "../Store.js";
import SaveAsPDF from "../components/SaveAsPDF.jsx";
import supplySVG from "../assets/hvac/supply.svg";
import returnSVG from "../assets/hvac/return.svg";
import ductSVG from "../assets/hvac/duct.svg";
import indoorSVG from "../assets/hvac/indoor.svg";
import outdoorSVG from "../assets/hvac/outdoor.svg";
import thermostatSVG from "../assets/hvac/thermostat.svg";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

const hvacSymbols = {
  supply: supplySVG,
  return: returnSVG,
  duct: ductSVG,
  indoor: indoorSVG,
  outdoor: outdoorSVG,
  thermostat: thermostatSVG,
};

const overlayHVAC = (context, hvacAnnotations, symbolImages) => {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;
  // ducts
  hvacAnnotations?.ducts?.forEach((duct) => {
    const x = duct.xPercent * canvasWidth;
    const y = duct.yPercent * canvasHeight;
    const width = (duct.width || 0.2) * canvasWidth;
    const height = (duct.height || 0.04) * canvasHeight;
    context.save();
    context.translate(x, y);
    context.beginPath();
    context.rect(0, 0, width, height);
    context.fillStyle = duct.fill || "rgba(0,120,255,0.3)";
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = duct.stroke || "blue";
    context.stroke();
    context.restore();
    // Draw duct SVG if available
    if (symbolImages.duct) {
      const img = new window.Image();
      img.src = symbolImages.duct;
      img.onload = () => {
        context.save();
        context.translate(x, y);
        context.drawImage(img, -15, -15, 30, 30);
        context.restore();
      };
    }
  });
  // diffusers
  hvacAnnotations?.diffusers?.forEach((diffuser) => {
    const x = diffuser.xPercent * canvasWidth;
    const y = diffuser.yPercent * canvasHeight;
    const size = (diffuser.sizePercent || 0.08) * canvasWidth;
    context.beginPath();
    if (diffuser.shape === "square") {
      context.rect(x - size / 2, y - size / 2, size, size);
    } else {
      context.arc(x, y, size / 2, 0, 2 * Math.PI);
    }
    context.fillStyle = "rgba(0, 255, 0, 0.5)";
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = "lime";
    context.stroke();
    // Draw diffuser SVG if available
    if (symbolImages.supply) {
      const img = new window.Image();
      img.src = symbolImages.supply;
      img.onload = () => {
        context.save();
        context.translate(x, y);
        context.drawImage(img, -size / 2, -size / 2, size, size);
        context.restore();
      };
    }
  });
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
};

const EngineerViewPage = () => {
  const [lastHVACItem, setLastHVACItem] = useState(null);
  // { type: "duct" | "diffuser", id: string }
  const { id } = useParams();
  const { state } = useContext(Store);
  const token = state?.adminInfo?.token;
  const [annotation, setAnnotation] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHVAC, setShowHVAC] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'duct' | 'diffuser' | null
  const pdfContainerRef = useRef(null);

  // Fetch and render PDF + annotations
  // Fetch annotation and PDF only once (on mount or id/token change)
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError("Admin not authenticated.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch annotation data
        const response = await fetch(`/api/annotations/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch annotation");
        const data = await response.json();
        setAnnotation(data);
        // Fetch PDF file
        const pdfResponse = await fetch(`/api/annotated-pdf/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pdfResponse.ok) throw new Error("Failed to fetch PDF");
        const pdfBlob = await pdfResponse.blob();
        setPdfFile(
          new File([pdfBlob], data.filename || "untitled.pdf", {
            type: "application/pdf",
          })
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  // Redraw overlays whenever annotation, showHVAC, or addMode changes
  useEffect(() => {
    const renderOverlays = async () => {
      if (!pdfFile || !annotation) return;
      const pdfUrl = window.URL.createObjectURL(pdfFile);
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const container = pdfContainerRef.current;
      if (!container) return;
      container.innerHTML = "";
      // Main PDF canvas
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      container.appendChild(canvas);
      await page.render({ canvasContext: context, viewport }).promise;
      // Overlay canvas for annotations and HVAC
      const overlayCanvas = document.createElement("canvas");
      overlayCanvas.width = viewport.width;
      overlayCanvas.height = viewport.height;
      overlayCanvas.style.position = "absolute";
      overlayCanvas.style.top = "0";
      overlayCanvas.style.left = "0";
      overlayCanvas.style.pointerEvents = addMode ? "auto" : "none";
      container.style.position = "relative";
      container.appendChild(overlayCanvas);
      const overlayContext = overlayCanvas.getContext("2d");
      overlayAnnotations(overlayContext, annotation);
      if (showHVAC && annotation.hvac) {
        overlayHVAC(overlayContext, annotation.hvac, hvacSymbols);
      }
      // Add click handler for interactive placement
      overlayCanvas.onclick = (e) => {
        if (!addMode) {
          e.stopPropagation();
          return;
        }

        const rect = overlayCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / overlayCanvas.width;
        const y = (e.clientY - rect.top) / overlayCanvas.height;

        if (addMode === "duct") {
          const newDuct = {
            id: `duct-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            width: 0.2,
            height: 0.04,
            fill: "rgba(0,120,255,0.3)",
            stroke: "blue",
          };

          setAnnotation((prev) => ({
            ...prev,
            hvac: {
              ...(prev?.hvac || { ducts: [], diffusers: [] }),
              ducts: [...(prev?.hvac?.ducts || []), newDuct],
              diffusers: prev?.hvac?.diffusers || [],
            },
          }));

          setLastHVACItem({ type: "duct", id: newDuct.id });
        }

        if (addMode === "diffuser") {
          const newDiffuser = {
            id: `diffuser-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            sizePercent: 0.08,
            shape: "circle",
            airflow: 100,
          };

          setAnnotation((prev) => ({
            ...prev,
            hvac: {
              ...(prev?.hvac || { ducts: [], diffusers: [] }),
              ducts: prev?.hvac?.ducts || [],
              diffusers: [...(prev?.hvac?.diffusers || []), newDiffuser],
            },
          }));

          setLastHVACItem({ type: "diffuser", id: newDiffuser.id });
        }

        setAddMode(null);
      };
    };
    renderOverlays();
  }, [pdfFile, annotation, showHVAC, addMode]);

  // Save handler (save full annotation, not just hvac)
  const handleSave = async () => {
    if (!annotation) return;
    await fetch(`/api/annotations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(annotation),
    });
    alert("Annotation (including HVAC) saved!");
  };

  return (
    <div className="container mt-4">
      <h2>Engineer View: Annotated Drawing</h2>
      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="mb-2">
        <Button
          onClick={() => setAddMode("duct")}
          variant="info"
          className="me-2"
        >
          Add Duct
        </Button>
        <Button
          onClick={() => setAddMode("diffuser")}
          variant="success"
          className="me-2"
        >
          Add Diffuser
        </Button>
<Button
  variant="secondary"
  onClick={() => {
    if (!lastHVACItem || !annotation?.hvac) {
      setAddMode(null);
      return;
    }

    setAnnotation((prev) => {
      if (!prev?.hvac) return prev;

      const ducts = [...(prev.hvac.ducts || [])];
      const diffusers = [...(prev.hvac.diffusers || [])];

      if (lastHVACItem.type === "duct") {
        const index = ducts.findIndex(d => d.id === lastHVACItem.id);
        if (index !== -1) ducts.splice(index, 1);
      }

      if (lastHVACItem.type === "diffuser") {
        const index = diffusers.findIndex(d => d.id === lastHVACItem.id);
        if (index !== -1) diffusers.splice(index, 1);
      }

      return {
        ...prev,
        hvac: {
          ...prev.hvac,
          ducts,
          diffusers,
        },
      };
    });

    setLastHVACItem(null);
    setAddMode(null);
  }}
>
  Cancel
</Button>

        <Button onClick={handleSave} variant="primary" className="ms-3">
          Save HVAC Items
        </Button>
      </div>
      <Button
        className="btn btn-outline-primary mb-2"
        onClick={() => setShowHVAC((prev) => !prev)}
      >
        {showHVAC ? "Hide HVAC Layer" : "Show HVAC Layer"}
      </Button>
      {showHVAC && (
        <div className="mb-2">
          <strong>Legend:</strong>
          <span className="ms-2" style={{ color: "orange" }}>
            ■ Ducts (Yellow/Orange)
          </span>
          <span className="ms-3" style={{ color: "lime" }}>
            ● Diffusers (Green/Lime)
          </span>
        </div>
      )}
      <div
        ref={pdfContainerRef}
        id="pdf-container"
        style={{
          width: "100%",
          minHeight: 400,
          margin: "2rem 0",
          position: "relative",
        }}
      ></div>
      {annotation && pdfFile && (
        <SaveAsPDF
          file={pdfFile}
          isPaid={annotation.isPaid}
          pdfId={id}
          token={token}
          annotations={annotation}
        />
      )}
    </div>
  );
};

export default EngineerViewPage;
