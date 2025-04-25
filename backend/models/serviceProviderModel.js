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
        experience: { type: Number },
        portfolio: { type: String },
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

