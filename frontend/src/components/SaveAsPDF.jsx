import { useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

/**
 * Draw VRF System annotations on PDF canvas
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} vrfAnnotations - VRF system data (outdoor/indoor units)
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {string} acType - System type ('vrf-ducted' or 'vrf-ductless')
 *
 * Line Visualization:
 * - VRF-Ducted: Dual parallel lines (red supply + blue return, dashed)
 * - VRF-Ductless: Single solid teal line (direct refrigerant connection)
 */
const drawVRFAnnotations = (
  context,
  vrfAnnotations,
  canvasWidth,
  canvasHeight,
  acType
) => {
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

// This component now receives the 'annotations' object as a prop
function SaveAsPDF({
  file,
  isPaid,
  pdfId,
  token,
  annotations,
  acType,
  annotationType = "user",
  userId,
}) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const drawAnnotations = (context, annotations, viewport, acType) => {
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

    // Draw user annotations (rectangles, lines, comments) - these are always shown
    // as they contain engineer/admin notes and system descriptions
    // Rectangles: condenser, AC units, and other system components
    if (annotations?.rectangles) {
      annotations.rectangles.forEach((rect) => {
        const x = rect.xPercent * canvasWidth;
        const y = rect.yPercent * canvasHeight;
        const width = rect.widthPercent * canvasWidth;
        const height = rect.heightPercent * canvasHeight;

        context.save();
        context.translate(x, y);
        context.rotate((rect.rotation || 0) * (Math.PI / 180));
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

    // Skip lines in ducted modes since we auto-generate refrigerant lines
    // (to avoid rendering old daisy-chain lines that interfere with star topology)
    if (acType !== "ducted" && acType !== "vrf-ducted" && annotations?.lines) {
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

    // Draw all user comments (engineer/admin annotations) - filter by acType
    if (annotations?.comments) {
      annotations.comments.forEach((comment) => {
        // Only render comment if it matches current acType or has no acType (legacy comments)
        if (comment.acType && comment.acType !== acType) {
          return; // Skip this comment
        }

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

    // For minisplit ducted systems, draw blue dashed refrigerant lines connecting AC units to condenser
    // Star topology: Condenser connects directly to each AC1, AC2, AC3, etc.
    if (
      acType === "ducted" &&
      annotations?.rectangles &&
      annotations.rectangles.length > 1
    ) {
      // Find condenser: prefer explicit flag, then look for smallest rectangle (outdoor condenser is typically small)
      let condenser = null;

      // 1) explicit flag
      annotations.rectangles.forEach((rect) => {
        if (rect.isCondenser) condenser = rect;
      });

      // 2) find by comment if marked as "condenser"
      if (!condenser && annotations.comments) {
        const condenserComments = annotations.comments.filter((c) =>
          c.text.toLowerCase().includes("condenser")
        );
        if (condenserComments.length > 0) {
          const condenserComment = condenserComments[0];
          const closestRect = annotations.rectangles.reduce((closest, rect) => {
            const rectCx =
              rect.xPercent * canvasWidth +
              (rect.widthPercent * canvasWidth) / 2;
            const rectCy =
              rect.yPercent * canvasHeight +
              (rect.heightPercent * canvasHeight) / 2;
            const dist = Math.sqrt(
              (condenserComment.xPercent * canvasWidth - rectCx) ** 2 +
                (condenserComment.yPercent * canvasHeight - rectCy) ** 2
            );
            const closestDist = Math.sqrt(
              (condenserComment.xPercent * canvasWidth -
                (closest.xPercent * canvasWidth +
                  (closest.widthPercent * canvasWidth) / 2)) **
                2 +
                (condenserComment.yPercent * canvasHeight -
                  (closest.yPercent * canvasHeight +
                    (closest.heightPercent * canvasHeight) / 2)) **
                  2
            );
            return dist < closestDist ? rect : closest;
          });
          condenser = closestRect;
        }
      }

      // 3) smallest rectangle fallback (outdoor condenser is typically compact)
      if (!condenser) {
        let minArea = Infinity;
        annotations.rectangles.forEach((rect) => {
          const area = rect.widthPercent * rect.heightPercent;
          if (area > 0 && area < minArea) {
            minArea = area;
            condenser = rect;
          }
        });
      }

      if (condenser) {
        // Get all non-condenser rectangles (indoor AC units)
        const indoorUnits = annotations.rectangles.filter(
          (rect) => rect !== condenser && !rect.isCondenser
        );

        // Draw blue dashed refrigerant lines from condenser to each indoor unit (star topology)
        const condX =
          condenser.xPercent * canvasWidth +
          (condenser.widthPercent * canvasWidth) / 2;
        const condY =
          condenser.yPercent * canvasHeight +
          (condenser.heightPercent * canvasHeight) / 2;

        indoorUnits.forEach((unit) => {
          const unitX =
            unit.xPercent * canvasWidth + (unit.widthPercent * canvasWidth) / 2;
          const unitY =
            unit.yPercent * canvasHeight +
            (unit.heightPercent * canvasHeight) / 2;

          context.save();
          context.setLineDash([5, 5]); // dashed line
          context.lineWidth = 2;
          context.strokeStyle = "blue"; // blue refrigerant line
          context.beginPath();
          context.moveTo(condX, condY);
          context.lineTo(unitX, unitY);
          context.stroke();
          context.restore();
        });
      }
    }

    // For ductless systems, draw refrigerant lines connecting rectangles to their nearest condenser
    if (
      acType === "ductless" &&
      annotations?.rectangles &&
      annotations.rectangles.length > 1
    ) {
      // Find condensers: prefer explicit `isCondenser` flags, then comment matches, then largest rectangle fallback
      let condensers = [];

      // 1) explicit flags
      annotations.rectangles.forEach((rect) => {
        if (rect.isCondenser) condensers.push(rect);
      });

      // 2) comment-based matching using synonyms
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
        if (largestRect) condensers.push(largestRect);
      }

      // Draw visible label for condensers on the PDF canvas — skip if a matching user comment is nearby
      const isCondenserComment = (text) => {
        const syns = [
          "condenser",
          "outdoor",
          "outdoor unit",
          "outdoor-unit",
          "compressor",
          "outside unit",
          "heat pump",
        ];
        const t = (text || "").toLowerCase();
        return syns.some((syn) =>
          new RegExp("\\b" + syn.replace(/[-]/g, "\\-") + "\\b", "i").test(t)
        );
      };

      const findNearbyCondenserComment = (cond) => {
        if (!annotations.comments) return null;
        const cx =
          cond.xPercent * canvasWidth + (cond.widthPercent * canvasWidth) / 2;
        const cy =
          cond.yPercent * canvasHeight +
          (cond.heightPercent * canvasHeight) / 2;
        const pxThreshold = 40;
        let best = null;
        let bestDist = Infinity;
        annotations.comments.forEach((c) => {
          if (!isCondenserComment(c.text)) return;
          const x = c.xPercent * canvasWidth;
          const y = c.yPercent * canvasHeight;
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bestDist && dist <= pxThreshold) {
            bestDist = dist;
            best = c;
          }
        });
        return best;
      };

      condensers.forEach((cond) => {
        const matchingComment = findNearbyCondenserComment(cond);
        const cx =
          cond.xPercent * canvasWidth + (cond.widthPercent * canvasWidth) / 2;
        const cy =
          cond.yPercent * canvasHeight +
          (cond.heightPercent * canvasHeight) / 2;
        context.save();
        context.fillStyle = "black";
        context.font = "bold 14px Arial";
        const labelText = matchingComment ? matchingComment.text : "";
        context.fillText(labelText, cx + 8, cy - 8);
        context.restore();
      });
      // Now, for each rectangle not a condenser, connect to the nearest condenser
      annotations.rectangles.forEach((rect) => {
        if (!condensers.includes(rect)) {
          let nearestCondenser = null;
          let minDist = Infinity;
          condensers.forEach((cond) => {
            const cx =
              cond.xPercent * canvasWidth +
              (cond.widthPercent * canvasWidth) / 2;
            const cy =
              cond.yPercent * canvasHeight +
              (cond.heightPercent * canvasHeight) / 2;
            const rx =
              rect.xPercent * canvasWidth +
              (rect.widthPercent * canvasWidth) / 2;
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
              rect.xPercent * canvasWidth +
              (rect.widthPercent * canvasWidth) / 2;
            const ry =
              rect.yPercent * canvasHeight +
              (rect.heightPercent * canvasHeight) / 2;
            context.save();
            context.setLineDash([5, 5]); // dotted line for minisplit ductless
            context.lineWidth = 2;
            context.strokeStyle = "blue"; // blue refrigerant line for minisplit ductless
            context.beginPath();
            context.moveTo(rx, ry);
            context.lineTo(cx, cy);
            context.stroke();
            context.restore();
          }
        }
      });
    }

    // For VRF ductless systems, draw teal refrigerant lines connecting rectangles to their nearest condenser
    if (
      acType === "vrf-ductless" &&
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
        if (largestRect) condensers.push(largestRect);
      }

      // Now, for each rectangle not a condenser, connect to the nearest condenser with teal refrigerant line
      annotations.rectangles.forEach((rect) => {
        if (!condensers.includes(rect)) {
          let nearestCondenser = null;
          let minDist = Infinity;
          condensers.forEach((cond) => {
            const cx =
              cond.xPercent * canvasWidth +
              (cond.widthPercent * canvasWidth) / 2;
            const cy =
              cond.yPercent * canvasHeight +
              (cond.heightPercent * canvasHeight) / 2;
            const rx =
              rect.xPercent * canvasWidth +
              (rect.widthPercent * canvasWidth) / 2;
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
              rect.xPercent * canvasWidth +
              (rect.widthPercent * canvasWidth) / 2;
            const ry =
              rect.yPercent * canvasHeight +
              (rect.heightPercent * canvasHeight) / 2;
            context.save();
            context.setLineDash([]); // solid line for VRF ductless
            context.lineWidth = 2.5;
            context.strokeStyle = "#008B8B"; // teal/dark cyan for VRF ductless refrigerant
            context.beginPath();
            context.moveTo(rx, ry);
            context.lineTo(cx, cy);
            context.stroke();
            context.restore();
          }
        }
      });
    }

    // For VRF ducted systems, draw red/blue dashed supply/return lines between user rectangles
    // Uses sequential chain topology: Rect1→Rect2→Rect3→...→Condenser (largest rectangle)
    if (
      acType === "vrf-ducted" &&
      annotations?.rectangles &&
      annotations.rectangles.length > 1
    ) {
      // Find condenser by comment text "condenser"
      let condenser = null;
      if (annotations.comments) {
        const condenserComment = annotations.comments.find((c) =>
          c.text.toLowerCase().includes("condenser")
        );
        if (condenserComment) {
          condenser = annotations.rectangles.find(
            (r) => r.id === condenserComment.rectId
          );
        }
      }
      // Fallback to largest if no comment
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
        // Get all non-condenser rectangles and sort by comment text number (e.g., "ac-1" -> 1)
        const indoorRects = annotations.rectangles
          .filter((rect) => rect !== condenser && !rect.isCondenser)
          .sort((a, b) => {
            const getNum = (rect) => {
              if (!annotations.comments) return 0;
              const comment = annotations.comments.find(
                (c) => c.rectId === rect.id
              );
              if (comment) {
                const match = comment.text.match(/ac-(\d+)/i);
                return match ? parseInt(match[1]) : 0;
              }
              return 0;
            };
            return getNum(a) - getNum(b);
          });

        // Draw chain connections between rectangles
        for (let i = 0; i < indoorRects.length - 1; i++) {
          const x1 = indoorRects[i].xPercent * canvasWidth;
          const y1 = indoorRects[i].yPercent * canvasHeight;
          const x2 = indoorRects[i + 1].xPercent * canvasWidth;
          const y2 = indoorRects[i + 1].yPercent * canvasHeight;

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

        // Connect last rectangle to condenser
        if (indoorRects.length > 0) {
          const lastIndoor = indoorRects[indoorRects.length - 1];
          const lastX = lastIndoor.xPercent * canvasWidth;
          const lastY = lastIndoor.yPercent * canvasHeight;
          const condX = condenser.xPercent * canvasWidth;
          const condY = condenser.yPercent * canvasHeight;

          const offset = 3;
          const dx = condX - lastX;
          const dy = condY - lastY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const perpX = (-dy / length) * offset;
          const perpY = (dx / length) * offset;

          // Supply line to condenser
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "red";
          context.beginPath();
          context.moveTo(lastX + perpX, lastY + perpY);
          context.lineTo(condX + perpX, condY + perpY);
          context.stroke();
          context.restore();

          // Return line from condenser
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "#0066FF";
          context.beginPath();
          context.moveTo(lastX - perpX, lastY - perpY);
          context.lineTo(condX - perpX, condY - perpY);
          context.stroke();
          context.restore();
        }
      }
    }

    // Draw HVAC annotations - ONLY for ducted minisplit systems
    // VRF and ductless systems should NOT show ducts/diffusers
    if (acType === "ducted" && annotations?.hvac?.ducts) {
      annotations.hvac.ducts.forEach((duct) => {
        const x = duct.xPercent * canvasWidth;
        const y = duct.yPercent * canvasHeight;
        const width = (duct.width || 0.1) * canvasWidth;
        const height = (duct.height || 0.02) * canvasHeight;
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
      });
    }

    // Only show diffusers in ducted minisplit mode, NOT in ductless or VRF modes
    if (acType === "ducted" && annotations?.hvac?.diffusers) {
      annotations.hvac.diffusers.forEach((diffuser) => {
        const x = diffuser.xPercent * canvasWidth;
        const y = diffuser.yPercent * canvasHeight;
        const size = (diffuser.sizePercent || 0.04) * canvasWidth;
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
      });
    }

    // Draw dotted connection lines from diffusers to nearest ducts, preferring matching groups
    if (
      acType === "ducted" &&
      annotations?.hvac?.ducts &&
      annotations?.hvac?.diffusers
    ) {
      annotations.hvac.diffusers.forEach((diffuser) => {
        const dx = diffuser.xPercent * canvasWidth;
        const dy = diffuser.yPercent * canvasHeight;
        const diffuserGroup = getNearestCommentText(
          dx,
          dy,
          annotations.comments
        );
        let nearestDuct = null;
        let minDist = Infinity;
        // First, try to find a duct with matching group
        annotations.hvac.ducts.forEach((duct) => {
          const ductCenterX =
            duct.xPercent * canvasWidth +
            ((duct.width || 0.2) * canvasWidth) / 2;
          const ductCenterY =
            duct.yPercent * canvasHeight +
            ((duct.height || 0.04) * canvasHeight) / 2;
          const ductGroup = getNearestCommentText(
            ductCenterX,
            ductCenterY,
            annotations.comments
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
          annotations.hvac.ducts.forEach((duct) => {
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

    // Draw VRF system annotations (outdoor condenser + indoor units + refrigerant lines)
    // VRF systems are standalone - do NOT render minisplit ducts/diffusers
    if (acType.startsWith("vrf") && annotations?.vrf) {
      drawVRFAnnotations(
        context,
        annotations.vrf,
        canvasWidth,
        canvasHeight,
        acType
      );

      // NOTE: VRF systems use their own indoor units, not minisplit ductwork
      // Indoor units handle air distribution internally (ducted) or directly (ductless)
      // Ductwork visualization is NOT needed in PDF as it's internal to each unit
    }
  };

  const saveAsPDF = async () => {
    setError(null);
    setIsSaved(false);

    // Only allow saving user-type or engineer-type annotations
    if (annotationType !== "user" && annotationType !== "engineer") {
      setError("Only user or engineer annotations can be saved.");
      return;
    }

    if (!pdfId || !token) {
      setError("Missing PDF ID or authentication token.");
      return;
    }

    if (!file || file.type !== "application/pdf") {
      setError("The selected file is not a PDF.");
      return;
    }

    try {
      setError(null);
      setIsSaved(false);

      const response = await fetch(`/api/annotated-pdf/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        let body = null;
        try {
          body = await response.json();
        } catch (e) {
          try {
            body = await response.text();
          } catch (e2) {
            body = null;
          }
        }
        const serverMsg =
          body && body.message ? body.message : body || response.statusText;
        throw new Error(`Failed to fetch PDF from server: ${serverMsg}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const scale = 1.0; // Reduced scale to avoid large canvas issues
      const viewport = page.getViewport({ scale });

      // Prepare canvases for all 4 modes: minisplit-ducted, minisplit-ductless, vrf-ducted, vrf-ductless
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const canvases = {
        ducted: { canvas: canvas, context: context, drawn: false },
        ductless: {
          canvas: document.createElement("canvas"),
          context: null,
          drawn: false,
        },
        "vrf-ducted": {
          canvas: document.createElement("canvas"),
          context: null,
          drawn: false,
        },
        "vrf-ductless": {
          canvas: document.createElement("canvas"),
          context: null,
          drawn: false,
        },
      };

      // Initialize all canvases
      Object.keys(canvases).forEach((mode) => {
        if (mode !== "ducted") {
          canvases[mode].context = canvases[mode].canvas.getContext("2d");
        }
        canvases[mode].canvas.width = viewport.width;
        canvases[mode].canvas.height = viewport.height;
      });

      // Render base PDF page to all canvases
      for (const mode of Object.keys(canvases)) {
        await page.render({ canvasContext: canvases[mode].context, viewport })
          .promise;
      }

      // Always fetch authoritative user annotations from backend
      let normalizedAnnotations = null;
      try {
        const annRes = await fetch(`/api/annotations/${pdfId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!annRes.ok) {
          let body = null;
          try {
            body = await annRes.json();
          } catch {}
          const serverMsg =
            body && body.message ? body.message : annRes.statusText;
          throw new Error(`Failed to fetch user annotations: ${serverMsg}`);
        }
        const annData = await annRes.json();
        normalizedAnnotations = annData.annotations || annData;
      } catch (e) {
        console.warn("Failed to fetch annotations for PDF:", e);
        setError("Could not load user annotations for saving.");
        return;
      }

      // Determine system views are handled by canvases; no alternate type variable needed

      // Draw annotations for all 4 modes (user annotations only)
      if (normalizedAnnotations) {
        Object.keys(canvases).forEach((mode) => {
          drawAnnotations(
            canvases[mode].context,
            normalizedAnnotations,
            viewport,
            mode
          );
        });
      }

      // Add small labels so each page is clear
      const getSystemLabel = (type) => {
        switch (type) {
          case "ducted":
            return "Minisplit - Ducted View";
          case "ductless":
            return "Minisplit - Ductless View";
          case "vrf-ducted":
            return "VRF System - Ducted Indoor Units";
          case "vrf-ductless":
            return "VRF System - Ductless Indoor Units";
          default:
            return `${type} View`;
        }
      };

      const drawLabel = (ctx, label) => {
        try {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.font = "16px Arial";
          ctx.fillText(label, 10, 22);
          ctx.restore();
        } catch (e) {
          // ignore font issues in some environments
        }
      };

      const drawLegend = (ctx, mode) => {
        try {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.font = "12px Arial";

          let legendY = ctx.canvas.height - 120;
          let legendX = 10;

          // Background box for legend
          ctx.fillStyle = "rgba(248, 249, 250, 0.9)";
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 1;
          ctx.fillRect(legendX, legendY - 5, 350, 115);
          ctx.strokeRect(legendX, legendY - 5, 350, 115);

          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.font = "bold 12px Arial";
          ctx.fillText(
            "Legend - Refrigerant Lines:",
            legendX + 5,
            legendY + 12
          );

          ctx.font = "11px Arial";

          if (mode === "ducted") {
            ctx.fillText(
              "━ ━ Blue Dashed: Star Topology (Refrigerant)",
              legendX + 5,
              legendY + 30
            );
            ctx.fillText(
              "- - - Grey Dashed: Ducts & Diffusers",
              legendX + 5,
              legendY + 45
            );
            ctx.fillText(
              "(Each AC unit directly to Condenser)",
              legendX + 15,
              legendY + 60
            );
          } else if (mode === "ductless") {
            ctx.fillText(
              "· · · Blue Dotted: Star Topology",
              legendX + 5,
              legendY + 30
            );
            ctx.fillText(
              "(Each AC unit to nearest Condenser)",
              legendX + 15,
              legendY + 45
            );
          } else if (mode === "vrf-ducted") {
            ctx.fillText(
              "━ ━ Red Dashed: Supply Line (Sequential)",
              legendX + 5,
              legendY + 30
            );
            ctx.fillText(
              "━ ━ Blue Dashed: Return Line (Sequential)",
              legendX + 5,
              legendY + 45
            );
          } else if (mode === "vrf-ductless") {
            ctx.fillText(
              "━ ━ Teal Solid: Star Topology",
              legendX + 5,
              legendY + 30
            );
            ctx.fillText(
              "(Each AC unit directly to Condenser)",
              legendX + 15,
              legendY + 45
            );
          }

          ctx.restore();
        } catch (e) {
          // ignore font issues in some environments
        }
      };

      // Draw labels and legends on all 4 canvases
      Object.keys(canvases).forEach((mode) => {
        drawLabel(canvases[mode].context, getSystemLabel(mode));
        drawLegend(canvases[mode].context, mode);
      });

      // Convert all canvases to images and embed in PDF
      const imageDataMap = {};
      const pngImageMap = {};

      for (const mode of Object.keys(canvases)) {
        const imageData = canvases[mode].canvas.toDataURL("image/png");
        if (!imageData || imageData === "data:," || imageData.length < 100) {
          throw new Error(`Failed to generate image for ${mode} mode`);
        }
        imageDataMap[mode] = imageData;
        pngImageMap[mode] = await pdfDoc.embedPng(imageData);
      }

      const newPdfPage = pdfDoc.getPages()[0];
      const { width, height } = newPdfPage.getSize();

      // Page 1: Minisplit - Ducted
      newPdfPage.drawImage(pngImageMap["ducted"], {
        x: 0,
        y: 0,
        width,
        height,
      });

      // Page 2: Minisplit - Ductless
      const page2 = pdfDoc.addPage([width, height]);
      page2.drawImage(pngImageMap["ductless"], { x: 0, y: 0, width, height });

      // Page 3: VRF - Ducted
      const page3 = pdfDoc.addPage([width, height]);
      page3.drawImage(pngImageMap["vrf-ducted"], { x: 0, y: 0, width, height });

      // Page 4: VRF - Ductless
      const page4 = pdfDoc.addPage([width, height]);
      page4.drawImage(pngImageMap["vrf-ductless"], {
        x: 0,
        y: 0,
        width,
        height,
      });

      if (isPaid) {
        const { width } = newPdfPage.getSize();
        const font = await pdfDoc.embedFont(pdfDoc.DefaultFont);
        const signatureText = "AC Commerce — User: admin_unique1@example.com";
        const watermarkText = "APPROVED\nAC COMMERCE";

        newPdfPage.drawText(signatureText, {
          x: width - font.widthOfTextAtSize(signatureText, 10) - 10,
          y: 20,
          size: 10,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });

        const watermarkBox = {
          x: 20,
          y: 20,
          width: 150,
          height: 50,
        };
        newPdfPage.drawRectangle({
          ...watermarkBox,
          borderColor: rgb(0, 1, 0),
          borderWidth: 2,
        });

        newPdfPage.drawText(watermarkText, {
          x: watermarkBox.x + 10,
          y: watermarkBox.y + 15,
          size: 12,
          font: font,
          color: rgb(0, 1, 0),
        });
      }

      const pdfBytes = await pdfDoc.save();

      if (annotationType === "engineer") {
        // For engineer, save to server
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        // Prepare form data for POST
        const formData = new FormData();
        formData.append("pdfFile", blob, file.name || "engineer-review.pdf"); // Use original filename
        // Need userId, but since it's engineer, perhaps from context
        // For now, hardcode or get from props
        formData.append("userId", userId || "6947bb2b736e7aceca4ac627"); // Use prop or fallback
        formData.append("userAnnotationId", pdfId);
        const systemTypeMap = {
          ducted: "minisplit-ducted",
          ductless: "minisplit-ductless",
          "vrf-ducted": "vrf-ducted",
          "vrf-ductless": "vrf-ductless",
        };
        formData.append("systemType", systemTypeMap[acType] || acType);
        formData.append("roomType", "living room");
        formData.append("areaSqft", "400");
        formData.append("btuRequired", "18000");
        formData.append(
          "rectangles",
          JSON.stringify(normalizedAnnotations?.rectangles || [])
        );
        formData.append(
          "comments",
          JSON.stringify(normalizedAnnotations?.comments || [])
        );
        formData.append(
          "lines",
          JSON.stringify(normalizedAnnotations?.lines || [])
        );
        formData.append(
          "hvac",
          JSON.stringify(normalizedAnnotations?.hvac || {})
        );
        formData.append("refrigerantLinesAuto", "true");
        formData.append(
          "engineerNotes",
          "System design looks good. Recommended for installation."
        );
        formData.append("imageWidth", viewport.width.toString());
        formData.append("imageHeight", viewport.height.toString());

        const saveResponse = await fetch("/api/engineer-annotations", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Failed to save engineer annotation"
          );
        }

        setIsSaved(true);
        alert("Engineer annotation saved successfully!");
      } else {
        // For user, download
        const downloadBlob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(downloadBlob);

        // Open in new tab as workaround for download issues (includes unique filename in URL, but user can save manually)
        window.open(url, "_blank");

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to save PDF:", err);
      setError("Failed to save PDF. Please try again.");
    }
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
      <Button
        className="go-to-btn btn-text w-auto p-1"
        variant="btn-outline"
        size="sm"
        onClick={saveAsPDF}
      >
        💾 Save as PDF
      </Button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {isSaved && <p style={{ color: "green" }}>PDF saved successfully!</p>}
    </div>
  );
}

export default SaveAsPDF;
