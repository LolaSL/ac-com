import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { isAuth } from '../utils.js';
import Product from '../models/productModel.js';
import Seller from '../models/sellerModel.js';

const userReviewsRouter = express.Router();

// Get all reviews made by the authenticated user
userReviewsRouter.get(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const userId = req.user._id;

        // Seller reviews reference user by ObjectId; fall back to name for legacy/seeded reviews
        const userName = req.user.name;
        const sellers = await Seller.find({
            $or: [
                { 'reviews.user': userId },
                { 'reviews.name': userName },
            ],
        })
            .select('name brand reviews')
            .lean();

        const sellerReviews = [];
        sellers.forEach((s) => {
            s.reviews
                .filter((r) => ((r.user?.toString() === userId.toString()) || r.name === userName) && !r.deleted)
                .forEach((r) => {
                    sellerReviews.push({
                        sellerId: s._id,
                        sellerName: s.name,
                        sellerBrand: s.brand,
                        rating: r.rating,
                        comment: r.comment,
                        createdAt: r.createdAt,
                        updatedAt: r.updatedAt,
                    });
                });
        });

        // Product reviews: prefer matching by user ObjectId; fallback to name for legacy reviews
        const products = await Product.find({
            $or: [
                { 'reviews.user': userId },
                { 'reviews.name': userName },
            ],
        })
            .select('name slug image reviews')
            .lean();

        const productReviews = [];
        products.forEach((p) => {
            p.reviews
                .filter((r) => ((r.user?.toString() === userId.toString()) || r.name === userName) && !r.deleted)
                .forEach((r) => {
                    productReviews.push({
                        productId: p._id,
                        productName: p.name,
                        productSlug: p.slug,
                        productImage: p.image,
                        rating: r.rating,
                        comment: r.comment,
                        createdAt: r.createdAt,
                        updatedAt: r.updatedAt,
                    });
                });
        });

        res.send({ productReviews, sellerReviews });
        // Soft delete a product review authored by the user
        userReviewsRouter.delete(
            '/products/:productId',
            isAuth,
            expressAsyncHandler(async (req, res) => {
                const { productId } = req.params;
                const product = await Product.findById(productId);
                if (!product) return res.status(404).send({ message: 'Product Not Found' });

                const target = product.reviews.find(
                    (r) => ((r.user?.toString() === req.user._id.toString()) || r.name === req.user.name) && !r.deleted
                );
                if (!target) return res.status(404).send({ message: 'Review Not Found' });
                target.deleted = true;

                const activeReviews = product.reviews.filter((r) => !r.deleted);
                product.numReviews = activeReviews.length;
                product.rating = activeReviews.length
                    ? activeReviews.reduce((a, c) => a + c.rating, 0) / activeReviews.length
                    : 0;

                await product.save();
                res.send({ message: 'Review removed' });
            })
        );

        // Soft delete a seller review authored by the user
        userReviewsRouter.delete(
            '/sellers/:sellerId',
            isAuth,
            expressAsyncHandler(async (req, res) => {
                const { sellerId } = req.params;
                const seller = await Seller.findById(sellerId);
                if (!seller) return res.status(404).send({ message: 'Seller Not Found' });

                const target = seller.reviews.find(
                    (r) => r.user?.toString() === req.user._id.toString() && !r.deleted
                );
                if (!target) return res.status(404).send({ message: 'Review Not Found' });
                target.deleted = true;

                const activeReviews = seller.reviews.filter((r) => !r.deleted);
                seller.numReviews = activeReviews.length;
                seller.rating = activeReviews.length
                    ? activeReviews.reduce((a, c) => a + c.rating, 0) / activeReviews.length
                    : 0;

                await seller.save();
                res.send({ message: 'Review removed' });
            })
        );

        // Restore a soft-deleted product review authored by the user
        userReviewsRouter.post(
            '/products/:productId/restore',
            isAuth,
            expressAsyncHandler(async (req, res) => {
                const { productId } = req.params;
                const product = await Product.findById(productId);
                if (!product) return res.status(404).send({ message: 'Product Not Found' });

                const target = product.reviews.find(
                    (r) => ((r.user?.toString() === req.user._id.toString()) || r.name === req.user.name) && r.deleted
                );
                if (!target) return res.status(404).send({ message: 'Review Not Found' });
                target.deleted = false;

                const activeReviews = product.reviews.filter((r) => !r.deleted);
                product.numReviews = activeReviews.length;
                product.rating = activeReviews.length
                    ? activeReviews.reduce((a, c) => a + c.rating, 0) / activeReviews.length
                    : 0;

                await product.save();
                res.send({ message: 'Review restored' });
            })
        );

        // Restore a soft-deleted seller review authored by the user
        userReviewsRouter.post(
            '/sellers/:sellerId/restore',
            isAuth,
            expressAsyncHandler(async (req, res) => {
                const { sellerId } = req.params;
                const seller = await Seller.findById(sellerId);
                if (!seller) return res.status(404).send({ message: 'Seller Not Found' });

                const target = seller.reviews.find(
                    (r) => r.user?.toString() === req.user._id.toString() && r.deleted
                );
                if (!target) return res.status(404).send({ message: 'Review Not Found' });
                target.deleted = false;

                const activeReviews = seller.reviews.filter((r) => !r.deleted);
                seller.numReviews = activeReviews.length;
                seller.rating = activeReviews.length
                    ? activeReviews.reduce((a, c) => a + c.rating, 0) / activeReviews.length
                    : 0;

                await seller.save();
                res.send({ message: 'Review restored' });
            })
        );

        // Soft delete all reviews authored by the user
        userReviewsRouter.delete(
            '/all',
            isAuth,
            expressAsyncHandler(async (req, res) => {
                const userId = req.user._id.toString();
                const userName = req.user.name;

                const products = await Product.find({
                    $or: [
                        { 'reviews.user': req.user._id },
                        { 'reviews.name': userName },
                    ],
                });
                for (const p of products) {
                    let changed = false;
                    p.reviews.forEach((r) => {
                        if (((r.user?.toString() === userId) || r.name === userName) && !r.deleted) {
                            r.deleted = true;
                            changed = true;
                        }
                    });
                    if (changed) {
                        const active = p.reviews.filter((r) => !r.deleted);
                        p.numReviews = active.length;
                        p.rating = active.length ? active.reduce((a, c) => a + c.rating, 0) / active.length : 0;
                        await p.save();
                    }
                }

                const sellers = await Seller.find({ 'reviews.user': req.user._id });
                for (const s of sellers) {
                    let changed = false;
                    s.reviews.forEach((r) => {
                        if (r.user?.toString() === userId && !r.deleted) {
                            r.deleted = true;
                            changed = true;
                        }
                    });
                    if (changed) {
                        const active = s.reviews.filter((r) => !r.deleted);
                        s.numReviews = active.length;
                        s.rating = active.length ? active.reduce((a, c) => a + c.rating, 0) / active.length : 0;
                        await s.save();
                    }
                }

                res.send({ message: 'All reviews removed' });
            })
        );

    })
);

export default userReviewsRouter;
