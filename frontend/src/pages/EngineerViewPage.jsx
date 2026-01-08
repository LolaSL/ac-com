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

  // Draw dotted connection lines from diffusers to the bottom duct
  if (hvacAnnotations?.ducts && hvacAnnotations?.diffusers) {
    // Find the duct with the highest y-center (bottom)
    let mainDuct = null;
    let maxY = -Infinity;
    hvacAnnotations.ducts.forEach((duct) => {
      const ductCenterY =
        duct.yPercent * canvasHeight +
        ((duct.height || 0.04) * canvasHeight) / 2;
      if (ductCenterY > maxY) {
        maxY = ductCenterY;
        mainDuct = duct;
      }
    });
    if (mainDuct) {
      const ductCenterX =
        mainDuct.xPercent * canvasWidth +
        ((mainDuct.width || 0.2) * canvasWidth) / 2;
      const ductCenterY =
        mainDuct.yPercent * canvasHeight +
        ((mainDuct.height || 0.04) * canvasHeight) / 2;
      hvacAnnotations.diffusers.forEach((diffuser) => {
        const dx = diffuser.xPercent * canvasWidth;
        const dy = diffuser.yPercent * canvasHeight;
        context.save();
        context.setLineDash([5, 5]); // dotted line
        context.lineWidth = 2;
        context.strokeStyle = "gray"; // route color for ducts
        context.beginPath();
        context.moveTo(dx, dy);
        context.lineTo(ductCenterX, ductCenterY);
        context.stroke();
        context.restore();
      });
    }
  }
};

const overlayAnnotations = (context, annotations, acType) => {
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

  // For ductless systems, draw refrigerant lines connecting all rectangles to the condenser
  if (
    acType === "ductless" &&
    annotations?.rectangles &&
    annotations.rectangles.length > 1
  ) {
    // Find the condenser: first, check for comments containing "condenser" or "outdoor"
    let condenser = null;
    if (annotations.comments) {
      for (const comment of annotations.comments) {
        if (
          comment.text.toLowerCase().includes("condenser") ||
          comment.text.toLowerCase().includes("outdoor")
        ) {
          // Find the closest rectangle to this comment
          let closestRect = null;
          let minDist = Infinity;
          annotations.rectangles.forEach((rect) => {
            const rectCenterX =
              rect.xPercent * canvasWidth +
              (rect.widthPercent * canvasWidth) / 2;
            const rectCenterY =
              rect.yPercent * canvasHeight +
              (rect.heightPercent * canvasHeight) / 2;
            const dist = Math.sqrt(
              (comment.xPercent * canvasWidth - rectCenterX) ** 2 +
                (comment.yPercent * canvasHeight - rectCenterY) ** 2
            );
            if (dist < minDist) {
              minDist = dist;
              closestRect = rect;
            }
          });
          if (closestRect) {
            condenser = closestRect;
            break;
          }
        }
      }
    }
    // If no labeled condenser, assume the largest area
    if (!condenser) {
      let maxArea = -Infinity;
      annotations.rectangles.forEach((rect) => {
        const area = rect.widthPercent * rect.heightPercent;
        if (area > maxArea) {
          maxArea = area;
          condenser = rect;
        }
      });
    }
    if (condenser) {
      const cx =
        condenser.xPercent * canvasWidth +
        (condenser.widthPercent * canvasWidth) / 2;
      const cy =
        condenser.yPercent * canvasHeight +
        (condenser.heightPercent * canvasHeight) / 2;
      annotations.rectangles.forEach((rect) => {
        if (rect !== condenser) {
          const rx =
            rect.xPercent * canvasWidth + (rect.widthPercent * canvasWidth) / 2;
          const ry =
            rect.yPercent * canvasHeight +
            (rect.heightPercent * canvasHeight) / 2;
          context.save();
          context.setLineDash([5, 5]);
          context.lineWidth = 2;
          context.strokeStyle = "blue"; // refrigerant line color
          context.beginPath();
          context.moveTo(rx, ry);
          context.lineTo(cx, cy);
          context.stroke();
          context.restore();
        }
      });
    }
  }
};

const EngineerViewPage = () => {
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
  const [acType, setAcType] = useState("ducted"); // 'ducted' | 'ductless'
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
      overlayAnnotations(overlayContext, annotation, acType);
      if (showHVAC && annotation.hvac && acType === "ducted") {
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
        }

        setAddMode(null);
      };
    };
    renderOverlays();
  }, [pdfFile, annotation, showHVAC, addMode, acType]);

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
        <label className="me-2">AC Type:</label>
        <select value={acType} onChange={(e) => setAcType(e.target.value)}>
          <option value="ducted">Ducted</option>
          <option value="ductless">Ductless</option>
        </select>
      </div>
  <div className="mb-2 d-flex flex-wrap align-items-center gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
        {acType === "ducted" && (
          <>
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
          </>
        )}
        {acType === "ductless" && (
          <p className="text-muted">
            Ductless system: No ducts or diffusers needed. Use separate units
            per room.
          </p>
          
        )}
{acType !== "ductless" && (
  <Button
    variant="secondary"
    onClick={() => {
      if (!annotation?.hvac) {
        setAddMode(null);
        return;
      }

      setAnnotation((prev) => {
        if (!prev?.hvac) return prev;

        const ducts = [...(prev.hvac.ducts || [])];
        const diffusers = [...(prev.hvac.diffusers || [])];

        const allItems = [
          ...ducts.map((d) => ({ ...d, type: "duct" })),
          ...diffusers.map((d) => ({ ...d, type: "diffuser" })),
        ];

        if (allItems.length === 0) return prev;

        const mostRecent = allItems.reduce((max, item) => {
          const maxTime = parseInt(max.id.split("-")[1]);
          const itemTime = parseInt(item.id.split("-")[1]);
          return itemTime > maxTime ? item : max;
        });

        if (mostRecent.type === "duct") {
          const index = ducts.findIndex((d) => d.id === mostRecent.id);
          if (index !== -1) ducts.splice(index, 1);
        }

        if (mostRecent.type === "diffuser") {
          const index = diffusers.findIndex(
            (d) => d.id === mostRecent.id
          );
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

      setAddMode(null);
    }}
  >
    Cancel
  </Button>
)}


        <Button onClick={handleSave} variant="primary" className="ms-3">
          Save HVAC Items
          </Button>
          
      {acType === "ducted" && (
        <>
          <Button
         variant="primary" className="ms-3"
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
        </>
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
          <div >
            <SaveAsPDF
              file={pdfFile}
              isPaid={annotation.isPaid}
              pdfId={id}
              token={token}
              annotations={annotation}
              acType={acType}
            />
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default EngineerViewPage;
