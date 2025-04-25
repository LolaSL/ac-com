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
    const orders = await Order.find()
      .populate('user', 'name')
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    const countOrders = await Order.countDocuments();
    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, page, pages });
  })
);



orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {

    const orderItems = req.body.orderItems.map((item) => {

      const discountedPrice = item.discountedPrice || (item.discount > 0
        ? item.price * (1 - item.discount / 100)
        : item.price);
      return { ...item, product: item._id, price: discountedPrice };
    });

    const itemsPrice = Number.isNaN(parseFloat(req.body.itemsPrice)) ? 0 : parseFloat(req.body.itemsPrice);
    const shippingPrice = Number.isNaN(parseFloat(req.body.shippingPrice)) ? 10 : parseFloat(req.body.shippingPrice);
    const taxPrice = Number.isNaN(parseFloat(req.body.taxPrice)) ? 0 : parseFloat(req.body.taxPrice);
    const totalPrice = Number.isNaN(parseFloat(req.body.totalPrice)) ? itemsPrice + shippingPrice + taxPrice : parseFloat(req.body.totalPrice);


    const newOrder = new Order({
      orderItems,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      paymentResult: req.body.paymentResult,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      user: req.user._id,
    });

    console.log({ itemsPrice, shippingPrice, taxPrice, totalPrice });

    const order = await newOrder.save();
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