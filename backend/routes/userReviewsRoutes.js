import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { isAuth } from '../utils.js';
import Product from '../models/productModel.js';
import Seller from '../models/sellerModel.js';

const userReviewsRouter = express.Router();

const isUsersReview = (review, userId, userName) =>
    review &&
    ((review.user?.toString() === userId.toString()) || review.name === userName);

const findLastMatchingReview = (reviews, predicate) => {
    for (let i = reviews.length - 1; i >= 0; i -= 1) {
        if (predicate(reviews[i])) return reviews[i];
    }
    return null;
};

const recalculateProductRating = (product) => {
    const activeReviews = product.reviews.filter((r) => !r.deleted);
    product.numReviews = activeReviews.length;
    product.rating = activeReviews.length
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length
        : 0;
};

const recalculateSellerRating = (seller) => {
    const activeReviews = seller.reviews.filter((r) => !r.deleted);
    seller.numReviews = activeReviews.length;
    seller.rating = activeReviews.length
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length
        : 0;
};

// Get all reviews made by the authenticated user
userReviewsRouter.get(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const userId = req.user._id;
        const userName = req.user.name;

        const sellers = await Seller.find({
            $or: [{ 'reviews.user': userId }, { 'reviews.name': userName }],
        })
            .select('name brand reviews')
            .lean();

        const sellerReviews = [];
        sellers.forEach((s) => {
            s.reviews
                .filter((r) => isUsersReview(r, userId, userName) && !r.deleted)
                .forEach((r) => {
                    sellerReviews.push({
                        reviewId: r._id,
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

        const products = await Product.find({
            $or: [{ 'reviews.user': userId }, { 'reviews.name': userName }],
        })
            .select('name slug image reviews')
            .lean();

        const productReviews = [];
        products.forEach((p) => {
            p.reviews
                .filter((r) => isUsersReview(r, userId, userName) && !r.deleted)
                .forEach((r) => {
                    productReviews.push({
                        reviewId: r._id,
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
    })
);

// Soft delete a specific product review authored by the user
userReviewsRouter.delete(
    '/products/:productId/reviews/:reviewId',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { productId, reviewId } = req.params;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send({ message: 'Product Not Found' });

        const target = product.reviews.id(reviewId);
        if (!target || !isUsersReview(target, req.user._id, req.user.name)) {
            return res.status(404).send({ message: 'Review Not Found' });
        }

        target.deleted = true;
        recalculateProductRating(product);
        await product.save();

        res.send({ message: 'Review removed' });
    })
);

// Backward-compatible fallback delete: remove latest active review by user for this product
userReviewsRouter.delete(
    '/products/:productId',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { productId } = req.params;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send({ message: 'Product Not Found' });

        const target = findLastMatchingReview(
            product.reviews,
            (r) => isUsersReview(r, req.user._id, req.user.name) && !r.deleted
        );
        if (!target) return res.status(404).send({ message: 'Review Not Found' });

        target.deleted = true;
        recalculateProductRating(product);
        await product.save();

        res.send({ message: 'Review removed' });
    })
);

// Restore a specific soft-deleted product review authored by the user
userReviewsRouter.post(
    '/products/:productId/reviews/:reviewId/restore',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { productId, reviewId } = req.params;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send({ message: 'Product Not Found' });

        const target = product.reviews.id(reviewId);
        if (!target || !isUsersReview(target, req.user._id, req.user.name)) {
            return res.status(404).send({ message: 'Review Not Found' });
        }

        target.deleted = false;
        recalculateProductRating(product);
        await product.save();

        res.send({ message: 'Review restored' });
    })
);

// Backward-compatible fallback restore: restore latest deleted review by user for this product
userReviewsRouter.post(
    '/products/:productId/restore',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { productId } = req.params;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send({ message: 'Product Not Found' });

        const target = findLastMatchingReview(
            product.reviews,
            (r) => isUsersReview(r, req.user._id, req.user.name) && r.deleted
        );
        if (!target) return res.status(404).send({ message: 'Review Not Found' });

        target.deleted = false;
        recalculateProductRating(product);
        await product.save();

        res.send({ message: 'Review restored' });
    })
);

// Soft delete a specific seller review authored by the user
userReviewsRouter.delete(
    '/sellers/:sellerId/reviews/:reviewId',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { sellerId, reviewId } = req.params;
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).send({ message: 'Seller Not Found' });

        const target = seller.reviews.id(reviewId);
        if (!target || !isUsersReview(target, req.user._id, req.user.name)) {
            return res.status(404).send({ message: 'Review Not Found' });
        }

        target.deleted = true;
        recalculateSellerRating(seller);
        await seller.save();

        res.send({ message: 'Review removed' });
    })
);

// Backward-compatible fallback delete: remove latest active review by user for this seller
userReviewsRouter.delete(
    '/sellers/:sellerId',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { sellerId } = req.params;
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).send({ message: 'Seller Not Found' });

        const target = findLastMatchingReview(
            seller.reviews,
            (r) => isUsersReview(r, req.user._id, req.user.name) && !r.deleted
        );
        if (!target) return res.status(404).send({ message: 'Review Not Found' });

        target.deleted = true;
        recalculateSellerRating(seller);
        await seller.save();

        res.send({ message: 'Review removed' });
    })
);

// Restore a specific soft-deleted seller review authored by the user
userReviewsRouter.post(
    '/sellers/:sellerId/reviews/:reviewId/restore',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { sellerId, reviewId } = req.params;
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).send({ message: 'Seller Not Found' });

        const target = seller.reviews.id(reviewId);
        if (!target || !isUsersReview(target, req.user._id, req.user.name)) {
            return res.status(404).send({ message: 'Review Not Found' });
        }

        target.deleted = false;
        recalculateSellerRating(seller);
        await seller.save();

        res.send({ message: 'Review restored' });
    })
);

// Backward-compatible fallback restore: restore latest deleted review by user for this seller
userReviewsRouter.post(
    '/sellers/:sellerId/restore',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { sellerId } = req.params;
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).send({ message: 'Seller Not Found' });

        const target = findLastMatchingReview(
            seller.reviews,
            (r) => isUsersReview(r, req.user._id, req.user.name) && r.deleted
        );
        if (!target) return res.status(404).send({ message: 'Review Not Found' });

        target.deleted = false;
        recalculateSellerRating(seller);
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
            $or: [{ 'reviews.user': req.user._id }, { 'reviews.name': userName }],
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
                recalculateProductRating(p);
                await p.save();
            }
        }

        const sellers = await Seller.find({
            $or: [{ 'reviews.user': req.user._id }, { 'reviews.name': userName }],
        });
        for (const s of sellers) {
            let changed = false;
            s.reviews.forEach((r) => {
                if (((r.user?.toString() === userId) || r.name === userName) && !r.deleted) {
                    r.deleted = true;
                    changed = true;
                }
            });
            if (changed) {
                recalculateSellerRating(s);
                await s.save();
            }
        }

        res.send({ message: 'All reviews removed' });
    })
);

export default userReviewsRouter;
