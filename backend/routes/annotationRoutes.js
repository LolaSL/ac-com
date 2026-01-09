import express from 'express';
import multer from 'multer';
import AnnotationModel from '../models/annotationModel.js';
import { isAuth } from '../utils.js';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import expressAsyncHandler from 'express-async-handler';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/all-annotations', isAuth, async (req, res) => {
  try {
    // Only allow admin users
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access only.' });
    }
    const annotations = await AnnotationModel.find({});
    console.log(`All annotations (${annotations.length}):`, annotations.map(a => ({ id: a._id, filename: a.filename, isPaid: a.isPaid, userId: a.userId })));
    const data = annotations.map((a) => ({
      _id: a._id,
      filename: a.filename,
      pdfId: a.pdfId,
      createdAt: a.createdAt,
      isPaid: a.isPaid,
      userId: a.userId,
    }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch all annotations', error: error.message });
  }
});
router.post(
  "/upload-annotate",
  isAuth,
  upload.single("pdfFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded." });
      }

      const userId = req.user._id;
      const isPaid = req.user.isPaid; // <-- ensure user’s isPaid is used

      const { pdfId, rectangles, comments, lines, imageWidth, imageHeight } =
        req.body;

      if (!imageWidth || !imageHeight) {
        return res
          .status(400)
          .json({ message: "Missing image dimensions." });
      }

      const width = parseFloat(imageWidth);
      const height = parseFloat(imageHeight);

      const parsedRectangles = JSON.parse(rectangles || "[]");
      const parsedComments = JSON.parse(comments || "[]");
      const parsedLines = JSON.parse(lines || "[]");
      const percentRectangles = parsedRectangles.map((rect) => ({
        id: rect.id,
        xPercent: rect.x / width,
        yPercent: rect.y / height,
        widthPercent: rect.width / width,
        heightPercent: rect.height / height,
        fill: rect.fill,
        stroke: rect.stroke,
        rotation: rect.rotation || 0,
      }));

      const percentComments = parsedComments.map((comment) => ({
        id: comment.id,
        rectId: comment.rectId,
        text: comment.text,
        xPercent: comment.x / width,
        yPercent: comment.y / height,
        fill: comment.fill,
        textColor: comment.textColor,
      }));

      const percentLines = parsedLines.map((line) => ({
        id: line.id,
        rectId: line.rectId,
        commentId: line.commentId,
        points: line.points.map((p, i) => (i % 2 === 0 ? p / width : p / height)),
        stroke: line.stroke,
        strokeWidth: line.strokeWidth,
      }));

      const newAnnotation = new AnnotationModel({
        filename: req.file.originalname,
        pdfData: req.file.buffer,
        userId,
        pdfId,
        isPaid,
        originalImageWidth: width,
        originalImageHeight: height,
        annotations: {
          rectangles: percentRectangles,
          comments: percentComments,
          lines: percentLines,
        },
      });

      const savedAnnotation = await newAnnotation.save();

      return res.status(201).json({
        message: "PDF and annotations saved successfully!",
        id: savedAnnotation._id,
      });
    } catch (error) {
      console.error("Error saving PDF and annotations:", error);
      if (!res.headersSent) {
        return res.status(500).json({
          message: "Failed to save PDF and annotations.",
          error: error.message,
        });
      }
    }
  }
);

