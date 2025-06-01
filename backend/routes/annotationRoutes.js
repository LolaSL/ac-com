import express from 'express';
import multer from 'multer';
import AnnotationModel from '../models/annotationModel.js'; 
import { isAuth } from '../utils.js'; 

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
      points: line.points.map((p, i) => i % 2 === 0 ? p / width : p / height), // x / width, y / height
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
    res.status(201).json({ message: 'PDF and annotations saved successfully!', id: savedAnnotation._id });
  } catch (error) {
    console.error('Error saving PDF and annotations:', error);
    res.status(500).json({ message: 'Failed to save PDF and annotations.', error: error.message });
  }
});


router.get('/annotated-pdf/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotated PDF not found.' });
    }

 
    if (annotation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to access this PDF.' });
    }

    console.log("Sending PDF with ID:", req.params.id); 
res.set({
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'inline', // don't force download
});
res.send(annotation.pdfData);
  } catch (error) {
    console.error('Error fetching annotated PDF:', error);
    res.status(500).json({ message: 'Failed to fetch annotated PDF.', error: error.message });
  }
});



router.get('/annotations/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotations not found for this PDF.' });
    }

    if (annotation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to access these annotations.' });
    }

    res.json(annotation.annotations);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({ message: 'Failed to fetch annotations.', error: error.message });
  }
});


router.get('/user-annotations', isAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const userAnnotations = await AnnotationModel.find({ userId: userId }).select('_id filename pdfId createdAt updatedAt');
    res.json(userAnnotations);
  } catch (error) {
    console.error('Error fetching user annotations:', error);
    res.status(500).json({ message: 'Failed to fetch user annotations.', error: error.message });
  }
});


router.delete('/annotations/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotation not found.' });
    }

    await AnnotationModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Annotation deleted successfully by admin.' });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({ message: 'Failed to delete annotation.', error: error.message });
  }
});


export default router;