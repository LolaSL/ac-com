import mongoose, { Schema } from "mongoose";

const annotationSchema = new Schema(
  {
    filename: { type: String, required: true },
    pdfData: { type: Buffer, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pdfId: { type: String, required: true },

    originalImageWidth: { type: Number, required: true },
    originalImageHeight: { type: Number, required: true },

    annotations: {
      rectangles: [
        {
          id: { type: String, required: true },
          xPercent: { type: Number, required: true },
          yPercent: { type: Number, required: true },
          widthPercent: { type: Number, required: true },
          heightPercent: { type: Number, required: true },
          fill: { type: String },
          stroke: { type: String },
          rotation: { type: Number, default: 0 },
        },
      ],
      comments: [
        {
          id: { type: String, required: true },
          rectId: { type: String, required: true },
          text: { type: String, required: true },
          xPercent: { type: Number, required: true },
          yPercent: { type: Number, required: true },
          fill: { type: String },
          textColor: { type: String },
        },
      ],
      lines: [
        {
          id: { type: String, required: true },
          rectId: { type: String, required: true },
          commentId: { type: String, required: true },
          points: [{ type: Number }],
          stroke: { type: String },
          strokeWidth: { type: Number },
        },
      ],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const AnnotationModel = mongoose.model("Annotation", annotationSchema);

export default AnnotationModel;