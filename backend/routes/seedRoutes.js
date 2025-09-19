import express from 'express';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import Seller from '../models/sellerModel.js';
import Contact from '../models/contactModel.js';
import ServiceProvider from '../models/serviceProviderModel.js';
import Project from '../models/projectModel.js';
import Message from '../models/messageModel.js';
import Earnings from '../models/earningModel.js';
import Blog from '../models/blogModel.js';
import Notification from '../models/notificationModel.js';
import Annotation from '../models/annotationModel.js'; 
import data from '../data.js';

const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  try {
    await Product.deleteMany({});
    await User.deleteMany({});
    await Seller.deleteMany({});
    await Contact.deleteMany({});
    await ServiceProvider.deleteMany({});
    await Project.deleteMany({});
    await Message.deleteMany({});
    await Earnings.deleteMany({});
    await Blog.deleteMany({});
    await Notification.deleteMany({});
    await Annotation.deleteMany({});

    // Seed ServiceProviders
    const createdServiceProviders = await ServiceProvider.insertMany(data.serviceProviders);
    const serviceProviderIds = createdServiceProviders.map(sp => sp._id.toString());

    // Seed Projects
    const projectsWithIds = data.projects.map((project, index) => ({
      ...project,
      serviceProvider: serviceProviderIds[index % serviceProviderIds.length],
    }));
    const createdProjects = await Project.insertMany(projectsWithIds);
    const projectIds = createdProjects.map(p => p._id.toString());

    // Seed Messages
    const messagesWithIds = data.messages.map((message, index) => ({
      ...message,
      serviceProvider: serviceProviderIds[index % serviceProviderIds.length],
    }));
    const createdMessages = await Message.insertMany(messagesWithIds);

    // Seed Earnings
    const earningsWithIds = data.earnings.map((earning, index) => ({
      ...earning,
      serviceProvider: serviceProviderIds[index % serviceProviderIds.length],
      projectName: projectIds[index % projectIds.length],
    }));
    const createdEarnings = await Earnings.insertMany(earningsWithIds);

    // Seed other collections
    const createdProducts = await Product.insertMany(data.products);
    const createdUsers = await User.insertMany(data.users);
    const createdSellers = await Seller.insertMany(data.sellers);
    const createdContacts = await Contact.insertMany(data.contacts);
    const createdBlogs = await Blog.insertMany(data.blogs);
    const createdNotifications = await Notification.insertMany(data.notifications);

    // Seed Annotations with required fields
    const annotationsWithIds = data.annotations.map((annotation) => ({
  ...annotation,
  userId: createdUsers[0]._id,
  pdfData: Buffer.from('%PDF-1.4\n% Dummy PDF content\n'),
  originalImageWidth: 800,
  originalImageHeight: 1000,
  isPaid: Math.random() < 0.5, // 50% chance to be true (paid) or false (free)
}));

const createdAnnotations = await Annotation.insertMany(annotationsWithIds)

    res.send({
      createdProducts,
      createdUsers,
      createdSellers,
      createdContacts,
      createdServiceProviders,
      createdProjects,
      createdMessages,
      createdEarnings,
      createdBlogs,
      createdNotifications,
      createdAnnotations,
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).send({ message: 'Error seeding data', error: error.message });
  }
});

export default seedRouter;
