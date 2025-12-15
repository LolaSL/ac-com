import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Wishlist from '../models/wishlistModel.js';
import Product from '../models/productModel.js';
import { isAuth } from '../utils.js';

const wishlistRouter = express.Router();


wishlistRouter.get(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const wishlistItems = await Wishlist.find({ user: req.user._id })
            .populate('product')
            .sort({ createdAt: -1 });

        res.send(wishlistItems);
    })
);


wishlistRouter.post(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).send({ message: 'Product ID is required' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send({ message: 'Product not found' });
        }

        const existingItem = await Wishlist.findOne({
            user: req.user._id,
            product: productId,
        });

        if (existingItem) {
            return res.status(400).send({ message: 'Product already in wishlist' });
        }

        const wishlistItem = new Wishlist({
            user: req.user._id,
            product: productId,
        });

        await wishlistItem.save();

        const populatedItem = await Wishlist.findById(wishlistItem._id).populate('product');
        res.status(201).send(populatedItem);
    })
);


wishlistRouter.delete(
    '/:id',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const wishlistItem = await Wishlist.findOne({
            user: req.user._id,
            product: req.params.id,
        });

        if (!wishlistItem) {
            return res.status(404).send({ message: 'Item not found in wishlist' });
        }

        await Wishlist.deleteOne({ _id: wishlistItem._id });
        res.send({ message: 'Item removed from wishlist' });
    })
);


wishlistRouter.get(
    '/check/:productId',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const exists = await Wishlist.findOne({
            user: req.user._id,
            product: req.params.productId,
        });

        res.send({ inWishlist: !!exists });
    })
);

export default wishlistRouter;
