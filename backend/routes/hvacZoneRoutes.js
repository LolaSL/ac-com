import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import HvacZone from '../models/hvacZoneModel.js';
import { isAuth } from '../utils.js';

const hvacZoneRouter = express.Router();

// Get all zones for authenticated user
hvacZoneRouter.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const zones = await HvacZone.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(zones);
  })
);

// Get single zone by ID
hvacZoneRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const zone = await HvacZone.findById(req.params.id);
    
    if (!zone) {
      res.status(404);
      throw new Error('HVAC zone not found');
    }
    
    // Verify ownership
    if (zone.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access this zone');
    }
    
    res.json(zone);
  })
);

// Create new zone
hvacZoneRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { projectName, x, y, width, height, equipment, floorPlanImage, notes } = req.body;
    
    const zone = new HvacZone({
      userId: req.user._id,
      projectName,
      x,
      y,
      width,
      height,
      equipment: equipment || [],
      floorPlanImage,
      notes,
    });
    
    const createdZone = await zone.save();
    res.status(201).json(createdZone);
  })
);

// Update zone
hvacZoneRouter.put(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const zone = await HvacZone.findById(req.params.id);
    
    if (!zone) {
      res.status(404);
      throw new Error('HVAC zone not found');
    }
    
    // Verify ownership
    if (zone.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this zone');
    }
    
    zone.projectName = req.body.projectName || zone.projectName;
    zone.x = req.body.x !== undefined ? req.body.x : zone.x;
    zone.y = req.body.y !== undefined ? req.body.y : zone.y;
    zone.width = req.body.width !== undefined ? req.body.width : zone.width;
    zone.height = req.body.height !== undefined ? req.body.height : zone.height;
    zone.equipment = req.body.equipment || zone.equipment;
    zone.floorPlanImage = req.body.floorPlanImage || zone.floorPlanImage;
    zone.notes = req.body.notes || zone.notes;
    
    const updatedZone = await zone.save();
    res.json(updatedZone);
  })
);

// Delete zone
hvacZoneRouter.delete(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const zone = await HvacZone.findById(req.params.id);
    
    if (!zone) {
      res.status(404);
      throw new Error('HVAC zone not found');
    }
    
    // Verify ownership
    if (zone.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this zone');
    }
    
    await zone.deleteOne();
    res.json({ message: 'Zone deleted successfully' });
  })
);

// Add equipment to zone
hvacZoneRouter.post(
  '/:id/equipment',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    console.log('Adding equipment to zone:', req.params.id);
    console.log('Equipment data:', req.body);
    
    const zone = await HvacZone.findById(req.params.id);
    
    if (!zone) {
      res.status(404);
      throw new Error('HVAC zone not found');
    }
    
    // Verify ownership
    if (zone.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to modify this zone');
    }
    
    try {
      zone.equipment.push(req.body);
      const updatedZone = await zone.save();
      console.log('Equipment added successfully');
      res.json(updatedZone);
    } catch (error) {
      console.error('Error saving equipment:', error.message);
      res.status(400);
      throw new Error(`Failed to add equipment: ${error.message}`);
    }
  })
);

// Update equipment in zone
hvacZoneRouter.put(
  '/:id/equipment/:equipmentId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const zone = await HvacZone.findById(req.params.id);
    
    if (!zone) {
      res.status(404);
      throw new Error('HVAC zone not found');
    }
    
    // Verify ownership
    if (zone.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to modify this zone');
    }
    
    const equipment = zone.equipment.id(req.params.equipmentId);
    if (!equipment) {
      res.status(404);
      throw new Error('Equipment not found');
    }
    
    Object.assign(equipment, req.body);
    const updatedZone = await zone.save();
    res.json(updatedZone);
  })
);

// Delete equipment from zone
hvacZoneRouter.delete(
  '/:id/equipment/:equipmentId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const zone = await HvacZone.findById(req.params.id);
    
    if (!zone) {
      res.status(404);
      throw new Error('HVAC zone not found');
    }
    
    // Verify ownership
    if (zone.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to modify this zone');
    }
    
    zone.equipment = zone.equipment.filter(
      (eq) => eq._id.toString() !== req.params.equipmentId
    );
    const updatedZone = await zone.save();
    res.json(updatedZone);
  })
);

export default hvacZoneRouter;
