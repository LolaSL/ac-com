import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Seller from '../models/sellerModel.js';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import { isAuth, isAdmin } from '../utils.js';
import multer from 'multer';
const upload = multer()
const sellerRouter = express.Router();

sellerRouter.get(
  '/all',
  expressAsyncHandler(async (req, res) => {
    try {
      const sellers = await Seller.find({});
      res.json(sellers);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  })
);


sellerRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    try {

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const sellers = await Seller.find().skip(skip).limit(limit);
      const count = await Seller.countDocuments();
      const totalPages = Math.ceil(count / limit);
      res.json({
        page,
        totalPages,
        sellers,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
);



sellerRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sellers = await Seller.find().skip(skip).limit(limit);
    const count = await Seller.countDocuments();
    const totalPages = Math.ceil(count / limit);
    res.json({ page, totalPages, sellers });
  })
);

sellerRouter.get(
  '/:id/referral-link',
  expressAsyncHandler(async (req, res) => {
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).send({ message: 'Seller not found' });
    }
    const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/products?ref=${seller.referralCode}`;
    res.send({ referralLink: link });
  })
);

sellerRouter.post(
  '/',
  isAuth,
  isAdmin,
  upload.single('logo'),
  expressAsyncHandler(async (req, res) => {
    const { name, brand, info, link, companyLink } = req.body;
    const logo = req.file ? `/uploads/${req.file.filename}` : '';
    if (!name || !brand || !info || !link || !companyLink) {
      return res.status(400).json({ message: 'All fields (name, brand, info, link, companyLink) are required!' });
    }

    const newSeller = new Seller({
      name,
      brand,
      info,
      link,
      companyLink,
      logo,
    });

    const savedSeller = await newSeller.save();
    res.status(201).send({ message: 'Seller created successfully', seller: savedSeller });
  })
);

sellerRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  upload.single('logo'),
  expressAsyncHandler(async (req, res) => {
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).send({ message: 'Seller Not Found' });
    }

    const { name, brand, info, link, companyLink } = req.body;

    seller.name = name || seller.name;
    seller.brand = brand || seller.brand;
    seller.info = info || seller.info;
    seller.link = link || seller.link;
    seller.companyLink = companyLink || seller.companyLink;

    if (req.file) {
      seller.logo = `/uploads/${req.file.filename}`;
    }

    try {
      const updatedSeller = await seller.save();
      res.send({ message: 'Seller Updated', seller: updatedSeller });
    } catch (error) {
      res.status(400).send({ message: 'Invalid Seller Data', error: error.message });
    }
  })
);

sellerRouter.get(
  "/all-referral-stats",
  expressAsyncHandler(async (req, res) => {
    try {
      const sellers = await Seller.find({});
      console.log(`[DEBUG] Total sellers found in DB: ${sellers.length}`);
      const allStats = [];

      for (const seller of sellers) {
        // 1️⃣ Users referred by this seller
        const referredUsers = await User.find({ referredBy: seller._id }).select("_id");
        const referredUserIds = referredUsers.map((u) => u._id);

        // 2️⃣ Orders placed by referred users
        const referredOrders = await Order.find({ user: { $in: referredUserIds } });

        const totalReferredOrders = referredOrders.length;

        // 3️⃣ Total sales & commission
        const totalReferredSales = referredOrders.reduce(
          (sum, order) => sum + Number(order.totalPrice || 0),
          0
        );

        const commissionRate = 0.1; // 10%
        const totalCommission = totalReferredSales * commissionRate;

        console.log(`[DEBUG] Processing seller: ${seller.name} (${seller._id})`);
        allStats.push({
          seller: {
            _id: seller._id,
            name: seller.name,
            brand: seller.brand,
            logo: seller.logo,
            referralCode: seller.referralCode,
          },
          stats: {
            referredUsersCount: referredUsers.length,
            totalReferredOrders,
            totalReferredSales: Number(totalReferredSales.toFixed(2)),
            totalCommission: Number(totalCommission.toFixed(2)),
            commissionRate,
          },
        });
      }

      console.log(`[DEBUG] Returning ${allStats.length} sellers in response`);
      res.json({
        totalSellers: sellers.length,
        sellers: allStats,
      });
    } catch (err) {
      console.error("Error in /all-referral-stats:", err);
      res.status(500).json({ message: err.message });
    }
  })
);

sellerRouter.get('/:id/dashboard', expressAsyncHandler(async (req, res) => {
  const sellerId = req.params.id;

  const seller = await Seller.findById(sellerId);
  if (!seller) return res.status(404).json({ message: 'Seller Not Found' });

  // Referred users
  const referredUsers = await User.find({ referredBy: sellerId })
    .select('name email createdAt')
    .sort({ createdAt: -1 });

  const referredUserIds = referredUsers.map(u => u._id);

  // Referred orders: by referred users OR paymentResult.referredBy == sellerId
  const referredOrdersByUser = await Order.find({ user: { $in: referredUserIds } })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  const referredOrdersByPayment = await Order.find({ 'paymentResult.referredBy': sellerId })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  // Combine and deduplicate orders
  const referredOrdersMap = new Map();
  referredOrdersByUser.forEach(order => referredOrdersMap.set(order._id.toString(), order));
  referredOrdersByPayment.forEach(order => referredOrdersMap.set(order._id.toString(), order));
  const referredOrders = Array.from(referredOrdersMap.values());

  const totalReferredUsers = referredUsers.length;
  const totalReferredOrders = referredOrders.length;
  const totalReferredSales = referredOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  const commissionRate = 0.1;
  const totalCommission = totalReferredSales * commissionRate;

  res.json({
    seller: {
      _id: seller._id,
      name: seller.name,
      brand: seller.brand,
      logo: seller.logo,
      referralCode: seller.referralCode,
    },
    stats: {
      referredUsersCount: totalReferredUsers,
      totalReferredOrders,
      totalReferredSales,
      totalCommission,
      commissionRate,
    },
    referredUsers,
    referredOrders,
  });
}));


sellerRouter.get('/:id', expressAsyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) return res.status(404).send({ message: 'Seller Not Found' });

  // Users referred by this seller
  const referredUsers = await User.find({ referredBy: seller._id }).select('_id');
  const referredUserIds = referredUsers.map(u => u._id);

  // Orders placed by referred users
  const referredOrders = await Order.find({ user: { $in: referredUserIds } });

  const totalReferredOrders = referredOrders.length;
  const totalReferredSales = referredOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const commissionRate = 0.1;
  const totalCommission = totalReferredSales * commissionRate;

  res.send({
    _id: seller._id,
    name: seller.name,
    brand: seller.brand,
    logo: seller.logo && seller.logo !== "undefined" && seller.logo.startsWith('/images/') ? seller.logo : "",
    info: seller.info,
    link: seller.link,
    companyLink: seller.companyLink,
    rating: seller.rating,
    numReviews: seller.numReviews,
    reviews: seller.reviews,
    referralCode: seller.referralCode,
    stats: {
      referredUsersCount: referredUsers.length,
      totalReferredOrders,
      totalReferredSales: Number(totalReferredSales.toFixed(2)),
      totalCommission: Number(totalCommission.toFixed(2)),
      commissionRate,
    }
  });
}));








sellerRouter.post(
  '/:id/reviews',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const seller = await Seller.findById(req.params.id);
    if (seller) {
      if (seller.reviews.find((x) => x.user.toString() === req.user._id.toString())) {
        return res.status(400).send({ message: 'You already submitted a review' });
      }

      const review = {
        name: req.user.name,
        rating: Number(req.body.rating),
        comment: req.body.comment,
        user: req.user._id,
      };

      seller.reviews.push(review);
      seller.numReviews = seller.reviews.length;
      seller.rating =
        seller.reviews.reduce((a, c) => c.rating + a, 0) / seller.reviews.length;

      const updatedSeller = await seller.save();
      res.status(201).send({
        message: 'Review Added',
        review: updatedSeller.reviews[updatedSeller.reviews.length - 1],
        numReviews: updatedSeller.numReviews,
        rating: updatedSeller.rating,
      });
    } else {
      res.status(404).send({ message: 'Seller Not Found' });
    }
  })
);

sellerRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const seller = await Seller.findById(req.params.id);
    if (seller) {
      await seller.deleteOne();;
      res.send({ message: 'Seller Deleted' });
    } else {
      res.status(404).send({ message: 'Seller Not Found' });
    }
  })
);

// Get seller referral statistics
sellerRouter.get(
  '/:id/referral-stats',
  expressAsyncHandler(async (req, res) => {
    const sellerId = req.params.id;

    // Count referred users
    const referredUsersCount = await User.countDocuments({ referredBy: sellerId });

    // Get referred orders
    const referredOrders = await Order.find({ referredBy: sellerId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Calculate total referred sales
    const totalReferredSales = referredOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    // Calculate commission (10% of referred sales)
    const commissionRate = 0.10;
    const totalCommission = totalReferredSales * commissionRate;

    // Get recent referred orders (last 10)
    const recentReferredOrders = referredOrders.slice(0, 10);

    res.json({
      sellerId,
      referredUsersCount,
      totalReferredOrders: referredOrders.length,
      totalReferredSales,
      commissionRate,
      totalCommission,
      recentReferredOrders,
    });
  })
);

// Get seller's referred users
sellerRouter.get(
  '/:id/referred-users',
  expressAsyncHandler(async (req, res) => {
    const sellerId = req.params.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const referredUsers = await User.find({ referredBy: sellerId })
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await User.countDocuments({ referredBy: sellerId });
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      page,
      totalPages,
      totalCount,
      users: referredUsers,
    });
  })
);

// Get seller's referred orders
sellerRouter.get(
  '/:id/referred-orders',
  expressAsyncHandler(async (req, res) => {
    const sellerId = req.params.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const referredOrders = await Order.find({ referredBy: sellerId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Order.countDocuments({ referredBy: sellerId });
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate total sales for these orders
    const totalSales = referredOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    res.json({
      page,
      totalPages,
      totalCount,
      totalSales,
      orders: referredOrders,
    });
  })
);



export default sellerRouter;