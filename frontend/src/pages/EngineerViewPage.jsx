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
import "./EngineerViewPage.css";

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
 * - VRF-Ducted: Dual parallel lines (red supply + blue return, dashed) in chain
 * - VRF-Ductless: Single solid teal line (sequential chain connection)
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
        // VRF-Ductless: Chain topology - outdoor -> indoor1 -> indoor2 -> ...
        const sortedIndoors = [...vrfAnnotations.indoorUnits].sort(
          (a, b) => a.xPercent - b.xPercent
        );
        const points = [{ x: outX, y: outY }];
        sortedIndoors.forEach((indoor) => {
          points.push({
            x: indoor.xPercent * canvasWidth,
            y: indoor.yPercent * canvasHeight,
          });
        });
        // Draw lines between consecutive points
        for (let i = 0; i < points.length - 1; i++) {
          context.save();
          context.setLineDash([]); // solid line
          context.lineWidth = 2.5;
          context.strokeStyle = "#008B8B"; // teal/dark cyan
          context.beginPath();
          context.moveTo(points[i].x, points[i].y);
          context.lineTo(points[i + 1].x, points[i + 1].y);
          context.stroke();
          context.restore();
        }
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
    // Only return text if comment is within 50 pixels
    return nearest && minDist <= 50 ? nearest.text.toLowerCase() : null;
  };
  // ducts
  hvacAnnotations?.ducts?.forEach((duct) => {
    const x = duct.xPercent * canvasWidth;
    const y = duct.yPercent * canvasHeight;
    const width = 40;
    const height = 20;
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
        context.drawImage(img, -10, -10, 20, 20);
        context.restore();
      };
    }
  });
  // diffusers
  hvacAnnotations?.diffusers?.forEach((diffuser) => {
    const x = diffuser.xPercent * canvasWidth;
    const y = diffuser.yPercent * canvasHeight;
    const size = (diffuser.sizePercent || 0.01) * canvasWidth;
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

  // Draw dotted connection lines from diffusers to ducts
  // Logic: If equal number of ducts and diffusers, connect 1-to-1 (nearest)
  // Else, connect based on matching comment groups (1-to-many)
  if (hvacAnnotations?.ducts && hvacAnnotations?.diffusers) {
    const numDucts = hvacAnnotations.ducts.length;
    const numDiffusers = hvacAnnotations.diffusers.length;
    if (numDucts === numDiffusers) {
      // 1-to-1: pair ducts and diffusers by sorted position (left to right)
      const sortedDucts = [...hvacAnnotations.ducts].sort(
        (a, b) => a.xPercent - b.xPercent
      );
      const sortedDiffusers = [...hvacAnnotations.diffusers].sort(
        (a, b) => a.xPercent - b.xPercent
      );
      sortedDucts.forEach((duct, index) => {
        const diffuser = sortedDiffusers[index];
        if (diffuser) {
          const ductCenterX = duct.xPercent * canvasWidth + 20; // fixed duct width 40, center at +20
          const ductCenterY = duct.yPercent * canvasHeight + 10; // fixed duct height 20, center at +10
          const dx = diffuser.xPercent * canvasWidth;
          const dy = diffuser.yPercent * canvasHeight;
          context.save();
          context.setLineDash([5, 5]);
          context.lineWidth = 2;
          context.strokeStyle = "gray";
          context.beginPath();
          context.moveTo(ductCenterX, ductCenterY);
          context.lineTo(dx, dy);
          context.stroke();
          context.restore();
        }
      });
    } else {
      // 1-to-many: connect diffusers to ducts with matching comment groups, fallback to nearest
      hvacAnnotations.diffusers.forEach((diffuser) => {
        const dx = diffuser.xPercent * canvasWidth;
        const dy = diffuser.yPercent * canvasHeight;
        const diffuserGroup = getNearestCommentText(dx, dy, comments);
        let nearestDuct = null;
        let minDist = Infinity;
        hvacAnnotations.ducts.forEach((duct) => {
          const ductCenterX = duct.xPercent * canvasWidth + 20; // fixed duct width 40, center at +20
          const ductCenterY = duct.yPercent * canvasHeight + 10; // fixed duct height 20, center at +10
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
        // Fallback to nearest duct if no matching group
        if (!nearestDuct) {
          hvacAnnotations.ducts.forEach((duct) => {
            const ductCenterX = duct.xPercent * canvasWidth + 20; // fixed duct width 40, center at +20
            const ductCenterY = duct.yPercent * canvasHeight + 10; // fixed duct height 20, center at +10
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
          context.setLineDash([5, 5]);
          context.lineWidth = 2;
          context.strokeStyle = "gray";
          context.beginPath();
          context.moveTo(dx, dy);
          context.lineTo(nearestDuct.x, nearestDuct.y);
          context.stroke();
          context.restore();
        }
      });
    }
  }
};

const overlayAnnotations = (context, annotations, acType) => {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  // Helper function to get the center of a rotated rectangle
  const getRotatedCenter = (x, y, width, height, angleDeg) => {
    const angle = (angleDeg || 0) * (Math.PI / 180);
    const cx = width / 2;
    const cy = height / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotatedCx = cx * cos - cy * sin;
    const rotatedCy = cx * sin + cy * cos;
    return { x: x + rotatedCx, y: y + rotatedCy };
  };

  // rectangles - ALWAYS render user-drawn rectangles (engineer annotations)
  // These represent condenser, AC units, and other system components
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
  // lines - skip in ducted modes since we auto-generate refrigerant lines
  // (to avoid rendering old daisy-chain lines that interfere with star topology)
  if (acType !== "ducted" && acType !== "vrf-ducted") {
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
  }
  // comments - filter by acType to show only comments created in current mode
  annotations?.comments?.forEach((comment) => {
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

  // Draw lines from rectangles to nearest comments (callout style)
  annotations?.rectangles?.forEach((rect) => {
    const rectCenter = getRotatedCenter(
      rect.xPercent * canvasWidth,
      rect.yPercent * canvasHeight,
      rect.widthPercent * canvasWidth,
      rect.heightPercent * canvasHeight,
      rect.rotation
    );
    const rx = rectCenter.x;
    const ry = rectCenter.y;
    let nearestComment = null;
    let minDist = Infinity;
    annotations.comments?.forEach((comment) => {
      // Only consider comments that match the current acType
      if (comment.acType && comment.acType !== acType) {
        return;
      }
      const cx = comment.xPercent * canvasWidth;
      const cy = comment.yPercent * canvasHeight;
      const dist = Math.sqrt((rx - cx) ** 2 + (ry - cy) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearestComment = comment;
      }
    });
    if (nearestComment && minDist < 150) {
      // threshold in pixels for relevance
      const cx = nearestComment.xPercent * canvasWidth;
      const cy = nearestComment.yPercent * canvasHeight;
      context.save();
      context.setLineDash([5, 5]); // dotted line
      context.lineWidth = 1;
      context.strokeStyle = "gray";
      context.beginPath();
      context.moveTo(rx, ry);
      context.lineTo(cx, cy);
      context.stroke();
      context.restore();
    }
  });

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
            rect.xPercent * canvasWidth + (rect.widthPercent * canvasWidth) / 2;
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
      const condCenter = getRotatedCenter(
        condenser.xPercent * canvasWidth,
        condenser.yPercent * canvasHeight,
        condenser.widthPercent * canvasWidth,
        condenser.heightPercent * canvasHeight,
        condenser.rotation
      );
      const condX = condCenter.x;
      const condY = condCenter.y;

      indoorUnits.forEach((unit) => {
        const unitCenter = getRotatedCenter(
          unit.xPercent * canvasWidth,
          unit.yPercent * canvasHeight,
          unit.widthPercent * canvasWidth,
          unit.heightPercent * canvasHeight,
          unit.rotation
        );
        const unitX = unitCenter.x;
        const unitY = unitCenter.y;

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
      const condCenter = getRotatedCenter(
        cond.xPercent * canvasWidth,
        cond.yPercent * canvasHeight,
        cond.widthPercent * canvasWidth,
        cond.heightPercent * canvasHeight,
        cond.rotation
      );
      context.save();
      context.fillStyle = "black";
      context.font = "bold 14px Arial";
      context.fillText("", condCenter.x + 8, condCenter.y - 8);
      context.restore();
    });
    // Now, for each rectangle not a condenser, connect to the nearest condenser
    annotations.rectangles.forEach((rect) => {
      if (!condensers.includes(rect)) {
        const rectCenter = getRotatedCenter(
          rect.xPercent * canvasWidth,
          rect.yPercent * canvasHeight,
          rect.widthPercent * canvasWidth,
          rect.heightPercent * canvasHeight,
          rect.rotation
        );
        const rx = rectCenter.x;
        const ry = rectCenter.y;
        let nearestCondenser = null;
        let minDist = Infinity;
        condensers.forEach((cond) => {
          const condCenter = getRotatedCenter(
            cond.xPercent * canvasWidth,
            cond.yPercent * canvasHeight,
            cond.widthPercent * canvasWidth,
            cond.heightPercent * canvasHeight,
            cond.rotation
          );
          const cx = condCenter.x;
          const cy = condCenter.y;
          const dist = Math.sqrt((rx - cx) ** 2 + (ry - cy) ** 2);
          if (dist < minDist) {
            minDist = dist;
            nearestCondenser = { cx, cy };
          }
        });
        if (nearestCondenser) {
          const cx = nearestCondenser.cx;
          const cy = nearestCondenser.cy;
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

    // Now, for each rectangle not a condenser, connect to the nearest condenser with teal refrigerant line
    annotations.rectangles.forEach((rect) => {
      if (!condensers.includes(rect)) {
        const rectCenter = getRotatedCenter(
          rect.xPercent * canvasWidth,
          rect.yPercent * canvasHeight,
          rect.widthPercent * canvasWidth,
          rect.heightPercent * canvasHeight,
          rect.rotation
        );
        const rx = rectCenter.x;
        const ry = rectCenter.y;
        let nearestCondenser = null;
        let minDist = Infinity;
        condensers.forEach((cond) => {
          const condCenter = getRotatedCenter(
            cond.xPercent * canvasWidth,
            cond.yPercent * canvasHeight,
            cond.widthPercent * canvasWidth,
            cond.heightPercent * canvasHeight,
            cond.rotation
          );
          const cx = condCenter.x;
          const cy = condCenter.y;
          const dist = Math.sqrt((rx - cx) ** 2 + (ry - cy) ** 2);
          if (dist < minDist) {
            minDist = dist;
            nearestCondenser = { cx, cy };
          }
        });
        if (nearestCondenser) {
          const cx = nearestCondenser.cx;
          const cy = nearestCondenser.cy;
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
    // Fallback to highest id if no comment
    if (!condenser) {
      let maxIdNum = -1;
      annotations.rectangles.forEach((rect) => {
        const idNum = parseInt(rect.id) || 0;
        if (idNum > maxIdNum) {
          maxIdNum = idNum;
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
        const rect1Center = getRotatedCenter(
          indoorRects[i].xPercent * canvasWidth,
          indoorRects[i].yPercent * canvasHeight,
          indoorRects[i].widthPercent * canvasWidth,
          indoorRects[i].heightPercent * canvasHeight,
          indoorRects[i].rotation
        );
        const x1 = rect1Center.x;
        const y1 = rect1Center.y;
        const rect2Center = getRotatedCenter(
          indoorRects[i + 1].xPercent * canvasWidth,
          indoorRects[i + 1].yPercent * canvasHeight,
          indoorRects[i + 1].widthPercent * canvasWidth,
          indoorRects[i + 1].heightPercent * canvasHeight,
          indoorRects[i + 1].rotation
        );
        const x2 = rect2Center.x;
        const y2 = rect2Center.y;

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
        const lastRectCenter = getRotatedCenter(
          indoorRects[indoorRects.length - 1].xPercent * canvasWidth,
          indoorRects[indoorRects.length - 1].yPercent * canvasHeight,
          indoorRects[indoorRects.length - 1].widthPercent * canvasWidth,
          indoorRects[indoorRects.length - 1].heightPercent * canvasHeight,
          indoorRects[indoorRects.length - 1].rotation
        );
        const lastX = lastRectCenter.x;
        const lastY = lastRectCenter.y;
        const condCenter = getRotatedCenter(
          condenser.xPercent * canvasWidth,
          condenser.yPercent * canvasHeight,
          condenser.widthPercent * canvasWidth,
          condenser.heightPercent * canvasHeight,
          condenser.rotation
        );
        const condX = condCenter.x;
        const condY = condCenter.y;

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
          throw new Error(`Failed to fetch annotation: ${serverMsg}`);
        }
        const data = await response.json();
        console.log("Fetched annotation data:", data);
        setAnnotation(data);
        setAcType(data.acType || "ducted");
        // Fetch PDF file
        const pdfResponse = await fetch(`/api/annotated-pdf/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pdfResponse.ok) {
          let body = null;
          try {
            body = await pdfResponse.json();
          } catch (e) {
            try {
              body = await pdfResponse.text();
            } catch (e2) {
              body = null;
            }
          }
          const serverMsg =
            body && body.message
              ? body.message
              : body || pdfResponse.statusText;
          throw new Error(`Failed to fetch PDF: ${serverMsg}`);
        }
        let pdfBlob;
        try {
          pdfBlob = await pdfResponse.blob();
        } catch (e) {
          console.error("Error reading PDF blob:", e);
          throw new Error("Failed to read PDF data from response");
        }
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
              acType: acType, // Store which mode this comment was created in
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

      {/* Refrigerant Lines Legend - Always Visible */}
      <div
        className="mb-4 p-3 border rounded"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <strong className="d-block mb-2">
          📋 Refrigerant Line Types (Current Mode:{" "}
          {acType === "ducted"
            ? "Minisplit - Ducted"
            : acType === "ductless"
            ? "Minisplit - Ductless"
            : acType === "vrf-ducted"
            ? "VRF System - Ducted"
            : "VRF System - Ductless"}
          )
        </strong>
        {acType === "ducted" && (
          <div className="d-flex flex-wrap gap-3 flex-column">
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "40px",
                  height: "2px",
                  backgroundColor: "blue",
                  position: "relative",
                  top: "2px",
                }}
              />
              <span style={{ marginLeft: "8px" }}>
                Blue Dashed: Refrigerant Lines (Star Topology - Each AC unit
                directly to Condenser)
              </span>
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "40px",
                  height: "2px",
                  position: "relative",
                  top: "2px",
                  borderTop: "2px dashed grey",
                  backgroundColor: "transparent",
                }}
              />
              <span style={{ marginLeft: "8px" }}>
                Grey Dashed: Ducts & Diffusers
              </span>
            </span>
          </div>
        )}
        {acType === "ductless" && (
          <div className="d-flex flex-wrap gap-3">
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "40px",
                  height: "2px",
                  position: "relative",
                  top: "2px",
                  borderTop: "2px dotted blue",
                  backgroundColor: "transparent",
                }}
              />
              <span style={{ marginLeft: "8px" }}>
                Blue Dotted: Refrigerant Lines (Star Topology - Each AC unit to
                nearest Condenser)
              </span>
            </span>
          </div>
        )}
        {acType === "vrf-ducted" && (
          <div>
            <div className="d-flex flex-wrap gap-3 mb-2">
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: "40px",
                    height: "2px",
                    backgroundColor: "red",
                    position: "relative",
                    top: "2px",
                    borderTop: "2px dashed red",
                  }}
                />
                <span style={{ marginLeft: "8px", color: "red" }}>
                  Red Dashed: Supply Line (Sequential Chain)
                </span>
              </span>
            </div>
            <div className="d-flex flex-wrap gap-3">
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: "40px",
                    height: "2px",
                    backgroundColor: "#0066FF",
                    position: "relative",
                    top: "2px",
                    borderTop: "2px dashed #0066FF",
                  }}
                />
                <span style={{ marginLeft: "8px", color: "#0066FF" }}>
                  Blue Dashed: Return Line (Sequential Chain)
                </span>
              </span>
            </div>
          </div>
        )}
        {acType === "vrf-ductless" && (
          <div className="d-flex flex-wrap gap-3">
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "40px",
                  height: "2px",
                  backgroundColor: "#008B8B",
                  position: "relative",
                  top: "2px",
                }}
              />
              <span style={{ marginLeft: "8px", color: "#008B8B" }}>
                Teal Solid: Refrigerant Lines (Star Topology - Each AC unit to
                Condenser)
              </span>
            </span>
          </div>
        )}
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
                <strong>Legend (Minisplit HVAC):</strong>
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
                <strong>Legend (VRF Ducted HVAC):</strong>
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
          {acType === "vrf-ducted" && (
            <>
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
                onClick={() => setAddMode("comment")}
                variant="warning"
                className="me-2"
              >
                Add Comment
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAnnotation((prev) => {
                    let allItems = [];

                    // Handle VRF units
                    if (prev?.annotations?.vrf) {
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

                    // Handle comments
                    if (prev?.annotations?.comments) {
                      const comments = [...(prev.annotations.comments || [])];
                      allItems.push(
                        ...comments.map((c) => ({
                          ...c,
                          type: "comment",
                          subType: "annotation",
                        }))
                      );
                    }

                    if (allItems.length === 0) return prev;

                    const mostRecent = allItems.reduce((max, item) => {
                      const maxTime = parseInt(max.id.split("-")[1]);
                      const itemTime = parseInt(item.id.split("-")[1]);
                      return itemTime > maxTime ? item : max;
                    });

                    // Remove comments
                    if (mostRecent.subType === "annotation") {
                      return {
                        ...prev,
                        annotations: {
                          ...(prev.annotations || {}),
                          comments: (prev.annotations?.comments || []).filter(
                            (c) => c.id !== mostRecent.id
                          ),
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

                  // Handle comments
                  if (prev?.annotations?.comments) {
                    const comments = [...(prev.annotations.comments || [])];
                    allItems.push(
                      ...comments.map((c) => ({
                        ...c,
                        type: "comment",
                        subType: "annotation",
                      }))
                    );
                  }

                  if (allItems.length === 0) return prev;

                  const mostRecent = allItems.reduce((max, item) => {
                    const maxTime = parseInt(max.id.split("-")[1]);
                    const itemTime = parseInt(item.id.split("-")[1]);
                    return itemTime > maxTime ? item : max;
                  });

                  // Remove comments
                  if (mostRecent.subType === "annotation") {
                    return {
                      ...prev,
                      annotations: {
                        ...(prev.annotations || {}),
                        comments: (prev.annotations?.comments || []).filter(
                          (c) => c.id !== mostRecent.id
                        ),
                      },
                    };
                  }

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
            annotationType="engineer"
            userId={annotation.userId}
          />
        )}
      </div>
    </div>
  );
};

export default EngineerViewPage;
