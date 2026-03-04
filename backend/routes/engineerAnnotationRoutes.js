import express from "express";
import multer from "multer";
import EngineerAnnotationModel from "../models/engineerAnnotationModel.js";
import AnnotationModel from "../models/annotationModel.js";
import { isAuth } from "../utils.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import expressAsyncHandler from "express-async-handler";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/engineer-annotations
 * Engineer/Admin saves annotated PDF based on user's annotation
 * Requires: isAuth (must be admin/engineer)
 */
router.post(
    "/",
    isAuth,
    upload.single("pdfFile"),
    expressAsyncHandler(async (req, res) => {
        // Verify user is admin/engineer
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Only engineers/admins can save annotations" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No PDF file uploaded." });
        }

        const {
            userId,
            userAnnotationId,
            systemType,
            roomType,
            areaSqft,
            btuRequired,
            rectangles,
            comments,
            lines,
            hvac,
            vrf,
            refrigerantLinesAuto,
            engineerNotes,
            imageWidth,
            imageHeight,
        } = req.body;

        if (!userId || !userAnnotationId) {
            return res
                .status(400)
                .json({ message: "Missing userId or userAnnotationId" });
        }

        if (!imageWidth || !imageHeight) {
            return res
                .status(400)
                .json({ message: "Missing image dimensions." });
        }

        // Verify the user annotation exists
        const userAnnotation = await AnnotationModel.findById(userAnnotationId);
        if (!userAnnotation) {
            return res.status(404).json({ message: "User annotation not found." });
        }

        const width = parseFloat(imageWidth);
        const height = parseFloat(imageHeight);

        // Parse and normalize annotation data to percentages
        const parsedRectangles = JSON.parse(rectangles || "[]");
        const parsedComments = JSON.parse(comments || "[]");
        const parsedLines = JSON.parse(lines || "[]");
        const parsedHvac = JSON.parse(hvac || "{}");
        const parsedVrf = JSON.parse(vrf || "{}");

        const percentRectangles = parsedRectangles.map((rect) => {
            const xPercent = rect.xPercent ?? (rect.x / width);
            const yPercent = rect.yPercent ?? (rect.y / height);
            const widthPercent = rect.widthPercent ?? (rect.width / width);
            const heightPercent = rect.heightPercent ?? (rect.height / height);

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

        const percentComments = parsedComments.map((comment) => {
            const xPercent = comment.xPercent ?? (comment.x / width);
            const yPercent = comment.yPercent ?? (comment.y / height);

            return {
                id: comment.id,
                rectId: comment.rectId,
                text: comment.text,
                acType: comment.acType,
                xPercent: Number.isFinite(parseFloat(xPercent)) ? parseFloat(xPercent) : 0,
                yPercent: Number.isFinite(parseFloat(yPercent)) ? parseFloat(yPercent) : 0,
                fill: comment.fill,
                textColor: comment.textColor,
            };
        });

        const percentLines = parsedLines.map((line) => {
            const points = Array.isArray(line.points) ? line.points : [];
            const maxAbsPoint = points.reduce((m, p) => {
                const n = typeof p === "string" ? parseFloat(p) : p;
                return Number.isFinite(n) ? Math.max(m, Math.abs(n)) : m;
            }, 0);

            // Heuristic: if points look like pixels (> 1), normalize; otherwise treat as already-percent.
            const looksLikePixels = maxAbsPoint > 1.5;
            const normalizedPoints = looksLikePixels
                ? points.map((p, i) => {
                    const n = typeof p === "string" ? parseFloat(p) : p;
                    if (!Number.isFinite(n)) return 0;
                    return i % 2 === 0 ? n / width : n / height;
                })
                : points.map((p) => {
                    const n = typeof p === "string" ? parseFloat(p) : p;
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

        // Normalize HVAC data
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
                points: line.points.map((p, i) => (i % 2 === 0 ? p / width : p / height)),
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

        const newEngineerAnnotation = new EngineerAnnotationModel({
            userId,
            engineerId: req.user._id,
            userAnnotationId,
            pdfData: req.file.buffer,
            filename: req.file.originalname,
            originalImageWidth: width,
            originalImageHeight: height,
            systemConfig: {
                systemType,
                roomType,
                areaSqft: parseFloat(areaSqft) || null,
                btuRequired: parseFloat(btuRequired) || null,
                refrigerantLinesAuto: refrigerantLinesAuto === "true" || refrigerantLinesAuto === true,
            },
            annotations: {
                rectangles: percentRectangles,
                comments: percentComments,
                lines: percentLines,
                hvac: hvacData,
                vrf: vrfData,
            },
            engineerNotes,
            status: "reviewed",
        });

        const savedAnnotation = await newEngineerAnnotation.save();

        return res.status(201).json({
            message: "Engineer annotation saved successfully!",
            id: savedAnnotation._id,
        });
    })
);

/**
 * GET /api/engineer-annotations/user/:userId
 * Get all engineer annotations for a specific user
 * Requires: isAuth
 */
router.get(
    "/user/:userId",
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { userId } = req.params;

        // Authorization: user can see their own, or admin
        const isOwner = req.user._id.toString() === userId;
        const isAdmin = req.user.isAdmin;

        if (!isOwner && !isAdmin) {
            return res
                .status(403)
                .json({ message: "Unauthorized to view these annotations" });
        }

        const annotations = await EngineerAnnotationModel.find({ userId })
            .populate("engineerId", "name email")
            .sort({ createdAt: -1 });

        const data = annotations.map((a) => ({
            _id: a._id,
            engineerId: a.engineerId,
            userAnnotationId: a.userAnnotationId,
            filename: a.filename,
            systemConfig: a.systemConfig,
            status: a.status,
            createdAt: a.createdAt,
        }));

        return res.json(data);
    })
);

/**
 * GET /api/engineer-annotations/engineer/:engineerId
 * Get all annotations created by a specific engineer
 * Requires: isAuth (only engineer or admin)
 */
router.get(
    "/engineer/:engineerId",
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { engineerId } = req.params;

        // Authorization: engineer can see their own, or admin
        const isOwner = req.user._id.toString() === engineerId;
        const isAdmin = req.user.isAdmin;

        if (!isOwner && !isAdmin) {
            return res
                .status(403)
                .json({ message: "Unauthorized to view these annotations" });
        }

        const annotations = await EngineerAnnotationModel.find({ engineerId })
            .populate("userId", "name email")
            .sort({ createdAt: -1 });

        const data = annotations.map((a) => ({
            _id: a._id,
            userId: a.userId,
            userAnnotationId: a.userAnnotationId,
            filename: a.filename,
            systemConfig: a.systemConfig,
            status: a.status,
            createdAt: a.createdAt,
        }));

        return res.json(data);
    })
);

