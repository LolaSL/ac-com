import mongoose from 'mongoose';

const earningSchema = new mongoose.Schema(
    {
        projectName: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
        serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true }, 
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ['Paid', 'Pending', 'Failed'],
            default: 'Pending',
        },
    },
    { timestamps: true }
);

const Earnings = mongoose.model('Earnings', earningSchema);
export default Earnings;

