import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/userModel.js';
import Seller from '../models/sellerModel.js';
import ServiceProvider from '../models/serviceProviderModel.js';
import Payment from '../models/paymentModel.js';
import Notification from '../models/notificationModel.js';
import {
  isAuth, isAdmin, generateToken, baseUrl,
  sendEmail
} from '../utils.js';



const userRouter = express.Router();

userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    const countUsers = await User.countDocuments();
    const users = await User.find({})
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    const pages = Math.ceil(countUsers / pageSize);
    res.send({ users, page, pages });
  })
);


userRouter.get(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    console.log('Profile update request received:', {
      userId: req.user._id,
      hasPassword: !!req.body.password,
      body: { ...req.body, password: req.body.password ? '[REDACTED]' : undefined }
    });

    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.phone !== undefined) {
        user.phone = req.body.phone;
      }
      if (req.body.avatar !== undefined) {
        user.avatar = req.body.avatar;
      }

      if (req.body.password) {
        console.log('Updating password for user:', user.email);
        user.password = bcrypt.hashSync(req.body.password, 8);
      }

      const updatedUser = await user.save();
      console.log('User updated successfully:', updatedUser.email);

      res.send({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        isAdmin: updatedUser.isAdmin,
        token: generateToken(updatedUser),
      });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  })
);

userRouter.post(
  '/forget-password',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '3h',
      });
      user.resetToken = token;
      await user.save();

      const resetLink = `${baseUrl()}/reset-password/${token}`;
      console.log('===================================');
      console.log('PASSWORD RESET LINK:');
      console.log(resetLink);
      console.log('===================================');

      // Only send email if Gmail is configured
      if (process.env.GMAIL_USER) {
        try {
          await sendEmail({
            to: user.email,
            subject: 'Reset Password',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0066ff;">Password Reset Request</h2>
                <p>Hello ${user.name},</p>
                <p>Please click the following link to reset your password:</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="background-color: #0066ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                </p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>This link will expire in 3 hours.</p>
                <p>Best regards,<br>The AC-Commerce Team</p>
              </div>
            `
          });
        } catch (error) {
          console.log('Email sending failed:', error.message);
        }
      } else {
        console.log('Gmail not configured - skipping password reset email');
      }

      res.send({ message: 'We sent reset password link to your email.' });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  })
);

userRouter.post(
  '/reset-password',
  expressAsyncHandler(async (req, res) => {
    jwt.verify(req.body.token, process.env.JWT_SECRET, async (err, decode) => {
      if (err) {
        res.status(401).send({ message: 'Invalid Token' });
      } else {
        const user = await User.findOne({ resetToken: req.body.token });
        if (user) {
          if (req.body.password) {
            user.password = bcrypt.hashSync(req.body.password, 8);
            user.resetToken = undefined;
            await user.save();
            res.send({
              message: 'Password reseted successfully',
            });
          }
        } else {
          res.status(404).send({ message: 'User not found' });
        }
      }
    });
  })
);

userRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.isAdmin = Boolean(req.body.isAdmin);
      const updatedUser = await user.save();
      res.send({ message: 'User Updated', user: updatedUser });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.email === 'admin_uniqueA@example.com') {
        res.status(400).send({ message: 'Can Not Delete Admin User' });
        return;
      }
      await user.deleteOne();
      res.send({ message: 'User Deleted' });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.post(
  '/admin/signin',
  expressAsyncHandler(async (req, res) => {
    const admin = await User.findOne({ email: req.body.email });
    if (
      admin &&
      bcrypt.compareSync(req.body.password, admin.password) &&
      admin.isAdmin
    ) {
      res.send({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        isAdmin: true,
        type: 'admin',
        token: generateToken(admin),
      });
    } else {
      res.status(401).send({ message: 'Invalid admin credentials' });
    }
  })
);

userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (user && bcrypt.compareSync(req.body.password, user.password)) {
      res.send({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        isServiceProvider: user.isServiceProvider,
        type: user.isServiceProvider ? 'serviceProvider' : 'user',
        token: generateToken(user),
      });
      return;
    }
    res.status(401).send({ message: 'Invalid email or password' });
  })
);

userRouter.post(
  '/google-auth',
  expressAsyncHandler(async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).send({ message: 'Google access token is required' });
    }

    // Fetch user info from Google using the access token
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
    );
    if (!googleRes.ok) {
      return res.status(401).send({ message: 'Invalid Google token' });
    }
    const { sub: googleId, email, name, picture } = await googleRes.json();

    // Find by googleId first, then fall back to email
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      // Link googleId if signing in via Google for the first time on existing account
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
    } else {
      // New user — create account
      user = await new User({
        name,
        email,
        googleId,
        avatar: picture,
        isAdmin: false,
      }).save();
    }

    res.send({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      token: generateToken(user),
    });
  })
);

userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const referredBy = req.query.ref;
    let sellerId = null;
    if (referredBy) {
      const seller = await Seller.findOne({ referralCode: referredBy });
      if (seller) {
        sellerId = seller._id;
      }
    }
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password),
      referredBy: sellerId,
    });
    const user = await newUser.save();
    res.send({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      token: generateToken(user),
    });
  }));

// Payment routes for admins
userRouter.get(
  '/admin/payments',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const payments = await Payment.find({})
      .populate('serviceProvider', 'name email')
      .populate('order', 'totalPrice')
      .populate('project', 'title')
      .sort({ createdAt: -1 });
    res.send(payments);
  })
);

userRouter.post(
  '/admin/payments',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { serviceProvider: spEmail, amount, currency, paymentMethod, order, project, description } = req.body;

    // Find service provider by email
    let serviceProviderId = null;
    if (spEmail) {
      const sp = await ServiceProvider.findOne({ email: spEmail });
      if (sp) {
        serviceProviderId = sp._id;
      } else {
        return res.status(400).send({ message: 'Service Provider not found' });
      }
    }

    const payment = new Payment({
      serviceProvider: serviceProviderId,
      amount,
      currency: currency || 'USD',
      paymentMethod: paymentMethod || 'bank transfer',
      order,
      project,
      description,
    });
    const createdPayment = await payment.save();
    res.status(201).send(createdPayment);
  })
);

userRouter.put(
  '/admin/payments/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);
    if (payment) {
      const wasCompleted = payment.status === 'completed';
      payment.status = req.body.status || payment.status;
      payment.transactionId = req.body.transactionId || payment.transactionId;
      if (req.body.status === 'completed') {
        payment.paidAt = Date.now();
      }
      payment.updatedAt = Date.now();
      const updatedPayment = await payment.save();

      // Notify the SP when a payment is newly marked completed
      if (!wasCompleted && updatedPayment.status === 'completed' && updatedPayment.serviceProvider) {
        await Notification.create({
          title: 'Payment Received',
          message: `Your payment of $${updatedPayment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been processed successfully.${
            updatedPayment.description ? ' Note: ' + updatedPayment.description : ''
          }`,
          type: 'info',
          recipientType: 'serviceProvider',
          serviceProviderId: updatedPayment.serviceProvider,
          isRead: false,
        });
      }

      res.send(updatedPayment);
    } else {
      res.status(404).send({ message: 'Payment not found' });
    }
  })
);

userRouter.delete(
  '/admin/payments/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);
    if (payment) {
      await Payment.findByIdAndDelete(req.params.id);
      res.send({ message: 'Payment deleted' });
    } else {
      res.status(404).send({ message: 'Payment not found' });
    }
  })
);

export default userRouter;