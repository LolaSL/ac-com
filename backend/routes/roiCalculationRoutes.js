import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import ROICalculation from '../models/roiCalculationModel.js';
import { isAuth, isAdmin } from '../utils.js';

const roiRouter = express.Router();

// Get all ROI calculations for authenticated user
roiRouter.get(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const pageSize = 10;
        const page = Number(req.query.page) || 1;

        const countCalculations = await ROICalculation.countDocuments({
            userId: req.user._id,
        });

        const calculations = await ROICalculation.find({
            userId: req.user._id,
        })
            .sort({ createdAt: -1 })
            .skip(pageSize * (page - 1))
            .limit(pageSize)
            .populate('linkedBtuProjectId')
            .populate('linkedProductIds');

        const pages = Math.ceil(countCalculations / pageSize);

        res.send({
            calculations,
            page,
            pages,
            total: countCalculations,
        });
    })
);

// Get single ROI calculation by ID
roiRouter.get(
    '/:id',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const calculation = await ROICalculation.findById(req.params.id).populate(
            'linkedBtuProjectId'
        );

        if (!calculation) {
            return res.status(404).send({ message: 'ROI Calculation not found' });
        }

        // Verify ownership
        if (calculation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).send({ message: 'Access denied' });
        }

        res.send(calculation);
    })
);

// Create new ROI calculation
roiRouter.post(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const {
            name,
            description,
            projectSize,
            installationTime,
            teamSize,
            projectsPerMonth,
            monthsToAnalyze,
            savingsPerProject,
            savingsPercentage,
            annualSavings,
            roi,
            paybackMonths,
            linkedBtuProjectId,
            linkedProductIds,
            tags,
        } = req.body;

        // Validate required fields
        if (
            !projectSize ||
            !installationTime ||
            !teamSize ||
            !projectsPerMonth ||
            !monthsToAnalyze
        ) {
            return res.status(400).send({
                message: 'All input parameters are required',
            });
        }

        const calculation = new ROICalculation({
            userId: req.user._id,
            name: name || 'ROI Calculation',
            description,
            projectSize,
            installationTime,
            teamSize,
            projectsPerMonth,
            monthsToAnalyze,
            savingsPerProject,
            savingsPercentage,
            annualSavings,
            roi,
            paybackMonths,
            linkedBtuProjectId,
            linkedProductIds: linkedProductIds || [],
            tags: tags || [],
        });

        const savedCalculation = await calculation.save();
        res.status(201).send(savedCalculation);
    })
);

// Update ROI calculation
roiRouter.put(
    '/:id',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const calculation = await ROICalculation.findById(req.params.id);

        if (!calculation) {
            return res.status(404).send({ message: 'ROI Calculation not found' });
        }

        // Verify ownership
        if (calculation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).send({ message: 'Access denied' });
        }

        // Update fields
        calculation.name = req.body.name || calculation.name;
        calculation.description = req.body.description || calculation.description;
        calculation.projectSize = req.body.projectSize || calculation.projectSize;
        calculation.installationTime =
            req.body.installationTime || calculation.installationTime;
        calculation.teamSize = req.body.teamSize || calculation.teamSize;
        calculation.projectsPerMonth =
            req.body.projectsPerMonth || calculation.projectsPerMonth;
        calculation.monthsToAnalyze =
            req.body.monthsToAnalyze || calculation.monthsToAnalyze;
        calculation.savingsPerProject =
            req.body.savingsPerProject || calculation.savingsPerProject;
        calculation.savingsPercentage =
            req.body.savingsPercentage || calculation.savingsPercentage;
        calculation.annualSavings =
            req.body.annualSavings || calculation.annualSavings;
        calculation.roi = req.body.roi || calculation.roi;
        calculation.paybackMonths =
            req.body.paybackMonths || calculation.paybackMonths;
        calculation.linkedBtuProjectId =
            req.body.linkedBtuProjectId || calculation.linkedBtuProjectId;
        calculation.linkedProductIds =
            req.body.linkedProductIds || calculation.linkedProductIds;
        calculation.isPinned =
            req.body.isPinned !== undefined ? req.body.isPinned : calculation.isPinned;
        calculation.tags = req.body.tags || calculation.tags;

        const updatedCalculation = await calculation.save();
        res.send(updatedCalculation);
    })
);

// Delete ROI calculation
roiRouter.delete(
    '/:id',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const calculation = await ROICalculation.findById(req.params.id);

        if (!calculation) {
            return res.status(404).send({ message: 'ROI Calculation not found' });
        }

        // Verify ownership
        if (calculation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).send({ message: 'Access denied' });
        }

        await ROICalculation.deleteOne({ _id: req.params.id });
        res.send({ message: 'ROI Calculation deleted' });
    })
);

// Toggle pin status
roiRouter.put(
    '/:id/pin',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const calculation = await ROICalculation.findById(req.params.id);

        if (!calculation) {
            return res.status(404).send({ message: 'ROI Calculation not found' });
        }

        // Verify ownership
        if (calculation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).send({ message: 'Access denied' });
        }

        calculation.isPinned = !calculation.isPinned;
        const updatedCalculation = await calculation.save();
        res.send(updatedCalculation);
    })
);

// Get ROI calculations by tag
roiRouter.get(
    '/search/tag/:tag',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const calculations = await ROICalculation.find({
            userId: req.user._id,
            tags: req.params.tag,
        })
            .sort({ createdAt: -1 })
            .populate('linkedBtuProjectId')
            .populate('linkedProductIds');

        res.send(calculations);
    })
);

// Admin: Get all ROI calculations
roiRouter.get(
    '/admin/all',
    isAuth,
    isAdmin,
    expressAsyncHandler(async (req, res) => {
        const pageSize = 10;
        const page = Number(req.query.page) || 1;

        const countCalculations = await ROICalculation.countDocuments();

        const calculations = await ROICalculation.find({})
            .sort({ createdAt: -1 })
            .skip(pageSize * (page - 1))
            .limit(pageSize)
            .populate('userId', 'name email')
            .populate('linkedBtuProjectId')
            .populate('linkedProductIds');

        const pages = Math.ceil(countCalculations / pageSize);

        res.send({
            calculations,
            page,
            pages,
            total: countCalculations,
        });
    })
);

export default roiRouter;
