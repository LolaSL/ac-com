import mongoose, { Schema } from "mongoose";

const annotationSchema = new Schema(
  {
    filename: { type: String, required: true },
    fileType: { type: String, default: 'application/pdf' },
    pdfData: { type: Buffer, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pdfId: { type: String, required: true },

    originalImageWidth: { type: Number, required: true },
    originalImageHeight: { type: Number, required: true },
    pdfRotation: { type: Number, default: 0 },
    offsetX: { type: Number, default: 0 },
    offsetY: { type: Number, default: 0 },

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
          acType: { type: String },
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
      hvac: {
        ducts: [
          {
            id: { type: String, required: true },
            xPercent: { type: Number, required: true },
            yPercent: { type: Number, required: true },
            width: { type: Number, required: true },
            height: { type: Number },
            ductType: { type: String }, // "supply", "return", "flex", "exhaust", "insulated"
            fill: { type: String },
            stroke: { type: String },
          },
        ],
        diffusers: [
          {
            id: { type: String, required: true },
            shape: { type: String, required: true }, // "circle", "square", "linear", etc.
            xPercent: { type: Number, required: true },
            yPercent: { type: Number, required: true },
            sizePercent: { type: Number, required: true },
            diffuserType: { type: String }, // "round", "supply-4way", "return-grille", "linear-slot", etc.
            airflow: { type: Number }, // optional CFM
          },
        ],
        refrigerantLines: [
          {
            id: { type: String, required: true },
            points: [{ type: Number }], // [x1, y1, x2, y2, ...]
            stroke: { type: String },
            strokeWidth: { type: Number },
            lineType: { type: String }, // "liquid", "vapor", "suction"
          },
        ],
        dampers: [
          {
            id: { type: String, required: true },
            xPercent: { type: Number, required: true },
            yPercent: { type: Number, required: true },
            sizePercent: { type: Number },
            damperType: { type: String }, // "fire", "volume"
          },
        ],
        thermostats: [
          {
            id: { type: String, required: true },
            xPercent: { type: Number, required: true },
            yPercent: { type: Number, required: true },
            sizePercent: { type: Number },
            label: { type: String },
          },
        ],
        zones: [
          {
            id: { type: String, required: true },
            xPercent: { type: Number, required: true },
            yPercent: { type: Number, required: true },
            widthPercent: { type: Number, required: true },
            heightPercent: { type: Number, required: true },
            fill: { type: String },  // zone background color (e.g. "rgba(0,150,255,0.12)")
            stroke: { type: String }, // zone border color
            zoneNumber: { type: Number },
            zoneLabel: { type: String },
          },
        ],
      },
      vrf: {
        outdoorUnits: [
          {
            id: { type: String, required: true },
            xPercent: { type: Number, required: true },
            yPercent: { type: Number, required: true },
            sizePercent: { type: Number, default: 0.12 },
            capacity: { type: Number }, // optional BTU
          },
        ],
        indoorUnits: [
          {
            id: { type: String, required: true },
            xPercent: { type: Number, required: true },
            yPercent: { type: Number, required: true },
            sizePercent: { type: Number, default: 0.08 },
            roomName: { type: String }, // optional
          },
        ],
      },

    },
    isPaid: { type: Boolean, default: false },
    acType: { type: String, enum: ['ducted', 'ductless', 'vrf-ducted', 'vrf-ductless'], default: 'vrf-ducted' },
    roomData: [
      {
        name: { type: String }, // Room name with flat prefix (e.g., "Flat 1: Kitchen")
        size: { type: Number }, // Area in square meters
        btu: { type: Number, default: 0 }, // Calculated BTU
        unit: { type: String, default: 'meters' }, // Unit of measurement
        roomType: { type: String }, // Original room type for backward compatibility
        width: { type: String },
        length: { type: String },
        areaSqFt: { type: String },
        areaSqM: { type: String },
        uniqueId: { type: String },
      }
    ],
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