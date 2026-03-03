import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Notification from '../models/notificationModel.js';
import Order from '../models/orderModel.js';
import { isAuth, isAdmin } from '../utils.js';

const notificationRouter = express.Router();

// GET notifications
notificationRouter.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    let notifications;

    if (req.user.isAdmin) {
      // Admin sees all admin-targeted + 'all' notifications
      notifications = await Notification.find({
        $or: [
          { recipientType: 'admin' },
          { recipientType: 'all' },
        ],
      })
        .select('_id title message type recipientType userId serviceProviderId orderId isRead createdAt updatedAt link')
        .sort({ createdAt: -1 })
        .lean({ virtuals: true });

    } else if (req.user.isServiceProvider) {
      // Service Provider — match by serviceProviderId or general SP broadcasts
      notifications = await Notification.find({
        $or: [
          { recipientType: 'serviceProvider', serviceProviderId: req.user._id },
          { recipientType: 'serviceProvider', serviceProviderId: { $in: [null, undefined] } },
          { recipientType: 'all' },
        ],
      })
        .select('_id title message type recipientType userId serviceProviderId orderId isRead createdAt updatedAt link')
        .sort({ createdAt: -1 })
        .lean({ virtuals: true });

    } else {
      // Regular user — match by userId or general user broadcasts
      notifications = await Notification.find({
        $or: [
          { recipientType: 'user', userId: req.user._id },
          { recipientType: 'user', userId: { $in: [null, undefined] } },
          { recipientType: 'all' },
        ],
      })
        .select('_id title message type recipientType userId serviceProviderId orderId isRead createdAt updatedAt link')
        .sort({ createdAt: -1 })
        .lean({ virtuals: true });
    }

    res.json(notifications);
  })
);

// MARK notification as read
notificationRouter.put(
  '/mark-all-read',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    let query;
    if (req.user.isAdmin) {
      query = { $or: [{ recipientType: 'admin' }, { recipientType: 'all' }] };
    } else if (req.user.isServiceProvider) {
      query = {
        $or: [
          { recipientType: 'serviceProvider', serviceProviderId: req.user._id },
          { recipientType: 'all' },
        ],
      };
    } else {
      query = {
        $or: [
          { recipientType: 'user', userId: req.user._id },
          { recipientType: 'all' },
        ],
      };
    }
    await Notification.updateMany({ ...query, isRead: false }, { $set: { isRead: true } });
    res.json({ message: 'All notifications marked as read' });
  })
);

// MARK notification as read
notificationRouter.put(
  '/:id/read',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (notification) {
      notification.isRead = true;
      await notification.save();
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(404).send({ message: 'Notification not found' });
    }
  })
);

// CREATE a new notification (Admin only)
notificationRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { title, message, type, recipientType } = req.body;

    const notification = new Notification({
      title,
      message,
      type,
      recipientType,
    });

    const createdNotification = await notification.save();
    res.status(201).json(createdNotification);
  })
);

// DELETE a notification (Admin only)
notificationRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).send({ message: 'Notification not found' });
    }

    await notification.deleteOne();
    res.status(200).send({ message: 'Notification deleted successfully' });
  })
);

// POST /api/notifications/send-payment-reminders  (Admin only)
// Manually trigger staged payment reminders for all unpaid orders.
const REMINDER_STAGES = [
  {
    stage: 1, minHours: 1, maxHours: Infinity,
    title: 'Complete Your Payment', type: 'info',
    message: (shortId, total) =>
      `Your order #${shortId} is awaiting payment. Total: $${total}. Complete your payment to confirm the order.`,
  },
  {
    stage: 2, minHours: 24, maxHours: Infinity,
    title: 'Payment Reminder', type: 'urgent',
    message: (shortId, total) =>
      `Reminder: Your order #${shortId} ($${total}) is still unpaid after 24 hours. Please complete your payment to avoid cancellation.`,
  },
  {
    stage: 3, minHours: 72, maxHours: Infinity,
    title: 'Urgent: Order Pending Payment', type: 'urgent',
    message: (shortId, total) =>
      `Your order #${shortId} ($${total}) has been unpaid for 3 days. Please complete your payment soon or the order may be cancelled.`,
  },
  {
    stage: 4, minHours: 168, maxHours: Infinity,
    title: 'Final Notice: Order Will Be Cancelled', type: 'urgent',
    message: (shortId, total) =>
      `Final notice: Your order #${shortId} ($${total}) will be cancelled if payment is not received within 24 hours.`,
  },
];

notificationRouter.post(
  '/send-payment-reminders',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const unpaidOrders = await Order.find({ isPaid: false }).populate('user', '_id name');

    let sent = 0;

    for (const order of unpaidOrders) {
      if (!order.user) continue;

      const orderAgeHours =
        (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
      const orderLink = `/order/${order._id}`;
      const shortId = order._id.toString().slice(-6);
      const total = order.totalPrice.toFixed(2);

      // Find the highest applicable stage not yet notified
      for (const stage of [...REMINDER_STAGES].reverse()) {
        if (orderAgeHours < stage.minHours) continue;

        const alreadySent = await Notification.findOne({
          title: stage.title,
          link: orderLink,
          userId: order.user._id,
        });
        if (alreadySent) continue;

        await Notification.create({
          title: stage.title,
          message: stage.message(shortId, total),
          type: stage.type,
          recipientType: 'user',
          userId: order.user._id,
          link: orderLink,
        });
        sent++;
        break; // Send only the most relevant stage per manual trigger
      }
    }

    res.send({
      message: `Payment reminders sent: ${sent} notification(s) for ${unpaidOrders.length} unpaid order(s).`,
      sent,
      total: unpaidOrders.length,
    });
  })
);

export default notificationRouter;