/**
 * GET /api/engineer-annotations/by-user-annotation/:userAnnotationId
 * Get all engineer annotations linked to a specific user annotation ID
 * Requires: isAuth (owner of the user annotation or admin)
 */
router.get(
    "/by-user-annotation/:userAnnotationId",
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { userAnnotationId } = req.params;

        const annotations = await EngineerAnnotationModel.find({ userAnnotationId })
            .populate("engineerId", "name email")
            .sort({ createdAt: -1 });

        if (!annotations || annotations.length === 0) {
            return res.json([]);
        }

        // Authorization: allow if current user owns the underlying user annotation or is admin
        const ownerUserId = annotations[0].userId?.toString();
        const isOwner = ownerUserId && ownerUserId === req.user._id.toString();
        const isAdmin = req.user.isAdmin;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Unauthorized to view these annotations" });
        }

        const data = annotations.map((a) => ({
            _id: a._id,
            engineerId: a.engineerId,
            userAnnotationId: a.userAnnotationId,
            filename: a.filename,
            systemConfig: a.systemConfig,
            status: a.status,
            createdAt: a.createdAt,
        }));

        return res.json(data);
    })
);

/**
 * GET /api/engineer-annotations/annotated-pdf/:id
 * Download engineer annotation as PDF
 * Requires: isAuth
 */
