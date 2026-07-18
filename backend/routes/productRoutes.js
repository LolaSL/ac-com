import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/productModel.js';
import { isAuth, isAdmin } from '../utils.js';
import mongoose from 'mongoose';

const productRouter = express.Router();

// Cache for frequently accessed data
const cache = {
  categories: { data: null, timestamp: null },
  brands: { data: null, timestamp: null },
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper to check cache validity
const isCacheValid = (cacheEntry) => {
  return cacheEntry.data && cacheEntry.timestamp &&
    (Date.now() - cacheEntry.timestamp < CACHE_DURATION);
};

// Helper to invalidate cache
const invalidateCache = () => {
  cache.categories = { data: null, timestamp: null };
  cache.brands = { data: null, timestamp: null };
};

productRouter.get('/', async (req, res) => {
  try {
    const products = await Product.find().select('-reviews').lean();
    res.send(products);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching products', error: error.message });
  }
});

productRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newProduct = new Product({
      name: 'sample name ' + Date.now(),
      model: 'sample model ' + Date.now(),
      slug: 'sample-name-' + Date.now(),
      image: '/images/p1.jpg',
      price: 0,
      category: 'sample category',
      brand: 'sample brand',
      countInStock: 0,
      rating: 0,
      numReviews: 0,
      description: 'sample description',
      features: [
        'Heating',
        'Cooling',
        'Wi-Fi embedded',
        'Energy Saving',
        'Remote Control',
        'Led',
        'Smart Things',
        "Anti-Bacteria Filter",
        "Dust Filter",
        "Motion Sensor",
        "Fast Cooling",
        "Dual Sensing",
        "Smart Operation",
        "Anti Corrosion Gold Fin™",
        "Auto Restart"
      ],
      mode: [
        "Cooling Mode",
        " Drying Mode ",
        "Fan Mode",
        "Silent Mode ",
        "Self-cleaning",
        "Low Noise",
        "Night Mode"
      ],
      btu: 0,
      areaCoverage: 0,
      energyEfficiency: 0,
      documents: [],
      discount: 0,
      dimension: {
        width: 0,
        height: 0,
        depth: 0,
      },
    });
    const product = await newProduct.save();

    // Invalidate cache after creating product
    invalidateCache();

    res.send({ message: 'Product Created', product });
  })
);

productRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const productId = req.params.id;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send({ message: 'Invalid product ID' });
    }

    // Validate required fields
    const { name, model, slug, price, countInStock, btu } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).send({ message: 'Product name is required' });
    }

    if (!model || model.trim().length === 0) {
      return res.status(400).send({ message: 'Product model is required' });
    }

    if (!slug || slug.trim().length === 0) {
      return res.status(400).send({ message: 'Product slug is required' });
    }

    if (price === undefined || price < 0) {
      return res.status(400).send({ message: 'Valid price is required' });
    }

    if (countInStock === undefined || countInStock < 0) {
      return res.status(400).send({ message: 'Valid stock count is required' });
    }

    const features = Array.isArray(req.body.features)
      ? req.body.features
      : req.body.features.split(',').map((feature) => feature.trim());
    const mode = Array.isArray(req.body.mode)
      ? req.body.mode
      : req.body.mode.split(',').map((mode) => mode.trim());
    const documents = Array.isArray(req.body.documents)
      ? req.body.documents
      : JSON.parse(req.body.documents || '[]');

    const product = await Product.findById(productId);
    if (product) {
      product.name = req.body.name.trim();
      product.model = req.body.model.trim();
      product.slug = req.body.slug.trim();
      product.price = Number(req.body.price);
      product.image = req.body.image;
      product.images = req.body.images;
      product.category = req.body.category;
      product.brand = req.body.brand;
      product.countInStock = Number(req.body.countInStock);
      product.description = req.body.description;
      product.features = features;
      product.mode = mode;
      product.btu = Number(req.body.btu) || 0;
      product.areaCoverage = Number(req.body.areaCoverage) || 0;
      product.energyEfficiency = Number(req.body.energyEfficiency) || 0;
      product.documents = documents;
      product.discount = req.body.discount !== undefined
        ? Math.min(Math.max(Number(req.body.discount), 0), 100)
        : 0;
      product.dimension = req.body.dimension || {
        width: 0,
        height: 0,
        depth: 0,
      };
      await product.save();

      // Invalidate cache after updating product
      invalidateCache();

      res.send({ message: 'Product Updated', product });
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
  })
);


productRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();

      // Invalidate cache after deleting product
      invalidateCache();

      res.send({ message: 'Product Deleted' });
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
  })
);


