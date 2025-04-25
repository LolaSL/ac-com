import jwt from 'jsonwebtoken';
import ServiceProvider from './models/serviceProviderModel.js';

const protectServiceProvider = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {

      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.serviceProvider = await ServiceProvider.findById(decoded.id).select('-password');

      if (!req.serviceProvider) {
        return res.status(404).json({ message: 'Service provider not found' });
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export default protectServiceProvider;
