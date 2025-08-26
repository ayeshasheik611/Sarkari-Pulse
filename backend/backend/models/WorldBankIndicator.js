import mongoose from 'mongoose';

const worldBankIndicatorSchema = new mongoose.Schema({
  // Core identification
  country: {
    code: { type: String, required: true }, // e.g., 'IN', 'US', 'CN'
    name: { type: String, required: true }  // e.g., 'India', 'United States'
  },
  
  indicator: {
    code: { type: String, required: true }, // e.g., 'NY.GDP.MKTP.CD'
    name: { type: String, required: true }, // e.g., 'GDP (current US$)'
    category: { 
      type: String, 
      required: true,
      enum: ['economy', 'business', 'social', 'environment', 'health', 'education', 'infrastructure']
    },
    subcategory: { type: String } // e.g., 'gdp', 'inflation', 'life-expectancy'
  },
  
  // Data points
  year: { type: Number, required: true },
  value: { type: Number }, // Can be null for missing data
  
  // Metadata
  unit: { type: String }, // e.g., 'current US$', '%', 'years'
  scale: { type: String }, // e.g., 'millions', 'billions'
  
  // Data management
  lastUpdated: { type: Date, default: Date.now },
  dataSource: { type: String, default: 'World Bank Open Data' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
worldBankIndicatorSchema.index({ 'country.code': 1, 'indicator.code': 1, year: 1 }, { unique: true });
worldBankIndicatorSchema.index({ 'indicator.category': 1, 'indicator.subcategory': 1 });
worldBankIndicatorSchema.index({ 'country.code': 1, year: 1 });
worldBankIndicatorSchema.index({ year: 1 });
worldBankIndicatorSchema.index({ lastUpdated: 1 });

const WorldBankIndicator = mongoose.model('WorldBankIndicator', worldBankIndicatorSchema);

export default WorldBankIndicator;