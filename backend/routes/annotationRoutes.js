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

    const { isPaid, email } = req.user;
    console.log(`User isPaid: ${isPaid}, User Email: ${email}`);

    const pdfDoc = await PDFDocument.load(annotation.pdfData);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const isPaidTemp = true; // ← TEMP for testing

    if (isPaidTemp) {
      console.log('User is a paid member. Applying premium content.');

      if (annotation.annotations && Array.isArray(annotation.annotations)) {
        console.log(`Found ${annotation.annotations.length} annotations. Rendering...`);

        annotation.annotations.forEach((ann) => {
          const page = pages[ann.pageIndex] || firstPage;

          switch (ann.type) {
            case 'text':
              page.drawText(ann.text, {
                x: ann.x,
                y: ann.y,
                size: ann.size,
                color: rgb(ann.color.r, ann.color.g, ann.color.b),
              });
              break;

            case 'rectangle':
              page.drawRectangle({
                x: ann.x,
                y: ann.y,
                width: ann.width,
                height: ann.height,
                borderColor: rgb(ann.borderColor.r, ann.borderColor.g, ann.borderColor.b),
                borderWidth: ann.borderWidth,
              });
              break;

            default:
              console.warn(`Unknown annotation type: ${ann.type}`);
          }
        });
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

      firstPage.drawText('AC COMMERCE', {
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

      const { isPaid, email } = req.user;

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

    // Filter annotations based on user's payment status
    const isPaid = req.user.isPaid;
    let filteredAnnotations = annotation.annotations;

    if (!isPaid) {
      // For unpaid users, exclude engineer/admin HVAC annotations
      filteredAnnotations = {
        ...annotation.annotations,
        hvac: null,
      };
    }

    return res.json(filteredAnnotations);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to fetch annotations.', error: error.message });
    }
  }
});

router.get('/user-annotations', isAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const annotations = await AnnotationModel.find({ userId });

    const data = annotations.map((a) => ({
      _id: a._id,
      filename: a.filename,
      pdfId: a.pdfId,
      createdAt: a.createdAt,
      isPaid: a.isPaid,
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