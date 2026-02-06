import express from "express";
import expressAsyncHandler from "express-async-handler";
import DemoRequest from "../models/demoRequestModel.js";

const demoRequestRouter = express.Router();

// POST /api/demo-requests - Create a new demo request
demoRequestRouter.post(
    "/",
    expressAsyncHandler(async (req, res) => {
        const { firstName, lastName, email, company, phone, projectSize, preferredDate } = req.body;

        const demoRequest = new DemoRequest({
            firstName,
            lastName,
            email,
            company,
            phone,
            projectSize,
            preferredDate,
        });

        const createdDemoRequest = await demoRequest.save();

        res.status(201).json({
            message: "Demo request submitted successfully",
            demoRequest: createdDemoRequest,
        });
    })
);

export default demoRequestRouter;