router.get('/annotated-pdf/:id', isAuth, async (req, res) => {
  console.log('--- Starting PDF generation for annotation ID:', req.params.id);

  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation || !annotation.pdfData) {
      console.error('Annotated PDF not found or missing pdfData.');
      return res.status(404).json({ message: 'Annotated PDF not found.' });
    }

    const { email } = req.user;
    const isPaid = annotation.isPaid !== undefined ? annotation.isPaid : false;
    console.log(`Annotation isPaid: ${isPaid}, User Email: ${email}`);
    console.log('Annotation object:', annotation);

    const pdfDoc = await PDFDocument.load(annotation.pdfData);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    if (isPaid) {
      console.log('Annotation is paid. Drawing annotations, watermark, and stamp.');

      const ann = annotation.annotations;
      if (ann) {
        console.log('Found annotations object. Rendering...');

        // Draw rectangles
        if (ann.rectangles && Array.isArray(ann.rectangles)) {
          ann.rectangles.forEach((rect) => {
            const { width, height } = firstPage.getSize();
            firstPage.drawRectangle({
              x: rect.xPercent * width,
              y: height - rect.yPercent * height - rect.heightPercent * height,
              width: rect.widthPercent * width,
              height: rect.heightPercent * height,
              borderColor: rgb(0, 0, 0),
              borderWidth: 2,
            });
          });
        }

        // Draw lines
        if (ann.lines && Array.isArray(ann.lines)) {
          ann.lines.forEach((line) => {
            const { width, height } = firstPage.getSize();
            const points = line.points;
            for (let i = 0; i < points.length - 2; i += 2) {
              const x1 = points[i] * width;
              const y1 = height - points[i + 1] * height;
              const x2 = points[i + 2] * width;
              const y2 = height - points[i + 3] * height;
              firstPage.drawLine({
                start: { x: x1, y: y1 },
                end: { x: x2, y: y2 },
                thickness: line.strokeWidth || 2,
                color: rgb(0, 0, 0),
              });
            }
          });
        }

        // Draw comments
        if (ann.comments && Array.isArray(ann.comments)) {
          ann.comments.forEach((comment) => {
            const { width, height } = firstPage.getSize();
            firstPage.drawText(comment.text || '', {
              x: comment.xPercent * width,
              y: height - comment.yPercent * height,
              size: 12,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
          });
        }

        // Draw HVAC if ducted
        if (annotation.acType === 'ducted' && ann.hvac) {
          const hvac = ann.hvac;
          const { width, height } = firstPage.getSize();

          // Draw ducts
          if (hvac.ducts && Array.isArray(hvac.ducts)) {
            hvac.ducts.forEach((duct) => {
              const x = duct.xPercent * width;
              const y = height - duct.yPercent * height - (duct.height || 0.04) * height;
              const w = (duct.width || 0.2) * width;
              const h = (duct.height || 0.04) * height;
              firstPage.drawRectangle({
                x,
                y,
                width: w,
                height: h,
                borderColor: rgb(0, 0.5, 1),
                borderWidth: 2,
              });
            });
          }

          // Draw diffusers
          if (hvac.diffusers && Array.isArray(hvac.diffusers)) {
            hvac.diffusers.forEach((diffuser) => {
              const x = diffuser.xPercent * width;
              const y = height - diffuser.yPercent * height;
              const size = (diffuser.sizePercent || 0.08) * width;
              firstPage.drawCircle({
                x,
                y,
                size: size / 2,
                borderColor: rgb(0, 1, 0),
                borderWidth: 2,
              });
            });
          }

          // Draw connections (simplified, nearest duct)
          if (hvac.ducts && hvac.diffusers) {
            hvac.diffusers.forEach((diffuser) => {
              const dx = diffuser.xPercent * width;
              const dy = height - diffuser.yPercent * height;
              let nearestDuct = null;
              let minDist = Infinity;
              hvac.ducts.forEach((duct) => {
                const ductX = duct.xPercent * width + ((duct.width || 0.2) * width) / 2;
                const ductY = height - duct.yPercent * height - ((duct.height || 0.04) * height) / 2;
                const dist = Math.sqrt((dx - ductX) ** 2 + (dy - ductY) ** 2);
                if (dist < minDist) {
                  minDist = dist;
                  nearestDuct = { x: ductX, y: ductY };
                }
              });
              if (nearestDuct) {
                firstPage.drawLine({
                  start: { x: dx, y: dy },
                  end: { x: nearestDuct.x, y: nearestDuct.y },
                  thickness: 2,
                  color: rgb(0.5, 0.5, 0.5),
                });
              }
            });
          }
        }

        // For ductless, draw connections
        if (annotation.acType === 'ductless' && ann.rectangles && Array.isArray(ann.rectangles)) {
          // Find condensers
          let condensers = [];
          if (ann.comments && Array.isArray(ann.comments)) {
            ann.comments.forEach((comment) => {
              if (comment.text.toLowerCase().includes('condenser') || comment.text.toLowerCase().includes('outdoor')) {
                let closestRect = null;
                let minDist = Infinity;
                ann.rectangles.forEach((rect) => {
                  const rectX = rect.xPercent * width + (rect.widthPercent * width) / 2;
                  const rectY = height - rect.yPercent * height - (rect.heightPercent * height) / 2;
                  const commentX = comment.xPercent * width;
                  const commentY = height - comment.yPercent * height;
                  const dist = Math.sqrt((commentX - rectX) ** 2 + (commentY - rectY) ** 2);
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
          if (condensers.length === 0) {
            // Largest
            let maxArea = -Infinity;
            let largest = null;
            ann.rectangles.forEach((rect) => {
              const area = rect.widthPercent * rect.heightPercent;
              if (area > maxArea) {
                maxArea = area;
                largest = rect;
              }
            });
            if (largest) condensers.push(largest);
          }
          // Draw lines
          ann.rectangles.forEach((rect) => {
            if (!condensers.includes(rect)) {
              let nearestCond = null;
              let minDist = Infinity;
              condensers.forEach((cond) => {
                const condX = cond.xPercent * width + (cond.widthPercent * width) / 2;
                const condY = height - cond.yPercent * height - (cond.heightPercent * height) / 2;
                const rectX = rect.xPercent * width + (rect.widthPercent * width) / 2;
                const rectY = height - rect.yPercent * height - (rect.heightPercent * height) / 2;
                const dist = Math.sqrt((rectX - condX) ** 2 + (rectY - condY) ** 2);
                if (dist < minDist) {
                  minDist = dist;
                  nearestCond = cond;
                }
              });
              if (nearestCond) {
                const rectX = rect.xPercent * width + (rect.widthPercent * width) / 2;
                const rectY = height - rect.yPercent * height - (rect.heightPercent * height) / 2;
                const condX = nearestCond.xPercent * width + (nearestCond.widthPercent * width) / 2;
                const condY = height - nearestCond.yPercent * height - (nearestCond.heightPercent * height) / 2;
                firstPage.drawLine({
                  start: { x: rectX, y: rectY },
                  end: { x: condX, y: condY },
                  thickness: 2,
                  color: rgb(0, 0, 1),
                });
              }
            }
          });
        }
      } else {
        console.log('No annotations found.');
      }

      // Use annotation's createdAt date for the watermark
      let createdAtDate = annotation.createdAt;
      let formattedDate = createdAtDate
        ? new Date(createdAtDate).toLocaleString()
        : 'Unknown Date';
      const watermarkText = `AC Commerce — User: ${email || 'Unknown User'} —  Saved: ${formattedDate}`;

      if (annotation.annotatedImageUrl) {
        console.log('Found annotatedImageUrl – using image + centered text watermark.');

        const imageBytes = await fetch(annotation.annotatedImageUrl).then((res) =>
          res.arrayBuffer()
        );
        const embeddedImage = await pdfDoc.embedPng(imageBytes);

        pages.forEach((page) => {
          const fontSize = 18;
          const { width, height } = page.getSize();

          const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);

          const xPos = (width - textWidth) / 2;
          const yPos = height / 2 - fontSize / 2;

          page.drawText(watermarkText, {
            x: xPos,
            y: yPos,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.6, 0.6, 0.6),
            opacity: 0.15,
          });

        });
      } else {
        console.log('No annotatedImageUrl – drawing only centered text watermark.');

        pages.forEach((page) => {
          const { width, height } = page.getSize();
          const fontSize = 14;

          const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
          const xPos = (width - textWidth) / 2;
          const yPos = 30; // ← bottom padding

          page.drawText(watermarkText, {
            x: xPos,
            y: yPos,
            size: fontSize,
            font: helveticaFont,
            opacity: 0.4,
            color: rgb(0.5, 0.5, 0.5),
          });
        });

      }

      console.log('Drawing APPROVAL stamp.');
      const { width, height } = firstPage.getSize();

      const stampMarginX = 50;
      const stampMarginY = height - 100;
      const boxWidth = 140;
      const boxHeight = 60;

      firstPage.drawRectangle({
        x: stampMarginX - 10,
        y: stampMarginY - 10,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0, 0.6, 0),
        borderWidth: 2,
      });

      firstPage.drawText('APPROVED', {
        x: stampMarginX,
        y: stampMarginY + 30,
        size: 20,
        font: helveticaFont,
        color: rgb(0, 0.6, 0),
        opacity: 0.85,
      });

      firstPage.drawText(email || 'User', {
        x: stampMarginX,
        y: stampMarginY + 10,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0.6, 0),
      });
    }

    // ------------------------------------------------------------
    // SAVE + SEND PDF
    // ------------------------------------------------------------
    const pdfBytes = await pdfDoc.save();
    console.log('PDF generation successful. Sending response.');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${annotation.filename || 'annotated.pdf'}"`,
      'Content-Length': pdfBytes.length,
    });

    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error generating annotated PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to generate annotated PDF.' });
    }
  }
});

