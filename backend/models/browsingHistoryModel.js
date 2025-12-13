import mongoose from 'mongoose';

const browsingHistorySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
        priceAtView: {
            type: Number,
            required: true,
        },
        currentPrice: {
            type: Number,
        },
        priceDropped: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index to prevent duplicate entries and speed up queries
browsingHistorySchema.index({ user: 1, product: 1, viewedAt: -1 });

const BrowsingHistory = mongoose.model('BrowsingHistory', browsingHistorySchema);
export default BrowsingHistory;
