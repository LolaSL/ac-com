import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Wishlist from '../models/wishlistModel.js';
import WishlistCollection from '../models/wishlistCollectionModel.js';
import Product from '../models/productModel.js';
import { isAuth } from '../utils.js';

const wishlistRouter = express.Router();

/* ────────────────────────────────────────────────────────────
   COLLECTIONS  /api/wishlist/collections
   ──────────────────────────────────────────────────────────── */

// Helper: ensure a default collection exists for user
async function ensureDefaultCollection(userId) {
  let col = await WishlistCollection.findOne({ user: userId, isDefault: true });
  if (!col) {
    col = await WishlistCollection.create({
      user: userId,
      name: 'My Wishlist',
      isDefault: true,
    });
  }
  return col;
}

// GET all collections (with item counts)
wishlistRouter.get(
  '/collections',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const defaultCol = await ensureDefaultCollection(req.user._id);

    const collections = await WishlistCollection.find({ user: req.user._id }).sort({
      isDefault: -1,
      createdAt: 1,
    });

    // count items per collection
    const counts = await Wishlist.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$collection', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => (countMap[c._id ? c._id.toString() : 'null'] = c.count));

    // items with null collection belong to default
    const result = collections.map((col) => ({
      _id: col._id,
      name: col.name,
      isDefault: col.isDefault,
      itemCount:
        (countMap[col._id.toString()] || 0) +
        (col.isDefault ? countMap['null'] || 0 : 0),
      createdAt: col.createdAt,
    }));

    res.send(result);
  })
);

// POST create collection
wishlistRouter.post(
  '/collections',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).send({ message: 'Collection name is required' });
    }

    const existing = await WishlistCollection.findOne({
      user: req.user._id,
      name: name.trim(),
    });
    if (existing) {
      return res.status(400).send({ message: 'Collection name already exists' });
    }

    const col = await WishlistCollection.create({
      user: req.user._id,
      name: name.trim(),
    });
    res.status(201).send({ _id: col._id, name: col.name, isDefault: false, itemCount: 0, createdAt: col.createdAt });
  })
);

// PUT rename collection
wishlistRouter.put(
  '/collections/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const col = await WishlistCollection.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!col) return res.status(404).send({ message: 'Collection not found' });
    if (col.isDefault) return res.status(400).send({ message: 'Cannot rename default collection' });

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).send({ message: 'Collection name is required' });
    }

    const dup = await WishlistCollection.findOne({
      user: req.user._id,
      name: name.trim(),
      _id: { $ne: col._id },
    });
    if (dup) return res.status(400).send({ message: 'Collection name already exists' });

    col.name = name.trim();
    await col.save();
    res.send({ _id: col._id, name: col.name, isDefault: col.isDefault });
  })
);

// DELETE collection (moves its items to default)
wishlistRouter.delete(
  '/collections/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const col = await WishlistCollection.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!col) return res.status(404).send({ message: 'Collection not found' });
    if (col.isDefault) return res.status(400).send({ message: 'Cannot delete default collection' });

    const defaultCol = await ensureDefaultCollection(req.user._id);

    // Move items to default collection
    await Wishlist.updateMany(
      { user: req.user._id, collection: col._id },
      { $set: { collection: defaultCol._id } }
    );

    await WishlistCollection.deleteOne({ _id: col._id });
    res.send({ message: 'Collection deleted, items moved to default' });
  })
);

// PUT move item to another collection
wishlistRouter.put(
  '/move',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { productId, collectionId } = req.body;
    if (!productId || !collectionId) {
      return res.status(400).send({ message: 'productId and collectionId required' });
    }

    const col = await WishlistCollection.findOne({
      _id: collectionId,
      user: req.user._id,
    });
    if (!col) return res.status(404).send({ message: 'Collection not found' });

    const item = await Wishlist.findOne({ user: req.user._id, product: productId });
    if (!item) return res.status(404).send({ message: 'Wishlist item not found' });

    item.collection = col._id;
    await item.save();
    res.send({ message: 'Item moved', collectionId: col._id, collectionName: col.name });
  })
);

/* ────────────────────────────────────────────────────────────
   WISHLIST ITEMS  /api/wishlist
   ──────────────────────────────────────────────────────────── */

wishlistRouter.get(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { collectionId } = req.query;
        const defaultCol = await ensureDefaultCollection(req.user._id);

        let filter = { user: req.user._id };
        if (collectionId) {
            filter.collection = collectionId;
            // If querying default collection, also include legacy null items
            if (collectionId === defaultCol._id.toString()) {
                filter = {
                    user: req.user._id,
                    $or: [{ collection: defaultCol._id }, { collection: null }],
                };
            }
        }

        const wishlistItems = await Wishlist.find(filter)
            .populate('product')
            .sort({ createdAt: -1 });

        res.send(wishlistItems);
    })
);


wishlistRouter.post(
    '/',
    isAuth,
    expressAsyncHandler(async (req, res) => {
        const { productId, collectionId } = req.body;

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

        // Determine which collection
        let targetCollection = null;
        if (collectionId) {
            const col = await WishlistCollection.findOne({
                _id: collectionId,
                user: req.user._id,
            });
            if (col) targetCollection = col._id;
        }
        if (!targetCollection) {
            const defaultCol = await ensureDefaultCollection(req.user._id);
            targetCollection = defaultCol._id;
        }

        const wishlistItem = new Wishlist({
            user: req.user._id,
            product: productId,
            collection: targetCollection,
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
