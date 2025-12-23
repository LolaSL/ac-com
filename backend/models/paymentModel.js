import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'missed'], default: 'pending' },
    paymentMethod: { type: String, default: 'bank transfer' },
    transactionId: { type: String },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    description: { type: String },
    paidAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;