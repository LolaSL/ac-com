import supplySVG from "../assets/hvac/supply.svg";
import returnSVG from "../assets/hvac/return.svg";
import ductSVG from "../assets/hvac/duct.svg";
import indoorSVG from "../assets/hvac/indoor.svg";
import outdoorSVG from "../assets/hvac/outdoor.svg";
import thermostatSVG from "../assets/hvac/thermostat.svg";

export const hvacSymbols = {
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
export const overlayVRFSystem = (context, vrfAnnotations, symbolImages, acType) => {
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
      } else if (acType === "vrf-ducted") {
        // VRF-Ducted: Chain topology - outdoor -> indoor1 -> indoor2 -> ...
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
        // Draw dual parallel lines (red supply + blue return, dashed) between consecutive points
        for (let i = 0; i < points.length - 1; i++) {
          const startX = points[i].x;
          const startY = points[i].y;
          const endX = points[i + 1].x;
          const endY = points[i + 1].y;

          const offset = 3;
          const dx = endX - startX;
          const dy = endY - startY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const perpX = (-dy / length) * offset;
          const perpY = (dx / length) * offset;

          // Supply line (red, dashed) - from start to end
          context.save();
          context.setLineDash([8, 4]);
          context.lineWidth = 2;
          context.strokeStyle = "red";
          context.beginPath();
          context.moveTo(startX + perpX, startY + perpY);
          context.lineTo(endX + perpX, endY + perpY);
          context.stroke();
          context.restore();

          // Return line (blue, dashed) - from end to start
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
      }
    });
  }
};

export const overlayHVAC = (context, hvacAnnotations, symbolImages, comments, acType = null) => {
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
  // Skip for VRF-ductless mode only - VRF-ducted still needs duct connections
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

export const overlayAnnotations = (context, annotations, acType) => {
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
  // Skip for VRF systems which have their own topology logic

if (
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
        context.save();
        context.setLineDash([5, 5]); // Dashed line
        context.lineWidth = 2;
        context.strokeStyle = "blue"; // Blue refrigerant line
        context.beginPath();
        context.moveTo(unitX, unitY);
        context.lineTo(nearestCondenser.x, nearestCondenser.y);
        context.stroke();
        context.restore();
      }
    });
  }
}
  // For ductless systems, draw refrigerant lines connecting rectangles to their nearest condenser
  if (
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
  // DISABLED: VRF systems use chain topology in overlayVRFSystem, not star topology here
  if (
    false // disabled for all VRF to prevent conflicting lines
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

      // Connect last indoor unit to condenser
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
    });

    // If no groups formed (e.g., no matching comments), fall back to original single-chain logic
    if (groups.every((g) => g.indoorRects.length === 0)) {
      const allIndoorRects = annotations.rectangles
        .filter((rect) => !rect.isCondenser && !condensers.includes(rect))
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
        const x1 = rect1Center.x;
        const y1 = rect1Center.y;
        const rect2Center = getRotatedCenter(
          allIndoorRects[i + 1].xPercent * canvasWidth,
          allIndoorRects[i + 1].yPercent * canvasHeight,
          allIndoorRects[i + 1].widthPercent * canvasWidth,
          allIndoorRects[i + 1].heightPercent * canvasHeight,
          allIndoorRects[i + 1].rotation
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

      // Connect last indoor unit to condenser
      if (allIndoorRects.length > 0) {
        const lastRectCenter = getRotatedCenter(
          allIndoorRects[allIndoorRects.length - 1].xPercent * canvasWidth,
          allIndoorRects[allIndoorRects.length - 1].yPercent * canvasHeight,
          allIndoorRects[allIndoorRects.length - 1].widthPercent * canvasWidth,
          allIndoorRects[allIndoorRects.length - 1].heightPercent * canvasHeight,
          allIndoorRects[allIndoorRects.length - 1].rotation
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
}
};