/* ---------------------------------------------------
   Helpers
--------------------------------------------------- */

// // Convert top-left (React/Konva) → bottom-left (PDF)
// const normalizeY = (y, pageHeight, elementHeight = 0) => {
//   return pageHeight - y - elementHeight;
// };

// // Normalize colors (0–255 → 0–1)
// const normalizeColor = (v) => (v > 1 ? v / 255 : v);

// // Draw annotations (multi-page safe)
// const drawAnnotations = ({ pages, annotations, font }) => {
//   if (!Array.isArray(annotations)) return;

//   annotations.forEach((ann) => {
//     const page = pages[ann.pageIndex] || pages[0];
//     const { height } = page.getSize();

//     switch (ann.type) {
//       case 'text':
//         page.drawText(ann.text || '', {
//           x: ann.x,
//           y: normalizeY(ann.y, height),
//           size: ann.size || 12,
//           font,
//           color: ann.color
//             ? rgb(
//                 normalizeColor(ann.color.r),
//                 normalizeColor(ann.color.g),
//                 normalizeColor(ann.color.b)
//               )
//             : rgb(0, 0, 0),
//         });
//         break;

//       case 'rectangle':
//         page.drawRectangle({
//           x: ann.x,
//           y: normalizeY(ann.y, height, ann.height),
//           width: ann.width,
//           height: ann.height,
//           borderWidth: ann.borderWidth || 1,
//           borderColor: ann.borderColor
//             ? rgb(
//                 normalizeColor(ann.borderColor.r),
//                 normalizeColor(ann.borderColor.g),
//                 normalizeColor(ann.borderColor.b)
//               )
//             : rgb(1, 0, 0),
//         });
//         break;

