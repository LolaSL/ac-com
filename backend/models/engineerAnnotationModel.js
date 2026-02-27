import mongoose, { Schema } from "mongoose";

const engineerAnnotationSchema = new Schema(
    {
        // Reference to the user whose annotation the engineer is reviewing
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

        // Reference to the engineer/admin making the annotation
        engineerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

        // Reference to the original user's annotation
        userAnnotationId: {
            type: Schema.Types.ObjectId,
            ref: "Annotation",
            required: true,
        },

        // PDF file data (engineer's annotated version)
        pdfData: { type: Buffer, required: true },
        filename: { type: String, required: true },

        // Original PDF dimensions for accurate percentage-based positioning
        originalImageWidth: { type: Number, required: true },
        originalImageHeight: { type: Number, required: true },

        // HVAC system configuration selected by engineer
        systemConfig: {
            systemType: {
                type: String,
                enum: ["minisplit-ducted", "minisplit-ductless", "vrf-ducted", "vrf-ductless"],
                required: true,
            },
            roomType: { type: String }, // e.g., "bedroom", "living room"
            areaSqft: { type: Number }, // Square footage
            btuRequired: { type: Number }, // BTU calculation
            refrigerantLinesAuto: { type: Boolean, default: false }, // Auto-generated refrigerant lines
        },

        // Engineer's annotations (similar structure to user annotations)
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
                        fill: { type: String },
                        stroke: { type: String },
                    },
                ],
                diffusers: [
                    {
                        id: { type: String, required: true },
                        shape: { type: String, required: true }, // "circle", "square"
                        xPercent: { type: Number, required: true },
                        yPercent: { type: Number, required: true },
                        sizePercent: { type: Number, required: true },
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
            },
            vrf: {
                outdoorUnits: [
                    {
                        id: { type: String, required: true },
                        xPercent: { type: Number, required: true },
                        yPercent: { type: Number, required: true },
                        sizePercent: { type: Number, default: 0.12 },
                        capacity: { type: Number },
                    },
                ],
                indoorUnits: [
                    {
                        id: { type: String, required: true },
                        xPercent: { type: Number, required: true },
                        yPercent: { type: Number, required: true },
                        sizePercent: { type: Number, default: 0.08 },
                        roomName: { type: String },
                    },
                ],
            },
        },

        // Status of the engineer review
        status: {
            type: String,
            enum: ["pending", "reviewed", "approved", "rejected"],
            default: "reviewed",
        },

        // Engineer's notes/comments on the entire review
        engineerNotes: { type: String },

        // TTL expiration for 14-day retention
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 14 * 24 * 60 * 60, // 14 days in seconds
        },
        updatedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
engineerAnnotationSchema.index({ userId: 1, createdAt: -1 });
engineerAnnotationSchema.index({ engineerId: 1, createdAt: -1 });
engineerAnnotationSchema.index({ userAnnotationId: 1 });

const EngineerAnnotationModel = mongoose.model(
    "EngineerAnnotation",
    engineerAnnotationSchema
);

export default EngineerAnnotationModel;
