import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import { isAuth, isAdmin } from '../utils.js';
import ServiceProvider from '../models/serviceProviderModel.js';
import Earnings from '../models/earningModel.js';
import Project from '../models/projectModel.js';
import Message from '../models/messageModel.js';
import Notification from '../models/notificationModel.js';


const orderRouter = express.Router();

orderRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const pageSize = 15;
    const page = Number(req.query.page) || 1;
    const { status, q, dateFrom, dateTo, sort } = req.query;

    // Build filter
    const filter = {};
    if (status === 'paid') filter.isPaid = true;
    if (status === 'pending') filter.isPaid = false;
    if (status === 'delivered') filter.isDelivered = true;
    if (status === 'not-delivered') filter.isDelivered = false;

    if (dateFrom || dateTo) {
      const parseDate = (s) => {
        if (!s || typeof s !== 'string') return null;
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
      };
      const fromDate = parseDate(dateFrom);
      const toDate = parseDate(dateTo);
      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) {
          fromDate.setHours(0, 0, 0, 0);
          filter.createdAt.$gte = fromDate;
        }
        if (toDate) {
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }
    }

    // Text search on order id (string) or user name
    if (q && q.trim()) {
      const queryText = q.trim();
      const userMatches = await User.find(
        { name: { $regex: queryText, $options: 'i' } },
        { _id: 1 }
      );
      const userIds = userMatches.map((u) => u._id);
      const orClauses = [];
      if (userIds.length) {
        orClauses.push({ user: { $in: userIds } });
      }
      // Match order id
      orClauses.push({
        $expr: {
          $regexMatch: {
            input: { $toString: '$_id' },
            regex: queryText,
            options: 'i',
          },
        },
      });
      // Match totalPrice (supports inputs like "$953.63" or "953.63")
      const numericCandidate = parseFloat(queryText.replace(/[^0-9.]/g, ''));
      if (!Number.isNaN(numericCandidate)) {
        const delta = 0.01;
        orClauses.push({
          totalPrice: { $gte: numericCandidate - delta, $lte: numericCandidate + delta },
        });
      }
      filter.$or = orClauses;
    }

    // Sort
    const sortMap = {
      'createdAt:asc': { createdAt: 1 },
      'createdAt:desc': { createdAt: -1 },
      'totalPrice:asc': { totalPrice: 1 },
      'totalPrice:desc': { totalPrice: -1 },
      'paidAt:asc': { paidAt: 1 },
      'paidAt:desc': { paidAt: -1 },
      'deliveredAt:asc': { deliveredAt: 1 },
      'deliveredAt:desc': { deliveredAt: -1 },
    };
    const sortKey = sort && sortMap[sort] ? sortMap[sort] : { createdAt: -1 };

    const orders = await Order.find(filter)
      .sort(sortKey)
      .populate('user', 'name')
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const countOrders = await Order.countDocuments(filter);
    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, page, pages });
  })
);


orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {

    if (!req.body.orderItems || req.body.orderItems.length === 0) {
      return res.status(400).send({ message: 'Cart is empty!' });
    }

    // Validate all items have required fields
    const invalidItems = req.body.orderItems.filter(item => !item.slug || !item.name || !item.image || !item._id);
    if (invalidItems.length > 0) {
      console.error('Invalid order items:', invalidItems);
      return res.status(400).send({ 
        message: 'Cart contains items with missing information. Please clear cart and re-add items.',
        invalidItems: invalidItems.map(i => ({ _id: i._id, name: i.name, missingFields: [] }))
      });
    }

    const orderItems = req.body.orderItems.map((item) => {
      const discountedPrice = item.discountedPrice || (item.discount > 0
        ? item.price * (1 - item.discount / 100)
        : item.price);
      
      // For custom items (condenser-*, placeholder-*), don't try to set product reference
      // Just save the item data as-is
      if (item._id && (item._id.toString().startsWith('condenser-') || item._id.toString().startsWith('placeholder-'))) {
        console.log(`Handling custom item: ${item._id}`);
        return { 
          slug: item.slug,
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          price: discountedPrice,
          discount: item.discount || 0,
          isCustom: true, // Mark as custom item
          customId: item._id // Store the custom ID separately
        };
      }
      
      // For regular products, set product reference
      return { ...item, product: item._id, price: discountedPrice };
    });

    const itemsPrice = Number.isNaN(parseFloat(req.body.itemsPrice)) ? 0 : parseFloat(req.body.itemsPrice);
    const shippingPrice = Number.isNaN(parseFloat(req.body.shippingPrice)) ? 10 : parseFloat(req.body.shippingPrice);
    const taxPrice = Number.isNaN(parseFloat(req.body.taxPrice)) ? 0 : parseFloat(req.body.taxPrice);
    const totalPrice = Number.isNaN(parseFloat(req.body.totalPrice))
      ? (itemsPrice + shippingPrice + taxPrice)
      : parseFloat(req.body.totalPrice);

    // Round to 2 decimal places to avoid PayPal DECIMAL_PRECISION error
    const roundedTotalPrice = Math.round(totalPrice * 100) / 100;

    if (Number.isNaN(roundedTotalPrice)) {
      return res.status(400).send({ message: 'Calculation error with total price' });
    }


    console.log('Order Items:', req.body.orderItems);
    console.log('Parsed Prices:', { itemsPrice, shippingPrice, taxPrice, totalPrice, roundedTotalPrice });
    console.log('User referredBy:', req.user.referredBy);


    const newOrder = new Order({
      orderItems,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      paymentResult: req.body.paymentResult,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice: roundedTotalPrice,
      user: req.user._id,
      referredBy: req.user.referredBy,
    });


    const order = await newOrder.save();

    // Create notification for user
    await Notification.create({
      title: 'Order Confirmed',
      message: `Your order #${order._id.toString().slice(-6)} has been placed successfully. Total: $${roundedTotalPrice.toFixed(2)}`,
      type: 'info',
      recipientType: 'user',
      userId: req.user._id,
      link: `/order/${order._id}`,
    });

    // Create notification for admin
    await Notification.create({
      title: 'New Order Received',
      message: `New order #${order._id.toString().slice(-6)} from ${req.user.name}. Total: $${roundedTotalPrice.toFixed(2)}`,
      type: 'urgent',
      recipientType: 'admin',
      link: `/admin/order/${order._id}`,
    });

    res.status(201).send({ message: 'New Order Created', order });
  })
);