//       default:
//         console.warn('Unknown annotation type:', ann.type);
//     }
//   });
// };

// // Draw watermark (paid vs free)
// const drawWatermark = ({ pages, font, text, isPaid }) => {
//   pages.forEach((page) => {
//     const { width, height } = page.getSize();

//     if (isPaid) {
//       const fontSize = 12;
//       const textWidth = font.widthOfTextAtSize(text, fontSize);

//       page.drawText(text, {
//         x: (width - textWidth) / 2,
//         y: 25,
//         size: fontSize,
//         font,
//         opacity: 0.35,
//         color: rgb(0.5, 0.5, 0.5),
//       });
//     } else {
//       page.drawText('UNPAID PREVIEW', {
//         x: width / 4,
//         y: height / 2,
//         size: 40,
//         font,
//         rotate: { type: 'degrees', angle: -30 },
//         opacity: 0.15,
//         color: rgb(1, 0, 0),
//       });
//     }
//   });
// };


// Draw approval stamp (paid only)
const drawApprovalStamp = ({ page, font }) => {
  const { height } = page.getSize();

  const x = 40;
  const y = height - 90;

  page.drawRectangle({
    x: x - 10,
    y: y - 10,
    width: 150,
    height: 60,
    borderWidth: 2,
    borderColor: rgb(0, 0.6, 0),
  });

  page.drawText('APPROVED', {
    x,
    y: y + 25,
    size: 20,
    font,
    color: rgb(0, 0.6, 0),
    opacity: 0.85,
  });

  page.drawText('AC COMMERCE', {
    x,
    y: y + 8,
    size: 10,
    font,
    color: rgb(0, 0.6, 0),
  });
};

/* ---------------------------------------------------
   ROUTE
--------------------------------------------------- */

