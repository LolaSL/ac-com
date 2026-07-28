import supplySVG from "../assets/hvac/supply.svg";
import returnSVG from "../assets/hvac/return.svg";
import ductSVG from "../assets/hvac/duct.svg";
import indoorSVG from "../assets/hvac/indoor.svg";
import outdoorSVG from "../assets/hvac/outdoor.svg";
import thermostatSVG from "../assets/hvac/thermostat.svg";
import supplyDiffuser4WaySVG from "../assets/hvac/supplyDiffuser4Way.svg";
import roundDiffuserSVG from "../assets/hvac/roundDiffuser.svg";
import linearSlotDiffuserSVG from "../assets/hvac/linearSlotDiffuser.svg";
import returnGrilleSVG from "../assets/hvac/returnGrille.svg";
import exhaustGrilleSVG from "../assets/hvac/exhaustGrille.svg";
import flexDuctSVG from "../assets/hvac/flexDuct.svg";
import supplyDuctSVG from "../assets/hvac/supplyDuct.svg";
import returnDuctSVG from "../assets/hvac/returnDuct.svg";
import fireDamperSVG from "../assets/hvac/fireDamper.svg";
import volumeDamperSVG from "../assets/hvac/volumeDamper.svg";
import vavBoxSVG from "../assets/hvac/vavBox.svg";
import condenserUnitSVG from "../assets/hvac/condenserUnit.svg";
import jetDiffuserSVG from "../assets/hvac/jetDiffuser.svg";
import transferGrilleSVG from "../assets/hvac/transferGrille.svg";
import drainPointSVG from "../assets/hvac/drainPoint.svg";
import wallDiffuserSVG from "../assets/hvac/wallDiffuser.svg";
import insulatedDuctSVG from "../assets/hvac/insulatedDuct.svg";

export const hvacSymbols = {
  supply: supplySVG,
  return: returnSVG,
  duct: ductSVG,
  indoor: indoorSVG,
  outdoor: outdoorSVG,
  thermostat: thermostatSVG,
  supplyDiffuser4Way: supplyDiffuser4WaySVG,
  roundDiffuser: roundDiffuserSVG,
  linearSlotDiffuser: linearSlotDiffuserSVG,
  returnGrille: returnGrilleSVG,
  exhaustGrille: exhaustGrilleSVG,
  flexDuct: flexDuctSVG,
  supplyDuct: supplyDuctSVG,
  returnDuct: returnDuctSVG,
  fireDamper: fireDamperSVG,
  volumeDamper: volumeDamperSVG,
  vavBox: vavBoxSVG,
  condenserUnit: condenserUnitSVG,
  jetDiffuser: jetDiffuserSVG,
  transferGrille: transferGrilleSVG,
  drainPoint: drainPointSVG,
  wallDiffuser: wallDiffuserSVG,
  insulatedDuct: insulatedDuctSVG,
};

/**
 * Preload all SVG symbol images so they can be drawn synchronously on canvas.
 * Returns a new object with the same keys but loaded HTMLImageElement values.
 */
export const preloadSymbolImages = (symbolUrls) => {
  const entries = Object.entries(symbolUrls);
  const promises = entries.map(
    ([key, url]) =>
      new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve([key, img]);
        img.onerror = () => resolve([key, null]);
        img.src = url;
      })
  );
  return Promise.all(promises).then((results) =>
    Object.fromEntries(results.filter(([, img]) => img !== null))
  );
};

/**
 * Draw an SVG symbol image on canvas. Supports both preloaded Image elements
 * (drawn synchronously) and URL strings (drawn via async onload).
 */
const drawSymbolImage = (src, drawFn) => {
  if (!src) return;
  if (typeof src === "object" && src.complete && src.src) {
    drawFn(src);
  } else if (typeof src === "string") {
    const img = new window.Image();
    img.onload = () => drawFn(img);
    img.src = src;
  }
};

// ─── Orthogonal (L-shaped) refrigerant line routing ───
// Real engineering drawings use Manhattan routing: horizontal → vertical (or vice-versa)
// instead of diagonal point-to-point lines.

/**
 * Draw an L-shaped (orthogonal) line between two points.
 * Goes horizontal first, then vertical — mimics pipes running along walls.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1 - start X (px)
 * @param {number} y1 - start Y (px)
 * @param {number} x2 - end X (px)
 * @param {number} y2 - end Y (px)
 * @param {object} opts - { color, lineWidth, dash, offset, label }
 *   offset: perpendicular shift to draw parallel supply/return pair
 */
const drawOrthogonalLine = (ctx, x1, y1, x2, y2, opts = {}) => {
  const { color = "red", lineWidth = 2, dash = [8, 4], offset = 0, label = "" } = opts;

  // Corner point: go horizontal first, then vertical
  const cornerX = x2;
  const cornerY = y1;

  ctx.save();
  ctx.setLineDash(dash);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x1 + offset, y1);
  ctx.lineTo(cornerX + offset, cornerY);
  ctx.lineTo(x2 + offset, y2);
  ctx.stroke();

  // Pipe size label at the midpoint of the horizontal segment
  if (label) {
    const midX = (x1 + cornerX) / 2 + offset;
    const midY = cornerY - 6;
    ctx.setLineDash([]);
    ctx.font = "bold 8px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(label, midX, midY);
  }
  ctx.restore();
};

/**
 * Draw a dual (supply + return) orthogonal pipe pair between two points.
 * Red supply line offset +3px, blue return line offset -3px.
 */
const drawDualOrthogonalLines = (ctx, x1, y1, x2, y2) => {
  drawOrthogonalLine(ctx, x1, y1, x2, y2, {
    color: "red", offset: 3, dash: [8, 4], label: "⅜″ L"
  });
  drawOrthogonalLine(ctx, x1, y1, x2, y2, {
    color: "#0066FF", offset: -3, dash: [8, 4], label: "⅝″ S"
  });
};

/**
 * Draw a single orthogonal refrigerant line (used for star topologies).
 */
const drawSingleOrthogonalLine = (ctx, x1, y1, x2, y2, color = "#008B8B", dash = []) => {
  drawOrthogonalLine(ctx, x1, y1, x2, y2, { color, dash, lineWidth: 2.5 });
};

const getRectCenterPercent = (rect) => ({
  x: (rect.xPercent || 0) + (rect.widthPercent || 0) / 2,
  y: (rect.yPercent || 0) + (rect.heightPercent || 0) / 2,
});

export const normalizeLinePointCoordinates = (points, width, height) => {
  if (!Array.isArray(points)) return [];

  const numericPoints = points.map((value) => {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    return Number.isFinite(numericValue) ? numericValue : null;
  });

  if (numericPoints.every((value) => value === null)) return [];

  const maxAbsPoint = numericPoints.reduce((max, value) => {
    if (value === null) return max;
    return Math.max(max, Math.abs(value));
  }, 0);

  const safeWidth = width > 0 ? width : 1;
  const safeHeight = height > 0 ? height : 1;
  const isPercent = maxAbsPoint <= 1.5;

  return numericPoints.map((value, index) => {
    if (value === null) return 0;
    if (isPercent) return value;
    return index % 2 === 0 ? value / safeWidth : value / safeHeight;
  });
};

