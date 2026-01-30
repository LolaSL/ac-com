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
import EngineerAnnotation from '../models/engineerAnnotationModel.js';
import Order from '../models/orderModel.js';
import Payment from '../models/paymentModel.js';
import BrowsingHistory from '../models/browsingHistoryModel.js';
import { PDFDocument, rgb } from 'pdf-lib';
import data from '../data.js';

const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  try {
    const includeOrders = req.query.includeOrders === 'true';
    const ordersMode = req.query.ordersMode || (includeOrders ? 'append' : 'skip');

    await Product.deleteMany({});
    await Seller.deleteMany({});
    await Contact.deleteMany({});
    await ServiceProvider.deleteMany({});
    await Project.deleteMany({});
    await Message.deleteMany({});
    await Earnings.deleteMany({});
    await Blog.deleteMany({});
    await Notification.deleteMany({});
    await Annotation.deleteMany({});
    await EngineerAnnotation.deleteMany({});
    await Payment.deleteMany({});
    await BrowsingHistory.deleteMany({});

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

    // Assign referrals to some users
    if (createdUsers.length > 0 && createdSellers.length > 0) {
      // Assign first 3 users to be referred by first seller
      await User.findByIdAndUpdate(createdUsers[0]._id, { referredBy: createdSellers[0]._id });
      await User.findByIdAndUpdate(createdUsers[1]._id, { referredBy: createdSellers[0]._id });
      await User.findByIdAndUpdate(createdUsers[2]._id, { referredBy: createdSellers[0]._id });

      // Assign next 2 users to be referred by second seller
      if (createdSellers.length > 1) {
        await User.findByIdAndUpdate(createdUsers[3]._id, { referredBy: createdSellers[1]._id });
        await User.findByIdAndUpdate(createdUsers[4]._id, { referredBy: createdSellers[1]._id });
      }
    }

    // Refresh users data after referral assignments
    createdUsers = await User.find({});

    // Update existing orders with referredBy based on user's referredBy
    const existingOrders = await Order.find({ referredBy: { $exists: false } }).populate('user');
    for (const order of existingOrders) {
      if (order.user && order.user.referredBy) {
        await Order.findByIdAndUpdate(order._id, { referredBy: order.user.referredBy });
      }
    }

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

    // Seed EngineerAnnotations
    const engineerAnnotationsWithIds = [];
    for (const ea of data.engineerAnnotations) {
      // Create a simple PDF with 4 pages for testing
      const pdfDoc = await PDFDocument.create();
      const pages = [];
      for (let i = 0; i < 4; i++) {
        const page = pdfDoc.addPage();
        pages.push(page);
      }
      const { width, height } = pages[0].getSize();
      const fontSize = 30;
      pages.forEach((page, index) => {
        page.drawText(`Engineer Review PDF - Page ${index + 1}`, {
          x: 50,
          y: height - 4 * fontSize,
          size: fontSize,
          color: rgb(0, 0.53, 0.71),
        });
        page.drawText(`System Type: ${ea.systemConfig.systemType}`, {
          x: 50,
          y: height - 6 * fontSize,
          size: 20,
          color: rgb(0, 0, 0),
        });
        page.drawText(`Engineer Notes: ${ea.engineerNotes}`, {
          x: 50,
          y: height - 8 * fontSize,
          size: 20,
          color: rgb(0, 0, 0),
        });
      });
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      engineerAnnotationsWithIds.push({
        ...ea,
        userId: createdUsers[1]._id, // Jane (user)
        engineerId: createdUsers[0]._id, // Admin (engineer)
        userAnnotationId: createdAnnotations[0]._id,
        pdfData: pdfBuffer,
        originalImageWidth: 800,
        originalImageHeight: 1000,
      });
    }

    const createdEngineerAnnotations = await EngineerAnnotation.insertMany(engineerAnnotationsWithIds);

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
      createdAnnotations,
      createdEngineerAnnotations,
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