productRouter.post(
  '/:id/reviews',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const productId = req.params.id;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send({ message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send({ message: 'Product Not Found' });
    }

    // Validate review data
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).send({ message: 'Rating must be between 1 and 5' });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).send({ message: 'Comment must be at least 10 characters' });
    }

    if (comment.trim().length > 500) {
      return res.status(400).send({ message: 'Comment must be less than 500 characters' });
    }

    // Check for duplicate review
    if (product.reviews.find((x) => ((x.user?.toString() === req.user._id.toString()) || x.name === req.user.name) && !x.deleted)) {
      return res
        .status(400)
        .send({ message: 'You already submitted a review' });
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment: comment.trim(),
      user: req.user._id,
    };

    product.reviews.push(review);
    const activeReviews = product.reviews.filter((r) => !r.deleted);
    product.numReviews = activeReviews.length;
    product.rating =
      activeReviews.reduce((a, c) => c.rating + a, 0) /
      (activeReviews.length || 1);

    const updatedProduct = await product.save();

    res.status(201).send({
      message: 'Review Created',
      review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
      numReviews: product.numReviews,
      rating: product.rating,
    });
  })
);

productRouter.put(
  '/:id/reviews/:reviewId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { id, reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'Invalid product ID' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).send({ message: 'Product Not Found' });
    }

    const review = product.reviews.id(reviewId);
    if (!review || review.deleted) {
      return res.status(404).send({ message: 'Review Not Found' });
    }

    if (review.user?.toString() !== req.user._id.toString()) {
      return res.status(403).send({ message: 'You can only edit your own review' });
    }

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).send({ message: 'Rating must be between 1 and 5' });
    }
    if (!comment || comment.trim().length < 10) {
      return res.status(400).send({ message: 'Comment must be at least 10 characters' });
    }
    if (comment.trim().length > 500) {
      return res.status(400).send({ message: 'Comment must be less than 500 characters' });
    }

    review.rating = Number(rating);
    review.comment = comment.trim();

    const activeReviews = product.reviews.filter((r) => !r.deleted);
    product.numReviews = activeReviews.length;
    product.rating =
      activeReviews.reduce((a, c) => c.rating + a, 0) /
      (activeReviews.length || 1);

    const updatedProduct = await product.save();

    res.send({
      message: 'Review Updated',
      review: updatedProduct.reviews.id(reviewId),
      numReviews: updatedProduct.numReviews,
      rating: updatedProduct.rating,
    });
  })
);

const PAGE_SIZE = 12;

productRouter.get(
  '/admin',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const page = query.page || 1;
    const pageSize = query.pageSize || PAGE_SIZE;

    const products = await Product.find()
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    const countProducts = await Product.countDocuments();
    res.send({
      products,
      countProducts,
      page,
      pages: Math.ceil(countProducts / pageSize),
    });
  })
);

productRouter.get(
  '/search',
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const pageSize = query.pageSize || PAGE_SIZE;
    const page = query.page || 1;
    const category = query.category || '';
    const price = query.price || '';
    const discount = query.discount || '';
    const btu = query.btu || '';
    const rating = query.rating || '';
    const order = query.order || '';
    const brand = query.brand || '';
    const searchQuery = (query.query || '').trim();

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isNumericQuery = searchQuery && /^\d+(?:\.\d+)?$/.test(searchQuery);
    const regexForQuery =
      searchQuery && searchQuery !== 'all'
        ? new RegExp(
          isNumericQuery
            ? `\\b${escapeRegex(searchQuery)}\\b`
            : escapeRegex(searchQuery),
          'i'
        )
        : null;

    const queryFilter =
      searchQuery && searchQuery !== 'all'
        ? {
          $or: [
            regexForQuery
              ? {
                name: {
                  $regex: regexForQuery,
                },
              }
              : null,
            regexForQuery
              ? {
                brand: {
                  $regex: regexForQuery,
                },
              }
              : null,
            regexForQuery
              ? {
                model: {
                  $regex: regexForQuery,
                },
              }
              : null,
            isNumericQuery
              ? {
                btu: Number(searchQuery),
              }
              : null,
          ].filter(Boolean),
        }
        : {};

    const btuFilter = btu && btu !== 'all' ? { btu: { $gte: Number(btu) } } : {};
    const categoryFilter = category && category !== 'all' ? { category } : {};
    const brandFilter =
      brand && brand !== 'all'
        ? {
          brand: {
            $regex: new RegExp(`^${brand.trim()}$`, 'i'),
          },
        }
        : {};
    const ratingFilter =
      rating && rating !== 'all'
        ? {
          rating: {
            $gte: Number(rating),
          },
        }
        : {};
    const priceFilter =
      price && price !== 'all'
        ? {
          price: {
            $gte: Number(price.split('-')[0]),
            $lte: Number(price.split('-')[1]),
          },
        }
        : {};
    const discountFilter =
      discount && discount !== 'any'
        ? discount === '0'
          ? { discount: { $eq: 0 } }
          : discount.includes('-')
            ? {
              discount: {
                $gte: Number(discount.split('-')[0]),
                $lte: Number(discount.split('-')[1]),
              },
            }
            : { discount: { $gte: Number(discount) } }
        : {};

    const sortOrder =
      order === 'brand'
        ? { brand: 1 }
        : order === 'lowest'
          ? { price: 1 }
          : order === 'highest'
            ? { price: -1 }
            : order === 'toprated'
              ? { rating: -1, numReviews: -1 }
              : order === 'newest'
                ? { createdAt: -1 }
                : { _id: -1 };

    const products = await Product.find({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
      ...btuFilter,
      ...brandFilter,
      ...discountFilter,
    })
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const countProducts = await Product.countDocuments({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
      ...btuFilter,
      ...brandFilter,
      ...discountFilter,
    });


    res.send({
      products,
      countProducts,
      page,
      pages: Math.ceil(countProducts / pageSize),
    });
  })
);


