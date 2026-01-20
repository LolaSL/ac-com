import mongoose from 'mongoose';

const roiCalculationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: true,
            default: 'ROI Calculation',
        },
        description: {
            type: String,
        },
        // Service Information
        serviceType: {
            type: String,
            enum: [
                'AC Installation',
                'AC Repair',
                'AC Maintenance',
                'Gas Ducted Heating',
                'Indoor Air Quality',
                'Smart Control Automation',
                'Electrical Service',
            ],
            default: 'AC Installation',
        },
        equipmentAge: {
            type: String,
            enum: [
                '',
                'Less than 1 year',
                '1-2 years',
                '3-4 years',
                '5-6 years',
                'More than 6 years',
                'New installation',
            ],
            default: '',
        },
        // Input Parameters
        projectSize: {
            type: Number,
            required: true,
            min: 1000,
            max: 50000,
        },
        installationTime: {
            type: Number,
            required: true,
            min: 1,
            max: 30,
        },
        teamSize: {
            type: Number,
            required: true,
            min: 1,
            max: 20,
        },
        projectsPerMonth: {
            type: Number,
            required: true,
            min: 1,
            max: 100,
        },
        monthsToAnalyze: {
            type: Number,
            required: true,
            min: 1,
            max: 36,
        },
        // Property Type Information (for BTU integration)
        propertyType: {
            type: String,
            enum: ['residential-single', 'residential-multi', 'industrial-commercial'],
            default: 'residential-single',
        },
        numberOfUnits: {
            type: Number,
            min: 1,
            max: 500,
        },
        maintenanceFrequency: {
            type: Number,
            min: 1,
            max: 52,
        },
        // BTU Project Data (when linked from BTU Calculator)
        btuProjectData: {
            totalBTU: Number,
            totalSquareFootage: Number,
            numberOfRooms: Number,
            estimatedProjectCost: Number,
            estimatedInstallationDays: Number,
            recommendedUnits: [{
                name: String,
                btu: Number,
                price: Number,
                quantity: Number,
            }],
            // Preserve original BTU Calculator input parameters and selected condensers
            inputParams: {
                measurementSystem: String,
                ceilingHeight: mongoose.Schema.Types.Mixed,
                numPeople: Number,
                options: mongoose.Schema.Types.Mixed,
                isMultiFlatProperty: Boolean,
                detectedFlats: [String],
                acAnnotations: [mongoose.Schema.Types.Mixed],
                isVRFSystem: Boolean,
                condenserSizingStatus: String,
                condensers: [
                    {
                        _id: String,
                        name: String,
                        model: String,
                        btu: Number,
                        price: Number,
                        flatName: String,
                    },
                ],
            },
        },
        // Calculated Results
        savingsPerProject: {
            type: Number,
            required: true,
        },
        savingsPercentage: {
            type: Number,
            required: true,
        },
        annualSavings: {
            type: Number,
            required: true,
        },
        roi: {
            type: Number,
            required: true,
        },
        paybackMonths: {
            type: Number,
            required: true,
        },
        // Link to BTU Calculator Results (optional)
        linkedBtuProjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Annotation',
        },
        linkedProductIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
        ],
        // Metadata
        isPinned: {
            type: Boolean,
            default: false,
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
        tags: [String],
    },
    {
        timestamps: true,
    }
);

const ROICalculation = mongoose.model('ROICalculation', roiCalculationSchema);
export default ROICalculation;