export const buildEditableRefrigerantLines = (annotations, acType) => {
  const rectangles = annotations?.rectangles || [];
  const comments = annotations?.comments || [];

  const getCommentForRect = (rectId) =>
    comments.find((comment) => String(comment.rectId) === String(rectId));

  const makeOrthogonalLine = (start, end, id, stroke, strokeWidth = 2, lineType = "liquid") => {
    const elbowX = end.x;
    const elbowY = start.y;
    return {
      id,
      points: [start.x, start.y, elbowX, elbowY, end.x, end.y],
      stroke,
      strokeWidth,
      lineType,
    };
  };

  const createRouteForPair = (startRect, endRect, baseId) => {
    const start = getRectCenterPercent(startRect);
    const end = getRectCenterPercent(endRect);
    return [
      makeOrthogonalLine(start, end, `${baseId}-supply`, "#FF6B35", 2, "liquid"),
      makeOrthogonalLine(start, end, `${baseId}-return`, "#0066FF", 2, "vapor"),
    ];
  };

  if (acType === "vrf-ducted") {
    let condensers = [];
    if (comments.length > 0) {
      condensers = comments
        .filter((comment) => comment.text.toLowerCase().includes("condenser"))
        .map((comment) => rectangles.find((rect) => String(rect.id) === String(comment.rectId)))
        .filter(Boolean);
    }

    if (condensers.length === 0) {
      let maxIdNum = -1;
      let fallbackCondenser = null;
      rectangles.forEach((rect) => {
        const idNum = parseInt(rect.id, 10) || 0;
        if (idNum > maxIdNum) {
          maxIdNum = idNum;
          fallbackCondenser = rect;
        }
      });
      if (fallbackCondenser) condensers = [fallbackCondenser];
    }

    if (condensers.length > 0) {
      const groups = condensers.map((condenser) => {
        const condenserComment = getCommentForRect(condenser.id)?.text || "";
        const match = condenserComment.match(/condenser-(\d+)/i);
        const groupNum = match ? match[1] : null;

        let indoorRects = [];
        if (groupNum && comments.length > 0) {
          indoorRects = rectangles
            .filter((rect) => !rect.isCondenser && String(rect.id) !== String(condenser.id))
            .filter((rect) => {
              const comment = getCommentForRect(rect.id);
              return comment && comment.text.match(new RegExp(`ac-${groupNum}(\\.\\d+)?`, "i"));
            })
            .sort((a, b) => {
              const aComment = getCommentForRect(a.id)?.text || "";
              const bComment = getCommentForRect(b.id)?.text || "";
              const aMatch = aComment.match(/ac-\d+(\.(\d+))?/i);
              const bMatch = bComment.match(/ac-\d+(\.(\d+))?/i);
              const aSub = aMatch && aMatch[2] ? parseInt(aMatch[2], 10) : 0;
              const bSub = bMatch && bMatch[2] ? parseInt(bMatch[2], 10) : 0;
              return aSub - bSub;
            });
        }

        return { condenser, indoorRects };
      });

      const lines = [];
      groups.forEach(({ condenser, indoorRects }) => {
        if (indoorRects.length === 0) return;
        for (let i = 0; i < indoorRects.length - 1; i += 1) {
          lines.push(...createRouteForPair(indoorRects[i], indoorRects[i + 1], `line-${indoorRects[i].id}-${indoorRects[i + 1].id}`));
        }
        lines.push(...createRouteForPair(indoorRects[indoorRects.length - 1], condenser, `line-${indoorRects[indoorRects.length - 1].id}-${condenser.id}`));
      });

      if (lines.length > 0) return lines;
    }
  }

  if (acType === "vrf-ductless") {
    let condensers = [];
    if (comments.length > 0) {
      condensers = comments
        .filter((comment) => comment.text.toLowerCase().includes("condenser"))
        .map((comment) => rectangles.find((rect) => String(rect.id) === String(comment.rectId)))
        .filter(Boolean);
    }

    if (condensers.length === 0) {
      rectangles.forEach((rect) => {
        if (rect.isCondenser) condensers.push(rect);
      });
    }

    if (condensers.length === 0 && rectangles.length > 0) {
      condensers = [rectangles.reduce((largest, rect) => {
        const area = (rect.widthPercent || 0) * (rect.heightPercent || 0);
        return area > ((largest.widthPercent || 0) * (largest.heightPercent || 0)) ? rect : largest;
      })];
    }

    if (condensers.length > 0) {
      const linePairs = [];
      rectangles.forEach((rect) => {
        if (condensers.some((condenser) => String(condenser.id) === String(rect.id))) return;
        const nearestCondenser = condensers.reduce((closest, condenser) => {
          const currentCenter = getRectCenterPercent(rect);
          const condenserCenter = getRectCenterPercent(condenser);
          const currentDist = Math.hypot(currentCenter.x - condenserCenter.x, currentCenter.y - condenserCenter.y);
          const closestDist = Math.hypot(
            closest.x - condenserCenter.x,
            closest.y - condenserCenter.y
          );
          return currentDist < closestDist ? currentCenter : closest;
        }, getRectCenterPercent(condensers[0]));
        linePairs.push(...createRouteForPair(rect, { ...rect, xPercent: nearestCondenser.x - (rect.widthPercent || 0) / 2, yPercent: nearestCondenser.y - (rect.heightPercent || 0) / 2, widthPercent: rect.widthPercent || 0, heightPercent: rect.heightPercent || 0 }, `line-${rect.id}-cond`));
      });
      return linePairs;
    }
  }

  return [];
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
 * - VRF-Ductless: Single solid teal line (star topology - each indoor to nearest outdoor)
 */
export const overlayVRFSystem = (context, vrfAnnotations, symbolImages, acType) => {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  // Draw outdoor condenser units
  // Skip for vrf-ducted: user's own condenser rectangle already represents this unit
  if (acType !== "vrf-ducted") vrfAnnotations?.outdoorUnits?.forEach((unit) => {
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
    drawSymbolImage(symbolImages.outdoor, (img) => {
      context.save();
      context.translate(x, y);
      context.drawImage(img, -size / 2, -size / 2, size, size);
      context.restore();
    });

    // Draw capacity label if available
    if (unit.capacity) {
      context.save();
      context.font = "10px Arial";
      context.fillStyle = "darkred";
      context.fillText(`${unit.capacity} BTU`, x, y + size / 2 + 15);
      context.restore();
    }
  }); // end outdoor units (skipped for vrf-ducted)

  // Draw indoor units (for VRF systems)
  // Skip in vrf-ducted: overlayAnnotations already renders the user-drawn rectangles for each AC unit
  if (acType !== "vrf-ducted") vrfAnnotations?.indoorUnits?.forEach((unit) => {
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
    drawSymbolImage(symbolImages.indoor, (img) => {
      context.save();
      context.translate(x, y);
      context.drawImage(img, -size / 2, -size / 2, size, size);
      context.restore();
    });
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
          drawSingleOrthogonalLine(context, inX, inY, nearestOut.x, nearestOut.y, "#008B8B", []);
        }
      });
    } else if (acType === "vrf-ducted") {
      // vrf-ducted chain is handled entirely by overlayAnnotations (rectangle-based).
      // Nothing to draw here — avoids double chain lines.

    }
  }
};