router.get(
    "/annotated-pdf/:id",
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const annotation = await EngineerAnnotationModel.findById(req.params.id);

        if (!annotation || !annotation.pdfData) {
            return res.status(404).json({ message: "Engineer annotation PDF not found" });
        }

        // Authorization check
        const tokenUserId = req.user._id.toString();
        const isOwner =
            annotation.userId.toString() === tokenUserId ||
            annotation.engineerId.toString() === tokenUserId;
        const isAdmin = req.user.isAdmin;

        if (!isOwner && !isAdmin) {
            return res
                .status(403)
                .json({ message: "Unauthorized to download this PDF" });
        }

        const { email } = req.user;
        let pdfDataForLoad = annotation.pdfData;

        // Coerce to Buffer if needed
        if (!Buffer.isBuffer(pdfDataForLoad)) {
            if (pdfDataForLoad.buffer) {
                pdfDataForLoad = Buffer.from(pdfDataForLoad.buffer);
            } else if (pdfDataForLoad._bsontype === "Binary" && pdfDataForLoad.value) {
                pdfDataForLoad = Buffer.from(pdfDataForLoad.value());
            } else {
                pdfDataForLoad = Buffer.from(pdfDataForLoad);
            }
        }

        const pdfDoc = await PDFDocument.load(pdfDataForLoad);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Draw annotations on PDF
        const ann = annotation.annotations;
        if (ann) {
            const { width, height } = firstPage.getSize();

            // Rectangles are already baked into the PDF canvas image (with correct rotation).
            // Drawing them again via pdf-lib (which has no rotation support) would produce
            // unrotated "echo" outlines on top of the correctly rotated baked shapes.

            // Draw lines
            if (ann.lines && Array.isArray(ann.lines)) {
                ann.lines.forEach((line) => {
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

            // Comments are already baked into the PDF canvas image (with correct rose color).
            // Drawing them again via pdf-lib would produce black duplicate text on top.

            // Draw HVAC elements
            if (ann.hvac) {
                const hvac = ann.hvac;

                // Draw ducts (for ducted systems)
                if (hvac.ducts && Array.isArray(hvac.ducts)) {
                    hvac.ducts.forEach((duct) => {
                        const x = duct.xPercent * width;
                        const y = height - duct.yPercent * height - (duct.height || 0.04) * height;
                        const w = (duct.width || 0.2) * width;
                        const h = (duct.height || 0.04) * height;
                        firstPage.drawRectangle({
                            x,
                            y,
                            width: w,
                            height: h,
                            borderColor: rgb(0, 0.5, 1),
                            borderWidth: 2,
                        });
                    });
                }

                // Draw diffusers
                if (hvac.diffusers && Array.isArray(hvac.diffusers)) {
                    hvac.diffusers.forEach((diffuser) => {
                        const x = diffuser.xPercent * width;
                        const y = height - diffuser.yPercent * height;
                        const size = (diffuser.sizePercent || 0.08) * width;
                        firstPage.drawCircle({
                            x,
                            y,
                            size: size / 2,
                            borderColor: rgb(0, 1, 0),
                            borderWidth: 2,
                        });
                    });
                }

                // Draw refrigerant lines
                if (annotation.systemConfig.systemType.startsWith("vrf")) {
                    // For VRF, draw chain: condenser -> indoor1 -> indoor2 -> ...
                    const outdoor = ann.hvac?.outdoorUnits?.[0];
                    const indoors = ann.hvac?.indoorUnits || [];
                    if (outdoor && indoors.length > 0) {
                        // Sort indoors by xPercent
                        const sortedIndoors = [...indoors].sort((a, b) => a.xPercent - b.xPercent);
                        const points = [];
                        // Start from condenser
                        points.push(outdoor.xPercent, outdoor.yPercent);
                        // Then each indoor
                        sortedIndoors.forEach(indoor => {
                            points.push(indoor.xPercent, indoor.yPercent);
                        });
                        // Draw lines between consecutive points
                        for (let i = 0; i < points.length - 2; i += 2) {
                            const x1 = points[i] * width;
                            const y1 = height - points[i + 1] * height;
                            const x2 = points[i + 2] * width;
                            const y2 = height - points[i + 3] * height;
                            firstPage.drawLine({
                                start: { x: x1, y: y1 },
                                end: { x: x2, y: y2 },
                                thickness: 3,
                                color: rgb(0, 0, 1), // blue for refrigerant
                            });
                        }
                    }
                } else if (hvac.refrigerantLines && Array.isArray(hvac.refrigerantLines)) {
                    // For other systems, draw stored lines
                    hvac.refrigerantLines.forEach((line) => {
                        const points = line.points;
                        for (let i = 0; i < points.length - 2; i += 2) {
                            const x1 = points[i] * width;
                            const y1 = height - points[i + 1] * height;
                            const x2 = points[i + 2] * width;
                            const y2 = height - points[i + 3] * height;

                            // Color based on line type
                            let color = rgb(1, 0, 0); // default red
                            if (line.lineType === "liquid") {
                                color = rgb(0, 0, 1); // blue
                            } else if (line.lineType === "vapor") {
                                color = rgb(1, 0, 0); // red
                            } else if (line.lineType === "suction") {
                                color = rgb(0, 0.5, 0); // green
                            }

                            firstPage.drawLine({
                                start: { x: x1, y: y1 },
                                end: { x: x2, y: y2 },
                                thickness: line.strokeWidth || 2,
                                color,
                            });
                        }
                    });
                }
            }
        }

        // Add watermark with engineer info
        const formattedDate = annotation.createdAt
            ? new Date(annotation.createdAt).toLocaleString()
            : "Unknown Date";
        const engineerName = annotation.engineerId?.name || "Engineer";
        // Fetch user email for watermark
        let userEmail = "User";
        try {
            const userAnnotation = await AnnotationModel.findById(annotation.userAnnotationId).populate('userId', 'email');
            if (userAnnotation && userAnnotation.userId && userAnnotation.userId.email) {
                userEmail = userAnnotation.userId.email;
            }
        } catch (e) {}
        const watermarkText = `AC-Commerce — User: ${userEmail} — Engineer: ${engineerName} — Reviewed: ${formattedDate}`;

        pages.forEach((page) => {
            const fontSize = 12;
            const { width, height } = page.getSize();
            const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
            const xPos = (width - textWidth) / 2;
            const yPos = height / 2 - fontSize / 2;
            page.drawText(watermarkText, {
                x: xPos,
                y: yPos,
                size: fontSize,
                font: helveticaFont,
                opacity: 0.28,
                color: rgb(0.4, 0.4, 0.4),
                rotate: { type: 'degrees', angle: 30 },
            });
        });

        // Add approval stamp
        const { width, height } = firstPage.getSize();
        const stampMarginX = 50;
        const stampMarginY = height - 100;
        const boxWidth = 150;
        const boxHeight = 60;

        firstPage.drawRectangle({
            x: stampMarginX - 10,
            y: stampMarginY - 10,
            width: boxWidth,
            height: boxHeight,
            borderColor: rgb(0.2, 0.6, 0.2),
            borderWidth: 2,
        });

        firstPage.drawText("ENGINEER REVIEW", {
            x: stampMarginX,
            y: stampMarginY + 30,
            size: 14,
            font: helveticaFont,
            color: rgb(0.2, 0.6, 0.2),
            opacity: 0.85,
        });

        firstPage.drawText(engineerName, {
            x: stampMarginX,
            y: stampMarginY + 10,
            size: 10,
            font: helveticaFont,
            color: rgb(0.2, 0.6, 0.2),
        });

        // Save and send PDF
        const pdfBytes = await pdfDoc.save();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${annotation.filename || "engineer-annotation.pdf"}"`,
            "Content-Length": pdfBytes.length,
        });

        return res.send(Buffer.from(pdfBytes));
    })
);

