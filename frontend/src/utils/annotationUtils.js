import supplySVG from "../assets/hvac/supply.svg";
import returnSVG from "../assets/hvac/return.svg";
import ductSVG from "../assets/hvac/duct.svg";
import indoorSVG from "../assets/hvac/indoor.svg";
import outdoorSVG from "../assets/hvac/outdoor.svg";
import thermostatSVG from "../assets/hvac/thermostat.svg";
// Professional engineering symbols
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
    supply:  { fill: "rgba(0,85,204,0.15)", stroke: "#0055CC", dash: [],       label: "SA" },
    return:  { fill: "rgba(204,68,0,0.15)",  stroke: "#CC4400", dash: [6,4],   label: "RA" },
    flex:    { fill: "rgba(150,150,150,0.1)", stroke: "#888",    dash: [3,3],   label: "FD" },
    exhaust: { fill: "rgba(34,139,34,0.15)",  stroke: "#228B22", dash: [4,4],   label: "EA" },
    default: { fill: "rgba(0,120,255,0.2)",   stroke: "#0066FF", dash: [],      label: "" },
  };

  // ─── DIFFUSER TYPE CONFIG ───
  const DIFFUSER_STYLES = {
    "supply-4way":  { fill: "rgba(0,85,204,0.25)", stroke: "#0055CC", svgKey: "supplyDiffuser4Way" },
    "round":        { fill: "rgba(0,85,204,0.25)", stroke: "#0055CC", svgKey: "roundDiffuser" },
    "linear-slot":  { fill: "rgba(0,85,204,0.2)",  stroke: "#0055CC", svgKey: "linearSlotDiffuser" },
    "return-grille":{ fill: "rgba(204,68,0,0.2)",  stroke: "#CC4400", svgKey: "returnGrille" },
    "exhaust":      { fill: "rgba(34,139,34,0.2)", stroke: "#228B22", svgKey: "exhaustGrille" },
    "circle":       { fill: "rgba(0,85,204,0.25)", stroke: "#0055CC", svgKey: "roundDiffuser" },
    "square":       { fill: "rgba(0,85,204,0.25)", stroke: "#0055CC", svgKey: "supplyDiffuser4Way" },
    "default":      { fill: "rgba(0,255,0,0.3)",   stroke: "#00AA00", svgKey: "supply" },
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
      context.globalAlpha = 0.5;
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
    const svgKey = ductType === "supply" ? "supplyDuct" : ductType === "return" ? "returnDuct" : ductType === "flex" ? "flexDuct" : "duct";
    if (symbolImages[svgKey]) {
      const img = new window.Image();
      img.src = symbolImages[svgKey];
      img.onload = () => {
        context.save();
        context.translate(x, y);
        const iconSize = 14 * scaleFactor;
        context.globalAlpha = 0.4;
        context.drawImage(img, 2, (height - iconSize) / 2, iconSize * 2, iconSize);
        context.globalAlpha = 1.0;
        context.restore();
      };
    }
  });

  // ─── RENDER DIFFUSERS ───
  hvacAnnotations?.diffusers?.forEach((diffuser) => {
    const x = diffuser.xPercent * canvasWidth;
    const y = diffuser.yPercent * canvasHeight;
    const size = (diffuser.sizePercent || 0.04) * canvasWidth;
    const diffuserType = diffuser.diffuserType || diffuser.shape || "default";
    const style = DIFFUSER_STYLES[diffuserType] || DIFFUSER_STYLES.default;

    context.save();

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
        context.globalAlpha = 0.3;
        for (let i = 0; i < size; i += 5 * scaleFactor) {
          context.beginPath();
          context.moveTo(x - size / 2 + i, y - size / 2);
          context.lineTo(x - size / 2, y - size / 2 + i);
          context.stroke();
        }
        context.globalAlpha = 1.0;
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
      context.font = `bold ${8 * scaleFactor}px Arial`;
      context.fillStyle = style.stroke;
      context.textAlign = "center";
      context.fillText(`${diffuser.airflow} CFM`, x, y + size / 2 + 10 * scaleFactor);
    }

    // Diffuser type tag
    const tagMap = { "supply-4way": "SD", "round": "SD", "linear-slot": "LD", "return-grille": "RG", "exhaust": "EG" };
    const tag = tagMap[diffuserType];
    if (tag) {
      context.font = `bold ${8 * scaleFactor}px Arial`;
      context.fillStyle = style.stroke;
      context.textAlign = "center";
      context.fillText(tag, x, y - size / 2 - 3 * scaleFactor);
    }

    context.restore();

    // Draw SVG symbol overlay (semi-transparent)
    if (symbolImages[style.svgKey]) {
      const img = new window.Image();
      img.src = symbolImages[style.svgKey];
      img.onload = () => {
        context.save();
        context.globalAlpha = 0.35;
        context.drawImage(img, x - size / 2, y - size / 2, size, size);
        context.globalAlpha = 1.0;
        context.restore();
      };
    }
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
      context.fillStyle = "rgba(204,0,0,0.15)";
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
      context.fillStyle = "rgba(85,85,85,0.1)";
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
    if (symbolImages[svgKey]) {
      const img = new window.Image();
      img.src = symbolImages[svgKey];
      img.onload = () => {
        context.save();
        context.globalAlpha = 0.3;
        context.drawImage(img, x - size / 2, y - size / 2, size, size);
        context.globalAlpha = 1.0;
        context.restore();
      };
    }
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
    context.fillStyle = "rgba(139,92,246,0.2)";
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
    if (symbolImages.thermostat) {
      const img = new window.Image();
      img.src = symbolImages.thermostat;
      img.onload = () => {
        context.save();
        context.globalAlpha = 0.3;
        context.drawImage(img, x - size / 2, y - size / 2, size, size);
        context.globalAlpha = 1.0;
        context.restore();
      };
    }
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
          context.globalAlpha = 0.6;
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
          context.globalAlpha = 0.6;
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
  const { skipRefrigerantLines = false, pdfScale = 1.5 } = options;
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  // Helper function to get the center of a rectangle for chain line connections.
  // Note: rectangles are rotated around their top-left corner (not center),
  // so chain lines must connect from the top-left position adjusted by rotation offset.
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

  // rectangles - ALWAYS render user-drawn rectangles (engineer annotations)
  // Rotate around top-left corner to match stored rectangle positioning
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
  // lines - skip when callout lines or refrigerant lines already connect rects to comments
  if (acType !== "ducted" && acType !== "ductless" && acType !== "vrf-ducted" && acType !== "vrf-ductless") {
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
    const scaleFactor = pdfScale / 1.5;
    const padding = 10 * scaleFactor;
    const fontSize = 17 * scaleFactor;
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
  }); // end callout lines (skipped for vrf-ducted)

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

      // Find nearest condenser
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
        const dist = Math.sqrt(
          (unitX - condCenter.x) ** 2 + (unitY - condCenter.y) ** 2
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCondenser = condCenter;
        }
      });

      if (nearestCondenser) {
        drawOrthogonalLine(context, unitX, unitY, nearestCondenser.x, nearestCondenser.y, {
          color: "blue", dash: [5, 5], lineWidth: 2
        });
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
          drawOrthogonalLine(context, rx, ry, cx, cy, {
            color: "blue", dash: [5, 5], lineWidth: 2
          });
        }
      }
    });
  }

  // For VRF ductless systems, draw teal refrigerant lines connecting rectangles to their nearest condenser
  if (!skipRefrigerantLines && acType === "vrf-ductless") {
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
          drawSingleOrthogonalLine(context, rx, ry, nearestCondenser.cx, nearestCondenser.cy, "#008B8B", []);
        }
      }
    });
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
        const rect = annotations.rectangles.find((r) => r.id === comment.rectId);
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
        // Find indoor units with matching comments (e.g., "ac-1", "ac-1.1")
        indoorRects = annotations.rectangles
          .filter((rect) => !rect.isCondenser && rect !== cond)
          .filter((rect) => {
            const comment = annotations.comments.find((c) => c.rectId === rect.id);
            return comment && comment.text.match(new RegExp(`ac-${groupNum}(\\.\\d+)?`, "i"));
          })
          .sort((a, b) => {
            // Sort by sub-number (e.g., ac-1 before ac-1.1)
            const aComment = annotations.comments.find((c) => c.rectId === a.id)?.text || "";
            const bComment = annotations.comments.find((c) => c.rectId === b.id)?.text || "";
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
      // condensers[] contains spread copies, so compare by id not reference
      const condenserIds = new Set(condensers.map((c) => c.id));
      const allIndoorRects = annotations.rectangles
        .filter((rect) => !rect.isCondenser && !condenserIds.has(rect.id))
        .sort((a, b) => {
          const getNum = (rect) => {
            if (!annotations.comments) return 0;
            const comment = annotations.comments.find((c) => c.rectId === rect.id);
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
};

// ─── Canvas Legend ────────────────────────────────────────────────
// Draws a professional legend box directly on the canvas so it appears
// in both the live view and generated PDF exports.

export const drawCanvasLegend = (ctx, acType = "vrf-ducted", options = {}) => {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const { position = "bottom-left" } = options;

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
    entries.push({ type: "line", color: "#0055CC",  dash: [4, 3], label: "Branch Connection Line" });
  }

  // ── Diffusers & Grilles (ducted modes) ──
  if (acType === "ducted" || acType === "vrf-ducted") {
    entries.push({ type: "symbol", shape: "square-x",  color: "#0055CC", label: "Supply Diffuser 4-Way (SD)" });
    entries.push({ type: "symbol", shape: "circle",    color: "#0055CC", label: "Round Diffuser (SD)" });
    entries.push({ type: "symbol", shape: "slot",      color: "#0055CC", label: "Linear Slot Diffuser (LD)" });
    entries.push({ type: "symbol", shape: "square-eq", color: "#CC4400", label: "Return Grille (RG)" });
    entries.push({ type: "symbol", shape: "square-h",  color: "#228B22", label: "Exhaust Grille (EG)" });
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

  // ── Layout constants (wide 2-column layout to minimize height) ──
  const rowH = 14;
  const padX = 8;
  const padY = 6;
  const iconW = 24;
  const gap = 5;
  const titleH = 16;
  const colW = 230;    // width per column
  const cols = 2;
  const colGap = 10;
  const rowsPerCol = Math.ceil(entries.length / cols);
  const boxW = cols * colW + (cols - 1) * colGap + padX * 2;
  const boxH = titleH + padY + rowsPerCol * rowH + padY;

  // Position
  let bx, by;
  if (position === "bottom-left") {
    bx = 10;
    by = ch - boxH - 10;
  } else {
    bx = cw - boxW - 10;
    by = ch - boxH - 10;
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
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("LEGEND", bx + padX, by + padY);

  // Separator line under title
  ctx.beginPath();
  ctx.moveTo(bx + padX, by + padY + 12);
  ctx.lineTo(bx + boxW - padX, by + padY + 12);
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ── Entries (2 columns) ──
  const startY = by + titleH + padY;
  ctx.font = "9.5px Arial";
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
      ctx.lineWidth = 2;
      ctx.setLineDash(entry.dash);
      ctx.beginPath();
      ctx.moveTo(ix, ey);
      ctx.lineTo(ix + iconW, ey);
      ctx.stroke();
      ctx.restore();
    } else if (entry.type === "symbol") {
      const cx = ix + iconW / 2;
      const sz = 10;

      ctx.save();
      ctx.setLineDash([]);
      if (entry.shape === "square-x") {
        // 4-way diffuser: square with X
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - sz / 2, ey - sz / 2, sz, sz);
        ctx.beginPath();
        ctx.moveTo(cx - sz / 2, ey - sz / 2); ctx.lineTo(cx + sz / 2, ey + sz / 2);
        ctx.moveTo(cx + sz / 2, ey - sz / 2); ctx.lineTo(cx - sz / 2, ey + sz / 2);
        ctx.stroke();
      } else if (entry.shape === "circle") {
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, ey, sz / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (entry.shape === "slot") {
        // Linear slot: wide thin rect
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 10, ey - 3, 20, 6);
      } else if (entry.shape === "square-eq") {
        // Return grille: square with ≡
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - sz / 2, ey - sz / 2, sz, sz);
        for (let li = -2; li <= 2; li += 2) {
          ctx.beginPath();
          ctx.moveTo(cx - 3, ey + li);
          ctx.lineTo(cx + 3, ey + li);
          ctx.stroke();
        }
      } else if (entry.shape === "square-h") {
        // Exhaust grille: square with hatching
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - sz / 2, ey - sz / 2, sz, sz);
        ctx.beginPath();
        ctx.moveTo(cx - sz / 2, ey + sz / 2); ctx.lineTo(cx + sz / 2, ey - sz / 2);
        ctx.stroke();
      } else if (entry.shape === "diamond") {
        // Fire damper: red diamond
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 1.5;
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
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, ey, sz / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = entry.color;
        ctx.font = "bold 6px Arial";
        ctx.textAlign = "center";
        ctx.fillText("VD", cx, ey + 1);
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
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = entry.color;
        ctx.font = "bold 7px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("T", cx, ey);
      } else if (entry.shape === "rect-fill") {
        // Filled rect for units
        ctx.fillStyle = entry.color;
        ctx.fillRect(cx - sz / 2, ey - sz / 2 + 1, sz, sz - 2);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - sz / 2, ey - sz / 2 + 1, sz, sz - 2);
      }
      ctx.restore();
    }

    // Label
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = "#222";
    ctx.font = "9.5px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(entry.label, tx, ey);
    ctx.restore();
  });

  ctx.restore();
};