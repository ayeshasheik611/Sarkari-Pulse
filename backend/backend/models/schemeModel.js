import mongoose from 'mongoose';

const mySchemeSchema = new mongoose.Schema({
  // MyScheme.gov.in specific fields
  schemeId: { type: String, unique: true, required: true },
  schemeName: { type: String, required: true },
  schemeDescription: { type: String },
  ministry: { type: String },
  department: { type: String },
  category: { type: String },
  subCategory: { type: String },
  beneficiaryType: { type: String },
  eligibility: { type: String },
  benefits: { type: String },
  applicationProcess: { type: String },
  documentsRequired: [String],
  officialWebsite: { type: String },
  launchDate: { type: Date },
  status: { type: String, default: 'Active' },
  
  // Metadata
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for better search performance
mySchemeSchema.index({ schemeName: 'text', schemeDescription: 'text' });
mySchemeSchema.index({ ministry: 1 });
mySchemeSchema.index({ category: 1 });

export default mongoose.model('MyScheme', mySchemeSchema);