orderRouter.get(
  '/summary',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const orders = await Order.aggregate([
        {
          $group: {
            _id: null,
            numOrders: { $sum: 1 },
            totalSales: { $sum: '$totalPrice' },
          },
        },
      ]);
      const users = await User.aggregate([
        {
          $group: {
            _id: null,
            numUsers: { $sum: 1 },
          },
        },
      ]);
      const dailyOrders = await Order.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            sales: { $sum: '$totalPrice' },
            paidOrders: {
              $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] }
            },
            notPaidOrders: {
              $sum: { $cond: [{ $eq: ['$isPaid', false] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$isDelivered', true] }, 1, 0] }
            },
            notDeliveredOrders: {
              $sum: { $cond: [{ $eq: ['$isDelivered', false] }, 1, 0] }
            }
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const productCategories = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]);

      const productDiscount = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            discount: { $sum: '$discount' },
          },
        },
      ]);
      const serviceProviders = await ServiceProvider.aggregate([
        { $skip: skip },
        { $limit: limit },
        {
          $group: {
            _id: null,
            numServiceProviders: { $sum: 1 },
          },
        },
      ]);
      const totalServiceProviders = await ServiceProvider.countDocuments();

      const totalProjects = await Project.aggregate([
        {
          $group: {
            _id: null,
            numProjects: { $sum: 1 },
          },
        },
      ]);

      const totalMessages = await Message.aggregate([
        { $project: { _id: 1 } },
      ]);
      console.log('Total messages found:', totalMessages.length);

      const totalMessagesCount = totalMessages.length > 0 ? totalMessages.length : 0;

      const totalEarnings = await Earnings.aggregate([
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$amount' },
            numEarnings: { $sum: 1 },
          },
        },
      ]);
      const totalNotifications = await Notification.aggregate([
        {
          $group: {
            _id: null,
            numNotifications: { $sum: 1 },
          },
        },
      ]);

      res.send({
        users,
        orders,
        dailyOrders,
        productCategories,
        serviceProviders,
        totalProjects,
        totalMessages: totalMessagesCount,
        totalEarnings,
        totalServiceProviders,
        currentPage: page,
        totalPages: Math.ceil(totalServiceProviders / limit),
        totalNotifications,
        productDiscount
      });

    } catch (error) {
      console.error('Error fetching summary:', error);
      res.status(500).send({ message: 'Error fetching summary data' });
    }
  })
);



orderRouter.get(
  '/by-short-id/:shortId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { shortId } = req.params;
    // Match orders whose ObjectId ends with the given 6-char short ID
    const regex = new RegExp(shortId + '$', 'i');
    const allOrders = await Order.find(
      req.user.isAdmin ? {} : { user: req.user._id }
    ).select('_id').lean();
    const match = allOrders.find((o) => regex.test(o._id.toString()));
    if (match) {
      res.send({ orderId: match._id });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const pageSize = 15;
    const page = Number(req.query.page) || 1;
    const countOrders = await Order.countDocuments({ user: req.user._id });
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const pages = Math.ceil(countOrders / pageSize);

    res.send({ orders, page, pages });
  })
);


orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);
orderRouter.post('/validate-cart', async (req, res) => {
  const { cartItems } = req.body;
  try {
    const validatedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item._id);
        return {
          ...item,
          price: product.price,
        };
      })
    );
    res.json(validatedItems);
  } catch (error) {
    res.status(400).send({ message: 'Invalid Cart Items', error });
  }
});

orderRouter.put(
  '/:id/deliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      await order.save();

      // Notify user of delivery
      const user = await User.findById(order.user);
      if (user) {
        await Notification.create({
          title: 'Order Delivered',
          message: `Your order #${order._id.toString().slice(-6)} has been delivered successfully!`,
          type: 'info',
          recipientType: 'user',
          userId: order.user,
          link: `/order/${order._id}`,
        });
      }

      res.send({ message: 'Order Delivered' });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };

      const updatedOrder = await order.save();

      // Notify user of successful payment
      await Notification.create({
        title: 'Payment Confirmed',
        message: `Payment for order #${order._id.toString().slice(-6)} has been processed successfully.`,
        type: 'info',
        recipientType: 'user',
        userId: order.user._id,
        link: `/order/${order._id}`,
      });

      // Notify admin
      await Notification.create({
        title: 'Order Payment Received',
        message: `Payment received for order #${order._id.toString().slice(-6)} from ${order.user.name}.`,
        type: 'info',
        recipientType: 'admin',
        link: `/admin/order/${order._id}`,
      });

      res.send({ message: 'Order Paid', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      await order.deleteOne();
      res.send({ message: 'Order Deleted' });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

export default orderRouter;