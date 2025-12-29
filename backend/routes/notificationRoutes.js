import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Notification from '../models/notificationModel.js';
import { isAuth, isAdmin } from '../utils.js';

const notificationRouter = express.Router();

// GET notifications
notificationRouter.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    console.log('Logged-in user info:', req.user);

    let notifications;

    if (req.user.isAdmin) {
      // Admin sees all admin notifications (no userId) or specifically for them
      notifications = await Notification.find({
        $or: [
          { recipientType: 'admin', userId: { $exists: false } }, // General admin notifications
          { recipientType: 'admin', userId: req.user._id },       // Specific admin notifications
          { recipientType: 'all' },                               // General notifications
        ],
      })
        .sort({ createdAt: -1 })
        .lean({ virtuals: true });
    } else {
      // Users / service providers see their specific notifications + general ones for their type
      notifications = await Notification.find({
        $or: [
          { recipientType: req.user.type, userId: req.user._id }, // Their specific notifications
          { recipientType: req.user.type, userId: { $exists: false } }, // General for their type
          { recipientType: 'all' },                               // General notifications
        ],
      })
        .sort({ createdAt: -1 })
        .lean({ virtuals: true });
    }

    console.log('Fetched notifications recipientTypes:', notifications.map(n => n.recipientType));
    res.json(notifications);
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

export default notificationRouter;
