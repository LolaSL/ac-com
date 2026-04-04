import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      // Ductwork types
      'supply-duct', 'return-duct', 'flex-duct', 'exhaust-duct', 'insulated-duct',
      // Diffusers & Grilles
      'supply-4way', 'round-diffuser', 'linear-slot', 'return-grille', 'exhaust-grille',
      'jet-diffuser', 'wall-diffuser', 'transfer-grille',
      // Accessories
      'drain-point', 'smd',
      // Dampers
      'fire-damper', 'volume-damper', 'balancing-damper', 'motorized-damper',
      // Controls
      'thermostat', 'sensor',
      // Indoor Units
      'fcu', 'ahu', 'vav', 'vrv', 'rtu', 'split-system', 'chiller', 'boiler',
      'heat-pump', 'condensing-unit', 'exhaust-fan', 'make-up-air',
      // Legacy uppercase support
      'FCU', 'AHU', 'VAV', 'SMD', 'VRV', 'DUCT',
      'supply-diffuser', 'linear-diffuser',
      // Additional types
      'SUPPLY_DUCT', 'RETURN_DUCT', 'FLEX_DUCT', 'EXHAUST_DUCT', 'INSULATED_DUCT',
      'SUPPLY_4WAY', 'ROUND_DIFFUSER', 'LINEAR_SLOT', 'RETURN_GRILLE', 'EXHAUST_GRILLE',
      'JET_DIFFUSER', 'WALL_DIFFUSER', 'TRANSFER_GRILLE', 'DRAIN_POINT',
      'FIRE_DAMPER', 'VOLUME_DAMPER'
    ],
    required: true,
  },
  label: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, default: 50 },
  height: { type: Number, default: 35 },
  btu: { type: Number },
  cfm: { type: Number },
  voltage: { type: Number, default: 220 },
  frequency: { type: Number, default: 50 },
  phase: { type: String, enum: ['1', '3'], default: '1' },
  tolerance: { type: Number, default: 10 },
  amperage: { type: Number },
  // Rendering properties for canvas
  fill: { type: String },
  stroke: { type: String },
  color: { type: String },
  size: { type: Number },
  shape: { type: String },
  airflow: { type: Number }, // CFM value for diffusers
  ductType: { type: String }, // For duct categorization
  diffuserType: { type: String }, // For diffuser categorization
  damperType: { type: String }, // For damper categorization
}, { _id: true });

const hvacZoneSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    projectName: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    equipment: [equipmentSchema],
    floorPlanImage: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

const HvacZone = mongoose.model('HvacZone', hvacZoneSchema);

export default HvacZone;
