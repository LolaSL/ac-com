import express from 'express';
import Product from '../models/productModel.js';
import data from '../data.js';

const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  try {
    await Product.deleteMany({});

    // Seed products only
    const createdProducts = [];
    for (const product of data.products) {
      try {
        const createdProduct = await Product.create(product);
        createdProducts.push(createdProduct);
      } catch (error) {
        console.log(`Skipping product ${product.name}: ${error.message}`);
      }
    }

    res.send({
      message: 'Products seeded successfully',
      productsCount: createdProducts.length
    });
  } catch (error) {
    res.status(500).send({ message: 'Error seeding data', error: error.message });
  }
});

export default seedRouter;