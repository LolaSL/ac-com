import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  mobilePhone: { type: String, required: true },
  country: { type: String, required: true },
  serviceType: { type: String, required: true },
  equipmentAge: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
}, {
  timestamps: true,
});

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;