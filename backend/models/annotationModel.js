import mongoose, { Schema } from 'mongoose';

const annotationSchema = new Schema({
  filename: { type: String, required: true },
  pdfData: { type: Buffer, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
pdfId: { type: String, required: true }, 

  annotations: {
    rectangles: [
      {
        id: { type: String, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        fill: { type: String },
        rotation: { type: Number, default: 0 },
      },
    ],
    comments: [
      {
        id: { type: String, required: true },
        rectId: { type: String, required: true },
        text: { type: String, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        fill: { type: String },
      },
    ],
    lines: [
      {
        id: { type: String, required: true },
        rectId: { type: String, required: true },
        commentId: { type: String, required: true },
        points: [Number],
        stroke: { type: String },
        strokeWidth: { type: Number },
      },
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7 // 7 days in seconds
  },
  
  updatedAt: { type: Date, default: Date.now },
});

const AnnotationModel = mongoose.model('Annotation', annotationSchema);

export default AnnotationModel;