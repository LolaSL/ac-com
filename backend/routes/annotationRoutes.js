import express from 'express';
import multer from 'multer';
import AnnotationModel from '../models/annotationModel.js'; // Adjust the path as needed
import { isAuth } from '../utils.js'; // Assuming you have an auth middleware

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Store file in memory as buffer

// Route to handle PDF upload and annotation saving (requires authentication)
router.post('/upload-annotate', isAuth, upload.single('pdfFile'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ message: 'No PDF file uploaded.' });
      }

      const userId = req.user._id;  // Ensure the userId is coming from req.user, which is set by the isAuth middleware
      const { rectangles, comments, lines, pdfId } = req.body;

      // Validate and parse annotation data
      const parsedRectangles = JSON.parse(rectangles || '[]');
      const parsedComments = JSON.parse(comments || '[]');
      const parsedLines = JSON.parse(lines || '[]');

      if (!Array.isArray(parsedRectangles)) throw new Error('Invalid rectangle data.');
      if (!Array.isArray(parsedComments)) throw new Error('Invalid comment data.');
      if (!Array.isArray(parsedLines)) throw new Error('Invalid line data.');

      // Create annotation document
      const newAnnotation = new AnnotationModel({
          filename: req.file.originalname,
          pdfData: req.file.buffer,
          userId: userId,  // This ensures the userId is set correctly
          pdfId: pdfId,
          annotations: {
              rectangles: parsedRectangles,
              comments: parsedComments,
              lines: parsedLines,
          },
      });

      const savedAnnotation = await newAnnotation.save();
      res.status(201).json({ message: 'PDF and annotations saved successfully!', id: savedAnnotation._id });
  } catch (error) {
      console.error('Error saving PDF and annotations:', error);
      res.status(500).json({ message: 'Failed to save PDF and annotations.', error: error.message });
  }
});

// Route to get a specific annotated PDF by ID (requires authentication and ownership check)
router.get('/annotated-pdf/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotated PDF not found.' });
    }

    // Check if the logged-in user owns this annotation
    if (annotation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to access this PDF.' });
    }

    console.log("Sending PDF with ID:", req.params.id); // Debugging log
    res.set('Content-Type', 'application/pdf');
    res.send(annotation.pdfData); // Send PDF data
  } catch (error) {
    console.error('Error fetching annotated PDF:', error);
    res.status(500).json({ message: 'Failed to fetch annotated PDF.', error: error.message });
  }
});


// Route to get the annotations for a specific PDF ID (requires authentication and ownership check)
router.get('/annotations/:id', isAuth, async (req, res) => {
  try {
    const annotation = await AnnotationModel.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: 'Annotations not found for this PDF.' });
    }

    // Check ownership
    if (annotation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to access these annotations.' });
    }

    res.json(annotation.annotations);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({ message: 'Failed to fetch annotations.', error: error.message });
  }
});

// Route to get all annotated PDFs for a specific user (requires authentication)
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

// Route to delete a specific annotated PDF (requires authentication and ownership check)
// import { isAuth, isAdmin } from '../middleware/authMiddleware.js';

// router.delete('/annotations/:id', isAuth, isAdmin, async (req, res) => {
//   try {
//     const annotation = await AnnotationModel.findById(req.params.id);
//     if (!annotation) {
//       return res.status(404).json({ message: 'Annotation not found.' });
//     }

//     await AnnotationModel.findByIdAndDelete(req.params.id);
//     res.json({ message: 'Annotation deleted successfully by admin.' });
//   } catch (error) {
//     console.error('Error deleting annotation:', error);
//     res.status(500).json({ message: 'Failed to delete annotation.', error: error.message });
//   }
// });


export default router;