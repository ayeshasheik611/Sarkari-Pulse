export interface CountryData {
  code: string;
  name: string;
  region: string;
  population: number;
  gdp: number;
  consumption: {
    food: number;
    energy: number;
    fuel: number;
  };
  marketChallenges: string[];
  supplyChainIssues: string[];
  exports: {
    category: string;
    value: number;
  }[];
  imports: {
    category: string;
    value: number;
  }[];
  economicIndicators: {
    inflationRate: number;
    unemploymentRate: number;
    growthRate: number;
  };
  lastUpdated: string;
  trendData: {
    year: number;
    gdp: number;
    consumption: number;
    exports: number;
    imports: number;
  }[];
}

export const mockCountries: CountryData[] = [
  {
    code: 'US',
    name: 'United States',
    region: 'North America',
    population: 331900000,
    gdp: 25462700000000,
    consumption: {
      food: 1872000000000,
      energy: 2635000000000,
      fuel: 1456000000000
    },
    marketChallenges: [
      'Supply chain disruptions',
      'Labor shortages',
      'Inflation pressures',
      'Trade policy uncertainties'
    ],
    supplyChainIssues: [
      'Port congestion',
      'Semiconductor shortage',
      'Transportation bottlenecks',
      'Raw material scarcity'
    ],
    exports: [
      { category: 'Technology', value: 156000000000 },
      { category: 'Agriculture', value: 145000000000 },
      { category: 'Manufacturing', value: 1340000000000 },
      { category: 'Services', value: 875000000000 }
    ],
    imports: [
      { category: 'Consumer Goods', value: 654000000000 },
      { category: 'Energy', value: 234000000000 },
      { category: 'Raw Materials', value: 456000000000 },
      { category: 'Technology', value: 445000000000 }
    ],
    economicIndicators: {
      inflationRate: 3.2,
      unemploymentRate: 3.7,
      growthRate: 2.1
    },
    lastUpdated: '2024-01-15T14:30:00Z',
    trendData: [
      { year: 2020, gdp: 23315080000000, consumption: 17734000000000, exports: 1431000000000, imports: 2239000000000 },
      { year: 2021, gdp: 24796750000000, consumption: 18373000000000, exports: 1537000000000, imports: 2325000000000 },
      { year: 2022, gdp: 25796100000000, consumption: 19021000000000, exports: 1645000000000, imports: 2456000000000 },
      { year: 2023, gdp: 26196500000000, consumption: 19587000000000, exports: 1734000000000, imports: 2578000000000 },
      { year: 2024, gdp: 25462700000000, consumption: 19963000000000, exports: 1756000000000, imports: 2601000000000 }
    ]
  },
  {
    code: 'IN',
    name: 'India',
    region: 'Asia',
    population: 1380000000,
    gdp: 3737000000000,
    consumption: {
      food: 374000000000,
      energy: 485000000000,
      fuel: 298000000000
    },
    marketChallenges: [
      'Infrastructure gaps',
      'Regulatory complexity',
      'Rural market penetration',
      'Digital divide'
    ],
    supplyChainIssues: [
      'Last-mile connectivity',
      'Cold storage shortage',
      'Logistics inefficiency',
      'Quality standardization'
    ],
    exports: [
      { category: 'Textiles', value: 45000000000 },
      { category: 'Pharmaceuticals', value: 28000000000 },
      { category: 'IT Services', value: 154000000000 },
      { category: 'Agriculture', value: 52000000000 }
    ],
    imports: [
      { category: 'Crude Oil', value: 165000000000 },
      { category: 'Electronics', value: 89000000000 },
      { category: 'Machinery', value: 67000000000 },
      { category: 'Chemicals', value: 45000000000 }
    ],
    economicIndicators: {
      inflationRate: 5.1,
      unemploymentRate: 7.8,
      growthRate: 6.3
    },
    lastUpdated: '2024-01-15T14:30:00Z',
    trendData: [
      { year: 2020, gdp: 3176000000000, consumption: 2156000000000, exports: 323000000000, imports: 394000000000 },
      { year: 2021, gdp: 3353000000000, consumption: 2289000000000, exports: 421000000000, imports: 507000000000 },
      { year: 2022, gdp: 3550000000000, consumption: 2445000000000, exports: 447000000000, imports: 613000000000 },
      { year: 2023, gdp: 3665000000000, consumption: 2563000000000, exports: 437000000000, imports: 670000000000 },
      { year: 2024, gdp: 3737000000000, consumption: 2634000000000, exports: 456000000000, imports: 689000000000 }
    ]
  },
  {
    code: 'CN',
    name: 'China',
    region: 'Asia',
    population: 1439000000,
    gdp: 17734000000000,
    consumption: {
      food: 1567000000000,
      energy: 4123000000000,
      fuel: 2456000000000
    },
    marketChallenges: [
      'Trade tensions',
      'Environmental regulations',
      'Demographic shifts',
      'Technology restrictions'
    ],
    supplyChainIssues: [
      'Zero-COVID impact',
      'Energy shortages',
      'Export restrictions',
      'Manufacturing costs'
    ],
    exports: [
      { category: 'Electronics', value: 789000000000 },
      { category: 'Machinery', value: 456000000000 },
      { category: 'Textiles', value: 234000000000 },
      { category: 'Chemicals', value: 345000000000 }
    ],
    imports: [
      { category: 'Energy', value: 567000000000 },
      { category: 'Raw Materials', value: 432000000000 },
      { category: 'Technology', value: 298000000000 },
      { category: 'Agriculture', value: 187000000000 }
    ],
    economicIndicators: {
      inflationRate: 2.8,
      unemploymentRate: 5.2,
      growthRate: 4.5
    },
    lastUpdated: '2024-01-15T14:30:00Z',
    trendData: [
      { year: 2020, gdp: 14723000000000, consumption: 8123000000000, exports: 2641000000000, imports: 2061000000000 },
      { year: 2021, gdp: 17456000000000, consumption: 9456000000000, exports: 3364000000000, imports: 2687000000000 },
      { year: 2022, gdp: 17963000000000, consumption: 9845000000000, exports: 3594000000000, imports: 2736000000000 },
      { year: 2023, gdp: 17896000000000, consumption: 10234000000000, exports: 3456000000000, exports: 2856000000000 },
      { year: 2024, gdp: 17734000000000, consumption: 10567000000000, exports: 3512000000000, imports: 2934000000000 }
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    region: 'Europe',
    population: 83784000,
    gdp: 4260000000000,
    consumption: {
      food: 187000000000,
      energy: 298000000000,
      fuel: 145000000000
    },
    marketChallenges: [
      'Energy transition',
      'Aging population',
      'Digital transformation',
      'Global competition'
    ],
    supplyChainIssues: [
      'Energy security',
      'Automotive transition',
      'Raw material dependence',
      'Skilled labor shortage'
    ],
    exports: [
      { category: 'Automotive', value: 234000000000 },
      { category: 'Machinery', value: 187000000000 },
      { category: 'Chemicals', value: 156000000000 },
      { category: 'Technology', value: 123000000000 }
    ],
    imports: [
      { category: 'Energy', value: 145000000000 },
      { category: 'Electronics', value: 89000000000 },
      { category: 'Raw Materials', value: 67000000000 },
      { category: 'Textiles', value: 45000000000 }
    ],
    economicIndicators: {
      inflationRate: 6.9,
      unemploymentRate: 3.1,
      growthRate: 1.4
    },
    lastUpdated: '2024-01-15T14:30:00Z',
    trendData: [
      { year: 2020, gdp: 3846000000000, consumption: 2145000000000, exports: 1560000000000, imports: 1338000000000 },
      { year: 2021, gdp: 4156000000000, consumption: 2234000000000, exports: 1646000000000, imports: 1434000000000 },
      { year: 2022, gdp: 4234000000000, consumption: 2298000000000, exports: 1735000000000, imports: 1523000000000 },
      { year: 2023, gdp: 4189000000000, consumption: 2356000000000, exports: 1689000000000, imports: 1567000000000 },
      { year: 2024, gdp: 4260000000000, consumption: 2398000000000, exports: 1734000000000, imports: 1589000000000 }
    ]
  },
  {
    code: 'BR',
    name: 'Brazil',
    region: 'South America',
    population: 215300000,
    gdp: 2055000000000,
    consumption: {
      food: 234000000000,
      energy: 187000000000,
      fuel: 145000000000
    },
    marketChallenges: [
      'Political instability',
      'Currency volatility',
      'Infrastructure needs',
      'Environmental concerns'
    ],
    supplyChainIssues: [
      'Transportation infrastructure',
      'Port efficiency',
      'Agricultural logistics',
      'Amazon regulations'
    ],
    exports: [
      { category: 'Agriculture', value: 89000000000 },
      { category: 'Mining', value: 67000000000 },
      { category: 'Manufacturing', value: 45000000000 },
      { category: 'Energy', value: 34000000000 }
    ],
    imports: [
      { category: 'Machinery', value: 56000000000 },
      { category: 'Electronics', value: 34000000000 },
      { category: 'Chemicals', value: 23000000000 },
      { category: 'Automotive', value: 19000000000 }
    ],
    economicIndicators: {
      inflationRate: 4.5,
      unemploymentRate: 9.3,
      growthRate: 2.9
    },
    lastUpdated: '2024-01-15T14:30:00Z',
    trendData: [
      { year: 2020, gdp: 1869000000000, consumption: 1234000000000, exports: 281000000000, imports: 219000000000 },
      { year: 2021, gdp: 1937000000000, consumption: 1298000000000, exports: 334000000000, imports: 267000000000 },
      { year: 2022, gdp: 2089000000000, consumption: 1367000000000, exports: 364000000000, imports: 298000000000 },
      { year: 2023, gdp: 2134000000000, consumption: 1423000000000, exports: 342000000000, imports: 312000000000 },
      { year: 2024, gdp: 2055000000000, consumption: 1456000000000, exports: 358000000000, imports: 289000000000 }
    ]
  }
];

export const getRegions = (): string[] => {
  return Array.from(new Set(mockCountries.map(country => country.region)));
};

export const getCountryByCode = (code: string): CountryData | undefined => {
  return mockCountries.find(country => country.code === code);
};