/**
 * GET /api/engineer-annotations/:id
 * Retrieve engineer annotation by ID
 * Requires: isAuth
 */
router.get(
    "/:id",
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const annotation = await EngineerAnnotationModel.findById(req.params.id)
            .populate("userId", "name email")
            .populate("engineerId", "name email");

        if (!annotation) {
            return res.status(404).json({ message: "Engineer annotation not found" });
        }

        // Check authorization: user can see their own, or engineer can see their own, or admin
        // Note: userId/engineerId are populated documents here, so use ._id to get the ObjectId
        const tokenUserId = req.user._id.toString();
        const ownerUserId = annotation.userId?._id?.toString() || annotation.userId?.toString();
        const ownerEngineerId = annotation.engineerId?._id?.toString() || annotation.engineerId?.toString();
        const isOwner = ownerUserId === tokenUserId || ownerEngineerId === tokenUserId;
        const isAdmin = req.user.isAdmin;

        if (!isOwner && !isAdmin) {
            return res
                .status(403)
                .json({ message: "Unauthorized to access this annotation" });
        }

        return res.json({
            _id: annotation._id,
            userId: annotation.userId,
            engineerId: annotation.engineerId,
            userAnnotationId: annotation.userAnnotationId,
            filename: annotation.filename,
            systemConfig: annotation.systemConfig,
            annotations: annotation.annotations,
            status: annotation.status,
            engineerNotes: annotation.engineerNotes,
            createdAt: annotation.createdAt,
            updatedAt: annotation.updatedAt,
        });
    })
);

