import mongoose, { Schema } from "mongoose";

const demoRequestSchema = new Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        company: { type: String, required: true },
        phone: { type: String },
        projectSize: { type: String },
        preferredDate: { type: String },
    },
    {
        timestamps: true,
    }
);

const DemoRequest = mongoose.model("DemoRequest", demoRequestSchema);

export default DemoRequest;