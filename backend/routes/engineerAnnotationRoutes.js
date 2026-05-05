import express from "express";
import multer from "multer";
import EngineerAnnotationModel from "../models/engineerAnnotationModel.js";
import AnnotationModel from "../models/annotationModel.js";
import { isAuth } from "../utils.js";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
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
            status,
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
            zones: (parsedHvac.zones || []).map((zone) => ({
                id: zone.id,
                xPercent: zone.xPercent || 0,
                yPercent: zone.yPercent || 0,
                widthPercent: zone.widthPercent || 0.15,
                heightPercent: zone.heightPercent || 0.12,
                fill: zone.fill || 'rgba(0,150,255,0.12)',
                stroke: zone.stroke || 'rgba(0,100,200,0.3)',
                zoneNumber: zone.zoneNumber || null,
            })),
            ducts: (parsedHvac.ducts || []).map((duct) => ({
                id: duct.id,
                xPercent: duct.xPercent || duct.x / width || 0,
                yPercent: duct.yPercent || duct.y / height || 0,
                width: duct.width || 0.08,
                height: duct.height || 0.025,
                fill: duct.fill || "transparent",
                stroke: duct.stroke || "#0055CC",
                ductType: duct.ductType || "default",
                sizeLabel: duct.sizeLabel || "",
            })),
            diffusers: (parsedHvac.diffusers || []).map((diffuser) => ({
                id: diffuser.id,
                shape: diffuser.shape || "circle",
                xPercent: diffuser.xPercent || diffuser.x / width || 0,
                yPercent: diffuser.yPercent || diffuser.y / height || 0,
                sizePercent: diffuser.sizePercent || 0.04,
                airflow: diffuser.airflow,
                diffuserType: diffuser.diffuserType || "default",
            })),
            dampers: (parsedHvac.dampers || []).map((damper) => ({
                id: damper.id,
                xPercent: damper.xPercent || damper.x / width || 0,
                yPercent: damper.yPercent || damper.y / height || 0,
                sizePercent: damper.sizePercent || 0.025,
                damperType: damper.damperType || "volume",
            })),
            thermostats: (parsedHvac.thermostats || []).map((thermo) => ({
                id: thermo.id,
                xPercent: thermo.xPercent || thermo.x / width || 0,
                yPercent: thermo.yPercent || thermo.y / height || 0,
                sizePercent: thermo.sizePercent || 0.02,
                label: thermo.label || "T",
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
            status: ["pending", "reviewed", "approved", "rejected"].includes(status) ? status : "reviewed",
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
        const annotation = await EngineerAnnotationModel.findById(req.params.id)
            .populate("userId", "name email")
            .populate("engineerId", "name email");

        if (!annotation || !annotation.pdfData) {
            return res.status(404).json({ message: "Engineer annotation PDF not found" });
        }

        // Authorization check
        const tokenUserId = req.user._id.toString();
        const ownerUserId = annotation.userId?._id?.toString() || annotation.userId?.toString();
        const ownerEngineerId = annotation.engineerId?._id?.toString() || annotation.engineerId?.toString();
        const isOwner = ownerUserId === tokenUserId || ownerEngineerId === tokenUserId;
        const isAdmin = req.user.isAdmin;

        if (!isOwner && !isAdmin) {
            return res
                .status(403)
                .json({ message: "Unauthorized to download this PDF" });
        }

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
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // All annotation content (rectangles, HVAC, zones, lines, comments) is already
        // baked into the 2-page PDF as canvas PNG images by the engineer save process.
        // No re-drawing needed here — only the watermark and stamp are added below.
        const ann = annotation.annotations;
        if (false) { // eslint-disable-line no-constant-condition
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

                // Draw zones (light blue service area rectangles behind everything)
                if (hvac.zones && Array.isArray(hvac.zones)) {
                    hvac.zones.forEach((zone) => {
                        const x = zone.xPercent * width;
                        const y = height - zone.yPercent * height - zone.heightPercent * height;
                        const w = zone.widthPercent * width;
                        const h = zone.heightPercent * height;
                        firstPage.drawRectangle({
                            x,
                            y,
                            width: w,
                            height: h,
                            color: rgb(0.75, 0.9, 1),       // Light blue fill
                            borderColor: rgb(0.4, 0.7, 0.9), // Subtle border
                            borderWidth: 1,
                            opacity: 0.15,
                            borderOpacity: 0.35,
                        });
                        // Draw zone number in top-left corner
                        if (zone.zoneNumber) {
                            firstPage.drawText(`Zone ${zone.zoneNumber}`, {
                                x: x + 6,
                                y: y + h - 16,
                                size: 11,
                                color: rgb(0, 0.31, 0.63),
                            });
                        }
                    });
                }

                // Draw ducts (for ducted systems) — color by ductType with shaded fills
                if (hvac.ducts && Array.isArray(hvac.ducts)) {
                    const ductStyles = {
                        supply:    { border: rgb(0, 0.333, 0.8),      fill: rgb(0.7, 0.85, 1) },
                        return:    { border: rgb(0.8, 0.267, 0),      fill: rgb(1, 0.85, 0.7) },
                        flex:      { border: rgb(0.533, 0.533, 0.533), fill: rgb(0.85, 0.85, 0.85) },
                        exhaust:   { border: rgb(0.133, 0.545, 0.133), fill: rgb(0.7, 0.92, 0.7) },
                        insulated: { border: rgb(0.8, 0.6, 0),         fill: rgb(1, 0.92, 0.7) },
                        default:   { border: rgb(0, 0.5, 1),           fill: rgb(0.8, 0.9, 1) },
                    };
                    hvac.ducts.forEach((duct) => {
                        const x = duct.xPercent * width;
                        const y = height - duct.yPercent * height - (duct.height || 0.04) * height;
                        const w = (duct.width || 0.2) * width;
                        const h = (duct.height || 0.04) * height;
                        const style = ductStyles[duct.ductType] || ductStyles.default;
                        const isDashed = duct.ductType === 'return' || duct.ductType === 'exhaust';
                        const isInsulated = duct.ductType === 'insulated';
                        firstPage.drawRectangle({
                            x,
                            y,
                            width: w,
                            height: h,
                            color: style.fill,
                            borderColor: style.border,
                            borderWidth: 1.5,
                            opacity: 0.25,
                            borderOpacity: 0.6,
                            dashArray: isDashed ? [6, 4] : isInsulated ? [8, 2, 2, 2] : undefined,
                        });
                    });
                }

                // Draw diffusers — shape/color by diffuserType
                if (hvac.diffusers && Array.isArray(hvac.diffusers)) {
                    const diffuserColors = {
                        'supply-4way':    { border: rgb(0, 0.333, 0.8), fill: rgb(0.88, 0.93, 1) },
                        'round':          { border: rgb(0, 0.333, 0.8), fill: rgb(0.88, 0.93, 1) },
                        'linear-slot':    { border: rgb(0, 0.333, 0.8), fill: rgb(0.88, 0.93, 1) },
                        'return-grille':  { border: rgb(0.8, 0.267, 0), fill: rgb(1, 0.95, 0.88) },
                        'exhaust':        { border: rgb(0.133, 0.545, 0.133), fill: rgb(0.88, 1, 0.88) },
                        'jet':            { border: rgb(0, 0.333, 0.8), fill: rgb(0.88, 0.93, 1) },
                        'wall-diffuser':  { border: rgb(0, 0.333, 0.8), fill: rgb(0.88, 0.93, 1) },
                        'transfer-grille':{ border: rgb(0.8, 0.267, 0), fill: rgb(1, 0.95, 0.88) },
                        'drain-point':    { border: rgb(0, 0.533, 0.667), fill: rgb(0.88, 0.97, 1) },
                        'default':        { border: rgb(0, 0.5, 1), fill: undefined },
                    };
                    hvac.diffusers.forEach((diffuser) => {
                        const x = diffuser.xPercent * width;
                        const y = height - diffuser.yPercent * height;
                        const size = (diffuser.sizePercent || 0.08) * width;
                        const dt = diffuser.diffuserType || 'default';
                        const colors = diffuserColors[dt] || diffuserColors.default;

                        if (dt === 'linear-slot') {
                            // Wide thin rectangle for linear slot
                            firstPage.drawRectangle({
                                x: x - size * 0.75,
                                y: y - size * 0.15,
                                width: size * 1.5,
                                height: size * 0.3,
                                borderColor: colors.border,
                                borderWidth: 2,
                                color: colors.fill,
                            });
                        } else if (dt === 'jet') {
                            // JET diffuser: nozzle shape (triangle + rectangle)
                            firstPage.drawRectangle({
                                x: x - size * 0.35,
                                y: y - size * 0.2,
                                width: size * 0.25,
                                height: size * 0.4,
                                borderColor: colors.border,
                                borderWidth: 2,
                                color: colors.fill,
                            });
                            // Arrow/nozzle direction indicator
                            firstPage.drawCircle({
                                x: x + size * 0.2,
                                y,
                                size: size * 0.15,
                                borderColor: colors.border,
                                borderWidth: 2,
                                color: colors.fill,
                            });
                        } else if (dt === 'wall-diffuser') {
                            // Wall diffuser: rectangle with wall indicator
                            firstPage.drawRectangle({
                                x: x - size * 0.45,
                                y: y - size * 0.3,
                                width: size * 0.12,
                                height: size * 0.6,
                                borderColor: rgb(0.4, 0.4, 0.4),
                                borderWidth: 1,
                                color: rgb(0.7, 0.7, 0.7),
                            });
                            firstPage.drawRectangle({
                                x: x - size * 0.3,
                                y: y - size * 0.25,
                                width: size * 0.5,
                                height: size * 0.5,
                                borderColor: colors.border,
                                borderWidth: 2,
                                color: colors.fill,
                            });
                        } else if (dt === 'transfer-grille') {
                            // Transfer grille: wide rectangle with arrows
                            firstPage.drawRectangle({
                                x: x - size * 0.45,
                                y: y - size * 0.25,
                                width: size * 0.9,
                                height: size * 0.5,
                                borderColor: colors.border,
                                borderWidth: 2,
                                color: colors.fill,
                            });
                        } else if (dt === 'drain-point') {
                            // Drain point: circle with down indicator
                            firstPage.drawCircle({
                                x,
                                y: y + size * 0.1,
                                size: size * 0.3,
                                borderColor: colors.border,
                                borderWidth: 2,
                                color: colors.fill,
                            });
                            firstPage.drawCircle({
                                x,
                                y: y + size * 0.1,
                                size: size * 0.1,
                                color: colors.border,
                            });
                        } else if (dt === 'supply-4way' || dt === 'square' || dt === 'return-grille' || dt === 'exhaust') {
                            // Square shape for 4-way, return grille, exhaust
                            firstPage.drawRectangle({
                                x: x - size / 2,
                                y: y - size / 2,
                                width: size,
                                height: size,
                                borderColor: colors.border,
                                borderWidth: 2,
                                color: colors.fill,
                            });
                        } else {
                            // Circle for round and default
                            firstPage.drawCircle({
                                x,
                                y,
                                size: size / 2,
                                borderColor: colors.border,
                                borderWidth: 2,
                                color: colors.fill,
                            });
                        }
                    });
                }

                // Draw dampers
                if (hvac.dampers && Array.isArray(hvac.dampers)) {
                    hvac.dampers.forEach((damper) => {
                        const cx = damper.xPercent * width;
                        const cy = height - damper.yPercent * height;
                        const sz = (damper.sizePercent || 0.03) * width;
                        if (damper.damperType === 'fire') {
                            // Red diamond for fire damper
                            firstPage.drawRectangle({
                                x: cx - sz / 2,
                                y: cy - sz / 2,
                                width: sz,
                                height: sz,
                                borderColor: rgb(0.8, 0, 0),
                                borderWidth: 2,
                                rotate: { type: 'degrees', angle: 45 },
                            });
                        } else {
                            // Circle for volume damper
                            firstPage.drawCircle({
                                x: cx,
                                y: cy,
                                size: sz / 2,
                                borderColor: rgb(0.4, 0.4, 0.4),
                                borderWidth: 2,
                            });
                        }
                    });
                }

                // Draw thermostats
                if (hvac.thermostats && Array.isArray(hvac.thermostats)) {
                    hvac.thermostats.forEach((thermo) => {
                        const cx = thermo.xPercent * width;
                        const cy = height - thermo.yPercent * height;
                        const sz = (thermo.sizePercent || 0.02) * width;
                        // Purple rounded rectangle for thermostat
                        firstPage.drawRectangle({
                            x: cx - sz / 2,
                            y: cy - sz / 2,
                            width: sz,
                            height: sz,
                            borderColor: rgb(0.545, 0.361, 0.965), // #8B5CF6
                            borderWidth: 2,
                            color: rgb(0.545, 0.361, 0.965, 0.2),
                        });
                        // Draw label
                        firstPage.drawText(thermo.label || 'T', {
                            x: cx - sz * 0.25,
                            y: cy - sz * 0.15,
                            size: sz * 0.5,
                            color: rgb(0.545, 0.361, 0.965),
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

        // Second page (ductless) already exists in the stored 2-page PDF
        const secondPage = pdfDoc.getPages()[1] || null;

        // Add watermark with engineer info
        const formattedDate = annotation.createdAt
            ? new Date(annotation.createdAt).toLocaleString()
            : "Unknown Date";
        const engineerName = annotation.engineerId?.name || "Engineer";
        const engineerEmail = annotation.engineerId?.email || "No Engineer Email";
        const userName = annotation.userId?.name || "User";
        const userEmail = annotation.userId?.email || "No User Email";
        const watermarkText = `AC-Commerce | User: ${userName} (${userEmail}) | Engineer: ${engineerName} (${engineerEmail}) | Reviewed: ${formattedDate}`;

        pdfDoc.getPages().forEach((page) => {
            const fontSize = 9;
            const { width, height } = page.getSize();
            const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
            // Diagonal watermark ~30° — matches the canvas rotate(-Math.PI/6) in the preview
            const angle = 30;
            const rad = angle * Math.PI / 180;
            const xPos = width / 2 - (textWidth / 2) * Math.cos(rad);
            const yPos = height / 2 - (textWidth / 2) * Math.sin(rad);
            page.drawText(watermarkText, {
                x: xPos,
                y: yPos,
                size: fontSize,
                font: helveticaFont,
                opacity: 0.28,
                color: rgb(0.4, 0.4, 0.4),
                rotate: degrees(angle),
            });
        });

        // Add circular seal-style stamp (clean/minimal) — color driven by annotation status
        const { width, height } = firstPage.getSize();
        const sealRadius = 58;
        const sealX = Math.max(sealRadius + 16, width - sealRadius - 26);
        const sealY = Math.max(sealRadius + 16, height - sealRadius - 30);

        const stampStatus = (annotation.status || 'reviewed').toLowerCase();
        const stampStyles = {
            approved: {
                label:       'APPROVED',
                ringColor:   rgb(0.08, 0.51, 0.20),   // green
                fillColor:   rgb(0.90, 0.98, 0.92),   // light green tint
                labelColor:  rgb(0.06, 0.40, 0.16),
                subColor:    rgb(0.08, 0.45, 0.18),
                dateColor:   rgb(0.10, 0.40, 0.18),
            },
            reviewed: {
                label:       'REVIEWED',
                ringColor:   rgb(0.12, 0.35, 0.78),   // blue
                fillColor:   rgb(0.90, 0.95, 1.00),
                labelColor:  rgb(0.10, 0.30, 0.75),
                subColor:    rgb(0.16, 0.34, 0.68),
                dateColor:   rgb(0.18, 0.33, 0.62),
            },
            rejected: {
                label:       'REJECTED',
                ringColor:   rgb(0.78, 0.12, 0.12),   // red
                fillColor:   rgb(1.00, 0.92, 0.92),
                labelColor:  rgb(0.70, 0.08, 0.08),
                subColor:    rgb(0.72, 0.12, 0.12),
                dateColor:   rgb(0.68, 0.14, 0.14),
            },
            pending: {
                label:       'PENDING',
                ringColor:   rgb(0.80, 0.45, 0.00),   // orange
                fillColor:   rgb(1.00, 0.96, 0.88),
                labelColor:  rgb(0.70, 0.38, 0.00),
                subColor:    rgb(0.72, 0.40, 0.00),
                dateColor:   rgb(0.68, 0.38, 0.00),
            },
        };
        const sc = stampStyles[stampStatus] || stampStyles.reviewed;

        // Outer ring
        firstPage.drawCircle({
            x: sealX,
            y: sealY,
            size: sealRadius,
            borderColor: sc.ringColor,
            borderWidth: 3,
            opacity: 0.5,
        });

        // Inner soft fill
        firstPage.drawCircle({
            x: sealX,
            y: sealY,
            size: sealRadius - 8,
            color: sc.fillColor,
            opacity: 0.28,
            borderColor: sc.ringColor,
            borderWidth: 1,
            borderOpacity: 0.35,
        });

        const approvedText = sc.label;
        const approvedSize = 14;
        const approvedWidth = helveticaBoldFont.widthOfTextAtSize(approvedText, approvedSize);

        firstPage.drawText(approvedText, {
            x: sealX - approvedWidth / 2,
            y: sealY + 14,
            size: approvedSize,
            font: helveticaBoldFont,
            color: sc.labelColor,
            opacity: 0.66,
        });

        const reviewText = "Engineer Review";
        const reviewSize = 8;
        const reviewWidth = helveticaBoldFont.widthOfTextAtSize(reviewText, reviewSize);

        firstPage.drawText(reviewText, {
            x: sealX - reviewWidth / 2,
            y: sealY + 1,
            size: reviewSize,
            font: helveticaBoldFont,
            color: sc.subColor,
            opacity: 0.62,
        });

        const dateText = formattedDate;
        const dateSize = 6.5;
        const dateWidth = helveticaFont.widthOfTextAtSize(dateText, dateSize);

        firstPage.drawText(dateText, {
            x: sealX - dateWidth / 2,
            y: sealY - 12,
            size: dateSize,
            font: helveticaFont,
            color: sc.dateColor,
            opacity: 0.56,
        });

        // Draw identical seal stamp on second page (ductless) if it exists
        if (secondPage) {
            secondPage.drawCircle({
                x: sealX,
                y: sealY,
                size: sealRadius,
                borderColor: sc.ringColor,
                borderWidth: 3,
                opacity: 0.5,
            });
            secondPage.drawCircle({
                x: sealX,
                y: sealY,
                size: sealRadius - 8,
                color: sc.fillColor,
                opacity: 0.28,
                borderColor: sc.ringColor,
                borderWidth: 1,
                borderOpacity: 0.35,
            });
            secondPage.drawText(approvedText, {
                x: sealX - approvedWidth / 2,
                y: sealY + 14,
                size: approvedSize,
                font: helveticaBoldFont,
                color: sc.labelColor,
                opacity: 0.66,
            });
            secondPage.drawText(reviewText, {
                x: sealX - reviewWidth / 2,
                y: sealY + 1,
                size: reviewSize,
                font: helveticaBoldFont,
                color: sc.subColor,
                opacity: 0.62,
            });
            secondPage.drawText(dateText, {
                x: sealX - dateWidth / 2,
                y: sealY - 12,
                size: dateSize,
                font: helveticaFont,
                color: sc.dateColor,
                opacity: 0.56,
            });
        }

        // Save and send PDF
        const pdfBytes = await pdfDoc.save();

        res.set({
            "Content-Type": "application/pdf",
            // "Content-Disposition": `attachment; filename="${annotation.filename || "engineer-annotation.pdf"}"`,
            "Content-Disposition": `inline; filename="engineer-annotation.pdf"`,
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
            offsetX: annotation.offsetX || 0,
            offsetY: annotation.offsetY || 0,
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

        // Allow the engineer who created it, the user who owns it, or admin to delete
        const isEngineer = annotation.engineerId.toString() === req.user._id.toString();
        const isOwner = annotation.userId.toString() === req.user._id.toString();
        if (!isEngineer && !isOwner && !req.user.isAdmin) {
            return res
                .status(403)
                .json({ message: "Unauthorized to delete this annotation" });
        }

        await EngineerAnnotationModel.findByIdAndDelete(req.params.id);
        return res.json({ message: "Engineer annotation deleted successfully" });
    })
);

/**
 * PATCH /api/engineer-annotations/:id/offset
 * Update alignment offset for engineer annotation
 * Requires: isAuth (user who owns the annotation)
 */
router.patch(
    "/:id/offset",
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const annotation = await EngineerAnnotationModel.findById(req.params.id);

        if (!annotation) {
            return res.status(404).json({ message: "Engineer annotation not found" });
        }

        // Verify ownership (only the user who owns the annotation can update offset)
        if (annotation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to update this annotation" });
        }

        // Update offset values
        annotation.offsetX = req.body.offsetX || 0;
        annotation.offsetY = req.body.offsetY || 0;

        await annotation.save();

        return res.json({
            message: "Alignment offset saved successfully",
            offsetX: annotation.offsetX,
            offsetY: annotation.offsetY,
        });
    })
);

export default router;
