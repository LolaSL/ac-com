import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/productModel.js';
import { isAuth, isAdmin } from '../utils.js';
import mongoose from 'mongoose';

const productRouter = express.Router();

productRouter.get('/', async (req, res) => {
  const products = await Product.find();
  res.send(products);
});

productRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newProduct = new Product({
      name: 'sample name ' + Date.now(),
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
      mode:[
        "Cooling Mode",
       " Drying Mode ",       
        "Fan Mode",
        "Silent Mode "
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
    res.send({ message: 'Product Created', product });
  })
);

productRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const productId = req.params.id;
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
      product.name = req.body.name;
      product.slug = req.body.slug;
      product.price = req.body.price;
      product.image = req.body.image;
      product.images = req.body.images;
      product.category = req.body.category;
      product.brand = req.body.brand;
      product.countInStock = req.body.countInStock;
      product.description = req.body.description;
      product.features = features;
      product.mode = mode;
      product.btu = req.body.btu;
      product.areaCoverage = req.body.areaCoverage;
      product.energyEfficiency = req.body.energyEfficiency;
      product.documents = documents;
      product.dimension = req.body.dimension || {
        width: 0,
        height: 0,
        depth: 0,
      };
      await product.save();
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
    const product = await Product.findById(productId);
    if (product) {
      if (product.reviews.find((x) => x.name === req.user.name)) {
        return res
          .status(400)
          .send({ message: 'You already submitted a review' });
      }

      const review = {
        name: req.user.name,
        rating: Number(req.body.rating),
        comment: req.body.comment,
      };
      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((a, c) => c.rating + a, 0) /
        product.reviews.length;
      const updatedProduct = await product.save();
      res.status(201).send({
        message: 'Review Created',
        review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
        numReviews: product.numReviews,
        rating: product.rating,
      });
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
  })
);

const PAGE_SIZE = 10;

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
    const searchQuery = query.query || '';

    const queryFilter =
      searchQuery && searchQuery !== 'all'
        ? {
          name: {
            $regex: searchQuery,
            $options: 'i',
          },
        }
        : {};

    const btuFilter = btu && btu !== 'all' ? { btu: { $gte: Number(btu) } } : {};
    const categoryFilter = category && category !== 'all' ? { category } : {};
    const brandFilter = brand && brand !== 'all' ? { brand } : {};
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
              ? { rating: -1 }
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
    const categories = await Product.find().distinct('category');
    res.send(categories);
  })
);

productRouter.get('/brands', async (req, res) => {
  try {

    const brands = await Product.distinct('brand');
    res.json(brands);
  } catch (err) {

    res.status(500).json({ message: 'Error fetching brands', error: err.message });
  }
});

productRouter.get('/slug/:slug', async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (product) {
    res.send(product);
  } else {
    res.status(404).send({ message: 'Product Not Found' });
  }
});

productRouter.get("/:id", async (req, res) => {
  const { id } = req.params; 

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    const product = await Product.findById(id);

    if (product) {
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
    
    const condensers = await Product.find({ category: "Outdoor condenser" }).sort({ btu: 1 });

    let selected = [];
    let totalBTU = 0;

    for (let condenser of condensers) {
      while (totalBTU + condenser.btu <= requiredBTU) {
        selected.push(condenser);
        totalBTU += condenser.btu;
      }
      if (totalBTU >= requiredBTU) break;
    }

    if (selected.length === 0) {
      return res.status(404).json({ message: "No suitable condenser found." });
    }

    res.json(selected);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


productRouter.get('/btu/:btu', async (req, res) => {
  try {
    const targetBTU = parseInt(req.params.btu);


    const product = await Product.findOne({
      btu: {
        $gte: targetBTU,
      }
    }).sort({ btu: 1 });


    if (!product) {
      const closestProduct = await Product.findOne({
        btu: { $lte: targetBTU }
      }).sort({ btu: -1 });

      if (closestProduct) {
        res.send(closestProduct);
      } else {
        res.status(404).send({ message: 'Product not found' });
      }
    } else {
      res.send(product);
    }
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});



export default productRouter;