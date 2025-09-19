import jwt from 'jsonwebtoken';
import Mailgun from 'mailgun.js';
import dotenv from 'dotenv';
import formData from 'form-data';

dotenv.config();

const mailgunClient = new Mailgun(formData);

export const mailgun = () =>
  mailgunClient.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
    url: 'https://api.mailgun.net',
  });

export const baseUrl = () =>
  process.env.BASE_URL
    ? process.env.BASE_URL
    : process.env.NODE_ENV !== 'production'
      ? 'http://localhost:5050'
      : 'https://ac-commerce.onrender.com';


export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      // CORRECTED: Add the isServiceProvider property
      isServiceProvider: user.isServiceProvider,
      // CORRECTED: Add the type property for filtering notifications
      type: user.isServiceProvider ? 'serviceProvider' : 'user',
     isPaid: user.isPaid,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
};


export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.slice(7); // remove "Bearer "
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        res.status(401).send({ message: 'Invalid token' });
      } else {
        req.user = decode; // contains isAdmin!
        next();
      }
    });
  } else {
    res.status(401).send({ message: 'No token' });
  }
};



export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).send({ message: 'Admin access only' });
  }
};



export const payOrderEmailTemplate = (order) => {
  return `
    <h1>Thanks for shopping with us</h1>
    <p>Hi ${order.user.name},</p>
    <p>We have finished processing your order.</p>
    <h2>[Order ${order._id}] (${order.createdAt.toString().substring(0, 10)})</h2>
    <table>
    <thead>
    <tr>
        <td><strong>Product</strong></td>
        <td><strong>Quantity</strong></td>
        <td><strong align="right">Price</strong></td>
    </tr>
    </thead>
    <tbody>
    ${order.orderItems
      .map(
        (item) => `
    <tr>
        <td>${item.name}</td>
        <td align="center">${item.quantity}</td>
        <td align="right">$${item.price.toFixed(2)}</td>
    </tr>
    `
      )
      .join('\n')}
    </tbody>
    <tfoot>
    <tr>
        <td colspan="2">Items Price:</td>
        <td align="right">$${order.itemsPrice.toFixed(2)}</td>
    </tr>
    <tr>
        <td colspan="2">Shipping Price:</td>
        <td align="right">$${order.shippingPrice.toFixed(2)}</td>
    </tr>
    <tr>
        <td colspan="2"><strong>Total Price:</strong></td>
        <td align="right"><strong>$${order.totalPrice.toFixed(2)}</strong></td>
    </tr>
    <tr>
        <td colspan="2">Payment Method:</td>
        <td align="right">${order.paymentMethod}</td>
    </tr>
    </tfoot>
    </table>

    <h2>Shipping Address</h2>
    <p>
    ${order.shippingAddress.fullName},<br/>
    ${order.shippingAddress.address},<br/>
    ${order.shippingAddress.city},<br/>
    ${order.shippingAddress.country},<br/>
    ${order.shippingAddress.postalCode}<br/>
    </p>
    <hr/>
    <p>Thanks for shopping with us.</p>
  `;
};
