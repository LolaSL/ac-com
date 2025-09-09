import express from 'express';
import multer from 'multer';
import AnnotationModel from '../models/annotationModel.js';
import { isAuth } from '../utils.js';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fetch from 'node-fetch';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-annotate', isAuth, upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded.' });
    }

    const userId = req.user._id;
    const { rectangles, comments, lines, pdfId, imageWidth, imageHeight } = req.body;

    if (!imageWidth || !imageHeight) {
      return res.status(400).json({ message: 'Missing image dimensions.' });
    }

    const width = parseFloat(imageWidth);
    const height = parseFloat(imageHeight);

    const parsedRectangles = JSON.parse(rectangles || '[]');
    const parsedComments = JSON.parse(comments || '[]');
    const parsedLines = JSON.parse(lines || '[]');

    const percentRectangles = parsedRectangles.map(rect => ({
      id: rect.id,
      xPercent: rect.x / width,
      yPercent: rect.y / height,
      widthPercent: rect.width / width,
      heightPercent: rect.height / height,
      fill: rect.fill,
      stroke: rect.stroke,
      rotation: rect.rotation || 0,
    }));

    const percentComments = parsedComments.map(comment => ({
      id: comment.id,
      rectId: comment.rectId,
      text: comment.text,
      xPercent: comment.x / width,
      yPercent: comment.y / height,
      fill: comment.fill,
      textColor: comment.textColor,
    }));

    const percentLines = parsedLines.map(line => ({
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
      annotations: {
        rectangles: percentRectangles,
        comments: percentComments,
        lines: percentLines,
      },
    });

    const savedAnnotation = await newAnnotation.save();
    return res.status(201).json({ message: 'PDF and annotations saved successfully!', id: savedAnnotation._id });
  } catch (error) {
    console.error('Error saving PDF and annotations:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to save PDF and annotations.', error: error.message });
    }
  }
});

router.get('/annotated-pdf/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation || !annotation.pdfData) {
      return res.status(404).json({ message: 'Annotated PDF not found.' });
    }

    const tokenUserId = req.user._id?.toString() || req.user.id?.toString() || req.user.userId?.toString();
    if (!tokenUserId || annotation.userId.toString() !== tokenUserId) {
      return res.status(403).json({ message: 'Unauthorized access.' });
    }

    // Load the base PDF
    const pdfDoc = await PDFDocument.load(annotation.pdfData);
    const pages = pdfDoc.getPages();

    const watermarkText = `AC Design — User: ${req.user.email || 'Unknown User'}`;

    if (annotation.annotatedImageUrl) {
      const imageBytes = await fetch(annotation.annotatedImageUrl).then(res => res.arrayBuffer());
      const embeddedImage = await pdfDoc.embedPng(imageBytes);

      pages.forEach((page) => {
        const { width, height } = page.getSize();
        page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
        page.drawText(watermarkText, {
          x: width / 4,
          y: height / 2,
          size: 18,
          rotate: degrees(-40),
          opacity: 0.15,
          color: rgb(0.6, 0.6, 0.6),
        });
      });
    } else {
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText(watermarkText, {
          x: width / 4,
          y: height / 2,
          size: 20,                  
          rotate: degrees(-40),
          opacity: 0.25,                
          color: rgb(0.3, 0.3, 0.3),  
        });
      });
    }

    const pdfBytes = await pdfDoc.save();

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

router.get('/annotations/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotations not found for this PDF.' });
    }

    const tokenUserId = req.user._id?.toString() || req.user.id?.toString() || req.user.userId?.toString();
    if (!tokenUserId || annotation.userId.toString() !== tokenUserId) {
      return res.status(403).json({ message: 'Unauthorized to access these annotations.' });
    }

    return res.json(annotation.annotations);
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
    const userAnnotations = await AnnotationModel.find({ userId }).select('_id filename pdfId createdAt updatedAt');
    return res.json(userAnnotations);
  } catch (error) {
    console.error('Error fetching user annotations:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to fetch user annotations.', error: error.message });
    }
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

export default router;
