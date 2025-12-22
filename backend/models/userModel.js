import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    avatar: { type: String },
    resetToken: { type: String },
    isAdmin: { type: Boolean, default: false, required: true },
    isPaid: { type: Boolean, default: false, required: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;