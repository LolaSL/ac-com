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
import Annotation from '../models/annotationModel.js';
import Order from '../models/orderModel.js';
import Payment from '../models/paymentModel.js';
import data from '../data.js';

const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  try {
    const includeOrders = req.query.includeOrders === 'true';
    const ordersMode = req.query.ordersMode || (includeOrders ? 'append' : 'skip');

    await Product.deleteMany({});
    // Preserve users and orders; do not delete to keep manual data
    await Seller.deleteMany({});
    await Contact.deleteMany({});
    await ServiceProvider.deleteMany({});
    await Project.deleteMany({});
    await Message.deleteMany({});
    await Earnings.deleteMany({});
    await Blog.deleteMany({});
    await Notification.deleteMany({});
    await Annotation.deleteMany({});
    await Payment.deleteMany({});

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

    // Seed Payments
    const paymentsWithIds = data.payments.map((payment, index) => ({
      ...payment,
      serviceProvider: serviceProviderIds[index % serviceProviderIds.length],
    }));
    const createdPayments = await Payment.insertMany(paymentsWithIds);

    // Seed other collections
    const createdProducts = await Product.insertMany(data.products);

    // Preserve existing users; seed defaults only if none exist
    let createdUsers = await User.find({});
    if (createdUsers.length === 0) {
      createdUsers = await User.insertMany(data.users);
    }
    const createdSellers = await Seller.insertMany(data.sellers);
    const createdContacts = await Contact.insertMany(data.contacts);
    const createdBlogs = await Blog.insertMany(data.blogs);
    const createdNotifications = await Notification.insertMany(data.notifications);

    // Seed Orders with proper user and product references
    let createdOrders = [];
    if (ordersMode === 'seedIfNone') {
      // Only seed orders if none exist in DB
      const existingCount = await Order.countDocuments();
      if (existingCount === 0) {
        const ordersWithIds = data.orders.map((order, index) => {
          const userId = createdUsers[index % createdUsers.length]._id;
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

    // Seed Annotations with required fields
    const annotationsWithIds = data.annotations.map((annotation) => ({
      ...annotation,
      userId: createdUsers[0]._id,
      pdfData: Buffer.from('%PDF-1.4\n% Dummy PDF content\n'),
      originalImageWidth: 800,
      originalImageHeight: 1000,
      isPaid: Math.random() < 0.5, // 50% chance to be true (paid) or false (free)
    }));

    const createdAnnotations = await Annotation.insertMany(annotationsWithIds)

    res.send({
      createdProducts,
      createdUsers,
      createdSellers,
      createdContacts,
      createdServiceProviders,
      createdProjects,
      createdMessages,
      createdEarnings,
      createdBlogs,
      createdNotifications,
      createdOrders,
      createdAnnotations,
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