/**
 * PUT /api/engineer-annotations/:id
 * Update engineer annotation
 * Requires: isAuth (only engineer who created it)
 */
router.put(
    "/:id",
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const annotation = await EngineerAnnotationModel.findById(req.params.id);

        if (!annotation) {
            return res.status(404).json({ message: "Engineer annotation not found" });
        }

        // Only the engineer who created it can update
        if (annotation.engineerId.toString() !== req.user._id.toString()) {
            if (!req.user.isAdmin) {
                return res
                    .status(403)
                    .json({ message: "Unauthorized to update this annotation" });
            }
        }

        const { annotations, status, engineerNotes, systemConfig } = req.body;

        if (annotations) annotation.annotations = annotations;
        if (status) annotation.status = status;
        if (engineerNotes) annotation.engineerNotes = engineerNotes;
        if (systemConfig) annotation.systemConfig = { ...annotation.systemConfig, ...systemConfig };

        annotation.updatedAt = new Date();
        await annotation.save();

        return res.json({ message: "Engineer annotation updated successfully", annotation });
    })
);

/**
 * DELETE /api/engineer-annotations/:id
 * Delete engineer annotation
 * Requires: isAuth (only engineer who created it or admin)
 */
router.delete(
    "/:id",
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const annotation = await EngineerAnnotationModel.findById(req.params.id);

        if (!annotation) {
            return res.status(404).json({ message: "Engineer annotation not found" });
        }

        // Only the engineer who created it or admin can delete
        if (annotation.engineerId.toString() !== req.user._id.toString()) {
            if (!req.user.isAdmin) {
                return res
                    .status(403)
                    .json({ message: "Unauthorized to delete this annotation" });
            }
        }

        await EngineerAnnotationModel.findByIdAndDelete(req.params.id);
        return res.json({ message: "Engineer annotation deleted successfully" });
    })
);

export default router;
