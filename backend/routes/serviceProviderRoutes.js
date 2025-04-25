import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import Project from '../models/projectModel.js';
import Message from '../models/messageModel.js';
import Earnings from '../models/earningModel.js';
import ServiceProvider from '../models/serviceProviderModel.js';
import jwt from 'jsonwebtoken';
import { isAdmin } from '../utils.js';
import mongoose from 'mongoose';


const serviceProviderRouter = express.Router();


const generateToken = (serviceProvider) => {
  return jwt.sign(
    {
      _id: serviceProvider._id,
      name: serviceProvider.name,
      email: serviceProvider.email,
      isServiceProvider: true
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
};

export const isAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err);
        return res.status(401).send({ message: 'Invalid Token' });
      }


      req.serviceProvider = decoded;
      req.user = decoded;

      next();
    });
  } else {
    console.warn('Authorization header is missing or token not found.');
    res.status(401).send({ message: 'Token Not Found' });
  }
};



export const isServiceProvider = (req, res, next) => {
  if (req.serviceProvider) {
    next();
  } else {
    res.status(403).send({ message: 'Service Provider access required' });
  }
};


serviceProviderRouter.get(
  '/all',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const serviceProviders = await ServiceProvider.find({});
      res.send(serviceProviders);
    } catch (error) {
      console.error('Error in serviceProviderRouter.get /:id', err);
      res.status(500).send({ message: err.message });
    }

  })
);

serviceProviderRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const pageSize = 10;
      const page = Number(req.query.page) || 1;
      const countServiceProviders = await ServiceProvider.countDocuments();
      const serviceProviders = await ServiceProvider.find({})
        .skip(pageSize * (page - 1))
        .limit(pageSize);
      const pages = Math.ceil(countServiceProviders / pageSize);
      
      res.send({ serviceProviders, page, pages }); 
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  })
);


serviceProviderRouter.get(
  '/summary',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const { page = 1, pageSize = 10 } = req.query;

      const serviceProviders = await ServiceProvider.aggregate([
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: 'serviceProvider',
            as: 'projects',
          },
        },
        {
          $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'serviceProvider',
            as: 'messages',
          },
        },
        {
          $lookup: {
            from: 'earnings',
            localField: '_id',
            foreignField: 'serviceProvider',
            as: 'earnings',
          },
        },
        {
          $addFields: {
            completedProjects: {
              $size: {
                $filter: {
                  input: '$projects',
                  as: 'project',
                  cond: { $eq: ['$$project.status', 'Completed'] },
                },
              },
            },
            inProgressProjects: {
              $size: {
                $filter: {
                  input: '$projects',
                  as: 'project',
                  cond: { $eq: ['$$project.status', 'In Progress'] },
                },
              },
            },
            totalEarnings: { $sum: '$earnings.amount' },
          },
        },
        { $skip: (page - 1) * parseInt(pageSize) },
        { $limit: parseInt(pageSize) },
      ]);

      const totalServiceProviders = await ServiceProvider.countDocuments();

      res.send({
        serviceProviders,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalServiceProviders / parseInt(pageSize)),
        totalServiceProviders,
      });
    } catch (err) {
      res
        .status(500)
        .send({ message: 'Error fetching service providers', error: err.message });
    }
  })
);




serviceProviderRouter.get(
  '/projects',
  isAuth,
  isServiceProvider,
  expressAsyncHandler(async (req, res) => {
    try {
      const serviceProviderId = req.serviceProvider._id
      const projects = await Project.find({ serviceProvider: serviceProviderId });

      if (projects.length === 0) {
        return res.status(404).send({ message: 'No projects available' });
      }

      res.status(200).send(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).send({ message: 'Error loading projects' });
    }
  })
);


serviceProviderRouter.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projects = await ProjectModel.find({ serviceProviderId: id });
    res.json(projects);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching projects' });
  }
});

serviceProviderRouter.get(
  '/messages/all',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;

    try {
      console.log("Fetching messages - Page:", page, "Page Size:", pageSize);

      const count = await Message.countDocuments();
      console.log("Total Messages Count:", count);

      const messages = await Message.find({})
        .populate('serviceProvider', 'name')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ createdAt: -1 });
      console.log("Fetched Messages:", messages);

      res.json({
        messages,
        currentPage: page,
        totalPages: Math.ceil(count / pageSize),
        totalMessages: count,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Error fetching messages", error: error.message });
    }
  }));


serviceProviderRouter.get(
  '/messages',
  isAuth,
  isServiceProvider,
  expressAsyncHandler(async (req, res) => {
    try {
      const serviceProviderId = req.serviceProvider._id;

      const messages = await Message.find({ serviceProvider: serviceProviderId })
        .populate('serviceProvider', 'name')
        .sort({ date: -1 });

      res.send(messages);
    } catch (err) {
      res
        .status(500)
        .send({ message: 'Error fetching messages', error: err.message });
    }
  })
);

serviceProviderRouter.put(
  '/messages/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const messageId = req.params.id;
    const message = await Message.findById(new mongoose.Types.ObjectId(messageId));

    if (message) {
      Object.assign(message, req.body);
      await message.save();
      res.send({ message: 'Message Updated', message });
    } else {
      res.status(404).send({ message: 'Message Not Found' });
    }
  })
);



serviceProviderRouter.delete(
  '/message/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid message ID" });
    }

    try {
      const deletedMessage = await Message.findByIdAndDelete(id);

      if (deletedMessage) {
        res.send({ message: "Message deleted successfully" });
      } else {
        res.status(404).send({ message: "Message not found" });
      }
    } catch (err) {
      res.status(500).send({ message: "Error deleting message", error: err.message });
    }
  })
);


