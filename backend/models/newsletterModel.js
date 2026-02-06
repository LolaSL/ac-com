import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    preferences: {
        newFeatures: { type: Boolean, default: true },
        pricingUpdates: { type: Boolean, default: true },
        industryInsights: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false }
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'unsubscribed', 'bounced'],
        default: 'active'
    },
    subscriptionDate: {
        type: Date,
        default: Date.now
    },
    unsubscribeDate: {
        type: Date
    },
    unsubscribeToken: {
        type: String,
        unique: true,
        sparse: true
    },
    source: {
        type: String,
        default: 'website'
    }
}, {
    timestamps: true
});

// Indexes are automatically created for unique fields (email, unsubscribeToken)
// Additional index for subscription status queries
newsletterSchema.index({ subscriptionStatus: 1 });

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

export default Newsletter;