import mongoose from 'mongoose';

const worldBankCountrySchema = new mongoose.Schema({
  // Core identification
  code: { type: String, required: true, unique: true }, // ISO 3-letter code
  name: { type: String, required: true },
  
  // Geographic information
  region: {
    code: { type: String },
    name: { type: String }
  },
  incomeLevel: {
    code: { type: String },
    name: { type: String }
  },
  
  // Additional metadata
  capitalCity: { type: String },
  longitude: { type: Number },
  latitude: { type: Number },
  
  // Data management
  isActive: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
worldBankCountrySchema.index({ code: 1 });
worldBankCountrySchema.index({ 'region.code': 1 });
worldBankCountrySchema.index({ 'incomeLevel.code': 1 });

const WorldBankCountry = mongoose.model('WorldBankCountry', worldBankCountrySchema);

export default WorldBankCountry;