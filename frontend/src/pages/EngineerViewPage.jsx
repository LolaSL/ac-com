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

const overlayHVAC = (context, hvacAnnotations, symbolImages, comments) => {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  const getNearestCommentText = (x, y, comments) => {
    if (!comments) return null;
    let nearest = null;
    let minDist = Infinity;
    comments.forEach((comment) => {
      const cx = comment.xPercent * canvasWidth;
      const cy = comment.yPercent * canvasHeight;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = comment;
      }
    });
    return nearest ? nearest.text.toLowerCase() : null;
  };
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

  // Draw dotted connection lines from diffusers to nearest ducts, preferring matching groups
  if (hvacAnnotations?.ducts && hvacAnnotations?.diffusers) {
    hvacAnnotations.diffusers.forEach((diffuser) => {
      const dx = diffuser.xPercent * canvasWidth;
      const dy = diffuser.yPercent * canvasHeight;
      const diffuserGroup = getNearestCommentText(dx, dy, comments);
      let nearestDuct = null;
      let minDist = Infinity;
      // First, try to find a duct with matching group
      hvacAnnotations.ducts.forEach((duct) => {
        const ductCenterX =
          duct.xPercent * canvasWidth + ((duct.width || 0.2) * canvasWidth) / 2;
        const ductCenterY =
          duct.yPercent * canvasHeight +
          ((duct.height || 0.04) * canvasHeight) / 2;
        const ductGroup = getNearestCommentText(
          ductCenterX,
          ductCenterY,
          comments
        );
        if (diffuserGroup && ductGroup === diffuserGroup) {
          const dist = Math.sqrt(
            (dx - ductCenterX) ** 2 + (dy - ductCenterY) ** 2
          );
          if (dist < minDist) {
            minDist = dist;
            nearestDuct = { x: ductCenterX, y: ductCenterY };
          }
        }
      });
      // If no matching group duct, find nearest overall
      if (!nearestDuct) {
        hvacAnnotations.ducts.forEach((duct) => {
          const ductCenterX =
            duct.xPercent * canvasWidth +
            ((duct.width || 0.2) * canvasWidth) / 2;
          const ductCenterY =
            duct.yPercent * canvasHeight +
            ((duct.height || 0.04) * canvasHeight) / 2;
          const dist = Math.sqrt(
            (dx - ductCenterX) ** 2 + (dy - ductCenterY) ** 2
          );
          if (dist < minDist) {
            minDist = dist;
            nearestDuct = { x: ductCenterX, y: ductCenterY };
          }
        });
      }
      if (nearestDuct) {
        context.save();
        context.setLineDash([5, 5]); // dotted line
        context.lineWidth = 2;
        context.strokeStyle = "gray"; // relevant color for routes
        context.beginPath();
        context.moveTo(dx, dy);
        context.lineTo(nearestDuct.x, nearestDuct.y);
        context.stroke();
        context.restore();
      }
    });
  }
};

