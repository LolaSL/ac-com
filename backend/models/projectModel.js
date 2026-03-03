import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  client: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, default: 'In Progress' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  budget: { type: Number, default: 0 },
  description: { type: String, default: '' },
  completedAt: { type: Date },
  serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  hoursWorked: { type: Number, default: 0 },
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);
export default Project;
