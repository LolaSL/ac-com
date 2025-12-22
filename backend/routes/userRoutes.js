import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Seller from '../models/sellerModel.js';
import {
  isAuth, isAdmin, generateToken, baseUrl,
  mailgun
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

      // Only send email if Mailgun is configured
      if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        try {
          mailgun()
            .messages()
            .send(
              {
                from: 'AC Commerce <me@mg.yourdomain.com>',
                to: `${user.name} <${user.email}>`,
                subject: `Reset Password`,
                html: ` 
                 <p>Please Click the following link to reset your password:</p> 
               <a href="${resetLink}">Reset Password</a>
                 `,
              },
              (error, body) => {
                console.log(error);
                console.log(body);
              }
            );
        } catch (error) {
          console.log('Email sending failed (Mailgun not configured):', error.message);
        }
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
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const referredBy = req.query.ref; // Check for referral code in query params
    console.log('Signup request - ref query param:', referredBy);
    let sellerId = null;
    if (referredBy) {
      const seller = await Seller.findOne({ referralCode: referredBy });
      console.log('Found seller for ref', referredBy, ':', seller ? seller._id : 'not found');
      if (seller) {
        sellerId = seller._id;
      }
    }
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password),
      referredBy: sellerId,
    });
    const user = await newUser.save();
    console.log('Created user with referredBy:', user.referredBy);
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

export default userRouter;