const overlayAnnotations = (context, annotations, acType) => {
  console.log("overlayAnnotations called with annotations:", annotations);
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

  // For ductless systems, draw refrigerant lines connecting rectangles to their nearest condenser
  if (
    acType === "ductless" &&
    annotations?.rectangles &&
    annotations.rectangles.length > 1
  ) {
    // Find condensers: rectangles with nearby comments containing "condenser" or "outdoor"
    let condensers = [];
    if (annotations.comments) {
      annotations.comments.forEach((comment) => {
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
          if (closestRect && !condensers.includes(closestRect)) {
            condensers.push(closestRect);
          }
        }
      });
    }
    // If no labeled condensers, assume the largest area rectangle is the condenser
    if (condensers.length === 0) {
      let maxArea = -Infinity;
      let largestRect = null;
      annotations.rectangles.forEach((rect) => {
        const area = rect.widthPercent * rect.heightPercent;
        if (area > maxArea) {
          maxArea = area;
          largestRect = rect;
        }
      });
      if (largestRect) {
        condensers.push(largestRect);
      }
    }
    // Now, for each rectangle not a condenser, connect to the nearest condenser
    annotations.rectangles.forEach((rect) => {
      if (!condensers.includes(rect)) {
        let nearestCondenser = null;
        let minDist = Infinity;
        condensers.forEach((cond) => {
          const cx =
            cond.xPercent * canvasWidth + (cond.widthPercent * canvasWidth) / 2;
          const cy =
            cond.yPercent * canvasHeight +
            (cond.heightPercent * canvasHeight) / 2;
          const rx =
            rect.xPercent * canvasWidth + (rect.widthPercent * canvasWidth) / 2;
          const ry =
            rect.yPercent * canvasHeight +
            (rect.heightPercent * canvasHeight) / 2;
          const dist = Math.sqrt((rx - cx) ** 2 + (ry - cy) ** 2);
          if (dist < minDist) {
            minDist = dist;
            nearestCondenser = cond;
          }
        });
        if (nearestCondenser) {
          const cx =
            nearestCondenser.xPercent * canvasWidth +
            (nearestCondenser.widthPercent * canvasWidth) / 2;
          const cy =
            nearestCondenser.yPercent * canvasHeight +
            (nearestCondenser.heightPercent * canvasHeight) / 2;
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
      }
    });
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
        console.log("Fetched annotation data:", data);
        setAnnotation(data);
        setAcType(data.acType || "ducted");
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
      overlayAnnotations(overlayContext, annotation.annotations, acType);
      if (showHVAC && annotation.annotations.hvac && acType === "ducted") {
        overlayHVAC(
          overlayContext,
          annotation.annotations.hvac,
          hvacSymbols,
          annotation.annotations.comments
        );
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
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [] }),
                ducts: [...(prev.annotations?.hvac?.ducts || []), newDuct],
                diffusers: prev.annotations?.hvac?.diffusers || [],
              },
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
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [] }),
                ducts: prev.annotations?.hvac?.ducts || [],
                diffusers: [
                  ...(prev.annotations?.hvac?.diffusers || []),
                  newDiffuser,
                ],
              },
            },
          }));
        }

        if (addMode === "comment") {
          const text = prompt("Enter comment text:");
          if (text) {
            const newComment = {
              id: `comment-${Date.now()}`,
              xPercent: x,
              yPercent: y,
              text: text,
              fill: "rgba(252, 252, 243, 0.2)",
              textColor: "#FF1493",
            };

            setAnnotation((prev) => ({
              ...prev,
              annotations: {
                ...(prev.annotations || {}),
                comments: [...(prev.annotations?.comments || []), newComment],
              },
            }));
          }
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
      body: JSON.stringify({ ...annotation, acType }),
    });
    alert("Annotation (including HVAC) saved!");
  };

  return (
    <div className="container mt-4">
      <h2 className="mt-4 mb-4">Engineer View: Annotated Drawing</h2>
      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="mb-2 mt-4 d-flex align-items-center gap-2">
        <label className="me-2 mb-4">AC Type:</label>
        <select value={acType} onChange={(e) => setAcType(e.target.value)}>
          <option value="ducted">Ducted</option>
          <option value="ductless">Ductless</option>
        </select>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        {acType === "ducted" && (
          <>
            <Button
              className="btn btn-outline-primary me-2"
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
              <Button
                onClick={() => setAddMode("comment")}
                variant="warning"
                className="me-2"
              >
                Add Comment
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
                if (!annotation?.annotations?.hvac) {
                  setAddMode(null);
                  return;
                }

                setAnnotation((prev) => {
                  if (!prev?.annotations?.hvac) return prev;

                  const ducts = [...(prev.annotations.hvac.ducts || [])];
                  const diffusers = [
                    ...(prev.annotations.hvac.diffusers || []),
                  ];

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
                    const index = ducts.findIndex(
                      (d) => d.id === mostRecent.id
                    );
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
                    annotations: {
                      ...(prev.annotations || {}),
                      hvac: {
                        ...(prev.annotations.hvac || {}),
                        ducts,
                        diffusers,
                      },
                    },
                  };
                });

                setAddMode(null);
              }}
            >
              Cancel
            </Button>
          )}

          <Button onClick={handleSave} variant="primary" className="me-2">
            Save HVAC Items
          </Button>
        </div>

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
            annotations={annotation.annotations}
            acType={acType}
          />
        )}
      </div>
    </div>
  );
};

export default EngineerViewPage;
