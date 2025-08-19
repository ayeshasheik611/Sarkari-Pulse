// Backend API interfaces
export interface Scheme {
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
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse {
  success: boolean;
  data: Scheme[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  timestamp: string;
}

export interface SchemeStats {
  totalSchemes: number;
  activeSchemesCount: number;
  ministriesCount: number;
  sectorsCount: number;
  sourceBreakdown: Record<string, number>;
  levelBreakdown: Record<string, number>;
}

export const mockSchemes: Scheme[] = [
  {
    id: 'pm-kisan',
    name: 'PM-KISAN',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    objective: 'Financial support to small and marginal farmers',
    launchYear: 2019,
    status: 'Active',
    sector: 'Agriculture',
    beneficiaries: 12500000,
    targetBeneficiaries: 14000000,
    budget: 87500000000,
    budgetUtilized: 65500000000,
    eligibility: {
      income: 'Small and marginal farmers',
      location: 'All states',
      category: 'Farmer families'
    },
    description: 'Under this Scheme, an income support of Rs.6,000 per year in three equal installments will be provided to small and marginal farmer families having combined land holding/ownership of upto 2 hectares.',
    officialLink: 'https://pmkisan.gov.in/',
    lastUpdated: '2024-01-15T10:30:00Z',
    regionStats: [
      { state: 'Uttar Pradesh', beneficiaries: 2100000, budget: 12600000000 },
      { state: 'Maharashtra', beneficiaries: 1800000, budget: 10800000000 },
      { state: 'West Bengal', beneficiaries: 1600000, budget: 9600000000 },
      { state: 'Bihar', beneficiaries: 1400000, budget: 8400000000 },
      { state: 'Madhya Pradesh', beneficiaries: 1200000, budget: 7200000000 }
    ],
    progressData: [
      { month: 'Jan 2024', beneficiaries: 11800000, budget: 59000000000 },
      { month: 'Feb 2024', beneficiaries: 12000000, budget: 60500000000 },
      { month: 'Mar 2024', beneficiaries: 12200000, budget: 62000000000 },
      { month: 'Apr 2024', beneficiaries: 12300000, budget: 63500000000 },
      { month: 'May 2024', beneficiaries: 12400000, budget: 64500000000 },
      { month: 'Jun 2024', beneficiaries: 12500000, budget: 65500000000 }
    ]
  },
  {
    id: 'mgnrega',
    name: 'MGNREGA',
    ministry: 'Ministry of Rural Development',
    objective: 'Guarantee 100 days of wage employment in rural areas',
    launchYear: 2005,
    status: 'Active',
    sector: 'Rural Development',
    beneficiaries: 89000000,
    targetBeneficiaries: 100000000,
    budget: 732000000000,
    budgetUtilized: 685000000000,
    eligibility: {
      location: 'Rural areas only',
      age: '18 years and above',
      category: 'Rural households'
    },
    description: 'The Mahatma Gandhi National Rural Employment Guarantee Act aims at enhancing livelihood security of households in rural areas of the country by providing at least one hundred days of guaranteed wage employment.',
    officialLink: 'https://nrega.nic.in/',
    lastUpdated: '2024-01-15T09:15:00Z',
    regionStats: [
      { state: 'Uttar Pradesh', beneficiaries: 15400000, budget: 126000000000 },
      { state: 'West Bengal', beneficiaries: 12200000, budget: 98000000000 },
      { state: 'Bihar', beneficiaries: 11800000, budget: 92000000000 },
      { state: 'Rajasthan', beneficiaries: 9600000, budget: 78000000000 },
      { state: 'Odisha', beneficiaries: 8900000, budget: 71000000000 }
    ],
    progressData: [
      { month: 'Jan 2024', beneficiaries: 84000000, budget: 620000000000 },
      { month: 'Feb 2024', beneficiaries: 85500000, budget: 635000000000 },
      { month: 'Mar 2024', beneficiaries: 86800000, budget: 650000000000 },
      { month: 'Apr 2024', beneficiaries: 87200000, budget: 660000000000 },
      { month: 'May 2024', beneficiaries: 88100000, budget: 672000000000 },
      { month: 'Jun 2024', beneficiaries: 89000000, budget: 685000000000 }
    ]
  },
  {
    id: 'ayushman-bharat',
    name: 'Ayushman Bharat',
    ministry: 'Ministry of Health & Family Welfare',
    objective: 'Universal Health Coverage for economically vulnerable families',
    launchYear: 2018,
    status: 'Active',
    sector: 'Health',
    beneficiaries: 280000000,
    targetBeneficiaries: 500000000,
    budget: 65000000000,
    budgetUtilized: 58000000000,
    eligibility: {
      income: 'Bottom 40% economically vulnerable families',
      location: 'All states',
      category: 'SECC-2011 beneficiaries'
    },
    description: 'Ayushman Bharat is National Health Protection Scheme, which will cover over 10 crore poor and vulnerable families providing coverage upto 5 lakh rupees per family per year for secondary and tertiary care hospitalization.',
    officialLink: 'https://pmjay.gov.in/',
    lastUpdated: '2024-01-15T11:45:00Z',
    regionStats: [
      { state: 'Uttar Pradesh', beneficiaries: 45000000, budget: 9800000000 },
      { state: 'Bihar', beneficiaries: 32000000, budget: 7200000000 },
      { state: 'West Bengal', beneficiaries: 28000000, budget: 6500000000 },
      { state: 'Madhya Pradesh', beneficiaries: 24000000, budget: 5800000000 },
      { state: 'Rajasthan', beneficiaries: 22000000, budget: 5200000000 }
    ],
    progressData: [
      { month: 'Jan 2024', beneficiaries: 260000000, budget: 52000000000 },
      { month: 'Feb 2024', beneficiaries: 265000000, budget: 53500000000 },
      { month: 'Mar 2024', beneficiaries: 270000000, budget: 55000000000 },
      { month: 'Apr 2024', beneficiaries: 272000000, budget: 56000000000 },
      { month: 'May 2024', beneficiaries: 276000000, budget: 57000000000 },
      { month: 'Jun 2024', beneficiaries: 280000000, budget: 58000000000 }
    ]
  },
  {
    id: 'swachh-bharat',
    name: 'Swachh Bharat Mission',
    ministry: 'Ministry of Jal Shakti',
    objective: 'Clean India Mission - sanitation and hygiene',
    launchYear: 2014,
    status: 'Active',
    sector: 'Sanitation',
    beneficiaries: 600000000,
    targetBeneficiaries: 600000000,
    budget: 120000000000,
    budgetUtilized: 115000000000,
    eligibility: {
      location: 'All areas',
      category: 'All citizens'
    },
    description: 'Swachh Bharat Mission is a nation-wide campaign to eliminate open defecation and improve solid waste management. The mission aims to achieve the vision of Clean India by 2nd October 2019.',
    officialLink: 'https://swachhbharatmission.gov.in/',
    lastUpdated: '2024-01-15T08:20:00Z',
    regionStats: [
      { state: 'Uttar Pradesh', beneficiaries: 95000000, budget: 18500000000 },
      { state: 'Maharashtra', beneficiaries: 75000000, budget: 15200000000 },
      { state: 'Bihar', beneficiaries: 68000000, budget: 13800000000 },
      { state: 'West Bengal', beneficiaries: 62000000, budget: 12500000000 },
      { state: 'Madhya Pradesh', beneficiaries: 55000000, budget: 11200000000 }
    ],
    progressData: [
      { month: 'Jan 2024', beneficiaries: 590000000, budget: 108000000000 },
      { month: 'Feb 2024', beneficiaries: 592000000, budget: 110000000000 },
      { month: 'Mar 2024', beneficiaries: 595000000, budget: 111500000000 },
      { month: 'Apr 2024', beneficiaries: 597000000, budget: 113000000000 },
      { month: 'May 2024', beneficiaries: 598000000, budget: 114000000000 },
      { month: 'Jun 2024', beneficiaries: 600000000, budget: 115000000000 }
    ]
  },
  {
    id: 'digital-india',
    name: 'Digital India',
    ministry: 'Ministry of Electronics & IT',
    objective: 'Digital transformation and governance',
    launchYear: 2015,
    status: 'Active',
    sector: 'Technology',
    beneficiaries: 800000000,
    targetBeneficiaries: 1000000000,
    budget: 45000000000,
    budgetUtilized: 38000000000,
    eligibility: {
      location: 'All areas',
      category: 'All citizens'
    },
    description: 'Digital India is a campaign launched to ensure that Government services are made available to citizens electronically by improved online infrastructure and by increasing Internet connectivity.',
    officialLink: 'https://digitalindia.gov.in/',
    lastUpdated: '2024-01-15T12:00:00Z',
    regionStats: [
      { state: 'Maharashtra', beneficiaries: 120000000, budget: 5800000000 },
      { state: 'Uttar Pradesh', beneficiaries: 115000000, budget: 5500000000 },
      { state: 'Tamil Nadu', beneficiaries: 85000000, budget: 4200000000 },
      { state: 'Karnataka', beneficiaries: 78000000, budget: 3900000000 },
      { state: 'West Bengal', beneficiaries: 72000000, budget: 3600000000 }
    ],
    progressData: [
      { month: 'Jan 2024', beneficiaries: 750000000, budget: 32000000000 },
      { month: 'Feb 2024', beneficiaries: 765000000, budget: 33500000000 },
      { month: 'Mar 2024', beneficiaries: 775000000, budget: 35000000000 },
      { month: 'Apr 2024', beneficiaries: 785000000, budget: 36200000000 },
      { month: 'May 2024', beneficiaries: 792000000, budget: 37100000000 },
      { month: 'Jun 2024', beneficiaries: 800000000, budget: 38000000000 }
    ]
  }
];

export const getSectors = (): string[] => {
  return Array.from(new Set(mockSchemes.map(scheme => scheme.sector)));
};

export const getMinistries = (): string[] => {
  return Array.from(new Set(mockSchemes.map(scheme => scheme.ministry)));
};