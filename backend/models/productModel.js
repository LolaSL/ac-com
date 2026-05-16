import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const documentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['PDF', 'Image', 'Text', 'HTML'], default: 'PDF' },
  description: String
});



const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    model: { type: String, required: true },
    image: { type: String, required: true },
    images: [{ type: String }],
    brand: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, required: true },
    countInStock: { type: Number, required: true },
    rating: { type: Number, required: true },
    numReviews: { type: Number, required: true },
    reviews: [reviewSchema],
    features: [{ type: String }],
    mode: [{ type: String }],
    btu: { type: Number, required: true },
    coolingBtu: { type: Number },
    heatingBtu: { type: Number },
    productType: {
      type: String,
      enum: ['indoor', 'outdoor', 'accessory'],
    },
    areaCoverage: { type: Number },
    energyEfficiency: { type: Number },
    numberOfMaximumIndoorUnits:{ type: Number },
    documents: [documentSchema],
    dimension: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      depth: { type: Number, required: true }

    },
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);


const Product = mongoose.model('Product', productSchema);
export default Product;
