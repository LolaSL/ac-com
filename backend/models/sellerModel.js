

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
    referralCode: { type: String, required: true, unique: true },
    outboundClicks: { type: Number, default: 0 },
    clickLogs: [
      {
        clickedAt: { type: Date, default: Date.now },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      },
    ],
  },
  {
    timestamps: true,
  }
);


const Seller = mongoose.model('Seller', sellerSchema);
export default Seller;


