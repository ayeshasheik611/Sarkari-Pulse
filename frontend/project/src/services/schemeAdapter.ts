// Adapter to convert between backend and frontend scheme formats

// Backend scheme interface (from your API)
export interface BackendScheme {
  _id: string;
  name: string;
  ministry: string;
  description: string;
  sector: string;
  targetAudience: string;
  level: 'Central' | 'State';
  beneficiaryState: string;
  source: 'api' | 'dbt-bharat' | 'bulk-api' | 'india-gov' | 'mygov';
  sourceUrl: string;
  schemeId: string;
  isActive: boolean;
  scrapedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Frontend scheme interface (for UI compatibility)
export interface FrontendScheme {
  id: string;
  name: string;
  ministry: string;
  objective: string;
  launchYear: number;
  status: 'Active' | 'Inactive' | 'Under Review';
  sector: string;
  beneficiaries: number;
  targetBeneficiaries: number;
  budget: number;
  budgetUtilized: number;
  eligibility: {
    age?: string;
    income?: string;
    location?: string;
    category?: string;
    gender?: string;
    level?: string;
  };
  description: string;
  officialLink: string;
  lastUpdated: string;
  regionStats: {
    state: string;
    beneficiaries: number;
    budget: number;
  }[];
  progressData: {
    month: string;
    beneficiaries: number;
    budget: number;
  }[];
  // Additional backend fields
  schemeId: string;
  source: string;
  beneficiaryState: string;
  scrapedAt: string;
}

// Generate consistent mock data based on scheme characteristics
const generateConsistentBeneficiaries = (scheme: BackendScheme, seed: number): number => {
  // Base beneficiaries on sector and level
  let baseBeneficiaries = 1000000; // 1M base
  
  // Adjust based on sector
  if (scheme.sector.toLowerCase().includes('health')) baseBeneficiaries *= 5;
  else if (scheme.sector.toLowerCase().includes('education')) baseBeneficiaries *= 3;
  else if (scheme.sector.toLowerCase().includes('agriculture')) baseBeneficiaries *= 4;
  else if (scheme.sector.toLowerCase().includes('employment')) baseBeneficiaries *= 2;
  
  // Adjust based on level
  if (scheme.level === 'Central') baseBeneficiaries *= 2;
  
  // Add consistent variation based on seed
  const variation = (seed % 1000) / 1000; // 0-1
  return Math.floor(baseBeneficiaries * (0.5 + variation));
};

const generateConsistentBudget = (scheme: BackendScheme, seed: number): number => {
  // Base budget on sector and level
  let baseBudget = 10000000000; // 10B base
  
  // Adjust based on sector
  if (scheme.sector.toLowerCase().includes('health')) baseBudget *= 3;
  else if (scheme.sector.toLowerCase().includes('infrastructure')) baseBudget *= 5;
  else if (scheme.sector.toLowerCase().includes('agriculture')) baseBudget *= 2;
  else if (scheme.sector.toLowerCase().includes('education')) baseBudget *= 2.5;
  
  // Adjust based on level
  if (scheme.level === 'Central') baseBudget *= 3;
  
  // Add consistent variation based on seed
  const variation = (seed % 1000) / 1000; // 0-1
  return Math.floor(baseBudget * (0.3 + variation * 1.5));
};

const extractLaunchYear = (scheme: BackendScheme): number => {
  // Try to extract year from creation date or use a reasonable default
  const createdYear = new Date(scheme.createdAt).getFullYear();
  
  // If created recently, assume it's an older scheme being digitized
  if (createdYear >= 2020) {
    // Generate a launch year based on scheme characteristics
    const seed = scheme.schemeId ? parseInt(scheme.schemeId.slice(-2), 16) || 10 : 10;
    return 2010 + (seed % 15); // Launch years between 2010-2024
  }
  
  return createdYear;
};

const processSectorData = (sectorString: string): string => {
  // Clean up sector data - take the first meaningful sector
  const sectors = sectorString.split(',').map(s => s.trim());
  
  // Filter out generic terms and return the most specific sector
  const filteredSectors = sectors.filter(sector => 
    !sector.toLowerCase().includes('individual') &&
    !sector.toLowerCase().includes('general') &&
    sector.length > 3
  );
  
  return filteredSectors[0] || sectors[0] || 'General';
};

const generateConsistentRegionStats = (scheme: BackendScheme, seed: number) => {
  const states = ['Uttar Pradesh', 'Maharashtra', 'West Bengal', 'Bihar', 'Madhya Pradesh'];
  
  // If it's a state-level scheme, focus on that state
  if (scheme.level === 'State' && scheme.beneficiaryState !== 'All') {
    return [{
      state: scheme.beneficiaryState,
      beneficiaries: Math.floor((seed % 5000000) + 1000000),
      budget: Math.floor((seed % 20000000000) + 5000000000)
    }];
  }
  
  // For central schemes, distribute across states
  return states.map((state, index) => ({
    state,
    beneficiaries: Math.floor(((seed + index * 1000) % 5000000) + 500000),
    budget: Math.floor(((seed + index * 10000) % 20000000000) + 2000000000)
  }));
};

const generateConsistentProgressData = (scheme: BackendScheme, seed: number) => {
  const months = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024'];
  let baseBeneficiaries = Math.floor((seed % 5000000) + 2000000);
  let baseBudget = Math.floor((seed % 30000000000) + 10000000000);
  
  return months.map((month, index) => {
    // Show progressive growth
    const growthFactor = 1 + (index * 0.05); // 5% growth per month
    return {
      month,
      beneficiaries: Math.floor(baseBeneficiaries * growthFactor),
      budget: Math.floor(baseBudget * growthFactor)
    };
  });
};

// Convert backend scheme to frontend scheme format
export const convertBackendToFrontend = (backendScheme: BackendScheme): FrontendScheme => {
  // Use scheme ID as a seed for consistent mock data generation
  const seed = backendScheme.schemeId ? parseInt(backendScheme.schemeId.slice(-4), 16) || 1000 : 1000;
  
  // Generate consistent mock data based on scheme characteristics
  const mockBeneficiaries = generateConsistentBeneficiaries(backendScheme, seed);
  const mockBudget = generateConsistentBudget(backendScheme, seed);
  
  // Extract launch year from scheme ID or creation date
  const launchYear = extractLaunchYear(backendScheme);
  
  return {
    id: backendScheme._id,
    name: backendScheme.name,
    ministry: backendScheme.ministry,
    objective: backendScheme.description,
    launchYear: launchYear,
    status: backendScheme.isActive ? 'Active' : 'Inactive',
    sector: processSectorData(backendScheme.sector),
    beneficiaries: mockBeneficiaries,
    targetBeneficiaries: Math.floor(mockBeneficiaries * 1.2),
    budget: mockBudget,
    budgetUtilized: Math.floor(mockBudget * (0.6 + (seed % 30) / 100)), // 60-90% utilization
    eligibility: {
      category: backendScheme.targetAudience,
      location: backendScheme.level === 'Central' ? 'All states' : backendScheme.beneficiaryState,
      level: backendScheme.level
    },
    description: backendScheme.description,
    officialLink: backendScheme.sourceUrl,
    lastUpdated: backendScheme.updatedAt,
    regionStats: generateConsistentRegionStats(backendScheme, seed),
    progressData: generateConsistentProgressData(backendScheme, seed),
    // Additional backend-specific fields
    schemeId: backendScheme.schemeId,
    source: backendScheme.source,
    beneficiaryState: backendScheme.beneficiaryState,
    scrapedAt: backendScheme.scrapedAt
  };
};

// Convert array of backend schemes to frontend schemes
export const convertSchemesArray = (backendSchemes: BackendScheme[]): FrontendScheme[] => {
  return backendSchemes.map(convertBackendToFrontend);
};