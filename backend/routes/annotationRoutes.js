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

const isInvestorUser = (user = {}) => {
  const type = String(user.type || '').toLowerCase();
  const role = String(user.role || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  return Boolean(
    user.isInvestor ||
    type === 'investor' ||
    role === 'investor' ||
    email.includes('investor')
  );
};

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

router.get('/user-annotations', isAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const annotations = await AnnotationModel.find({ userId }).sort({ createdAt: -1 });
    const data = annotations.map((a) => ({
      _id: a._id,
      filename: a.filename,
      createdAt: a.createdAt,
      isPaid: a.isPaid,
    }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user annotations', error: error.message });
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
      const hasPaidAccess = Boolean(req.user.isPaid || isInvestorUser(req.user));

      const { pdfId, rectangles, comments, lines, hvac, vrf, acType, imageWidth, imageHeight, rooms, roomData, pdfRotation } =
        req.body;

      if (!imageWidth || !imageHeight) {
        return res
          .status(400)
          .json({ message: "Missing image dimensions." });
      }

      const width = parseFloat(imageWidth);
      const height = parseFloat(imageHeight);

      console.log('Backend received dimensions:', { width, height });
      console.log('Backend received rectangles (raw):', JSON.parse(rectangles || "[]"));

      const parsedRectangles = JSON.parse(rectangles || "[]");
      const parsedComments = JSON.parse(comments || "[]");
      const parsedLines = JSON.parse(lines || "[]");
      const parsedHvac = JSON.parse(hvac || "{}");
      const parsedVrf = JSON.parse(vrf || "{}");
      const parsedRooms = JSON.parse(rooms || roomData || "[]"); // Accept either rooms or roomData

      const percentRectangles = parsedRectangles.map((rect) => {
        const xPercent = rect.xPercent ?? (rect.x / width);
        const yPercent = rect.yPercent ?? (rect.y / height);
        const widthPercent = rect.widthPercent ?? (rect.width / width);
        const heightPercent = rect.heightPercent ?? (rect.height / height);

        console.log('Converting rectangle to percentages:', {
          id: rect.id,
          original: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          percentages: { xPercent, yPercent, widthPercent, heightPercent },
          canvasDimensions: { width, height }
        });

        return {
          id: rect.id,
          xPercent: Number.isFinite(parseFloat(xPercent)) ? parseFloat(xPercent) : 0,
          yPercent: Number.isFinite(parseFloat(yPercent)) ? parseFloat(yPercent) : 0,
          widthPercent: Number.isFinite(parseFloat(widthPercent)) ? parseFloat(widthPercent) : 0,
          heightPercent: Number.isFinite(parseFloat(heightPercent)) ? parseFloat(heightPercent) : 0,
          fill: rect.fill,
          stroke: rect.stroke,
          rotation: rect.rotation || 0,
        };
      });

      const percentComments = parsedComments.map((comment) => ({
        id: comment.id,
        rectId: comment.rectId,
        text: comment.text,
        acType: comment.acType,
        xPercent: (comment.xPercent ?? (comment.x / width)) || 0,
        yPercent: (comment.yPercent ?? (comment.y / height)) || 0,
        fill: comment.fill,
        textColor: comment.textColor,
      }));

      const percentLines = parsedLines.map((line) => {
        const points = Array.isArray(line.points) ? line.points : [];
        const maxAbsPoint = points.reduce((m, p) => {
          const n = typeof p === 'string' ? parseFloat(p) : p;
          return Number.isFinite(n) ? Math.max(m, Math.abs(n)) : m;
        }, 0);

        const looksLikePixels = maxAbsPoint > 1.5;
        const normalizedPoints = looksLikePixels
          ? points.map((p, i) => {
              const n = typeof p === 'string' ? parseFloat(p) : p;
              if (!Number.isFinite(n)) return 0;
              return i % 2 === 0 ? n / width : n / height;
            })
          : points.map((p) => {
              const n = typeof p === 'string' ? parseFloat(p) : p;
              return Number.isFinite(n) ? n : 0;
            });

        return {
          id: line.id,
          rectId: line.rectId,
          commentId: line.commentId,
          points: normalizedPoints,
          stroke: line.stroke,
          strokeWidth: line.strokeWidth,
        };
      });

      const hvacData = {
        ducts: (parsedHvac.ducts || []).map((duct) => ({
          id: duct.id,
          xPercent: duct.xPercent || duct.x / width || 0,
          yPercent: duct.yPercent || duct.y / height || 0,
          width: duct.width || 0.2,
          height: duct.height || 0.04,
          fill: duct.fill || "transparent",
          stroke: duct.stroke || "#0078d4",
        })),
        diffusers: (parsedHvac.diffusers || []).map((diffuser) => ({
          id: diffuser.id,
          shape: diffuser.shape || "circle",
          xPercent: diffuser.xPercent || diffuser.x / width || 0,
          yPercent: diffuser.yPercent || diffuser.y / height || 0,
          sizePercent: diffuser.sizePercent || 0.08,
          airflow: diffuser.airflow,
        })),
        refrigerantLines: (parsedHvac.refrigerantLines || []).map((line) => ({
          id: line.id,
          points: (line.points || []).map((p, i) => (i % 2 === 0 ? p / width : p / height)),
          stroke: line.stroke || "#FF6B35",
          strokeWidth: line.strokeWidth || 2,
          lineType: line.lineType || "liquid",
        })),
      };

      const vrfData = {
        outdoorUnits: (parsedVrf.outdoorUnits || []).map((unit) => ({
          id: unit.id,
          xPercent: unit.xPercent || unit.x / width || 0,
          yPercent: unit.yPercent || unit.y / height || 0,
          sizePercent: unit.sizePercent || 0.12,
          capacity: unit.capacity,
        })),
        indoorUnits: (parsedVrf.indoorUnits || []).map((unit) => ({
          id: unit.id,
          xPercent: unit.xPercent || unit.x / width || 0,
          yPercent: unit.yPercent || unit.y / height || 0,
          sizePercent: unit.sizePercent || 0.08,
          roomName: unit.roomName,
        })),
      };

      const newAnnotation = new AnnotationModel({
        filename: req.file.originalname,
        pdfData: req.file.buffer,
        userId,
        pdfId,
        isPaid: hasPaidAccess,
        acType,
        originalImageWidth: width,
        originalImageHeight: height,
        pdfRotation: Number.isFinite(parseInt(pdfRotation, 10)) ? parseInt(pdfRotation, 10) : 0,
        annotations: {
          rectangles: percentRectangles,
          comments: percentComments,
          lines: percentLines,
          hvac: hvacData,
          vrf: vrfData,
        },
        roomData: parsedRooms,
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
    const hasPaidAccess = Boolean(
      (annotation.isPaid !== undefined ? annotation.isPaid : false) || isInvestorUser(req.user)
    );
    console.log(`Annotation isPaid: ${annotation.isPaid}, paidAccess: ${hasPaidAccess}, User Email: ${email}`);
    console.log('Annotation object:', annotation);

    // Ensure pdf data is a Buffer/Uint8Array for pdf-lib
    let pdfDataForLoad = annotation.pdfData;
    let pdfDoc;
    let pages;
    let firstPage;
    try {
      if (!pdfDataForLoad) {
        throw new Error('annotation.pdfData is empty');
      }
      // If returned as a BSON Binary (has 'buffer' or 'sub_type'), coerce to Buffer
      if (typeof Buffer !== 'undefined' && !Buffer.isBuffer(pdfDataForLoad)) {
        if (pdfDataForLoad.buffer) {
          // Node BSON Binary exposes .buffer which may be an ArrayBuffer or Buffer
          pdfDataForLoad = Buffer.from(pdfDataForLoad.buffer);
        } else if (pdfDataForLoad._bsontype === 'Binary' && pdfDataForLoad.value) {
          pdfDataForLoad = Buffer.from(pdfDataForLoad.value());
        } else {
          // Fallback: try Buffer.from directly
          try {
            pdfDataForLoad = Buffer.from(pdfDataForLoad);
          } catch (e) {
            // leave as-is and let pdf-lib throw a helpful error
            console.warn('Could not coerce annotation.pdfData to Buffer directly:', e.message);
          }
        }
      }

      pdfDoc = await PDFDocument.load(pdfDataForLoad);
      // continue with existing flow
      pages = pdfDoc.getPages();
      firstPage = pages[0];
    } catch (loadError) {
      console.error('Error loading PDF with pdf-lib. pdfData type:', Object.prototype.toString.call(annotation.pdfData), 'coerced type:', Object.prototype.toString.call(pdfDataForLoad));
      console.error(loadError);
      if (!res.headersSent) {
        return res.status(500).json({ message: `Failed to generate annotated PDF: ${loadError.message}` });
      }
    }
    if (!pdfDoc) {
      // Defensive: if pdfDoc wasn't created, ensure we don't continue
      if (!res.headersSent) {
        return res.status(500).json({ message: 'Failed to generate annotated PDF: pdf could not be loaded' });
      }
      return;
    }

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    if (hasPaidAccess) {
      console.log('Annotation is paid. Drawing annotations, watermark, and stamp.');

      const ann = annotation.annotations;
      if (ann) {
        console.log('Found annotations object. Rendering...');

        // Rectangles are rendered by the canvas overlay (overlayAnnotations) which
        // supports rotation and fill. Drawing them here again (without rotation) would
        // produce a duplicate "empty" rectangle at the original un-rotated position.
        // Rectangle rendering intentionally omitted from the PDF-lib paid overlay.

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
          // ...existing code for drawing ducts, diffusers, and connections...
        }

        // For ductless, draw connections
        if (annotation.acType === 'ductless' && ann.rectangles && Array.isArray(ann.rectangles)) {
          // ...existing code for finding condensers and drawing lines...
        }
      } else {
        console.log('No annotations found.');
      }

      // ========== WATERMARK WITH USER CREDENTIALS ==========
      // Draw watermark on all pages (ALWAYS for paid content, regardless of annotations or acType)
      let createdAtDate = annotation.createdAt;
      let formattedDate = createdAtDate
        ? new Date(createdAtDate).toLocaleString()
        : 'Unknown Date';
      const watermarkText = `AC Commerce — User: ${email || 'Unknown User'} —  Saved: ${formattedDate}`;

      console.log('Drawing watermark on all pages:', watermarkText);
      pages.forEach((page) => {
        const fontSize = 14;
        const { width, height } = page.getSize();

        const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
        const xPos = (width - textWidth) / 2;
        const yPos = 30; // bottom padding

        page.drawText(watermarkText, {
          x: xPos,
          y: yPos,
          size: fontSize,
          font: helveticaFont,
          opacity: 0.4,
          color: rgb(0.5, 0.5, 0.5),
          rotate: degrees(45),
        });
      });

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
      const hasPaidAccess = Boolean(annotation.isPaid || isInvestorUser(req.user));

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
        isPaid: hasPaidAccess,
        text: `AC Commerce — ${email || 'User'} — ${formattedDate}`,
      });

      // 3️⃣ Approval stamp (PAID ONLY)
      if (hasPaidAccess) {
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
      pdfRotation: annotation.pdfRotation || 0,
      offsetX: annotation.offsetX || 0,
      offsetY: annotation.offsetY || 0,
      originalImageWidth: annotation.originalImageWidth,
      originalImageHeight: annotation.originalImageHeight,
      filename: annotation.filename,
      userId: annotation.userId,
      roomData: annotation.roomData || [], // Include room data for BTU Calculator export
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

// PATCH endpoint to update alignment offset
router.patch('/annotations/:id/offset', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotation not found.' });
    }

    // Verify ownership
    if (annotation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this annotation.' });
    }

    // Update offset values
    annotation.offsetX = req.body.offsetX || 0;
    annotation.offsetY = req.body.offsetY || 0;

    await annotation.save();

    res.json({ 
      message: 'Alignment offset saved successfully.', 
      offsetX: annotation.offsetX, 
      offsetY: annotation.offsetY 
    });
  } catch (error) {
    console.error('Error saving offset:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to save offset.', error: error.message });
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
      console.error('[DELETE] Annotation not found for id:', req.params.id);
      return res.status(404).json({ message: 'Annotation not found.' });
    }

    const tokenUserId = req.user._id?.toString() || req.user.id?.toString() || req.user.userId?.toString();
    const annotationUserId = annotation.userId?.toString();
    console.log('[DELETE] tokenUserId:', tokenUserId, '| annotationUserId:', annotationUserId);

    if (!tokenUserId) {
      console.error('[DELETE] No user id in token');
      return res.status(403).json({ message: 'No user id in token.' });
    }
    if (!annotationUserId) {
      console.error('[DELETE] No userId on annotation');
      return res.status(500).json({ message: 'No userId on annotation.' });
    }
    if (annotationUserId !== tokenUserId) {
      console.error('[DELETE] User id mismatch. Not authorized.');
      return res.status(403).json({ message: `Unauthorized: userId mismatch. Your id: ${tokenUserId}, annotation userId: ${annotationUserId}` });
    }

    await AnnotationModel.findByIdAndDelete(req.params.id);
    console.log('[DELETE] Annotation deleted for id:', req.params.id);
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

    const hasPaidAccess = Boolean(annotation.isPaid || isInvestorUser(req.user));
    if (!hasPaidAccess) {
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

    // Rectangles are rendered by the canvas overlay (overlayAnnotations) which supports
    // rotation and fill colors. Drawing them here (without rotation support) creates
    // duplicate uncolored rectangles. Rectangle rendering intentionally omitted.

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