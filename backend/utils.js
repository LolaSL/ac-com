import jwt from 'jsonwebtoken';
import mg from 'mailgun.js';
import dotenv from 'dotenv';


dotenv.config();

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
                    },
                    process.env.JWT_SECRET,  // Make sure this is set in your environment variables
                    {
                        expiresIn: '30d',  // The token will expire in 30 days
                    }
                );
            };
            
            export const isAuth = (req, res, next) => {
                const authorization = req.headers.authorization;
            
                if (authorization && authorization.startsWith('Bearer ')) {
                    const token = authorization.split(' ')[1];
                    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                        if (err) {
                            console.error('Token verification failed:', err); // Log error for debugging
                            return res.status(401).send({ message: 'Invalid token' });
                        }
                        req.user = { id: decoded._id, ...decoded };
                        // Attach user information to the request object
                        next();  // Proceed to the next middleware or route handler
                    });
                } else {
                    console.error('No token provided');
                    return res.status(401).send({ message: 'No token provided' });
                }
            };
            
export const isAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        console.log('Admin Access Granted:', req.user);
        next();
    } else {
        console.log('Admin Access Denied:', req.user);
        res.status(401).send({ message: 'Not authorized as an admin' });
    }
};



export const mailgun = () =>
    mg({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
    });

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
