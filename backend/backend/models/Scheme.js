import mongoose from "mongoose";

const schemeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ministry: { type: String },
  description: { type: String },
  launchDate: { type: Date },
  targetAudience: { type: String },
  budget: { type: Number },
  sector: { type: String },
  
  // New fields for MyScheme integration
  department: { type: String },
  source: { type: String, enum: ['manual', 'api', 'dom', 'import', 'individual_page', 'extracted', 'dbt-bharat', 'india-gov', 'mygov', 'digital-india', 'bulk-api', 'simple-bulk-api', 'aggressive-api', 'smart-pagination'], default: 'manual' },
  sourceUrl: { type: String },
  scrapedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  
  // Additional MyScheme specific fields
  schemeId: { type: String, unique: true, sparse: true }, // External scheme ID
  level: { type: String }, // Central/State
  beneficiaryState: { type: String } // State information
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for better search performance
schemeSchema.index({ name: 'text', description: 'text' });
schemeSchema.index({ ministry: 1 });
schemeSchema.index({ sector: 1 });
schemeSchema.index({ source: 1 });

const Scheme = mongoose.model("Scheme", schemeSchema);

export default Scheme;
