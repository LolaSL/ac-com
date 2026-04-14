import mongoose from 'mongoose';

const wishlistCollectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One default per user, names unique per user
wishlistCollectionSchema.index({ user: 1, name: 1 }, { unique: true });

const WishlistCollection = mongoose.model(
  'WishlistCollection',
  wishlistCollectionSchema
);
export default WishlistCollection;
