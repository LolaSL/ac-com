import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    phone: { type: String },
    avatar: { type: String },
    resetToken: { type: String },
    isAdmin: { type: Boolean, default: false, required: true },
    // TOTP-based multi-factor auth (currently gated to admin accounts).
    // `mfaSecret` holds the confirmed base32 secret used at login.
    // `mfaPendingSecret` holds an unconfirmed secret during enrollment;
    // it is promoted to `mfaSecret` once the user submits a valid code.
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    mfaPendingSecret: { type: String },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;