import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import BrowsingHistory from '../models/browsingHistoryModel.js';
import Product from '../models/productModel.js';
import { isAuth } from '../utils.js';

const browsingHistoryRouter = express.Router();

// Record a product view
browsingHistoryRouter.post(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { productId } = req.body;

        // Get the current product price
        const product = await Product.findById(productId);
        if (!product) {
            res.status(404).send({ message: 'Product not found' });
            return;
        }

        // Check if user already viewed this product recently (within last 24 hours)
        const existingView = await BrowsingHistory.findOne({
            user: req.user._id,
            product: productId,
            viewedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (existingView) {
            // Update the view time
            existingView.viewedAt = new Date();
            await existingView.save();
            res.send({ message: 'View updated' });
        } else {
            // Create new browsing history entry
            const browsingHistory = new BrowsingHistory({
                user: req.user._id,
                product: productId,
                priceAtView: product.price,
                currentPrice: product.price,
            });

            await browsingHistory.save();
            res.status(201).send({ message: 'View recorded' });
        }
    })
);

// Get user's browsing history with price drop information
browsingHistoryRouter.get(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const pageSize = 20;
        const page = Number(req.query.page) || 1;

        // Get browsing history and populate product details
        const browsingHistory = await BrowsingHistory.find({ user: req.user._id })
            .populate('product')
            .sort({ viewedAt: -1 })
            .skip(pageSize * (page - 1))
            .limit(pageSize);

        // Update current prices and check for price drops
        const updatedHistory = await Promise.all(
            browsingHistory.map(async (item) => {
                if (item.product) {
                    const currentProduct = await Product.findById(item.product._id);
                    if (currentProduct) {
                        item.currentPrice = currentProduct.price;
                        item.priceDropped = currentProduct.price < item.priceAtView;
                        await item.save();
                    }
                }
                return item;
            })
        );

        const countHistory = await BrowsingHistory.countDocuments({
            user: req.user._id,
        });
        const pages = Math.ceil(countHistory / pageSize);

        res.send({
            browsingHistory: updatedHistory,
            page,
            pages,
            totalItems: countHistory,
        });
    })
);

// Get products with price drops
browsingHistoryRouter.get(
    '/price-drops',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        // Get all browsing history for user
        const browsingHistory = await BrowsingHistory.find({ user: req.user._id })
            .populate('product')
            .sort({ viewedAt: -1 });

        // Filter and update for price drops
        const priceDrops = [];

        for (const item of browsingHistory) {
            if (item.product) {
                const currentProduct = await Product.findById(item.product._id);
                if (currentProduct && currentProduct.price < item.priceAtView) {
                    item.currentPrice = currentProduct.price;
                    item.priceDropped = true;
                    await item.save();
                    priceDrops.push(item);
                }
            }
        }

        res.send(priceDrops);
    })
);

// Clear browsing history
browsingHistoryRouter.delete(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        await BrowsingHistory.deleteMany({ user: req.user._id });
        res.send({ message: 'Browsing history cleared' });
    })
);

// Delete specific item from browsing history
browsingHistoryRouter.delete(
    '/:id',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const historyItem = await BrowsingHistory.findById(req.params.id);

        if (historyItem) {
            if (historyItem.user.toString() !== req.user._id.toString()) {
                res.status(401).send({ message: 'Not authorized' });
                return;
            }
            await historyItem.deleteOne();
            res.send({ message: 'History item deleted' });
        } else {
            res.status(404).send({ message: 'History item not found' });
        }
    })
);

export default browsingHistoryRouter;
