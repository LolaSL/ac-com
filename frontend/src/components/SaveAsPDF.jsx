import { useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

// This component now receives the 'annotations' object as a prop
function SaveAsPDF({ file, isPaid, pdfId, token, annotations, acType }) {
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

    if (annotations?.lines) {
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

    if (annotations?.comments) {
      annotations.comments.forEach((comment) => {
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

    // Draw HVAC annotations
    if (acType === "ducted" && annotations?.hvac?.ducts) {
      annotations.hvac.ducts.forEach((duct) => {
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
      });
    }

    if (acType === "ducted" && annotations?.hvac?.diffusers) {
      annotations.hvac.diffusers.forEach((diffuser) => {
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
  };

  const saveAsPDF = async () => {
    setError(null);
    setIsSaved(false);

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
        throw new Error("Failed to fetch PDF from server");
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const scale = 1.0; // Reduced scale to avoid large canvas issues
      const viewport = page.getViewport({ scale });

      // Prepare first canvas (current mode)
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Prepare second canvas (alternate mode)
      const canvas2 = document.createElement("canvas");
      const context2 = canvas2.getContext("2d");
      canvas2.width = viewport.width;
      canvas2.height = viewport.height;

      // Render base PDF page to both canvases
      await page.render({ canvasContext: context, viewport }).promise;
      await page.render({ canvasContext: context2, viewport }).promise;

      // Normalize annotations: backend sometimes returns a wrapper { annotations, acType, isPaid }
      let normalizedAnnotations =
        annotations && annotations.annotations
          ? annotations.annotations
          : annotations;
      let finalAcType = acType;
      // If annotations are missing or HVAC data isn't present, try fetching the latest annotations from the server
      if (
        !normalizedAnnotations ||
        Object.keys(normalizedAnnotations).length === 0 ||
        !normalizedAnnotations.hvac
      ) {
        try {
          const annRes = await fetch(`/api/annotations/${pdfId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (annRes.ok) {
            const annData = await annRes.json();
            normalizedAnnotations = annData.annotations || annData;
            finalAcType = finalAcType || annData.acType;
          }
        } catch (e) {
          console.warn("Failed to fetch annotations for PDF:", e);
        }
      }

      // Determine alternate mode (the other system view)
      const alternateAcType = finalAcType === "ducted" ? "ductless" : "ducted";

      // Draw annotations for page 1 (current mode)
      if (normalizedAnnotations) {
        drawAnnotations(context, normalizedAnnotations, viewport, finalAcType);
      }

      // Draw annotations for page 2 (alternate mode)
      if (normalizedAnnotations) {
        drawAnnotations(
          context2,
          normalizedAnnotations,
          viewport,
          alternateAcType
        );
      }

      // Add small labels so each page is clear
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

      drawLabel(
        context,
        `${finalAcType === "ducted" ? "Ducted" : "Ductless"} View`
      );
      drawLabel(
        context2,
        `${alternateAcType === "ducted" ? "Ducted" : "Ductless"} View`
      );

      const imageData1 = canvas.toDataURL("image/png");
      const imageData2 = canvas2.toDataURL("image/png");

      if (!imageData1 || imageData1 === "data:," || imageData1.length < 100) {
        throw new Error("Failed to generate image from first canvas");
      }
      if (!imageData2 || imageData2 === "data:," || imageData2.length < 100) {
        throw new Error("Failed to generate image from second canvas");
      }

      const pngImage1 = await pdfDoc.embedPng(imageData1);
      const pngImage2 = await pdfDoc.embedPng(imageData2);

      const newPdfPage = pdfDoc.getPages()[0];
      const { width, height } = newPdfPage.getSize();

      newPdfPage.drawImage(pngImage1, { x: 0, y: 0, width, height });

      // Add second page and draw the alternate-mode image
      const secondPage = pdfDoc.addPage([width, height]);
      secondPage.drawImage(pngImage2, { x: 0, y: 0, width, height });

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
      const downloadBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(downloadBlob);

      // Open in new tab as workaround for download issues (includes unique filename in URL, but user can save manually)
      window.open(url, "_blank");

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setIsSaved(true);
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
