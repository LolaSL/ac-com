import { useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";
import "./SaveAsPDF.css";

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
 * - VRF-Ducted: Dual parallel lines (red supply + blue return, dashed) in chain: Condenser→AC1→AC2→...
 * - VRF-Ductless: Single solid teal line in star topology: Each AC connects to nearest Condenser
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
    if (acType === "vrf-ductless") {
      // VRF-Ductless: Star topology - each indoor connects to nearest outdoor
      vrfAnnotations.indoorUnits.forEach((indoor) => {
        const inX = indoor.xPercent * canvasWidth;
        const inY = indoor.yPercent * canvasHeight;
        // Find nearest outdoor
        let nearestOut = null;
        let minDist = Infinity;
        vrfAnnotations.outdoorUnits.forEach((outdoor) => {
          const outX = outdoor.xPercent * canvasWidth;
          const outY = outdoor.yPercent * canvasHeight;
          const dist = Math.sqrt((inX - outX) ** 2 + (inY - outY) ** 2);
          if (dist < minDist) {
            minDist = dist;
            nearestOut = { x: outX, y: outY };
          }
        });
        if (nearestOut) {
          context.save();
          context.setLineDash([]); // solid line
          context.lineWidth = 2.5;
          context.strokeStyle = "#008B8B"; // teal/dark cyan
          context.beginPath();
          context.moveTo(inX, inY);
          context.lineTo(nearestOut.x, nearestOut.y);
          context.stroke();
          context.restore();
        }
      });
    } else if (acType === "vrf-ducted") {
      // VRF-Ducted: per-flat chain  ac-N.1 → ac-N.2 → … → condenser-N
      // Indoor units may carry a `flatNum` field; if not, assign to nearest outdoor unit.
      vrfAnnotations.outdoorUnits.forEach((outdoor) => {
        const outX = outdoor.xPercent * canvasWidth;
        const outY = outdoor.yPercent * canvasHeight;
        const outdoorFlatNum = outdoor.flatNum ?? null;

        // Select indoor units belonging to this condenser:
        // 1) match by flatNum if available
        // 2) fall back to all indoors (single-flat / legacy behaviour)
        let flatIndoors;
        if (outdoorFlatNum !== null) {
          flatIndoors = vrfAnnotations.indoorUnits.filter(
            (u) => (u.flatNum ?? null) === outdoorFlatNum
          );
        } else {
          // Single outdoor unit → assign all indoors to it
          flatIndoors = [...vrfAnnotations.indoorUnits];
        }

        // Sort by unitNum if available, otherwise by x position
        const sortedIndoors = flatIndoors.slice().sort((a, b) => {
          if (a.unitNum != null && b.unitNum != null) return a.unitNum - b.unitNum;
          return a.xPercent - b.xPercent;
        });

        // Chain: ac-N.1 → ac-N.2 → … → condenser-N
        const chain = [
          ...sortedIndoors.map((u) => ({
            x: u.xPercent * canvasWidth,
            y: u.yPercent * canvasHeight,
          })),
          { x: outX, y: outY },
        ];

        // Draw dual parallel lines (red supply + blue return, dashed) along the chain
        for (let i = 0; i < chain.length - 1; i++) {
          const startX = chain[i].x;
          const startY = chain[i].y;
          const endX = chain[i + 1].x;
          const endY = chain[i + 1].y;
          const dx = endX - startX;
          const dy = endY - startY;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) continue;
          const offset = 3;
          const perpX = (-dy / len) * offset;
          const perpY = (dx / len) * offset;

          // Supply line (red, dashed)
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "red";
          context.beginPath();
          context.moveTo(startX + perpX, startY + perpY);
          context.lineTo(endX + perpX, endY + perpY);
          context.stroke();
          context.restore();

          // Return line (blue, dashed)
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "#0066FF";
          context.beginPath();
          context.moveTo(endX - perpX, endY - perpY);
          context.lineTo(startX - perpX, startY - perpY);
          context.stroke();
          context.restore();
        }
      });
    }
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

  // eslint-disable-next-line no-unused-vars
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

    // For VRF ducted systems, draw blue dashed refrigerant lines connecting AC units to condenser
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
            context.setLineDash([5, 5]); // dotted line for VRF ductless
            context.lineWidth = 2;
            context.strokeStyle = "blue"; // blue refrigerant line for VRF ductless
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

    // For VRF ducted systems, draw red/blue dashed supply/return lines between user rectangles.
    // Supports both single-flat (ac-1, ac-2, condenser) and multi-flat
    // (ac-1.1, ac-1.2, condenser-1, ac-2.1, ac-2.2, condenser-2) topologies.
    // Chain per flat: ac-N.1 → ac-N.2 → ... → condenser-N
    if (
      acType === "vrf-ducted" &&
      annotations?.rectangles &&
      annotations.rectangles.length > 1
    ) {
      // Helper: get the comment label for a rectangle
      const getRectComment = (rect) => {
        if (!annotations.comments) return null;
        return annotations.comments.find((c) => c.rectId === rect.id) || null;
      };
      const getRectLabel = (rect) => {
        const c = getRectComment(rect);
        return c ? c.text.toLowerCase().trim() : "";
      };

      // Classify every rectangle as condenser or AC unit, and extract flat/unit numbers
      // Pattern: condenser-N  or  condenser N  (flat-aware)  →  flatNum = N, unitNum = 0
      // Pattern: ac-N.M  or  ac-NM  or  ac-N  (flat N, unit M)  →  flatNum = N, unitNum = M
      // Single-flat fallback: "condenser" with no number → flatNum = 1; "ac-N" → flatNum = 1, unitNum = N
      const classifyRect = (rect) => {
        const label = getRectLabel(rect);
        // condenser-N or condenser N  (multi-flat)
        const condMulti = label.match(/condenser[-\s]?(\d+)/);
        if (condMulti) return { type: "condenser", flatNum: parseInt(condMulti[1]), unitNum: 0, rect };
        // plain "condenser" (single-flat)
        if (/\bcondenser\b/.test(label)) return { type: "condenser", flatNum: 1, unitNum: 0, rect };
        if (rect.isCondenser) return { type: "condenser", flatNum: 1, unitNum: 0, rect };
        // ac-N.M (flat N, unit M inside flat)
        const acMulti = label.match(/ac[-\s]?(\d+)[.](\d+)/);
        if (acMulti) return { type: "ac", flatNum: parseInt(acMulti[1]), unitNum: parseInt(acMulti[2]), rect };
        // ac-N (single-flat style: flat 1, unit N)
        const acSingle = label.match(/ac[-\s]?(\d+)/);
        if (acSingle) return { type: "ac", flatNum: 1, unitNum: parseInt(acSingle[1]), rect };
        return null; // unrecognised rectangle — skip
      };

      const classified = annotations.rectangles
        .map(classifyRect)
        .filter(Boolean);

      // Group by flat number
      const flats = {}; // flatNum → { condenserRect, acRects[] }
      classified.forEach(({ type, flatNum, unitNum, rect }) => {
        if (!flats[flatNum]) flats[flatNum] = { condenserRect: null, acRects: [] };
        if (type === "condenser") {
          flats[flatNum].condenserRect = rect;
        } else {
          flats[flatNum].acRects.push({ rect, unitNum });
        }
      });

      // If we found no flats at all (no comments match), fall back to largest-rect-as-condenser
      if (Object.keys(flats).length === 0) {
        let maxArea = -Infinity;
        let fallbackCondenser = null;
        annotations.rectangles.forEach((rect) => {
          const area = rect.widthPercent * rect.heightPercent;
          if (area > maxArea) { maxArea = area; fallbackCondenser = rect; }
        });
        if (fallbackCondenser) {
          flats[1] = {
            condenserRect: fallbackCondenser,
            acRects: annotations.rectangles
              .filter((r) => r !== fallbackCondenser)
              .map((rect, i) => ({ rect, unitNum: i + 1 })),
          };
        }
      }

      // Helper: draw one dual-line segment (supply red + return blue, both dashed)
      const drawDuctSegment = (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        const offset = 3;
        const perpX = (-dy / len) * offset;
        const perpY = (dx / len) * offset;

        context.save();
        context.setLineDash([8, 4]);
        context.lineWidth = 2;
        context.strokeStyle = "red";
        context.beginPath();
        context.moveTo(x1 + perpX, y1 + perpY);
        context.lineTo(x2 + perpX, y2 + perpY);
        context.stroke();
        context.restore();

        context.save();
        context.setLineDash([8, 4]);
        context.lineWidth = 2;
        context.strokeStyle = "#0066FF";
        context.beginPath();
        context.moveTo(x1 - perpX, y1 - perpY);
        context.lineTo(x2 - perpX, y2 - perpY);
        context.stroke();
        context.restore();
      };

      // For each flat: chain ac-N.1 → ac-N.2 → … → condenser-N
      Object.values(flats).forEach(({ condenserRect, acRects }) => {
        // Sort AC units within this flat by their unit number
        const sortedAC = [...acRects].sort((a, b) => a.unitNum - b.unitNum);

        // If there's no condenser for this flat, skip drawing lines
        if (!condenserRect && sortedAC.length === 0) return;

        const rectCx = (r) =>
          r.xPercent * canvasWidth + (r.widthPercent * canvasWidth) / 2;
        const rectCy = (r) =>
          r.yPercent * canvasHeight + (r.heightPercent * canvasHeight) / 2;

        // Build ordered chain: [ac1, ac2, …, condenser]
        const chain = sortedAC.map(({ rect }) => rect);
        if (condenserRect) chain.push(condenserRect);

        // Draw segments along the chain
        for (let i = 0; i < chain.length - 1; i++) {
          drawDuctSegment(
            rectCx(chain[i]), rectCy(chain[i]),
            rectCx(chain[i + 1]), rectCy(chain[i + 1])
          );
        }
      });
    }

    // Draw HVAC annotations - for ducted minisplit and VRF-ducted systems
    if ((acType === "ducted" || acType === "vrf-ducted") && annotations?.hvac?.ducts) {
      annotations.hvac.ducts.forEach((duct) => {
        const x = duct.xPercent * canvasWidth;
        const y = duct.yPercent * canvasHeight;
        const width = (duct.width || 0.01) * canvasWidth;
        const height = (duct.height || 0.003) * canvasHeight;
        context.save();
        context.translate(x, y);
        context.beginPath();
        context.rect(0, 0, width, height);
        context.fillStyle = duct.fill || "rgba(255, 200, 0, 0.6)"; // semi-transparent orange
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = duct.stroke || "darkorange";
        context.stroke();
        context.restore();
      });
    }

    // Show diffusers in ducted minisplit and VRF-ducted modes
    if ((acType === "ducted" || acType === "vrf-ducted") && annotations?.hvac?.diffusers) {
      annotations.hvac.diffusers.forEach((diffuser) => {
        const x = diffuser.xPercent * canvasWidth;
        const y = diffuser.yPercent * canvasHeight;
        const size = (diffuser.sizePercent || 0.008) * canvasWidth;
        context.beginPath();
        if (diffuser.shape === "square") {
          context.rect(x - size / 2, y - size / 2, size, size);
        } else {
          context.arc(x, y, size / 2, 0, 2 * Math.PI);
        }
        context.fillStyle = "rgba(100, 200, 100, 0.6)"; // semi-transparent green
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = "darkgreen";
        context.stroke();
      });
    }

    // Draw dotted connection lines from diffusers to ducts
    // Logic: If equal number of ducts and diffusers, connect 1-to-1 (nearest by x position)
    // Else, connect based on matching comment groups (1-to-many), fallback to nearest
    if (
      (acType === "ducted" || acType === "vrf-ducted") &&
      annotations?.hvac?.ducts &&
      annotations?.hvac?.diffusers
    ) {
      const numDucts = annotations.hvac.ducts.length;
      const numDiffusers = annotations.hvac.diffusers.length;

      if (numDucts === numDiffusers) {
        // 1-to-1: pair ducts and diffusers by sorted position (left to right)
        const sortedDucts = [...annotations.hvac.ducts].sort(
          (a, b) => a.xPercent - b.xPercent
        );
        const sortedDiffusers = [...annotations.hvac.diffusers].sort(
          (a, b) => a.xPercent - b.xPercent
        );
        sortedDucts.forEach((duct, index) => {
          const diffuser = sortedDiffusers[index];
          if (diffuser) {
            const ductCenterX =
              duct.xPercent * canvasWidth +
              ((duct.width || 0.01) * canvasWidth) / 2;
            const ductCenterY =
              duct.yPercent * canvasHeight +
              ((duct.height || 0.003) * canvasHeight) / 2;
            const dx = diffuser.xPercent * canvasWidth;
            const dy = diffuser.yPercent * canvasHeight;
            context.save();
            context.setLineDash([3, 3]); // dotted line
            context.lineWidth = 1;
            context.strokeStyle = "darkgray";
            context.beginPath();
            context.moveTo(dx, dy);
            context.lineTo(ductCenterX, ductCenterY);
            context.stroke();
            context.restore();
          }
        });
      } else {
        // 1-to-many: connect diffusers to ducts with matching comment groups, fallback to nearest
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
              ((duct.width || 0.01) * canvasWidth) / 2;
            const ductCenterY =
              duct.yPercent * canvasHeight +
              ((duct.height || 0.003) * canvasHeight) / 2;
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
          
          // Fallback to nearest duct if no matching group
          if (!nearestDuct) {
            annotations.hvac.ducts.forEach((duct) => {
              const ductCenterX =
                duct.xPercent * canvasWidth +
                ((duct.width || 0.01) * canvasWidth) / 2;
              const ductCenterY =
                duct.yPercent * canvasHeight +
                ((duct.height || 0.003) * canvasHeight) / 2;
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
            context.setLineDash([3, 3]); // dotted line
            context.lineWidth = 1;
            context.strokeStyle = "darkgray"; // darker gray for better visibility
            context.beginPath();
            context.moveTo(dx, dy);
            context.lineTo(nearestDuct.x, nearestDuct.y);
            context.stroke();
            context.restore();
          }
        });
      }
    }

    // Draw VRF system annotations (outdoor condenser + indoor units + refrigerant lines)
    // For VRF-ducted, also render ducts/diffusers as shown above
    if (acType.startsWith("vrf") && annotations?.vrf) {
      drawVRFAnnotations(
        context,
        annotations.vrf,
        canvasWidth,
        canvasHeight,
        acType
      );

      // NOTE: VRF-ducted systems show ductwork for air distribution
      // VRF-ductless systems do not show ducts/diffusers
    }
  };

  // Helper: trigger a browser file download
  const triggerDownload = (bytes, filename) => {
    const downloadBlob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const saveAsPDF = async () => {
    setError(null);
    setIsSaved(false);

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
      // ── ENGINEER: download server-rendered PDF directly ──────────────────
      if (annotationType === "engineer") {
        const dlResponse = await fetch(
          `/api/engineer-annotations/annotated-pdf/${pdfId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!dlResponse.ok) {
          const errorData = await dlResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Failed to fetch engineer annotation PDF"
          );
        }
        const dlBuffer = await (await dlResponse.blob()).arrayBuffer();
        triggerDownload(dlBuffer, file.name || "engineer-review.pdf");
        setIsSaved(true);
        return;
      }

      // ── USER: single-page PDF with only the user's manual annotations ────
      // Fetch the base PDF from the server
      const baseResponse = await fetch(`/api/annotated-pdf/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!baseResponse.ok) {
        const body = await baseResponse.json().catch(() => ({}));
        throw new Error(
          body.message || `Failed to fetch PDF: ${baseResponse.statusText}`
        );
      }
      const baseBuffer = await (await baseResponse.blob()).arrayBuffer();

      // Fetch user-only annotations from backend
      const annRes = await fetch(`/api/annotations/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!annRes.ok) {
        const body = await annRes.json().catch(() => ({}));
        throw new Error(
          body.message || `Failed to fetch annotations: ${annRes.statusText}`
        );
      }
      const annData = await annRes.json();
      const userAnnotations = annData.annotations || annData;

      // Render the first page of the base PDF to a canvas
      const loadingTask = pdfjsLib.getDocument(baseBuffer);
      const pdfJsDoc = await loadingTask.promise;
      const pdfJsPage = await pdfJsDoc.getPage(1);
      const scale = 1.5;
      const viewport = pdfJsPage.getViewport({ scale });

      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = viewport.width;
      renderCanvas.height = viewport.height;
      const ctx = renderCanvas.getContext("2d");
      await pdfJsPage.render({ canvasContext: ctx, viewport }).promise;

      // Overlay only manual user annotations: rectangles, lines, comments
      const cw = renderCanvas.width;
      const ch = renderCanvas.height;

      // Rectangles
      userAnnotations?.rectangles?.forEach((rect) => {
        const x = rect.xPercent * cw;
        const y = rect.yPercent * ch;
        const w = rect.widthPercent * cw;
        const h = rect.heightPercent * ch;
        const angle = (rect.rotation || 0) * (Math.PI / 180);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.fillStyle = rect.fill || "rgba(20, 205, 230, 0.4)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = rect.stroke || "black";
        ctx.stroke();
        ctx.restore();
      });

      // Lines
      userAnnotations?.lines?.forEach((line) => {
        ctx.beginPath();
        const pts = line.points.map((val, idx) =>
          idx % 2 === 0 ? val * cw * 0.985 : val * ch * 0.985
        );
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.lineWidth = line.strokeWidth || 2;
        ctx.strokeStyle = line.stroke || "black";
        ctx.stroke();
      });

      // Comments
      userAnnotations?.comments?.forEach((comment) => {
        const x = comment.xPercent * cw;
        const y = comment.yPercent * ch;
        const padding = 6;
        const fontSize = 12;
        const text = comment.text;
        ctx.font = `bold ${fontSize}px Arial`;
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = comment.fill || "rgba(226, 218, 228, 0.3)";
        ctx.fillRect(x - padding, y - fontSize - padding, tw + padding * 2, fontSize + padding * 2);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - padding, y - fontSize - padding, tw + padding * 2, fontSize + padding * 2);
        ctx.fillStyle = comment.textColor || "#FF1493";
        ctx.fillText(text, x, y);
      });

      // Embed the canvas image into a new PDF page
      const imageData = renderCanvas.toDataURL("image/png");
      if (!imageData || imageData === "data:," || imageData.length < 100) {
        throw new Error("Failed to render PDF to canvas");
      }

      const pdfDoc = await PDFDocument.load(baseBuffer);
      const pngImage = await pdfDoc.embedPng(imageData);
      const firstPage = pdfDoc.getPages()[0];
      const { width, height } = firstPage.getSize();
      firstPage.drawImage(pngImage, { x: 0, y: 0, width, height });

      const pdfBytes = await pdfDoc.save();
      triggerDownload(pdfBytes, file.name || "my-drawing.pdf");
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to save PDF:", err);
      setError("Failed to save PDF. Please try again.");
    }
  };

  return (
    <div className="save-as-pdf">
      <canvas ref={canvasRef}></canvas>
      <Button
        className="go-to-btn btn-text w-auto p-1 save-button"
        variant="btn-outline"
        size="sm"
        onClick={saveAsPDF}
      >
        💾 Save as PDF
      </Button>
      {error && <p className="error-message">{error}</p>}
      {isSaved && <p className="success-message">PDF saved successfully!</p>}
    </div>
  );
}

export default SaveAsPDF;