productRouter.get(
  '/categories',
  expressAsyncHandler(async (req, res) => {
    // Check cache first
    if (isCacheValid(cache.categories)) {
      return res.send(cache.categories.data);
    }

    const categories = await Product.find().distinct('category');

    // Update cache
    cache.categories = {
      data: categories,
      timestamp: Date.now(),
    };

    res.send(categories);
  })
);

productRouter.get('/brands', async (req, res) => {
  try {
    // Check cache first
    if (isCacheValid(cache.brands)) {
      return res.json(cache.brands.data);
    }

    const brands = await Product.distinct('brand');

    // Update cache
    cache.brands = {
      data: brands,
      timestamp: Date.now(),
    };

    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching brands', error: err.message });
  }
});

productRouter.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();
    if (product) {
      const activeReviews = (product.reviews || []).filter((r) => !r.deleted);
      product.reviews = activeReviews;
      product.numReviews = activeReviews.length;
      product.rating = activeReviews.length
        ? activeReviews.reduce((a, c) => c.rating + a, 0) / activeReviews.length
        : 0;
      res.send(product);
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error fetching product', error: error.message });
  }
});

productRouter.post("/:id/view", expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }
  const product = await Product.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true, select: 'views' }
  );
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json({ views: product.views });
}));

productRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    const product = await Product.findById(id).lean();

    if (product) {
      const activeReviews = (product.reviews || []).filter((r) => !r.deleted);
      product.reviews = activeReviews;
      product.numReviews = activeReviews.length;
      product.rating = activeReviews.length
        ? activeReviews.reduce((a, c) => c.rating + a, 0) / activeReviews.length
        : 0;
      res.json(product);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Server error, please try again later" });
  }
});


