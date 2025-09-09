
import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Notification from '../models/notificationModel.js';
import { isAuth, isAdmin } from '../utils.js'

const notificationRouter = express.Router();



notificationRouter.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    console.log('User type from token:', req.user.type);
    const filter = { recipientType: req.user.type };
    console.log('Database query filter:', filter);

   const notifications = await Notification.find(filter)
  .sort({ createdAt: -1 })
  .lean({ virtuals: true }); 
console.log(notifications[0].localDate); 

res.json(notifications);
  })
);


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