export const overlayHVAC = (context, hvacAnnotations, symbolImages, comments, acType = null, pdfScale = 1.5) => {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;
  const scaleFactor = pdfScale / 1.5;

  // ─── DUCT TYPE CONFIG (professional engineering colors & styles) ───
  const DUCT_STYLES = {
    supply:    { fill: "rgba(0,120,255,0.4)",   stroke: "#0055CC", dash: [],       label: "SA" },
    return:    { fill: "rgba(255,120,50,0.4)",  stroke: "#CC4400", dash: [6,4],    label: "RA" },
    flex:      { fill: "rgba(150,150,150,0.4)", stroke: "#888",    dash: [3,3],    label: "FD" },
    exhaust:   { fill: "rgba(34,180,34,0.4)",   stroke: "#228B22", dash: [4,4],    label: "EA" },
    insulated: { fill: "rgba(255,180,50,0.4)",  stroke: "#CC9900", dash: [8,2,2,2],label: "ID" },
    default:   { fill: "rgba(0,150,255,0.4)",   stroke: "#0066FF", dash: [],       label: "" },
  };

  // ─── DIFFUSER TYPE CONFIG ───
  const DIFFUSER_STYLES = {
    "supply-4way":    { fill: "rgba(0,85,204,0.4)",  stroke: "#0055CC", svgKey: "supplyDiffuser4Way" },
    "round":          { fill: "rgba(0,85,204,0.4)",  stroke: "#0055CC", svgKey: "roundDiffuser" },
    "linear-slot":    { fill: "rgba(0,85,204,0.4)",  stroke: "#0055CC", svgKey: "linearSlotDiffuser" },
    "return-grille":  { fill: "rgba(204,68,0,0.4)",  stroke: "#CC4400", svgKey: "returnGrille" },
    "exhaust":        { fill: "rgba(34,139,34,0.4)", stroke: "#228B22", svgKey: "exhaustGrille" },
    "circle":         { fill: "rgba(0,85,204,0.4)",  stroke: "#0055CC", svgKey: "roundDiffuser" },
    "square":         { fill: "rgba(0,85,204,0.4)",  stroke: "#0055CC", svgKey: "supplyDiffuser4Way" },
    "jet":            { fill: "rgba(0,85,204,0.4)",  stroke: "#0055CC", svgKey: "jetDiffuser" },
    "transfer-grille":{ fill: "rgba(204,68,0,0.4)",  stroke: "#CC4400", svgKey: "transferGrille" },
    "drain-point":    { fill: "rgba(0,136,170,0.4)", stroke: "#0088AA", svgKey: "drainPoint" },
    "wall-diffuser":  { fill: "rgba(0,85,204,0.4)",  stroke: "#0055CC", svgKey: "wallDiffuser" },
    "default":        { fill: "rgba(0,255,0,0.4)",   stroke: "#00AA00", svgKey: "supply" },
  };

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
    return nearest && minDist <= 50 ? nearest.text.toLowerCase() : null;
  };

  // ─── RENDER ZONES (light blue shading behind everything) ───
  hvacAnnotations?.zones?.forEach((zone) => {
    const x = zone.xPercent * canvasWidth;
    const y = zone.yPercent * canvasHeight;
    const w = (zone.widthPercent || 0.15) * canvasWidth;
    const h = (zone.heightPercent || 0.12) * canvasHeight;

    context.save();
    context.beginPath();
    context.rect(x, y, w, h);
    context.fillStyle = zone.fill || 'rgba(0,150,255,0.12)';
    context.fill();
    context.lineWidth = 1 * scaleFactor;
    context.strokeStyle = zone.stroke || 'rgba(0,100,200,0.3)';
    context.stroke();

    // Draw zone label in top-left corner
    const hasZoneNumber = zone.zoneNumber !== undefined && zone.zoneNumber !== null && zone.zoneNumber !== "";
    const hasZoneLabel = zone.zoneLabel !== undefined && zone.zoneLabel !== null && String(zone.zoneLabel).trim() !== "";
    if (hasZoneNumber || hasZoneLabel) {
      const label = hasZoneLabel ? String(zone.zoneLabel) : String(zone.zoneNumber);
      const fontSize = Math.max(12, 16 * scaleFactor);
      context.font = `bold ${fontSize}px Arial`;
      context.fillStyle = 'rgba(0,80,160,0.9)';
      context.textAlign = 'left';
      context.textBaseline = 'top';
      context.fillText(`Zone ${label}`, x + 6 * scaleFactor, y + 6 * scaleFactor);
    }
    context.restore();
  });

  // ─── RENDER DUCTS ───
  hvacAnnotations?.ducts?.forEach((duct) => {
    const x = duct.xPercent * canvasWidth;
    const y = duct.yPercent * canvasHeight;
    const width = (duct.width || 0.08) * canvasWidth;
    const height = (duct.height || 0.025) * canvasHeight;
    const ductType = duct.ductType || "default";
    const style = DUCT_STYLES[ductType] || DUCT_STYLES.default;

    context.save();
    context.translate(x, y);

    if (ductType === "flex") {
      // Flex duct: wavy parallel lines
      context.beginPath();
      const segments = 8;
      const segWidth = width / segments;
      const amplitude = height * 0.15;
      // Top wavy line
      context.moveTo(0, 0);
      for (let i = 0; i < segments; i++) {
        const cx1 = i * segWidth + segWidth * 0.5;
        const cy1 = i % 2 === 0 ? -amplitude : amplitude;
        context.quadraticCurveTo(cx1, cy1, (i + 1) * segWidth, 0);
      }
      context.strokeStyle = style.stroke;
      context.lineWidth = 1.5 * scaleFactor;
      context.stroke();
      // Bottom wavy line
      context.beginPath();
      context.moveTo(0, height);
      for (let i = 0; i < segments; i++) {
        const cx1 = i * segWidth + segWidth * 0.5;
        const cy1 = height + (i % 2 === 0 ? -amplitude : amplitude);
        context.quadraticCurveTo(cx1, cy1, (i + 1) * segWidth, height);
      }
      context.stroke();
    } else if (ductType === "insulated") {
      // Insulated duct: double-wall with insulation pattern
      // Outer insulation layer (dashed)
      context.beginPath();
      context.rect(-2 * scaleFactor, -2 * scaleFactor, width + 4 * scaleFactor, height + 4 * scaleFactor);
      context.fillStyle = "rgba(255,200,100,0.4)";
      context.fill();
      context.lineWidth = 1.5 * scaleFactor;
      context.strokeStyle = "#CC9900";
      context.setLineDash([4 * scaleFactor, 2 * scaleFactor]);
      context.stroke();
      context.setLineDash([]);
      // Inner duct
      context.beginPath();
      context.rect(0, 0, width, height);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // Cross-hatch insulation pattern
      context.strokeStyle = "#CC9900";
      context.lineWidth = 0.5 * scaleFactor;
      context.globalAlpha = 0.4;
      for (let i = 0; i < width; i += 10 * scaleFactor) {
        context.beginPath();
        context.moveTo(i, -2 * scaleFactor);
        context.lineTo(i + 6 * scaleFactor, height + 2 * scaleFactor);
        context.stroke();
      }
      context.globalAlpha = 1.0;
    } else {
      // Standard rectangular duct
      context.beginPath();
      context.rect(0, 0, width, height);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      if (style.dash.length > 0) {
        context.setLineDash(style.dash.map(d => d * scaleFactor));
      }
      context.stroke();
      context.setLineDash([]);

      // Airflow arrow inside duct
      const arrowX = width * 0.75;
      const arrowY = height / 2;
      const arrowSize = Math.min(width * 0.08, height * 0.3);
      context.beginPath();
      context.moveTo(arrowX - arrowSize, arrowY - arrowSize);
      context.lineTo(arrowX + arrowSize, arrowY);
      context.lineTo(arrowX - arrowSize, arrowY + arrowSize);
      context.fillStyle = style.stroke;
      context.globalAlpha = 0.4;
      context.fill();
      context.globalAlpha = 1.0;

      // Duct size tick marks at ends
      context.beginPath();
      context.moveTo(0, -2 * scaleFactor);
      context.lineTo(0, height + 2 * scaleFactor);
      context.moveTo(width, -2 * scaleFactor);
      context.lineTo(width, height + 2 * scaleFactor);
      context.lineWidth = 1 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
    }

    // Label (duct type tag + size if available)
    if (style.label || duct.sizeLabel) {
      const labelText = duct.sizeLabel || style.label;
      context.font = `bold ${9 * scaleFactor}px Arial`;
      context.fillStyle = style.stroke;
      context.textAlign = "center";
      context.fillText(labelText, width / 2, -3 * scaleFactor);
    }

    context.restore();

    // Draw duct type SVG icon
    const svgKeyMap = {
      supply: "supplyDuct", return: "returnDuct", flex: "flexDuct", exhaust: "exhaustGrille", insulated: "insulatedDuct", default: "duct"
    };
    const svgKey = svgKeyMap[ductType] || svgKeyMap.default;
    drawSymbolImage(symbolImages[svgKey], (img) => {
      context.save();
      context.translate(x, y);
      const iconSize = 14 * scaleFactor;
      context.globalAlpha = 0.4;
      context.drawImage(img, 2, (height - iconSize) / 2, iconSize * 2, iconSize);
      context.globalAlpha = 1.0;
      context.restore();
    });
  });

  // ─── RENDER DIFFUSERS ───
  // Keep label anchors unique so nearby RG/SD tags don't combine visually.
  const reservedTagAnchors = [];
  const reservedAirflowAnchors = [];
  const reserveLabelSlot = (baseX, baseY, reserved) => {
    const X_GAP = 24 * scaleFactor;
    const Y_GAP = 10 * scaleFactor;
    const STEP = 8 * scaleFactor;
    
    const checkCollision = (testY) => {
      return reserved.some(
        (p) => Math.abs(p.x - baseX) < X_GAP && Math.abs(p.y - testY) < Y_GAP
      );
    };
    
    let currentY = baseY;
    let tries = 0;

    while (tries < 8 && checkCollision(currentY)) {
      const stepIndex = Math.floor(tries / 2) + 1;
      const dir = tries % 2 === 0 ? 1 : -1;
      currentY = baseY + dir * stepIndex * STEP;
      tries += 1;
    }

    reserved.push({ x: baseX, y: currentY });
    return { x: baseX, y: currentY };
  };

  hvacAnnotations?.diffusers?.forEach((diffuser) => {
    const x = diffuser.xPercent * canvasWidth;
    const y = diffuser.yPercent * canvasHeight;
    const size = (diffuser.sizePercent || 0.04) * canvasWidth;
    const diffuserType = diffuser.diffuserType || diffuser.shape || "default";
    const style = DIFFUSER_STYLES[diffuserType] || DIFFUSER_STYLES.default;

    context.save();
    context.globalAlpha = 0.4;

    if (diffuserType === "linear-slot") {
      // Linear slot: wide thin rectangle with slot lines
      const slotW = size * 2;
      const slotH = size * 0.4;
      context.beginPath();
      context.rect(x - slotW / 2, y - slotH / 2, slotW, slotH);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 1.5 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // Slot lines
      const numSlots = 5;
      for (let i = 1; i < numSlots; i++) {
        const sx = x - slotW / 2 + (slotW / numSlots) * i;
        context.beginPath();
        context.moveTo(sx, y - slotH / 2 + 2);
        context.lineTo(sx, y + slotH / 2 - 2);
        context.lineWidth = 0.8 * scaleFactor;
        context.stroke();
      }
    } else if (diffuserType === "return-grille" || diffuserType === "exhaust") {
      // Return/exhaust grilles: rectangle with horizontal louver lines
      context.beginPath();
      context.rect(x - size / 2, y - size / 2, size, size);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // Louver lines
      const numLouvers = 5;
      for (let i = 1; i < numLouvers; i++) {
        const ly = y - size / 2 + (size / numLouvers) * i;
        context.beginPath();
        context.moveTo(x - size / 2 + 3, ly);
        context.lineTo(x + size / 2 - 3, ly);
        context.lineWidth = 0.8 * scaleFactor;
        context.stroke();
      }
      // For exhaust, add diagonal hatching
      if (diffuserType === "exhaust") {
        context.globalAlpha = 0.4;
        for (let i = 0; i < size; i += 5 * scaleFactor) {
          context.beginPath();
          context.moveTo(x - size / 2 + i, y - size / 2);
          context.lineTo(x - size / 2, y - size / 2 + i);
          context.stroke();
        }
        context.globalAlpha = 0.4;
      }
    } else if (diffuserType === "supply-4way" || diffuserType === "square") {
      // 4-way supply: square with X pattern and directional arrows
      context.beginPath();
      context.rect(x - size / 2, y - size / 2, size, size);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // X pattern
      context.beginPath();
      context.moveTo(x - size / 2, y - size / 2);
      context.lineTo(x + size / 2, y + size / 2);
      context.moveTo(x + size / 2, y - size / 2);
      context.lineTo(x - size / 2, y + size / 2);
      context.lineWidth = 1 * scaleFactor;
      context.stroke();
    } else if (diffuserType === "jet") {
      // JET diffuser: nozzle with arrow (high velocity)
      context.beginPath();
      context.rect(x - size * 0.35, y - size * 0.25, size * 0.25, size * 0.5);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // Nozzle cone
      context.beginPath();
      context.moveTo(x - size * 0.1, y - size * 0.2);
      context.lineTo(x + size * 0.35, y);
      context.lineTo(x - size * 0.1, y + size * 0.2);
      context.closePath();
      context.fillStyle = style.fill;
      context.fill();
      context.stroke();
      // Arrow
      context.beginPath();
      context.moveTo(x + size * 0.3, y);
      context.lineTo(x + size * 0.5, y);
      context.moveTo(x + size * 0.42, y - size * 0.1);
      context.lineTo(x + size * 0.5, y);
      context.lineTo(x + size * 0.42, y + size * 0.1);
      context.lineWidth = 2.5 * scaleFactor;
      context.stroke();
    } else if (diffuserType === "wall-diffuser") {
      // Wall diffuser: rectangle with wall representation and airflow lines
      // Wall section
      context.beginPath();
      context.rect(x - size * 0.5, y - size * 0.35, size * 0.15, size * 0.7);
      context.fillStyle = "rgba(100,100,100,0.3)";
      context.fill();
      context.lineWidth = 1 * scaleFactor;
      context.strokeStyle = "#666";
      context.stroke();
      // Diffuser body
      context.beginPath();
      context.rect(x - size * 0.35, y - size * 0.25, size * 0.55, size * 0.5);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // Louver lines
      for (let i = 1; i < 4; i++) {
        const ly = y - size * 0.2 + (size * 0.4 / 4) * i;
        context.beginPath();
        context.moveTo(x - size * 0.3, ly);
        context.lineTo(x + size * 0.15, ly);
        context.lineWidth = 0.8 * scaleFactor;
        context.stroke();
      }
      // Airflow arrows
      context.beginPath();
      context.moveTo(x + size * 0.2, y - size * 0.15);
      context.lineTo(x + size * 0.45, y - size * 0.25);
      context.moveTo(x + size * 0.2, y);
      context.lineTo(x + size * 0.5, y);
      context.moveTo(x + size * 0.2, y + size * 0.15);
      context.lineTo(x + size * 0.45, y + size * 0.25);
      context.lineWidth = 1.5 * scaleFactor;
      context.stroke();
    } else if (diffuserType === "transfer-grille") {
      // Transfer grille: rectangle with bi-directional arrows
      context.beginPath();
      context.rect(x - size * 0.45, y - size * 0.3, size * 0.9, size * 0.6);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // Horizontal bars
      for (let i = 1; i < 4; i++) {
        const ly = y - size * 0.25 + (size * 0.5 / 4) * i;
        context.beginPath();
        context.moveTo(x - size * 0.4, ly);
        context.lineTo(x + size * 0.4, ly);
        context.lineWidth = 0.8 * scaleFactor;
        context.stroke();
      }
      // Up/down transfer arrows
      context.beginPath();
      context.moveTo(x - size * 0.15, y - size * 0.45);
      context.lineTo(x, y - size * 0.32);
      context.lineTo(x + size * 0.15, y - size * 0.45);
      context.moveTo(x - size * 0.15, y + size * 0.45);
      context.lineTo(x, y + size * 0.32);
      context.lineTo(x + size * 0.15, y + size * 0.45);
      context.lineWidth = 1.5 * scaleFactor;
      context.stroke();
    } else if (diffuserType === "drain-point") {
      // Drain point: circle with down arrow
      context.beginPath();
      context.arc(x, y - size * 0.1, size * 0.3, 0, 2 * Math.PI);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // Inner filled circle
      context.beginPath();
      context.arc(x, y - size * 0.1, size * 0.12, 0, 2 * Math.PI);
      context.fillStyle = style.stroke;
      context.fill();
      // Down arrow for drainage
      context.beginPath();
      context.moveTo(x, y + size * 0.1);
      context.lineTo(x, y + size * 0.45);
      context.moveTo(x - size * 0.12, y + size * 0.3);
      context.lineTo(x, y + size * 0.45);
      context.lineTo(x + size * 0.12, y + size * 0.3);
      context.lineWidth = 2.5 * scaleFactor;
      context.stroke();
    } else {
      // Default round diffuser (with concentric circles)
      context.beginPath();
      context.arc(x, y, size / 2, 0, 2 * Math.PI);
      context.fillStyle = style.fill;
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = style.stroke;
      context.stroke();
      // Inner circle
      context.beginPath();
      context.arc(x, y, size / 4, 0, 2 * Math.PI);
      context.lineWidth = 1 * scaleFactor;
      context.stroke();
      // Center dot
      context.beginPath();
      context.arc(x, y, 2 * scaleFactor, 0, 2 * Math.PI);
      context.fillStyle = style.stroke;
      context.fill();
    }

    // CFM / airflow label
    if (diffuser.airflow) {
      const airflowPos = reserveLabelSlot(
        x,
        y + size / 2 + 10 * scaleFactor,
        reservedAirflowAnchors
      );
      context.font = `bold ${8 * scaleFactor}px Arial`;
      context.fillStyle = style.stroke;
      context.textAlign = "center";
      context.fillText(`${diffuser.airflow} CFM`, airflowPos.x, airflowPos.y);
    }

    // Diffuser type tag
    const tagMap = { 
      "supply-4way": "SD", "round": "SD", "linear-slot": "LD", "return-grille": "RG", "exhaust": "EG",
      "jet": "JD", "wall-diffuser": "WD", "transfer-grille": "TG", "drain-point": "DP"
    };
    const tag = tagMap[diffuserType];
    if (tag) {
      const baseTagX = x;
      const baseTagY = y - size / 2 - 3 * scaleFactor;
      const tagPos = reserveLabelSlot(baseTagX, baseTagY, reservedTagAnchors);
      context.font = `bold ${8 * scaleFactor}px Arial`;
      context.fillStyle = style.stroke;
      context.textAlign = "center";
      context.fillText(tag, tagPos.x, tagPos.y);
    }

    context.restore();

    // Draw SVG symbol overlay (semi-transparent)
    drawSymbolImage(symbolImages[style.svgKey], (img) => {
      context.save();
      context.globalAlpha = 0.4;
      context.drawImage(img, x - size / 2, y - size / 2, size, size);
      context.globalAlpha = 1.0;
      context.restore();
    });
  });

  // ─── RENDER DAMPERS ───
  hvacAnnotations?.dampers?.forEach((damper) => {
    const x = damper.xPercent * canvasWidth;
    const y = damper.yPercent * canvasHeight;
    const size = (damper.sizePercent || 0.025) * canvasWidth;
    const damperType = damper.damperType || "volume";

    context.save();

    if (damperType === "fire") {
      // Fire damper: red diamond with FD
      context.beginPath();
      context.moveTo(x, y - size / 2);
      context.lineTo(x + size / 2, y);
      context.lineTo(x, y + size / 2);
      context.lineTo(x - size / 2, y);
      context.closePath();
      context.fillStyle = "rgba(204,0,0,0.4)";
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = "#CC0000";
      context.stroke();
      context.font = `bold ${8 * scaleFactor}px Arial`;
      context.fillStyle = "#CC0000";
      context.textAlign = "center";
      context.fillText("FD", x, y + 3 * scaleFactor);
    } else {
      // Volume damper: circle with VD
      context.beginPath();
      context.arc(x, y, size / 2, 0, 2 * Math.PI);
      context.fillStyle = "rgba(85,85,85,0.4)";
      context.fill();
      context.lineWidth = 2 * scaleFactor;
      context.strokeStyle = "#555";
      context.stroke();
      context.font = `bold ${8 * scaleFactor}px Arial`;
      context.fillStyle = "#555";
      context.textAlign = "center";
      context.fillText("VD", x, y + 3 * scaleFactor);
    }

    context.restore();

    // SVG overlay
    const svgKey = damperType === "fire" ? "fireDamper" : "volumeDamper";
    drawSymbolImage(symbolImages[svgKey], (img) => {
      context.save();
      context.globalAlpha = 0.4;
      context.drawImage(img, x - size / 2, y - size / 2, size, size);
      context.globalAlpha = 1.0;
      context.restore();
    });
  });

  // ─── RENDER THERMOSTATS ───
  hvacAnnotations?.thermostats?.forEach((thermo) => {
    const x = thermo.xPercent * canvasWidth;
    const y = thermo.yPercent * canvasHeight;
    const size = (thermo.sizePercent || 0.02) * canvasWidth;

    // Draw thermostat: rounded rectangle with T label
    context.save();
    const r = size * 0.3;
    context.beginPath();
    context.moveTo(x - size / 2 + r, y - size / 2);
    context.arcTo(x + size / 2, y - size / 2, x + size / 2, y + size / 2, r);
    context.arcTo(x + size / 2, y + size / 2, x - size / 2, y + size / 2, r);
    context.arcTo(x - size / 2, y + size / 2, x - size / 2, y - size / 2, r);
    context.arcTo(x - size / 2, y - size / 2, x + size / 2, y - size / 2, r);
    context.closePath();
    context.fillStyle = "rgba(139,92,246,0.4)";
    context.fill();
    context.lineWidth = 1.5 * scaleFactor;
    context.strokeStyle = "#8B5CF6";
    context.stroke();

    // Label
    context.fillStyle = "#8B5CF6";
    context.font = `bold ${Math.max(8, size * 0.45) * scaleFactor}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(thermo.label || "T", x, y);
    context.restore();

    // SVG overlay
    drawSymbolImage(symbolImages.thermostat, (img) => {
      context.save();
      context.globalAlpha = 0.4;
      context.drawImage(img, x - size / 2, y - size / 2, size, size);
      context.globalAlpha = 1.0;
      context.restore();
    });
  });

  // ─── DUCT-TO-DIFFUSER CONNECTION LINES ───
  // Connect diffusers to nearest matching duct with professional dashed branch lines
  if (hvacAnnotations?.ducts && hvacAnnotations?.diffusers && (!acType || acType !== "vrf-ductless")) {
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
          const ductW = (duct.width || 0.08) * canvasWidth;
          const ductH = (duct.height || 0.025) * canvasHeight;
          const ductCenterX = duct.xPercent * canvasWidth + ductW / 2;
          const ductCenterY = duct.yPercent * canvasHeight + ductH / 2;
          const dx = diffuser.xPercent * canvasWidth;
          const dy = diffuser.yPercent * canvasHeight;
          // Use duct type color for branch line
          const branchColor = (duct.ductType === 'return') ? '#CC4400' : '#0055CC';
          context.save();
          context.setLineDash([4 * scaleFactor, 3 * scaleFactor]);
          context.lineWidth = 1.5 * scaleFactor;
          context.strokeStyle = branchColor;
          context.globalAlpha = 0.4;
          context.beginPath();
          context.moveTo(ductCenterX, ductCenterY);
          context.lineTo(dx, dy);
          context.stroke();
          context.globalAlpha = 1.0;
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
          const ductW = (duct.width || 0.08) * canvasWidth;
          const ductH = (duct.height || 0.025) * canvasHeight;
          const ductCenterX = duct.xPercent * canvasWidth + ductW / 2;
          const ductCenterY = duct.yPercent * canvasHeight + ductH / 2;
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
              nearestDuct = { x: ductCenterX, y: ductCenterY, ductType: duct.ductType };
            }
          }
        });
        // Fallback to nearest duct if no matching group
        if (!nearestDuct) {
          hvacAnnotations.ducts.forEach((duct) => {
            const ductW = (duct.width || 0.08) * canvasWidth;
            const ductH = (duct.height || 0.025) * canvasHeight;
            const ductCenterX = duct.xPercent * canvasWidth + ductW / 2;
            const ductCenterY = duct.yPercent * canvasHeight + ductH / 2;
            const dist = Math.sqrt(
              (dx - ductCenterX) ** 2 + (dy - ductCenterY) ** 2
            );
            if (dist < minDist) {
              minDist = dist;
              nearestDuct = { x: ductCenterX, y: ductCenterY, ductType: duct.ductType };
            }
          });
        }
        if (nearestDuct) {
          const branchColor = nearestDuct.ductType === 'return' ? '#CC4400' : '#0055CC';
          context.save();
          context.setLineDash([4 * scaleFactor, 3 * scaleFactor]);
          context.lineWidth = 1.5 * scaleFactor;
          context.strokeStyle = branchColor;
          context.globalAlpha = 0.4;
          context.beginPath();
          context.moveTo(dx, dy);
          context.lineTo(nearestDuct.x, nearestDuct.y);
          context.stroke();
          context.globalAlpha = 1.0;
          context.restore();
        }
      });
    }
  }
};

export const overlayAnnotations = (context, annotations, acType, options = {}) => {
  const { skipRefrigerantLines = false, pdfScale = 1.5, pdfExport = false } = options;
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  const normalizeLinePoints = (line) => {
    const rawPoints = Array.isArray(line.points) ? line.points : [];
    if (rawPoints.length < 4) return [];

    const isPercent = rawPoints.every((value) => {
      const numericValue = typeof value === "string" ? parseFloat(value) : value;
      return Number.isFinite(numericValue) && Math.abs(numericValue) <= 1.5;
    });

    return rawPoints.reduce((acc, value, index) => {
      const numericValue = typeof value === "string" ? parseFloat(value) : value;
      if (!Number.isFinite(numericValue)) return acc;
      acc.push(index % 2 === 0
        ? (isPercent ? numericValue * canvasWidth : numericValue)
        : (isPercent ? numericValue * canvasHeight : numericValue));
      return acc;
    }, []);
  };

  console.log('overlayAnnotations: Converting percentages with canvas dimensions:', { canvasWidth, canvasHeight });
  if (annotations?.rectangles?.length > 0) {
    console.log('Sample rectangle percent coords:', {
      xPercent: annotations.rectangles[0].xPercent,
      yPercent: annotations.rectangles[0].yPercent,
      willRenderAt: {
        x: annotations.rectangles[0].xPercent * canvasWidth,
        y: annotations.rectangles[0].yPercent * canvasHeight
      }
    });
  }
  
  const getRotatedCenter = (x, y, width, height, angleDeg) => {
    const angle = (angleDeg || 0) * (Math.PI / 180);
    // The center of the rotated rectangle (after rotation around top-left)
    const cx = width / 2;
    const cy = height / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotatedCx = cx * cos - cy * sin;
    const rotatedCy = cx * sin + cy * cos;
    return { x: x + rotatedCx, y: y + rotatedCy };
  };

  /**
   * Check if a point is near a rectangle's rotated center.
   * Uses distance from rotated center to handle rotated rectangles correctly.
   */
  const isPointNearRect = (px, py, rect, tolerance = 100) => {
    // Use the rotated center to correctly handle rotated rectangles
    const rotatedCenter = getRotatedCenter(
      rect.xPercent * canvasWidth,
      rect.yPercent * canvasHeight,
      rect.widthPercent * canvasWidth,
      rect.heightPercent * canvasHeight,
      rect.rotation
    );
    // Check distance from point to rotated center
    const dist = Math.sqrt((px - rotatedCenter.x) ** 2 + (py - rotatedCenter.y) ** 2);
    // Use tolerance plus half the diagonal of the rectangle for loose matching
    const rw = rect.widthPercent * canvasWidth;
    const rh = rect.heightPercent * canvasHeight;
    const halfDiag = Math.sqrt(rw * rw + rh * rh) / 2;
    return dist <= tolerance + halfDiag;
  };

  // rectangles - ALWAYS render user-drawn rectangles (engineer annotations)
  // Rotate around top-left corner to match stored rectangle positioning
  annotations?.rectangles?.forEach((rect) => {
    // Convert percentage-based coordinates directly to pixel coordinates
    // No offset needed — percentages saved to DB are accurate reference points
    const x = rect.xPercent * canvasWidth;
    const y = rect.yPercent * canvasHeight;
    const width = rect.widthPercent * canvasWidth;
    const height = rect.heightPercent * canvasHeight;
    
    console.log('Rendering rectangle:', {
      id: rect.id,
      percentages: { xPercent: rect.xPercent, yPercent: rect.yPercent },
      canvasDimensions: { canvasWidth, canvasHeight },
      pixels: { x, y, width, height }
    });
    
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
  // lines - draw stored connector lines (user-created callout lines linking rectangles to comments)
  annotations?.lines?.forEach((line) => {
    context.beginPath();
    // Only convert percent to pixel if all points are <= 1.5 (percent-based)
    const isPercent = line.points.every((p) => Math.abs(p) <= 1.5);
    const points = isPercent
      ? line.points.map((val, idx) =>
          idx % 2 === 0
            ? val * canvasWidth
            : val * canvasHeight
        )
      : line.points;
    context.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      context.lineTo(points[i], points[i + 1]);
    }
    context.lineWidth = line.strokeWidth || 2;
    context.strokeStyle = line.stroke || "black";
    context.stroke();
  });
  // comments - filter by acType to show only comments created in current mode
  annotations?.comments?.forEach((comment) => {
    // Only render comment if it matches current acType or has no acType (legacy comments)
    if (comment.acType && comment.acType !== acType) {
      return; // Skip this comment
    }

    const x = comment.xPercent * canvasWidth;
    const y = comment.yPercent * canvasHeight;
    const scaleFactor = pdfScale / 1.5;
    const padding = 8 * scaleFactor;
    const fontSize = 11 * scaleFactor;
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

  // Draw lines from rectangles to nearest comments (callout style),
  // but only if a user-created line does NOT already exist between those points.
  // Skip only for vrf-ducted — its chain lines already connect everything visually
  if (acType !== "vrf-ducted") annotations?.rectangles?.forEach((rect) => {
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
    if (nearestComment && minDist < 150 * pdfScale) {
      // Check if a user-created line already exists between this rect and comment
      const cx = nearestComment.xPercent * canvasWidth;
      const cy = nearestComment.yPercent * canvasHeight;
      const hasUserLine = (annotations.lines || []).some((line) => {
        // Normalize stored line points (percent or pixel) before comparing endpoints.
        // IMPORTANT: Do NOT apply lineReductionFactor (0.985) here — that factor is
        // only for visual rendering offset. Rect centers and comment positions are
        // computed without any reduction, so line points must match that scale.
        const points = line.points;
        if (!points || points.length < 4) return false;
        const isPercent = points.every((p) => Math.abs(p) <= 1.5);
        const normalizedPoints = isPercent
          ? points.map((val, idx) =>
              idx % 2 === 0 ? val * canvasWidth : val * canvasHeight
            )
          : points;
        const x1 = normalizedPoints[0];
        const y1 = normalizedPoints[1];
        const x2 = normalizedPoints[normalizedPoints.length - 2];
        const y2 = normalizedPoints[normalizedPoints.length - 1];

        // Round all coordinates to nearest integer to avoid sub-pixel mismatch
        const rxR = Math.round(rx), ryR = Math.round(ry), cxR = Math.round(cx), cyR = Math.round(cy);
        const x1R = Math.round(x1), y1R = Math.round(y1), x2R = Math.round(x2), y2R = Math.round(y2);
        // Use generous tolerance scaled with pdfScale since user-drawn lines often start from
        // rectangle edges/corners rather than exact rotated center
        const scaledTol = 50 * pdfScale;
        const close = (a, b) => Math.abs(a - b) < scaledTol;
        const match1 = close(x1R, rxR) && close(y1R, ryR) && close(x2R, cxR) && close(y2R, cyR);
        const match2 = close(x2R, rxR) && close(y2R, ryR) && close(x1R, cxR) && close(y1R, cyR);
        return match1 || match2;
      });
      if (!hasUserLine) {
        // Render a single dotted auto-connector only when no user line exists.
        context.save();
        const dash = pdfExport ? [4 * (pdfScale / 1.5), 4 * (pdfScale / 1.5)] : [5, 5];
        context.setLineDash(dash);
        context.lineWidth = 1;
        context.strokeStyle = "gray";
        context.beginPath();
        context.moveTo(rx, ry);
        context.lineTo(cx, cy);
        context.stroke();
        context.restore();
      }
    }
  }); // end callout lines (skipped for vrf-ducted)

  const storedRefrigerantLines = !skipRefrigerantLines ? (annotations?.hvac?.refrigerantLines || []) : [];

  if (storedRefrigerantLines.length > 0) {
    storedRefrigerantLines.forEach((line) => {
      const normalizedPoints = normalizeLinePoints(line);
      if (normalizedPoints.length < 4) return;

      context.save();
      context.beginPath();
      context.moveTo(normalizedPoints[0], normalizedPoints[1]);
      for (let i = 2; i < normalizedPoints.length; i += 2) {
        context.lineTo(normalizedPoints[i], normalizedPoints[i + 1]);
      }
      context.lineWidth = line.strokeWidth || 2;
      context.strokeStyle = line.stroke || "#FF6B35";
      context.setLineDash([6, 3]);
      context.stroke();
      context.restore();
    });
  } else {
    // For minisplit ducted systems, draw blue dashed refrigerant lines connecting AC units to condenser
    // Star topology: Condenser connects directly to each AC1, AC2, AC3, etc.
    // Skip for VRF systems which have their own topology logic

if (
  !skipRefrigerantLines &&
  acType === "ducted" &&
  !acType.startsWith("vrf") &&
  annotations?.rectangles &&
  annotations.rectangles.length > 1
) {
  // Collect all condensers: prefer explicit flags, then comment matches, then smallest rectangle fallback
  let condensers = [];

  // 1) Explicit flags
  annotations.rectangles.forEach((rect) => {
    if (rect.isCondenser) condensers.push(rect);
  });

  // 2) Comment-based matching
  if (condensers.length === 0 && annotations.comments) {
    const condenserComments = annotations.comments.filter((c) =>
      c.text.toLowerCase().includes("condenser")
    );
    condenserComments.forEach((comment) => {
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
    });
  }

  // 3) Smallest rectangle fallback (if still no condensers)
  if (condensers.length === 0) {
    let minArea = Infinity;
    annotations.rectangles.forEach((rect) => {
      const area = rect.widthPercent * rect.heightPercent;
      if (area > 0 && area < minArea) {
        minArea = area;
        condensers = [rect]; // Fallback to single smallest (may not work for multiple flats)
      }
    });
  }

  if (condensers.length > 0) {
    // Get all non-condenser rectangles (indoor AC units)
    const indoorUnits = annotations.rectangles.filter(
      (rect) => !rect.isCondenser && !condensers.includes(rect)
    );

    // For each indoor unit, find the nearest condenser and draw a blue dashed line
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

      // Find nearest condenser (track both rect and center)
      let nearestCondenser = null;
      let nearestCondRect = null;
      let minDist = Infinity;
      condensers.forEach((cond) => {
        const condCenter = getRotatedCenter(
          cond.xPercent * canvasWidth,
          cond.yPercent * canvasHeight,
          cond.widthPercent * canvasWidth,
          cond.heightPercent * canvasHeight,
          cond.rotation
        );
        const dist = Math.sqrt(
          (unitX - condCenter.x) ** 2 + (unitY - condCenter.y) ** 2
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCondenser = condCenter;
          nearestCondRect = cond;
        }
      });

      if (nearestCondenser && nearestCondRect) {
        // Check if ANY user line connects this unit to the condenser
        // Must check BOTH endpoints to avoid false positives from callout lines
        const hasUserRefrigerantLine = (annotations.lines || []).some((line) => {
          const points = line.points;
          if (!points || points.length < 4) return false;
          const isPercent = points.every((p) => Math.abs(p) <= 1.5);
          const normalizedPoints = isPercent
            ? points.map((val, idx) =>
                idx % 2 === 0 ? val * canvasWidth : val * canvasHeight
              )
            : points;
          const x1 = normalizedPoints[0];
          const y1 = normalizedPoints[1];
          const x2 = normalizedPoints[normalizedPoints.length - 2];
          const y2 = normalizedPoints[normalizedPoints.length - 1];
          // Check if line connects this unit to the condenser (either direction)
          const scaledTol = 80 * pdfScale;
          const ep1NearUnit = isPointNearRect(x1, y1, unit, scaledTol);
          const ep2NearUnit = isPointNearRect(x2, y2, unit, scaledTol);
          const ep1NearCond = isPointNearRect(x1, y1, nearestCondRect, scaledTol);
          const ep2NearCond = isPointNearRect(x2, y2, nearestCondRect, scaledTol);
          return (ep1NearUnit && ep2NearCond) || (ep2NearUnit && ep1NearCond);
        });
        
        if (!hasUserRefrigerantLine) {
          drawOrthogonalLine(context, unitX, unitY, nearestCondenser.x, nearestCondenser.y, {
            color: "blue", dash: [5, 5], lineWidth: 2
          });
        }
      }
    });
  }
}
  // For ductless systems, draw refrigerant lines connecting rectangles to their nearest condenser
  if (
    !skipRefrigerantLines &&
    acType === "ductless" &&
    !acType.startsWith("vrf") &&
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
        let nearestCondRect = null;
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
            nearestCondRect = cond;
          }
        });
        if (nearestCondenser && nearestCondRect) {
          const cx = nearestCondenser.cx;
          const cy = nearestCondenser.cy;
          // Check if ANY user line connects this rectangle to the condenser
          // Must check BOTH endpoints to avoid false positives from callout lines
          const hasUserRefrigerantLine = (annotations.lines || []).some((line) => {
            const points = line.points;
            if (!points || points.length < 4) return false;
            const isPercent = points.every((p) => Math.abs(p) <= 1.5);
            const normalizedPoints = isPercent
              ? points.map((val, idx) =>
                  idx % 2 === 0 ? val * canvasWidth : val * canvasHeight
                )
              : points;
            const x1 = normalizedPoints[0];
            const y1 = normalizedPoints[1];
            const x2 = normalizedPoints[normalizedPoints.length - 2];
            const y2 = normalizedPoints[normalizedPoints.length - 1];
            // Check if line connects this rect to the condenser (either direction)
            const scaledTol = 80 * pdfScale;
            const ep1NearRect = isPointNearRect(x1, y1, rect, scaledTol);
            const ep2NearRect = isPointNearRect(x2, y2, rect, scaledTol);
            const ep1NearCond = isPointNearRect(x1, y1, nearestCondRect, scaledTol);
            const ep2NearCond = isPointNearRect(x2, y2, nearestCondRect, scaledTol);
            return (ep1NearRect && ep2NearCond) || (ep2NearRect && ep1NearCond);
          });
          if (!hasUserRefrigerantLine) {
            drawOrthogonalLine(context, rx, ry, cx, cy, {
              color: "blue", dash: [5, 5], lineWidth: 2
            });
          }
        }
      }
    });
  }

  // For VRF ductless systems, draw teal refrigerant lines (star topology per flat)
  // Multi-flat support: condenser-N connects to all ac-N.M units in that flat
  if (!skipRefrigerantLines && acType === "vrf-ductless" && annotations?.rectangles && annotations.rectangles.length > 1) {
    // Find all condensers by comments containing "condenser"
    let condensers = [];
    if (annotations.comments) {
      condensers = annotations.comments
        .filter((c) => c.text.toLowerCase().includes("condenser"))
        .map((comment) => {
          // Use String() for ID comparison to handle type mismatch (string vs number)
          const rect = annotations.rectangles.find((r) => String(r.id) === String(comment.rectId));
          return rect ? { ...rect, comment: comment.text } : null;
        })
        .filter(Boolean);
    }

    // Fallback: explicit isCondenser flag
    if (condensers.length === 0) {
      annotations.rectangles.forEach((rect) => {
        if (rect.isCondenser) condensers.push(rect);
      });
    }

    // Fallback: largest rectangle
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

    if (condensers.length > 0) {
      // Group indoor units by condenser (based on comment: condenser-N → ac-N.M)
      const groups = condensers.map((cond) => {
        const condComment = cond.comment || "";
        const match = condComment.match(/condenser-(\d+)/i);
        const groupNum = match ? match[1] : null;

        let indoorRects = [];
        if (groupNum && annotations.comments) {
          // Find indoor units with matching comments (e.g., "ac-1.1", "ac-1.2" for condenser-1)
          indoorRects = annotations.rectangles
            .filter((rect) => !rect.isCondenser && String(rect.id) !== String(cond.id))
            .filter((rect) => {
              const comment = annotations.comments.find((c) => String(c.rectId) === String(rect.id));
              return comment && comment.text.match(new RegExp(`ac-${groupNum}(\\.\\d+)?`, "i"));
            });
        }
        return { condenser: cond, indoorRects };
      });

      // Draw star topology lines for each group (condenser → each indoor unit)
      groups.forEach(({ condenser, indoorRects }) => {
        if (indoorRects.length === 0) return;

        const condCenter = getRotatedCenter(
          condenser.xPercent * canvasWidth,
          condenser.yPercent * canvasHeight,
          condenser.widthPercent * canvasWidth,
          condenser.heightPercent * canvasHeight,
          condenser.rotation
        );

        indoorRects.forEach((rect) => {
          const rectCenter = getRotatedCenter(
            rect.xPercent * canvasWidth,
            rect.yPercent * canvasHeight,
            rect.widthPercent * canvasWidth,
            rect.heightPercent * canvasHeight,
            rect.rotation
          );
          drawSingleOrthogonalLine(context, rectCenter.x, rectCenter.y, condCenter.x, condCenter.y, "#008B8B", []);
        });
      });

      // Fallback: if no groups matched (no condenser-N naming), use nearest condenser logic
      if (groups.every((g) => g.indoorRects.length === 0)) {
        const condenserIds = new Set(condensers.map((c) => String(c.id)));
        annotations.rectangles.forEach((rect) => {
          if (condenserIds.has(String(rect.id))) return;

          const rectCenter = getRotatedCenter(
            rect.xPercent * canvasWidth,
            rect.yPercent * canvasHeight,
            rect.widthPercent * canvasWidth,
            rect.heightPercent * canvasHeight,
            rect.rotation
          );
          const rx = rectCenter.x;
          const ry = rectCenter.y;

          // Find nearest condenser
          let nearestCondCenter = null;
          let minDist = Infinity;
          condensers.forEach((cond) => {
            const condCenter = getRotatedCenter(
              cond.xPercent * canvasWidth,
              cond.yPercent * canvasHeight,
              cond.widthPercent * canvasWidth,
              cond.heightPercent * canvasHeight,
              cond.rotation
            );
            const dist = Math.sqrt((rx - condCenter.x) ** 2 + (ry - condCenter.y) ** 2);
            if (dist < minDist) {
              minDist = dist;
              nearestCondCenter = condCenter;
            }
          });

          if (nearestCondCenter) {
            drawSingleOrthogonalLine(context, rx, ry, nearestCondCenter.x, nearestCondCenter.y, "#008B8B", []);
          }
        });
      }
    }
  }

  // For VRF ducted systems, draw red/blue dashed supply/return lines between user rectangles
  // Uses sequential chain topology: Rect1→Rect2→Rect3→...→Condenser (largest rectangle)
if (
  !skipRefrigerantLines &&
  acType === "vrf-ducted" &&
  annotations?.rectangles &&
  annotations.rectangles.length > 1
) {
  // Find all condensers by comments containing "condenser"
  let condensers = [];
  if (annotations.comments) {
    condensers = annotations.comments
      .filter((c) => c.text.toLowerCase().includes("condenser"))
      .map((comment) => {
        // Use String() for ID comparison to handle type mismatch (string vs number)
        const rect = annotations.rectangles.find((r) => String(r.id) === String(comment.rectId));
        return rect ? { ...rect, comment: comment.text } : null;
      })
      .filter(Boolean);
  }

  // Fallback to highest id if no condensers found
  if (condensers.length === 0) {
    let maxIdNum = -1;
    let fallbackCondenser = null;
    annotations.rectangles.forEach((rect) => {
      const idNum = parseInt(rect.id) || 0;
      if (idNum > maxIdNum) {
        maxIdNum = idNum;
        fallbackCondenser = rect;
      }
    });
    if (fallbackCondenser) condensers = [fallbackCondenser];
  }

  if (condensers.length > 0) {
    // Group indoor units by condenser (based on comment prefix, e.g., "ac-1*" for "condenser-1")
    const groups = condensers.map((cond) => {
      const condComment = cond.comment || "";
      const match = condComment.match(/condenser-(\d+)/i);
      const groupNum = match ? match[1] : null;

      let indoorRects = [];
      if (groupNum && annotations.comments) {
        // Find indoor units with matching comments (e.g., "ac-1.1", "ac-1.2" for condenser-1)
        indoorRects = annotations.rectangles
          .filter((rect) => !rect.isCondenser && String(rect.id) !== String(cond.id))
          .filter((rect) => {
            // Use String() for ID comparison to handle type mismatch
            const comment = annotations.comments.find((c) => String(c.rectId) === String(rect.id));
            return comment && comment.text.match(new RegExp(`ac-${groupNum}(\\.\\d+)?`, "i"));
          })
          .sort((a, b) => {
            // Sort by sub-number (e.g., ac-1.1 before ac-1.2)
            const aComment = annotations.comments.find((c) => String(c.rectId) === String(a.id))?.text || "";
            const bComment = annotations.comments.find((c) => String(c.rectId) === String(b.id))?.text || "";
            const aMatch = aComment.match(/ac-\d+(\.(\d+))?/i);
            const bMatch = bComment.match(/ac-\d+(\.(\d+))?/i);
            const aSub = aMatch && aMatch[2] ? parseInt(aMatch[2]) : 0;
            const bSub = bMatch && bMatch[2] ? parseInt(bMatch[2]) : 0;
            return aSub - bSub;
          });
      }

      return { condenser: cond, indoorRects };
    });

    // For each group, draw the chain
    groups.forEach(({ condenser, indoorRects }) => {
      if (indoorRects.length === 0) return; // Skip if no indoor units for this condenser

      // Chain indoor units sequentially
      for (let i = 0; i < indoorRects.length - 1; i++) {
        const rect1Center = getRotatedCenter(
          indoorRects[i].xPercent * canvasWidth,
          indoorRects[i].yPercent * canvasHeight,
          indoorRects[i].widthPercent * canvasWidth,
          indoorRects[i].heightPercent * canvasHeight,
          indoorRects[i].rotation
        );
        const rect2Center = getRotatedCenter(
          indoorRects[i + 1].xPercent * canvasWidth,
          indoorRects[i + 1].yPercent * canvasHeight,
          indoorRects[i + 1].widthPercent * canvasWidth,
          indoorRects[i + 1].heightPercent * canvasHeight,
          indoorRects[i + 1].rotation
        );
        drawDualOrthogonalLines(context, rect1Center.x, rect1Center.y, rect2Center.x, rect2Center.y);
      }

      // Connect last indoor unit to condenser
      const lastRectCenter = getRotatedCenter(
        indoorRects[indoorRects.length - 1].xPercent * canvasWidth,
        indoorRects[indoorRects.length - 1].yPercent * canvasHeight,
        indoorRects[indoorRects.length - 1].widthPercent * canvasWidth,
        indoorRects[indoorRects.length - 1].heightPercent * canvasHeight,
        indoorRects[indoorRects.length - 1].rotation
      );
      const condCenter = getRotatedCenter(
        condenser.xPercent * canvasWidth,
        condenser.yPercent * canvasHeight,
        condenser.widthPercent * canvasWidth,
        condenser.heightPercent * canvasHeight,
        condenser.rotation
      );
      drawDualOrthogonalLines(context, lastRectCenter.x, lastRectCenter.y, condCenter.x, condCenter.y);
    });

    // If no groups formed (e.g., no matching comments), fall back to original single-chain logic
    if (groups.every((g) => g.indoorRects.length === 0)) {
      // condensers[] contains spread copies, so compare by id (as string) not reference
      const condenserIds = new Set(condensers.map((c) => String(c.id)));
      const allIndoorRects = annotations.rectangles
        .filter((rect) => !rect.isCondenser && !condenserIds.has(String(rect.id)))
        .sort((a, b) => {
          const getNum = (rect) => {
            if (!annotations.comments) return 0;
            const comment = annotations.comments.find((c) => String(c.rectId) === String(rect.id));
            if (comment) {
              const match = comment.text.match(/ac-(\d+)/i);
              return match ? parseInt(match[1]) : 0;
            }
            return 0;
          };
          return getNum(a) - getNum(b);
        });

      // Use the first condenser for fallback
      const condenser = condensers[0];

      // Chain all indoor units to the single condenser (original logic)
      for (let i = 0; i < allIndoorRects.length - 1; i++) {
        const rect1Center = getRotatedCenter(
          allIndoorRects[i].xPercent * canvasWidth,
          allIndoorRects[i].yPercent * canvasHeight,
          allIndoorRects[i].widthPercent * canvasWidth,
          allIndoorRects[i].heightPercent * canvasHeight,
          allIndoorRects[i].rotation
        );
        const rect2Center = getRotatedCenter(
          allIndoorRects[i + 1].xPercent * canvasWidth,
          allIndoorRects[i + 1].yPercent * canvasHeight,
          allIndoorRects[i + 1].widthPercent * canvasWidth,
          allIndoorRects[i + 1].heightPercent * canvasHeight,
          allIndoorRects[i + 1].rotation
        );
        drawDualOrthogonalLines(context, rect1Center.x, rect1Center.y, rect2Center.x, rect2Center.y);
      }

      // Connect last indoor unit to condenser
      if (allIndoorRects.length > 0) {
        const lastRectCenter = getRotatedCenter(
          allIndoorRects[allIndoorRects.length - 1].xPercent * canvasWidth,
          allIndoorRects[allIndoorRects.length - 1].yPercent * canvasHeight,
          allIndoorRects[allIndoorRects.length - 1].widthPercent * canvasWidth,
          allIndoorRects[allIndoorRects.length - 1].heightPercent * canvasHeight,
          allIndoorRects[allIndoorRects.length - 1].rotation
        );
        const condCenter = getRotatedCenter(
          condenser.xPercent * canvasWidth,
          condenser.yPercent * canvasHeight,
          condenser.widthPercent * canvasWidth,
          condenser.heightPercent * canvasHeight,
          condenser.rotation
        );
        drawDualOrthogonalLines(context, lastRectCenter.x, lastRectCenter.y, condCenter.x, condCenter.y);
      }
    }
  }
}
  }
};

// ─── Canvas Legend ────────────────────────────────────────────────
// Draws a professional legend box directly on the canvas so it appears
// in both the live view and generated PDF exports.

export const drawCanvasLegend = (ctx, acType = "vrf-ducted", options = {}) => {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const { position = "bottom-left", pdfScale = 1.5 } = options;

  // Scale factor relative to default scale (1.5)
  const scaleFactor = pdfScale / 1.5;

  // Build legend entries based on acType
  const entries = [];

  // ── Refrigerant lines (all modes) ──
  if (acType === "vrf-ducted") {
    entries.push({ type: "line", color: "red",      dash: [6, 3], label: "Refrigerant Supply (Liquid ⅜″)" });
    entries.push({ type: "line", color: "#0066FF",  dash: [6, 3], label: "Refrigerant Return (Suction ⅝″)" });
  } else if (acType === "vrf-ductless") {
    entries.push({ type: "line", color: "#008B8B",  dash: [],     label: "Refrigerant Line (Star Topology)" });
  } else if (acType === "ducted") {
    entries.push({ type: "line", color: "blue",     dash: [5, 4], label: "Refrigerant Line" });
  } else if (acType === "ductless") {
    entries.push({ type: "line", color: "blue",     dash: [5, 4], label: "Refrigerant Line" });
  }

  // ── Ductwork (ducted modes only) ──
  if (acType === "ducted" || acType === "vrf-ducted") {
    entries.push({ type: "line", color: "#0055CC",  dash: [],     label: "Supply Duct (SA)" });
    entries.push({ type: "line", color: "#CC4400",  dash: [5, 3], label: "Return Duct (RA)" });
    entries.push({ type: "line", color: "#888",     dash: [2, 2], label: "Flex Duct (FD)" });
    entries.push({ type: "line", color: "#228B22",  dash: [4, 4], label: "Exhaust Duct (EA)" });
    entries.push({ type: "line", color: "#CC9900",  dash: [8, 2, 2, 2], label: "Insulated Duct (ID)" });
    entries.push({ type: "line", color: "#0055CC",  dash: [4, 3], label: "Branch Connection Line" });
  }

  // ── Diffusers & Grilles (ducted modes) ──
  if (acType === "ducted" || acType === "vrf-ducted") {
    entries.push({ type: "symbol", shape: "square-x",  color: "#0055CC", label: "Supply Diffuser 4-Way (SD)" });
    entries.push({ type: "symbol", shape: "circle",    color: "#0055CC", label: "Round Diffuser (SD)" });
    entries.push({ type: "symbol", shape: "slot",      color: "#0055CC", label: "Linear Slot Diffuser (LD)" });
    entries.push({ type: "symbol", shape: "jet",       color: "#0055CC", label: "JET Diffuser (JD)" });
    entries.push({ type: "symbol", shape: "wall-diff", color: "#0055CC", label: "Wall Diffuser (WD)" });
    entries.push({ type: "symbol", shape: "square-eq", color: "#CC4400", label: "Return Grille (RG)" });
    entries.push({ type: "symbol", shape: "transfer",  color: "#CC4400", label: "Transfer Grille (TG)" });
    entries.push({ type: "symbol", shape: "square-h",  color: "#228B22", label: "Exhaust Grille (EG)" });
    entries.push({ type: "symbol", shape: "drain",     color: "#0088AA", label: "Drain Point (DP)" });
  }

  // ── Dampers (ducted modes) ──
  if (acType === "ducted" || acType === "vrf-ducted") {
    entries.push({ type: "symbol", shape: "diamond", color: "#CC0000", label: "Fire Damper (FD)" });
    entries.push({ type: "symbol", shape: "circle-vd", color: "#555",  label: "Volume Damper (VD)" });
  }

  // ── Thermostat (ducted modes) ──
  if (acType === "ducted" || acType === "vrf-ducted") {
    entries.push({ type: "symbol", shape: "thermostat", color: "#8B5CF6", label: "Thermostat (T)" });
  }

  // ── Units ──
  entries.push({ type: "symbol", shape: "rect-fill", color: "rgba(20,205,230,0.6)", label: "Indoor Unit (User-placed)" });
  entries.push({ type: "symbol", shape: "rect-fill", color: "rgba(255,140,50,0.6)", label: "Condenser / Outdoor Unit" });

  if (entries.length === 0) return;

  // ── Layout constants (3-column layout to minimize height) ──
  // All dimensions scale with pdfScale
  const rowH = 14 * scaleFactor;
  const padX = 8 * scaleFactor;
  const padY = 6 * scaleFactor;
  const iconW = 24 * scaleFactor;
  const gap = 5 * scaleFactor;
  const titleH = 16 * scaleFactor;
  const colW = 145 * scaleFactor;    // width per column (reduced for 4 cols)
  const cols = 4;
  const colGap = 6 * scaleFactor;
  const rowsPerCol = Math.ceil(entries.length / cols);
  const boxW = cols * colW + (cols - 1) * colGap + padX * 2;
  const boxH = titleH + padY + rowsPerCol * rowH + padY;

  // Position (margins also scale)
  const margin = 10 * scaleFactor;
  let bx, by;
  if (position === "bottom-left") {
    bx = margin;
    by = ch - boxH - margin;
  } else {
    bx = cw - boxW - margin;
    by = ch - boxH - margin;
  }

  // ── Background ──
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(bx, by, boxW, boxH, 4) : ctx.rect(bx, by, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  // ── Title ──
  ctx.fillStyle = "#111";
  ctx.font = `bold ${11 * scaleFactor}px Arial`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("LEGEND", bx + padX, by + padY);

  // Separator line under title
  ctx.beginPath();
  ctx.moveTo(bx + padX, by + padY + 12 * scaleFactor);
  ctx.lineTo(bx + boxW - padX, by + padY + 12 * scaleFactor);
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 0.5 * scaleFactor;
  ctx.stroke();

  // ── Entries (3 columns) ──
  const startY = by + titleH + padY;
  ctx.font = `${9.5 * scaleFactor}px Arial`;
  ctx.textBaseline = "middle";

  entries.forEach((entry, i) => {
    const col = Math.floor(i / rowsPerCol);
    const row = i % rowsPerCol;
    const colOffset = col * (colW + colGap);
    const ey = startY + row * rowH + rowH / 2;
    const ix = bx + padX + colOffset; // icon start
    const tx = ix + iconW + gap; // text start

    if (entry.type === "line") {
      ctx.save();
      ctx.strokeStyle = entry.color;
      ctx.lineWidth = 2 * scaleFactor;
      ctx.setLineDash(entry.dash.map(d => d * scaleFactor));
      ctx.beginPath();
      ctx.moveTo(ix, ey);
      ctx.lineTo(ix + iconW, ey);
      ctx.stroke();
      ctx.restore();
    } else if (entry.type === "symbol") {
      const cx = ix + iconW / 2;
      const sz = 10 * scaleFactor;

      ctx.save();
      ctx.setLineDash([]);
      if (entry.shape === "square-x") {
        // 4-way diffuser: square with X
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.strokeRect(cx - sz / 2, ey - sz / 2, sz, sz);
        ctx.beginPath();
        ctx.moveTo(cx - sz / 2, ey - sz / 2); ctx.lineTo(cx + sz / 2, ey + sz / 2);
        ctx.moveTo(cx + sz / 2, ey - sz / 2); ctx.lineTo(cx - sz / 2, ey + sz / 2);
        ctx.stroke();
      } else if (entry.shape === "circle") {
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.beginPath();
        ctx.arc(cx, ey, sz / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (entry.shape === "slot") {
        // Linear slot: wide thin rect
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.strokeRect(cx - 10 * scaleFactor, ey - 3 * scaleFactor, 20 * scaleFactor, 6 * scaleFactor);
      } else if (entry.shape === "jet") {
        // JET diffuser: nozzle with arrow
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.beginPath();
        ctx.rect(cx - sz * 0.4, ey - sz * 0.3, sz * 0.3, sz * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - sz * 0.1, ey - sz * 0.2);
        ctx.lineTo(cx + sz * 0.4, ey);
        ctx.lineTo(cx - sz * 0.1, ey + sz * 0.2);
        ctx.stroke();
      } else if (entry.shape === "wall-diff") {
        // Wall diffuser: rectangle with airflow lines
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 1 * scaleFactor;
        ctx.fillStyle = "rgba(100,100,100,0.2)";
        ctx.fillRect(cx - sz * 0.5, ey - sz * 0.4, sz * 0.2, sz * 0.8);
        ctx.strokeRect(cx - sz * 0.5, ey - sz * 0.4, sz * 0.2, sz * 0.8);
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.strokeRect(cx - sz * 0.3, ey - sz * 0.3, sz * 0.5, sz * 0.6);
        // Airflow arrows
        ctx.beginPath();
        ctx.moveTo(cx + sz * 0.2, ey - sz * 0.15);
        ctx.lineTo(cx + sz * 0.45, ey - sz * 0.25);
        ctx.moveTo(cx + sz * 0.2, ey);
        ctx.lineTo(cx + sz * 0.5, ey);
        ctx.moveTo(cx + sz * 0.2, ey + sz * 0.15);
        ctx.lineTo(cx + sz * 0.45, ey + sz * 0.25);
        ctx.stroke();
      } else if (entry.shape === "square-eq") {
        // Return grille: square with ≡
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.strokeRect(cx - sz / 2, ey - sz / 2, sz, sz);
        for (let li = -2; li <= 2; li += 2) {
          ctx.beginPath();
          ctx.moveTo(cx - 3 * scaleFactor, ey + li * scaleFactor);
          ctx.lineTo(cx + 3 * scaleFactor, ey + li * scaleFactor);
          ctx.stroke();
        }
      } else if (entry.shape === "transfer") {
        // Transfer grille: rectangle with double arrow
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.strokeRect(cx - sz * 0.5, ey - sz * 0.3, sz, sz * 0.6);
        // Horizontal lines inside
        ctx.beginPath();
        ctx.moveTo(cx - sz * 0.35, ey - sz * 0.1);
        ctx.lineTo(cx + sz * 0.35, ey - sz * 0.1);
        ctx.moveTo(cx - sz * 0.35, ey + sz * 0.1);
        ctx.lineTo(cx + sz * 0.35, ey + sz * 0.1);
        ctx.stroke();
        // Up/down arrows
        ctx.beginPath();
        ctx.moveTo(cx - sz * 0.15, ey - sz * 0.5);
        ctx.lineTo(cx, ey - sz * 0.35);
        ctx.lineTo(cx + sz * 0.15, ey - sz * 0.5);
        ctx.moveTo(cx - sz * 0.15, ey + sz * 0.5);
        ctx.lineTo(cx, ey + sz * 0.35);
        ctx.lineTo(cx + sz * 0.15, ey + sz * 0.5);
        ctx.stroke();
      } else if (entry.shape === "square-h") {
        // Exhaust grille: square with hatching
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.strokeRect(cx - sz / 2, ey - sz / 2, sz, sz);
        ctx.beginPath();
        ctx.moveTo(cx - sz / 2, ey + sz / 2); ctx.lineTo(cx + sz / 2, ey - sz / 2);
        ctx.stroke();
      } else if (entry.shape === "drain") {
        // Drain point: circle with down arrow
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.beginPath();
        ctx.arc(cx, ey - sz * 0.15, sz * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = entry.color;
        ctx.beginPath();
        ctx.arc(cx, ey - sz * 0.15, sz * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Down arrow
        ctx.strokeStyle = entry.color;
        ctx.beginPath();
        ctx.moveTo(cx, ey + sz * 0.1);
        ctx.lineTo(cx, ey + sz * 0.45);
        ctx.moveTo(cx - sz * 0.15, ey + sz * 0.3);
        ctx.lineTo(cx, ey + sz * 0.45);
        ctx.lineTo(cx + sz * 0.15, ey + sz * 0.3);
        ctx.stroke();
      } else if (entry.shape === "diamond") {
        // Fire damper: red diamond
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.beginPath();
        ctx.moveTo(cx, ey - sz / 2);
        ctx.lineTo(cx + sz / 2, ey);
        ctx.lineTo(cx, ey + sz / 2);
        ctx.lineTo(cx - sz / 2, ey);
        ctx.closePath();
        ctx.stroke();
      } else if (entry.shape === "circle-vd") {
        // Volume damper: circle
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.beginPath();
        ctx.arc(cx, ey, sz / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = entry.color;
        ctx.font = `bold ${6 * scaleFactor}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText("VD", cx, ey + 1 * scaleFactor);
      } else if (entry.shape === "thermostat") {
        // Thermostat: rounded rectangle with T
        const r = sz * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx - sz / 2 + r, ey - sz / 2);
        ctx.arcTo(cx + sz / 2, ey - sz / 2, cx + sz / 2, ey + sz / 2, r);
        ctx.arcTo(cx + sz / 2, ey + sz / 2, cx - sz / 2, ey + sz / 2, r);
        ctx.arcTo(cx - sz / 2, ey + sz / 2, cx - sz / 2, ey - sz / 2, r);
        ctx.arcTo(cx - sz / 2, ey - sz / 2, cx + sz / 2, ey - sz / 2, r);
        ctx.closePath();
        ctx.fillStyle = "rgba(139,92,246,0.2)";
        ctx.fill();
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5 * scaleFactor;
        ctx.stroke();
        ctx.fillStyle = entry.color;
        ctx.font = `bold ${7 * scaleFactor}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("T", cx, ey);
      } else if (entry.shape === "rect-fill") {
        // Filled rect for units
        ctx.fillStyle = entry.color;
        ctx.fillRect(cx - sz / 2, ey - sz / 2 + 1 * scaleFactor, sz, sz - 2 * scaleFactor);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1 * scaleFactor;
        ctx.strokeRect(cx - sz / 2, ey - sz / 2 + 1 * scaleFactor, sz, sz - 2 * scaleFactor);
      }
      ctx.restore();
    }

    // Label
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = "#222";
    ctx.font = `${9.5 * scaleFactor}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(entry.label, tx, ey);
    ctx.restore();
  });

  ctx.restore();
};