serviceProviderRouter.get(
  '/earnings',
  isAuth,
  isServiceProvider,
  expressAsyncHandler(async (req, res) => {
    try {
      const serviceProviderId = req.serviceProvider._id;

      const earnings = await Earnings.find({ serviceProvider: serviceProviderId })
        .populate({
          path: 'projectName',
          select: 'name hoursWorked',
        })
        .populate('serviceProvider', 'name');

      if (earnings.length === 0) {
        res.status(404).send({ message: 'No earnings found for this service provider' });
        return;
      }

      const totalEarnings = earnings.reduce(
        (sum, earning) => sum + earning.amount,
        0
      );

      const earningThreshold = 10000;
      if (totalEarnings > earningThreshold) {
        await Notification.create({
          message: `Service Provider ${req.serviceProvider.name} has exceeded the earning threshold of $${earningThreshold}. Total Earnings: $${totalEarnings}`,
          type: 'Earnings Alert',
          priority: 'high',
        });
      }

      res.status(200).send(earnings);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  })
);


serviceProviderRouter.get(
  '/hours',
  isAuth,
  isServiceProvider,
  expressAsyncHandler(async (req, res) => {
    const serviceProviderId = req.serviceProvider._id

    const earnings = await Earnings.find({ serviceProvider: serviceProviderId }).populate('projectName');

    console.log('Earnings:', earnings);

    if (!earnings || earnings.length === 0) {
      return res.send({ totalHours: 0, projects: [] });
    }

    const totalHours = earnings.reduce((sum, earning) => sum + earning.hoursWorked, 0);


    res.send({
      totalHours,
      projects: earnings.map(e => ({
        _id: e._id,
        projectName: e.projectName,
        hoursWorked: e.hoursWorked,
        date: e.date,
        amount: e.amount,
        status: e.status,
      })),
    });
  })
);




serviceProviderRouter.get('/hours/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const totalHours = await HoursModel.aggregate([
      { $match: { serviceProviderId: id } },
      { $group: { _id: null, totalHours: { $sum: "$hours" } } },
    ]);
    res.json(totalHours[0] || { totalHours: 0 });
  } catch (err) {
    res.status(500).send({ message: 'Error fetching hours' });
  }
});


serviceProviderRouter.post(
  '/register',
  expressAsyncHandler(async (req, res) => {
    const { name, email, password, typeOfProvider, phone, company, experience, portfolio } = req.body;
    const existingProvider = await ServiceProvider.findOne({ email });
    if (existingProvider) {
      res.status(400).send({ message: 'Service Provider with this email already exists' });
      return;
    }
    const hashedPassword = bcrypt.hashSync(password, 8);

    const serviceProvider = await new ServiceProvider({
      name,
      email,
      password: hashedPassword,
      typeOfProvider,
      phone,
      company,
      experience,
      portfolio,
    }).save();


    res.send({
      _id: serviceProvider._id,
      name: serviceProvider.name,
      email: serviceProvider.email,
      isAdmin: serviceProvider.isAdmin,
      token: generateToken(serviceProvider),
    });
  })
);


serviceProviderRouter.post(
  '/login',
  expressAsyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const serviceProvider = await ServiceProvider.findOne({ email });

    if (serviceProvider && (await serviceProvider.matchPassword(password))) {
      res.send({
        _id: serviceProvider._id,
        name: serviceProvider.name,
        email: serviceProvider.email,
        isAdmin: serviceProvider.isAdmin,
        token: generateToken(serviceProvider),
      });
    } else {
      res.status(401).send({ message: 'Invalid email or password' });
    }
  })
);


serviceProviderRouter.get(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const serviceProvider = await ServiceProvider.findById(req.params.id);
      if (serviceProvider) {
        res.send(serviceProvider);
      } else {
        res.status(404).send({ message: 'Service provider not found' });
      }
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  })
);


serviceProviderRouter.put(
  '/profile/:id',
  isAuth,
  isServiceProvider,
  expressAsyncHandler(async (req, res) => {
    try {
      const serviceProvider = await ServiceProvider.findById(req.params.id);
      if (!serviceProvider) {
        return res.status(404).send({ message: 'Service Provider not found' });
      }

      serviceProvider.name = req.body.name || serviceProvider.name;
      serviceProvider.email = req.body.email || serviceProvider.email;
      serviceProvider.typeOfProvider = req.body.typeOfProvider || serviceProvider.typeOfProvider;
      serviceProvider.experience = req.body.experience || serviceProvider.experience;

      if (req.body.password) {
        serviceProvider.password = bcrypt.hashSync(req.body.password, 8);
      }

      await serviceProvider.save();
      res.send({
        _id: serviceProvider._id,
        name: serviceProvider.name,
        email: serviceProvider.email,
        typeOfProvider: serviceProvider.typeOfProvider,
        isAdmin: serviceProvider.isAdmin,
        token: generateToken(serviceProvider),
      });
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  })
);

serviceProviderRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const serviceProvider = await ServiceProvider.findById(req.params.id);
      if (serviceProvider) {
        serviceProvider.name = req.body.name || serviceProvider.name;
        serviceProvider.email = req.body.email || serviceProvider.email;
        serviceProvider.isActive = req.body.isActive !== undefined
          ? req.body.isActive
          : serviceProvider.isActive;

        const updatedServiceProvider = await serviceProvider.save();
        res.send({ message: 'Service provider updated successfully', serviceProvider: updatedServiceProvider });
      } else {
        res.status(404).send({ message: 'Service provider not found' });
      }
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  })
);



serviceProviderRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const serviceProvider = await ServiceProvider.findById(req.params.id);
      if (serviceProvider) {
        await serviceProvider.remove();
        res.send({ message: 'Service provider deleted successfully' });
      } else {
        res.status(404).send({ message: 'Service provider not found' });
      }
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  })
);

export default serviceProviderRouter;
