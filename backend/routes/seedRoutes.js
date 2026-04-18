import express from 'express';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import Seller from '../models/sellerModel.js';
import Contact from '../models/contactModel.js';
import ServiceProvider from '../models/serviceProviderModel.js';
import Project from '../models/projectModel.js';
import Message from '../models/messageModel.js';
import Earnings from '../models/earningModel.js';
import Blog from '../models/blogModel.js';
import Notification from '../models/notificationModel.js';
import Order from '../models/orderModel.js';
import Payment from '../models/paymentModel.js';
import BrowsingHistory from '../models/browsingHistoryModel.js';
import DemoRequest from '../models/demoRequestModel.js';
import Newsletter from '../models/newsletterModel.js';
import data from '../data.js';

const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  try {
    const includeOrders = req.query.includeOrders === 'true';
    const ordersMode = req.query.ordersMode || (includeOrders ? 'append' : 'skip');

    await Product.deleteMany({});
    // Sellers are upserted below to preserve click tracking data
    await Contact.deleteMany({});
    await ServiceProvider.deleteMany({});
    await Project.deleteMany({});
    await Message.deleteMany({});
    await Earnings.deleteMany({});
    await Blog.deleteMany({});
    await Notification.deleteMany({});
    await Payment.deleteMany({});
    await BrowsingHistory.deleteMany({});
    await DemoRequest.deleteMany({});
    await Newsletter.deleteMany({});

    // Seed ServiceProviders
    const createdServiceProviders = await ServiceProvider.insertMany(data.serviceProviders);
    const serviceProviderIds = createdServiceProviders.map(sp => sp._id.toString());

    // Seed Projects
    const projectsWithIds = data.projects.map((project, index) => ({
      ...project,
      serviceProvider: serviceProviderIds[index % serviceProviderIds.length],
    }));
    const createdProjects = await Project.insertMany(projectsWithIds);
    const projectIds = createdProjects.map(p => p._id.toString());

    // Seed Messages
    const messagesWithIds = data.messages.map((message, index) => ({
      ...message,
      serviceProvider: serviceProviderIds[index % serviceProviderIds.length],
    }));
    const createdMessages = await Message.insertMany(messagesWithIds);

    // Seed Earnings
    const earningsWithIds = data.earnings.map((earning, index) => ({
      ...earning,
      serviceProvider: serviceProviderIds[index % serviceProviderIds.length],
      projectName: projectIds[index % projectIds.length],
    }));
    const createdEarnings = await Earnings.insertMany(earningsWithIds);

    // Seed Payments — resolve serviceProvider by email so data.js assignments are respected
    const spEmailToId = {};
    createdServiceProviders.forEach(sp => { spEmailToId[sp.email] = sp._id.toString(); });
    const paymentsWithIds = data.payments.map((payment, index) => ({
      ...payment,
      serviceProvider: spEmailToId[payment.serviceProvider] || serviceProviderIds[index % serviceProviderIds.length],
    }));
    const createdPayments = await Payment.insertMany(paymentsWithIds);

    // Seed Demo Requests
    const createdDemoRequests = await DemoRequest.insertMany(data.demoRequests);

    // Seed Newsletter Subscribers
    const createdNewsletters = await Newsletter.insertMany(data.newsletter);

    // Seed other collections
    // const createdProducts = await Product.insertMany(data.products);
    const createdProducts = [];
    for (const product of data.products) {
      try {
        const createdProduct = await Product.create(product);
        createdProducts.push(createdProduct);
      } catch (error) {
        console.log(`Skipping product ${product.name}: ${error.message}`);
      }
    }

    // Preserve existing users; seed defaults only if none exist
    let createdUsers = await User.find({});
    if (createdUsers.length === 0) {
      createdUsers = await User.insertMany(data.users);
    }
    // Upsert sellers by referralCode to preserve outboundClicks and clickLogs
    const sellerOps = data.sellers.map((s) => ({
      updateOne: {
        filter: { referralCode: s.referralCode },
        update: {
          $set: {
            name: s.name,
            brand: s.brand,
            info: s.info,
            link: s.link,
            companyLink: s.companyLink,
            logo: s.logo,
            rating: s.rating,
            numReviews: s.numReviews,
          },
          $setOnInsert: {
            referralCode: s.referralCode,
            outboundClicks: 0,
            clickLogs: [],
            reviews: [],
          },
        },
        upsert: true,
      },
    }));
    await Seller.bulkWrite(sellerOps);
    const createdSellers = await Seller.find({});
    const createdContacts = await Contact.insertMany(data.contacts);

    // Assign referrals to specific users by email (deterministic regardless of DB order)
    const sellerByCode = {};
    createdSellers.forEach(s => { sellerByCode[s.referralCode] = s._id; });

    const referralAssignments = [
      // Referred by LG (LGREF)
      { email: 'user_doe@example.com', referralCode: 'LGREF' },
      { email: 'user_jen@example.com', referralCode: 'LGREF' },
      { email: 'user_manny@example.com', referralCode: 'LGREF' },
      // Referred by Samsung (SAMSUNGREF)
      { email: 'user_ban@example.com', referralCode: 'SAMSUNGREF' },
      { email: 'user_mik@example.com', referralCode: 'SAMSUNGREF' },
    ];

    for (const { email, referralCode } of referralAssignments) {
      const sellerId = sellerByCode[referralCode];
      if (sellerId) {
        await User.findOneAndUpdate({ email }, { referredBy: sellerId });
      }
    }

    // Refresh users data after referral assignments
    createdUsers = await User.find({});

    // Update existing orders missing referredBy based on user's referredBy
    const existingOrders = await Order.find({
      $or: [{ referredBy: { $exists: false } }, { referredBy: null }]
    }).populate('user');
    for (const order of existingOrders) {
      if (order.user && order.user.referredBy) {
        await Order.findByIdAndUpdate(order._id, { referredBy: order.user.referredBy });
      }
    }

    const createdBlogs = await Blog.insertMany(data.blogs);
    const notificationsWithIds = data.notifications.map(({ serviceProviderEmail, ...n }) => ({
      ...n,
      ...(serviceProviderEmail && spEmailToId[serviceProviderEmail]
        ? { serviceProviderId: spEmailToId[serviceProviderEmail] }
        : {}),
    }));
    const createdNotifications = await Notification.insertMany(notificationsWithIds);

    // Seed Orders with proper user and product references
    let createdOrders = [];
    if (ordersMode === 'seedIfNone') {
      // Only seed orders if none exist in DB
      const existingCount = await Order.countDocuments();
      if (existingCount === 0) {
        const ordersWithIds = data.orders.map((order, index) => {
          const userId = createdUsers[index % createdUsers.length]._id;
          const user = createdUsers[index % createdUsers.length];
          const orderItemsWithProductIds = order.orderItems.map((item) => {
            const product = createdProducts.find(p => p.slug === item.slug);
            return {
              ...item,
              product: product ? product._id : createdProducts[0]._id,
            };
          });
          return {
            ...order,
            user: userId,
            orderItems: orderItemsWithProductIds,
            referredBy: user.referredBy || null,
          };
        });
        const result = await Order.collection.insertMany(ordersWithIds, { ordered: true });
        createdOrders = Object.values(result.insertedIds);
      } else {
        createdOrders = [];
      }
    } else if (ordersMode === 'reset' || ordersMode === 'append') {
      // Always preserve manual orders, only add new seed orders that don't exist
      const ordersWithIds = data.orders.map((order, index) => {
        const userId = createdUsers[index % createdUsers.length]._id;
        const user = createdUsers[index % createdUsers.length];
        const orderItemsWithProductIds = order.orderItems.map((item) => {
          const product = createdProducts.find(p => p.slug === item.slug);
          return {
            ...item,
            product: product ? product._id : createdProducts[0]._id,
          };
        });
        return {
          ...order,
          user: userId,
          orderItems: orderItemsWithProductIds,
          referredBy: user.referredBy || null,
        };
      });
      // Deduplicate seed orders and avoid inserting orders that already exist in DB
      const payIds = ordersWithIds
        .map(o => (o.paymentResult && o.paymentResult.id ? o.paymentResult.id : null))
        .filter(Boolean);
      const createdDates = ordersWithIds
        .map(o => (o.createdAt ? new Date(o.createdAt) : null))
        .filter(Boolean);

      const existingQuery = [];
      if (payIds.length) existingQuery.push({ 'paymentResult.id': { $in: payIds } });
      if (createdDates.length) existingQuery.push({ createdAt: { $in: createdDates } });

      let existingOrders = [];
      if (existingQuery.length) {
        existingOrders = await Order.find({ $or: existingQuery });
      }

      const existingPayIds = new Set(existingOrders.map(o => (o.paymentResult && o.paymentResult.id ? o.paymentResult.id : null)).filter(Boolean));
      const existingCreatedKeys = new Set(existingOrders.map(o => (o.createdAt ? new Date(o.createdAt).toISOString() : null)).filter(Boolean));

      const seen = new Set();
      const uniqueOrders = [];
      for (const ord of ordersWithIds) {
        const payId = ord.paymentResult && ord.paymentResult.id ? ord.paymentResult.id : null;
        const createdKey = ord.createdAt ? new Date(ord.createdAt).toISOString() : null;
        const key = payId || createdKey || JSON.stringify({ items: ord.orderItems.map(i => ({ slug: i.slug, qty: i.quantity })), total: ord.totalPrice });
        if (existingPayIds.has(payId) || existingCreatedKeys.has(createdKey)) {
          // skip this order because it already exists in DB
          continue;
        }
        if (!seen.has(key)) {
          seen.add(key);
          uniqueOrders.push(ord);
        }
      }

      if (uniqueOrders.length) {
        const result = await Order.collection.insertMany(uniqueOrders, { ordered: true });
        createdOrders = Object.values(result.insertedIds);
      } else {
        createdOrders = [];
      }
    }



    res.send({
      createdProducts,
      createdUsers,
      createdSellers,
      createdContacts,
      createdServiceProviders,
      createdProjects,
      createdMessages,
      createdEarnings,
      createdPayments,
      createdBlogs,
      createdNotifications,
      createdOrders,
      createdNewsletters,
      message:
        ordersMode === 'reset'
          ? 'Seeding completed (orders reset)'
          : ordersMode === 'append'
            ? 'Seeding completed (orders appended only if none existed)'
            : 'Seeding completed (orders preserved; to seed orders use ?includeOrders=true or ?ordersMode=reset)',
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).send({ message: 'Error seeding data', error: error.message });
  }
});

export default seedRouter;