productRouter.get('/condensers/:btu', async (req, res) => {
  try {
    const requiredBTU = parseInt(req.params.btu);

    const condensers = await Product.find({
      $or: [
        { category: "Outdoor Condenser" },
        { category: "VRF Heat Recovery" },
        { category: { $regex: /VRF/i } },
        { category: { $regex: /outdoor/i } },
        { name: { $regex: /outdoor/i } },
      ]
    }).sort({ btu: 1 });

    console.log(`Found ${condensers.length} condensers for required BTU ${requiredBTU}:`, condensers.map(c => ({ name: c.name, btu: c.btu })));

    if (condensers.length === 0) {
      return res.status(404).json({ message: "No condensers found in database." });
    }

    // Return all condensers - let frontend decide which one to use
    res.json(condensers);
  } catch (error) {
    console.error("Error fetching condensers:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


productRouter.get('/btu/:btu', async (req, res) => {
  const targetBTU = parseInt(req.params.btu, 10);
  // Mode:
  //   'heating' -> filter by heatingBtu (excludes cooling-only SKUs)
  //   'both'    -> require both coolingBtu >= target AND heatingBtu >= target
  //                (heat pumps that meet both loads simultaneously)
  //   default   -> 'cooling': filter by coolingBtu, fall back to legacy `btu`
  const rawMode = (req.query.mode || 'cooling').toLowerCase();
  const mode =
    rawMode === 'heating' ? 'heating' :
    rawMode === 'both'    ? 'both'    :
    'cooling';

  if (isNaN(targetBTU)) {
    return res.status(400).send({ message: 'Invalid BTU value provided.' });
  }

  try {
    // Define the categories that are explicitly indoor AC units.
    const INDOOR_AC_CATEGORIES = [
      "Wall-Mounted AC",
      "Mini Split AC",
      "Wind-Free TM Cooling",
      "Cassette Indoor Unit",
      "Indoor Unit",
      "Split System Indoor",
      // Add any other categories that are NOT condensers here!
    ];

    // Capacity filter is mode-aware.
    // - heating: require heatingBtu >= target (excludes cooling-only SKUs).
    // - both:    require BOTH coolingBtu >= target AND heatingBtu >= target.
    // - cooling: prefer coolingBtu; fall back to the legacy `btu` field for SKUs not yet backfilled.
    const capacityFilter =
      mode === 'heating'
        ? { heatingBtu: { $gte: targetBTU } }
        : mode === 'both'
        ? {
            coolingBtu: { $gte: targetBTU },
            heatingBtu: { $gte: targetBTU },
          }
        : {
            $or: [
              { coolingBtu: { $gte: targetBTU } },
              { coolingBtu: { $exists: false }, btu: { $gte: targetBTU } },
            ],
          };

    const stockFilter = {
      $and: [
        { $or: [{ count: { $exists: false } }, { count: { $gt: 0 } }] },
        { $or: [{ quantity: { $exists: false } }, { quantity: { $gt: 0 } }] },
      ],
    };

    const query = {
      ...capacityFilter,
      // 🛑 CRITICAL FIX: Explicitly include only INDOOR AC units.
      // This is safer than excluding condensers, which fail due to naming variations.
      category: { $in: INDOOR_AC_CATEGORIES },
      ...stockFilter,
    };

    // Mode-aware sort key: pick the smallest unit that still meets the target in the requested mode.
    // For 'both', sort by coolingBtu (then heatingBtu) since the AND filter guarantees both are >= target.
    const sortKey =
      mode === 'heating' ? { heatingBtu: 1 } :
      mode === 'both'    ? { coolingBtu: 1, heatingBtu: 1 } :
      { coolingBtu: 1, btu: 1 };

    // Use find() to get ALL potential candidates and sort them by BTU.
    const candidates = await Product.find(query).sort(sortKey);

    if (candidates.length === 0) {
      // Fallback: no product meeting target, find the highest-capacity indoor AC available in the requested mode.
      console.log(`⚠️ No product with ${mode} BTU >=`, targetBTU, '— falling back to highest available');

      const fallbackQuery = {
        category: { $in: INDOOR_AC_CATEGORIES },
        ...stockFilter,
        price: { $gt: 0 },
      };
      // In heating mode, only consider products that have a heatingBtu (i.e., heat-pump-capable).
      if (mode === 'heating') {
        fallbackQuery.heatingBtu = { $exists: true, $gt: 0 };
      }
      // In 'both' mode, require heat-pump-capable SKUs with both capacities populated.
      if (mode === 'both') {
        fallbackQuery.heatingBtu = { $exists: true, $gt: 0 };
        fallbackQuery.coolingBtu = { $exists: true, $gt: 0 };
      }

      const fallbackSort =
        mode === 'heating' ? { heatingBtu: -1 } :
        mode === 'both'    ? { coolingBtu: -1, heatingBtu: -1 } :
        { coolingBtu: -1, btu: -1 };
      const fallback = await Product.findOne(fallbackQuery).sort(fallbackSort);

      if (fallback) {
        const fname = fallback.displayName || fallback.name || `Product ID: ${fallback._id}`;
        const cap =
          mode === 'heating' ? fallback.heatingBtu :
          mode === 'both'    ? `cool ${fallback.coolingBtu} / heat ${fallback.heatingBtu}` :
          (fallback.coolingBtu || fallback.btu);
        console.log(`✅ FALLBACK PRODUCT (highest ${mode} BTU indoor AC):`, fname, cap);
        return res.json(fallback);
      }

      console.log('❌ PRODUCT NOT FOUND for BTU:', targetBTU, 'mode:', mode);
      return res.status(404).send({ message: `No suitable ${mode}-capable product found with available stock.` });
    }

    // Final Filter: Pick the first valid product (must have price/name)
    const validProduct = candidates.find(p =>
      p.price > 0 &&
      (p.displayName || p.name)
    );

    if (validProduct) {
      const productName = validProduct.displayName || validProduct.name || `Product ID: ${validProduct._id}`;
      const cap =
        mode === 'heating' ? validProduct.heatingBtu :
        mode === 'both'    ? `cool ${validProduct.coolingBtu} / heat ${validProduct.heatingBtu}` :
        (validProduct.coolingBtu || validProduct.btu);
      console.log(`✅ FOUND PRODUCT (Indoor AC, ${mode}):`, productName, cap);

      // Return clean JSON to the client
      return res.json(validProduct);

    } else {
      console.log('❌ PRODUCT FOUND IN DB BUT INVALID DATA (Price/Name issue):', targetBTU);
      return res.status(404).send({ message: 'All found products are invalid or incomplete.' });
    }
  } catch (error) {
    console.error('Server error during product search:', error);
    res.status(500).send({ message: "Server error", error: error.message });
  }
});



export default productRouter;