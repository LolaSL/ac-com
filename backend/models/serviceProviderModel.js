import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';


const serviceProviderSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        typeOfProvider: { type: String, required: true },
        phone: { type: String, required: true },
        company: { type: String },
        experience: { type: String },
        portfolio: { type: String },
        bio: { type: String, default: '' },
        location: { type: String, default: '' },
        skills: { type: [String], default: [] },
        availabilityStatus: {
            type: String,
            enum: ['Available', 'Busy', 'On Leave'],
            default: 'Available',
        },
        socialLinks: {
            facebook:  { type: String, default: '' },
            twitter:   { type: String, default: '' },
            instagram: { type: String, default: '' },
            linkedin:  { type: String, default: '' },
        },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        hourlyRate: { type: Number, default: 0 },
        certifications: { type: [String], default: [] },
        isActive: { type: Boolean, default: true, required: true }, 
        isAdmin: { type: Boolean, default: false, required: true },
    },
    {
        timestamps: true,
    }
);


serviceProviderSchema.methods.matchPassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};


const ServiceProvider = mongoose.model('ServiceProvider', serviceProviderSchema);

export default ServiceProvider;

