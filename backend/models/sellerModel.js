

import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const sellerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    info: { type: String, required: true },
    link: { type: String, required: true },
    companyLink: { type: String, required: true },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    reviews: [reviewSchema],
    logo: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);


const Seller = mongoose.model('Seller', sellerSchema);
export default Seller;