router.get(
  '/annotated-pdf/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    console.log('Generating annotated PDF:', req.params.id);

    try {
      const annotation = await AnnotationModel.findById(req.params.id);
      if (!annotation?.pdfData) {
        return res.status(404).json({ message: 'Annotated PDF not found' });
      }

      const { email } = req.user;
      const isPaid = annotation.isPaid;

      const pdfDoc = await PDFDocument.load(annotation.pdfData);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // 1️⃣ Draw annotations
      drawAnnotations({
        pages,
        annotations: annotation.annotations,
        font,
      });

      // 2️⃣ Watermark
      const formattedDate = annotation.createdAt
        ? new Date(annotation.createdAt).toLocaleString()
        : 'Unknown date';

      drawWatermark({
        pages,
        font,
        isPaid,
        text: `AC Commerce — ${email || 'User'} — ${formattedDate}`,
      });

      // 3️⃣ Approval stamp (PAID ONLY)
      if (isPaid) {
        drawApprovalStamp({
          page: pages[0],
          font,
        });
      }

      // 4️⃣ Save + send
      const pdfBytes = await pdfDoc.save();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(
          annotation.filename || 'annotated.pdf'
        )}`,
        'Content-Length': pdfBytes.length,
      });

      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error('PDF generation failed:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to generate annotated PDF' });
      }
    }
  })
);

router.get('/annotations/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotations not found for this PDF.' });
    }

    const tokenUserId = req.user._id?.toString() || req.user.id?.toString() || req.user.userId?.toString();
    const isAdmin = req.user.isAdmin;
    // Allow access if admin, or if user owns the annotation
    if (!isAdmin && (!tokenUserId || annotation.userId.toString() !== tokenUserId)) {
      return res.status(403).json({ message: 'Unauthorized to access these annotations.' });
    }

    return res.json({
      annotations: annotation.annotations,
      isPaid: annotation.isPaid,
      acType: annotation.acType,
      filename: annotation.filename
    });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to fetch annotations.', error: error.message });
    }
  }
});

router.put('/annotations/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotation not found.' });
    }

    // Update the annotation with the new data
    annotation.annotations = req.body.annotations;
    annotation.isPaid = req.body.isPaid;
    annotation.acType = req.body.acType;

    await annotation.save();

    res.json({ message: 'Annotation updated successfully.' });
  } catch (error) {
    console.error('Error updating annotation:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to update annotation.', error: error.message });
    }
  }
});

router.get('/user-annotations', isAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const annotations = await AnnotationModel.find({ userId });

    console.log(`User ${userId} has ${annotations.length} annotations:`, annotations.map(a => ({ id: a._id, filename: a.filename, isPaid: a.isPaid })));

    const data = annotations.map((a) => ({
      _id: a._id,
      filename: a.filename,
      pdfId: a.pdfId,
      createdAt: a.createdAt,
      isPaid: a.isPaid,
      acType: a.acType,
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch annotations', error: error.message });
  }
});

router.delete('/annotations/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotation not found.' });
    }

    const tokenUserId = req.user._id?.toString() || req.user.id?.toString() || req.user.userId?.toString();
    // Only allow if user owns the annotation (admins cannot delete user annotations)
    if (!tokenUserId || annotation.userId.toString() !== tokenUserId) {
      return res.status(403).json({ message: 'Unauthorized to delete these annotations.' });
    }

    await AnnotationModel.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Annotation deleted successfully.' });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to delete annotation.', error: error.message });
    }
  }
});

router.get("/print-annotated-pdf/:id", isAuth, async (req, res) => {
  try {
    const annotationId = req.params.id;
    const annotation = await AnnotationModel.findById(annotationId);

    if (!annotation) {
      return res.status(404).json({ message: "PDF not found." });
    }

    if (!annotation.isPaid) {
      return res.status(403).json({
        message: "Printing is available only for paid documents.",
      });
    }

    const pdfDoc = await PDFDocument.load(annotation.pdfData);

    const pages = pdfDoc.getPages();
    pages.forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText("CONFIDENTIAL", {
        x: width / 2 - 100,
        y: height / 2,
        size: 50,
        color: rgb(0.8, 0.8, 0.8),
        rotate: { degrees: 45 },
        opacity: 0.3,
      });
    });


    const stampPath = path.join(
      process.cwd(),
      "backend/assets/approved-seal.png"
    );
    if (fs.existsSync(stampPath)) {
      const stampImageBytes = fs.readFileSync(stampPath);
      const stampImage = await pdfDoc.embedPng(stampImageBytes);

      const firstPage = pdfDoc.getPages()[0];
      firstPage.drawImage(stampImage, {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      });
    }

    const firstPage = pdfDoc.getPages()[0];
    const { width: pdfWidth, height: pdfHeight } = firstPage.getSize();
    const { rectangles, comments, lines } = annotation.annotations || {};

    rectangles?.forEach((rect) => {
      firstPage.drawRectangle({
        x: rect.xPercent * pdfWidth,
        y: rect.yPercent * pdfHeight,
        width: rect.widthPercent * pdfWidth,
        height: rect.heightPercent * pdfHeight,
        color: rgb(0, 0.8, 0.9),
        opacity: 0.3,
        borderColor: rgb(0, 0, 0),
        borderWidth: 2,
      });
    });


    const pdfBytes = await pdfDoc.save();

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${annotation.filename || "document"}.pdf"`
    );
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Error generating printable PDF:", error);
    res
      .status(500)
      .json({ message: "Error generating printable PDF.", error: error.message });
  }
});

export default router;