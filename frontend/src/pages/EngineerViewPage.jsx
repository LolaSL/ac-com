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

/**
 * Overlay VRF System on canvas
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} vrfAnnotations - VRF system data (outdoor/indoor units)
 * @param {Object} symbolImages - HVAC symbol images
 * @param {string} acType - System type ('vrf-ducted' or 'vrf-ductless')
 *
 * Line Visualization:
 * - VRF-Ducted: Dual parallel lines (red supply + blue return, dashed)
 * - VRF-Ductless: Single solid teal line (direct refrigerant connection)
 */
const overlayVRFSystem = (context, vrfAnnotations, symbolImages, acType) => {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  // Draw outdoor condenser units
  vrfAnnotations?.outdoorUnits?.forEach((unit) => {
    const x = unit.xPercent * canvasWidth;
    const y = unit.yPercent * canvasHeight;
    const size = (unit.sizePercent || 0.12) * canvasWidth;

    // Draw outdoor unit as larger rectangle
    context.save();
    context.translate(x, y);
    context.beginPath();
    context.rect(-size / 2, -size / 2, size, size);
    context.fillStyle = "rgba(200, 100, 100, 0.4)"; // reddish for outdoor
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = "red";
    context.stroke();
    context.font = "bold 12px Arial";
    context.fillStyle = "black";
    context.textAlign = "center";
    context.fillText("Condenser", 0, 5);
    context.restore();

    // Draw outdoor unit SVG if available
    if (symbolImages.outdoor) {
      const img = new window.Image();
      img.src = symbolImages.outdoor;
      img.onload = () => {
        context.save();
        context.translate(x, y);
        context.drawImage(img, -size / 2, -size / 2, size, size);
        context.restore();
      };
    }

    // Draw capacity label if available
    if (unit.capacity) {
      context.save();
      context.font = "10px Arial";
      context.fillStyle = "darkred";
      context.fillText(`${unit.capacity} BTU`, x, y + size / 2 + 15);
      context.restore();
    }
  });

  // Draw indoor units (for VRF systems)
  vrfAnnotations?.indoorUnits?.forEach((unit) => {
    const x = unit.xPercent * canvasWidth;
    const y = unit.yPercent * canvasHeight;
    const size = (unit.sizePercent || 0.08) * canvasWidth;

    context.save();
    context.translate(x, y);
    context.beginPath();
    context.rect(-size / 2, -size / 2, size, size);
    context.fillStyle = "rgba(100, 150, 255, 0.4)"; // bluish for indoor
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = "blue";
    context.stroke();
    context.font = "10px Arial";
    context.fillStyle = "black";
    context.textAlign = "center";
    context.fillText(unit.roomName || "Unit", 0, 3);
    context.restore();

    // Draw indoor unit SVG if available
    if (symbolImages.indoor) {
      const img = new window.Image();
      img.src = symbolImages.indoor;
      img.onload = () => {
        context.save();
        context.translate(x, y);
        context.drawImage(img, -size / 2, -size / 2, size, size);
        context.restore();
      };
    }
  });

  // Draw refrigerant lines connecting outdoor to indoor units
  if (vrfAnnotations?.outdoorUnits && vrfAnnotations?.indoorUnits) {
    vrfAnnotations.outdoorUnits.forEach((outdoor) => {
      const outX = outdoor.xPercent * canvasWidth;
      const outY = outdoor.yPercent * canvasHeight;

      if (acType === "vrf-ductless") {
        // VRF-Ductless: Star topology - direct connection from outdoor to each indoor
        vrfAnnotations.indoorUnits.forEach((indoor) => {
          const inX = indoor.xPercent * canvasWidth;
          const inY = indoor.yPercent * canvasHeight;

          context.save();
          context.setLineDash([]); // solid line
          context.lineWidth = 2.5;
          context.strokeStyle = "#008B8B"; // teal/dark cyan
          context.beginPath();
          context.moveTo(outX, outY);
          context.lineTo(inX, inY);
          context.stroke();
          context.restore();
        });
      } else {
        // VRF-Ducted: Sequential chain - AC1→AC2→AC3→...→Outdoor
        const indoorUnits = vrfAnnotations.indoorUnits;

        // Draw chain connections between indoor units
        for (let i = 0; i < indoorUnits.length - 1; i++) {
          const x1 = indoorUnits[i].xPercent * canvasWidth;
          const y1 = indoorUnits[i].yPercent * canvasHeight;
          const x2 = indoorUnits[i + 1].xPercent * canvasWidth;
          const y2 = indoorUnits[i + 1].yPercent * canvasHeight;

          const offset = 3;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const perpX = (-dy / length) * offset;
          const perpY = (dx / length) * offset;

          // Supply line (red, dashed)
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "red";
          context.beginPath();
          context.moveTo(x1 + perpX, y1 + perpY);
          context.lineTo(x2 + perpX, y2 + perpY);
          context.stroke();
          context.restore();

          // Return line (blue, dashed)
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "#0066FF";
          context.beginPath();
          context.moveTo(x1 - perpX, y1 - perpY);
          context.lineTo(x2 - perpX, y2 - perpY);
          context.stroke();
          context.restore();
        }

        // Connect last indoor unit to outdoor condenser
        if (indoorUnits.length > 0) {
          const lastIndoor = indoorUnits[indoorUnits.length - 1];
          const lastX = lastIndoor.xPercent * canvasWidth;
          const lastY = lastIndoor.yPercent * canvasHeight;

          const offset = 3;
          const dx = outX - lastX;
          const dy = outY - lastY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const perpX = (-dy / length) * offset;
          const perpY = (dx / length) * offset;

          // Supply line to outdoor
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "red";
          context.beginPath();
          context.moveTo(lastX + perpX, lastY + perpY);
          context.lineTo(outX + perpX, outY + perpY);
          context.stroke();
          context.restore();

          // Return line from outdoor
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "#0066FF";
          context.beginPath();
          context.moveTo(lastX - perpX, lastY - perpY);
          context.lineTo(outX - perpX, outY - perpY);
          context.stroke();
          context.restore();
        }
      }
    });
  }
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
    // Find condensers: prefer explicit `isCondenser` flags, then comment matches, then largest rectangle fallback
    let condensers = [];

    // 1) explicit flag
    annotations.rectangles.forEach((rect) => {
      if (rect.isCondenser) condensers.push(rect);
    });

    // 2) comment-based matching using simple synonyms if no explicit flags
    const synonyms = [
      "condenser",
      "outdoor",
      "outdoor unit",
      "outdoor-unit",
      "compressor",
      "outside unit",
      "heat pump",
    ];
    const normalizeText = (s) =>
      (s || "")
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .trim();

    if (condensers.length === 0 && annotations.comments) {
      annotations.comments.forEach((comment) => {
        const t = normalizeText(comment.text);
        for (const syn of synonyms) {
          const re = new RegExp(
            "\\b" + syn.replace(/[-]/g, "\\-") + "\\b",
            "i"
          );
          if (re.test(t)) {
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
            break;
          }
        }
      });
    }

    // 3) largest rectangle fallback
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
    // Draw visible label for condensers
    condensers.forEach((cond) => {
      const cx =
        cond.xPercent * canvasWidth + (cond.widthPercent * canvasWidth) / 2;
      const cy =
        cond.yPercent * canvasHeight + (cond.heightPercent * canvasHeight) / 2;
      context.save();
      context.fillStyle = "black";
      context.font = "bold 14px Arial";
      context.fillText("", cx + 8, cy - 8);
      context.restore();
    });
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
  // { type: "duct" | "diffuser" | "indoor" | "outdoor", id: string }
  const { id } = useParams();
  const { state } = useContext(Store);
  const token = state?.adminInfo?.token;
  const [annotation, setAnnotation] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHVAC, setShowHVAC] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'duct' | 'diffuser' | 'indoor' | 'outdoor' | null
  const [acType, setAcType] = useState("ducted"); // 'ducted' | 'ductless' | 'vrf-ducted' | 'vrf-ductless'
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
      if (showHVAC && annotation.annotations.vrf && acType.startsWith("vrf")) {
        overlayVRFSystem(
          overlayContext,
          annotation.annotations.vrf,
          hvacSymbols,
          acType
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

        if (addMode === "outdoor") {
          const capacity = prompt("Enter outdoor unit capacity (e.g., 48000):");
          if (capacity) {
            const newOutdoorUnit = {
              id: `outdoor-${Date.now()}`,
              xPercent: x,
              yPercent: y,
              sizePercent: 0.12,
              capacity: parseInt(capacity) || 48000,
              unitsConnected: 0,
            };

            setAnnotation((prev) => ({
              ...prev,
              annotations: {
                ...(prev.annotations || {}),
                vrf: {
                  ...(prev.annotations?.vrf || {
                    outdoorUnits: [],
                    indoorUnits: [],
                  }),
                  outdoorUnits: [
                    ...(prev.annotations?.vrf?.outdoorUnits || []),
                    newOutdoorUnit,
                  ],
                  indoorUnits: prev.annotations?.vrf?.indoorUnits || [],
                },
              },
            }));
          }
        }

        if (addMode === "indoor") {
          const roomName = prompt("Enter room/zone name (e.g., Living Room):");
          if (roomName) {
            const newIndoorUnit = {
              id: `indoor-${Date.now()}`,
              xPercent: x,
              yPercent: y,
              sizePercent: 0.08,
              roomName: roomName,
              capacity: 12000,
            };

            setAnnotation((prev) => ({
              ...prev,
              annotations: {
                ...(prev.annotations || {}),
                vrf: {
                  ...(prev.annotations?.vrf || {
                    outdoorUnits: [],
                    indoorUnits: [],
                  }),
                  outdoorUnits: prev.annotations?.vrf?.outdoorUnits || [],
                  indoorUnits: [
                    ...(prev.annotations?.vrf?.indoorUnits || []),
                    newIndoorUnit,
                  ],
                },
              },
            }));
          }
        }

        if (addMode === "markCondenser") {
          // Find nearest rectangle and toggle its isCondenser flag
          if (!annotation?.annotations?.rectangles) {
            setAddMode(null);
            return;
          }

          let nearest = null;
          let minDist = Infinity;
          annotation.annotations.rectangles.forEach((r) => {
            const rx = r.xPercent;
            const ry = r.yPercent;
            const dx = x - rx;
            const dy = y - ry;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              nearest = r;
            }
          });

          // threshold (in normalized coords) to avoid accidental picks
          if (nearest && minDist < 0.08) {
            setAnnotation((prev) => {
              if (!prev?.annotations?.rectangles) return prev;
              const rects = prev.annotations.rectangles.map((r) =>
                r.id === nearest.id ? { ...r, isCondenser: !r.isCondenser } : r
              );
              return {
                ...prev,
                annotations: {
                  ...(prev.annotations || {}),
                  rectangles: rects,
                },
              };
            });
          } else {
            alert(
              "No rectangle near click — try clicking closer to a rectangle."
            );
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
          <option value="ducted">Minisplit - Ducted</option>
          <option value="ductless">Minisplit - Ductless</option>
          <option value="vrf-ducted">VRF System - Ducted</option>
          <option value="vrf-ductless">VRF System - Ductless</option>
        </select>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <>
            <Button
              className="btn btn-outline-primary me-2"
              onClick={() => setShowHVAC((prev) => !prev)}
            >
              {showHVAC ? "Hide HVAC Layer" : "Show HVAC Layer"}
            </Button>
            {showHVAC && acType === "ducted" && (
              <div className="mb-2">
                <strong>Legend (Minisplit):</strong>
                <span className="ms-2" style={{ color: "orange" }}>
                  ■ Ducts (Yellow/Orange)
                </span>
                <span className="ms-3" style={{ color: "lime" }}>
                  ● Diffusers (Green/Lime)
                </span>
              </div>
            )}
            {showHVAC && acType === "vrf-ducted" && (
              <div className="mb-2">
                <strong>Legend (VRF Ducted):</strong>
                <span className="ms-2" style={{ color: "red" }}>
                  ■ Outdoor Condenser (Red)
                </span>
                <span className="ms-3" style={{ color: "blue" }}>
                  ■ Indoor Units (Blue) - Ducted
                </span>
                <span className="ms-3" style={{ color: "red" }}>
                  ── Supply Line (Red Dashed)
                </span>
                <span className="ms-3" style={{ color: "#0066FF" }}>
                  ── Return Line (Blue Dashed)
                </span>
              </div>
            )}
            {showHVAC && acType === "vrf-ductless" && (
              <div className="mb-2">
                <strong>Legend (VRF Ductless):</strong>
                <span className="ms-2" style={{ color: "red" }}>
                  ■ Outdoor Condenser (Red)
                </span>
                <span className="ms-3" style={{ color: "blue" }}>
                  ■ Indoor Units (Blue) - Ductless/Mini-split
                </span>
                <span className="ms-3" style={{ color: "#008B8B" }}>
                  ━━ Refrigerant Line (Teal Solid)
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
          {acType === "vrf-ducted" && (
            <>
              <Button
                onClick={() => setAddMode("outdoor")}
                variant="danger"
                className="me-2"
              >
                Add VRF Condenser (Outdoor)
              </Button>
              <Button
                onClick={() => setAddMode("indoor")}
                variant="primary"
                className="me-2"
              >
                Add VRF Indoor Unit (Ducted)
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
          {acType === "vrf-ductless" && (
            <>
              <Button
                onClick={() => setAddMode("outdoor")}
                variant="danger"
                className="me-2"
              >
                Add VRF Condenser (Outdoor)
              </Button>
              <Button
                onClick={() => setAddMode("indoor")}
                variant="info"
                className="me-2"
              >
                Add VRF Indoor Unit (Ductless)
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
          {(acType === "ducted" || acType === "vrf-ducted") && (
            <Button
              variant="secondary"
              onClick={() => {
                if (
                  !annotation?.annotations?.hvac &&
                  !annotation?.annotations?.vrf
                ) {
                  setAddMode(null);
                  return;
                }

                setAnnotation((prev) => {
                  let allItems = [];

                  // Handle minisplit ducts and diffusers
                  if (prev?.annotations?.hvac) {
                    const ducts = [...(prev.annotations.hvac.ducts || [])];
                    const diffusers = [
                      ...(prev.annotations.hvac.diffusers || []),
                    ];
                    allItems.push(
                      ...ducts.map((d) => ({
                        ...d,
                        type: "duct",
                        subType: "hvac",
                      })),
                      ...diffusers.map((d) => ({
                        ...d,
                        type: "diffuser",
                        subType: "hvac",
                      }))
                    );
                  }

                  // Handle VRF units
                  if (prev?.annotations?.vrf && acType.startsWith("vrf")) {
                    const outdoorUnits = [
                      ...(prev.annotations.vrf.outdoorUnits || []),
                    ];
                    const indoorUnits = [
                      ...(prev.annotations.vrf.indoorUnits || []),
                    ];
                    allItems.push(
                      ...outdoorUnits.map((d) => ({
                        ...d,
                        type: "outdoor",
                        subType: "vrf",
                      })),
                      ...indoorUnits.map((d) => ({
                        ...d,
                        type: "indoor",
                        subType: "vrf",
                      }))
                    );
                  }

                  if (allItems.length === 0) return prev;

                  const mostRecent = allItems.reduce((max, item) => {
                    const maxTime = parseInt(max.id.split("-")[1]);
                    const itemTime = parseInt(item.id.split("-")[1]);
                    return itemTime > maxTime ? item : max;
                  });

                  // Remove minisplit ducts/diffusers
                  if (mostRecent.subType === "hvac") {
                    const hvac = { ...prev.annotations.hvac };
                    if (mostRecent.type === "duct") {
                      hvac.ducts = hvac.ducts.filter(
                        (d) => d.id !== mostRecent.id
                      );
                    }
                    if (mostRecent.type === "diffuser") {
                      hvac.diffusers = hvac.diffusers.filter(
                        (d) => d.id !== mostRecent.id
                      );
                    }
                    return {
                      ...prev,
                      annotations: {
                        ...(prev.annotations || {}),
                        hvac,
                      },
                    };
                  }

                  // Remove VRF units
                  if (mostRecent.subType === "vrf") {
                    const vrf = { ...prev.annotations.vrf };
                    if (mostRecent.type === "outdoor") {
                      vrf.outdoorUnits = vrf.outdoorUnits.filter(
                        (d) => d.id !== mostRecent.id
                      );
                    }
                    if (mostRecent.type === "indoor") {
                      vrf.indoorUnits = vrf.indoorUnits.filter(
                        (d) => d.id !== mostRecent.id
                      );
                    }
                    return {
                      ...prev,
                      annotations: {
                        ...(prev.annotations || {}),
                        vrf,
                      },
                    };
                  }

                  return prev;
                });

                setAddMode(null);
              }}
            >
              Undo Last
            </Button>
          )}

          <Button onClick={handleSave} variant="primary" className="me-2">
            Save HVAC Items
          </Button>
          {/* <Button
            onClick={() => setAddMode("markCondenser")}
            variant="dark"
            className="me-2"
          >
            Mark/Unmark Condenser
          </Button> */}
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
