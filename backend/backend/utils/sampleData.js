// Sample MyScheme data for testing and fallback
export const sampleSchemes = [
  {
    id: "pm-kisan-samman-nidhi",
    scheme_name: "PM-KISAN Samman Nidhi",
    description: "Direct income support to farmers",
    ministry: "Ministry of Agriculture and Farmers Welfare",
    department: "Department of Agriculture and Cooperation",
    category: "Agriculture",
    sub_category: "Financial Assistance",
    beneficiary_type: "Farmers",
    eligibility: "Small and marginal farmers with cultivable land",
    benefits: "Rs. 6000 per year in three installments",
    application_process: "Online through PM-KISAN portal",
    documents_required: ["Aadhaar Card", "Bank Account Details", "Land Records"],
    official_website: "https://pmkisan.gov.in/",
    launch_date: "2019-02-24"
  },
  {
    id: "ayushman-bharat-pmjay",
    scheme_name: "Ayushman Bharat - PM-JAY",
    description: "Health insurance scheme for economically vulnerable families",
    ministry: "Ministry of Health and Family Welfare",
    department: "National Health Authority",
    category: "Health",
    sub_category: "Insurance",
    beneficiary_type: "Families",
    eligibility: "Families identified through SECC-2011 database",
    benefits: "Health cover of Rs. 5 lakh per family per year",
    application_process: "Through empanelled hospitals",
    documents_required: ["Aadhaar Card", "Ration Card", "Family ID"],
    official_website: "https://pmjay.gov.in/",
    launch_date: "2018-09-23"
  },
  {
    id: "pradhan-mantri-awas-yojana",
    scheme_name: "Pradhan Mantri Awas Yojana",
    description: "Housing for All scheme",
    ministry: "Ministry of Housing and Urban Affairs",
    department: "Department of Housing and Urban Affairs",
    category: "Housing",
    sub_category: "Construction",
    beneficiary_type: "Families",
    eligibility: "Families without pucca house",
    benefits: "Financial assistance for house construction/purchase",
    application_process: "Online through official portal",
    documents_required: ["Aadhaar Card", "Income Certificate", "Bank Account Details"],
    official_website: "https://pmaymis.gov.in/",
    launch_date: "2015-06-25"
  },
  {
    id: "swachh-bharat-mission",
    scheme_name: "Swachh Bharat Mission",
    description: "Clean India Mission for sanitation",
    ministry: "Ministry of Jal Shakti",
    department: "Department of Drinking Water and Sanitation",
    category: "Sanitation",
    sub_category: "Infrastructure",
    beneficiary_type: "Households",
    eligibility: "Households without toilet facilities",
    benefits: "Financial incentive for toilet construction",
    application_process: "Through local authorities",
    documents_required: ["Aadhaar Card", "Bank Account Details"],
    official_website: "https://swachhbharatmission.gov.in/",
    launch_date: "2014-10-02"
  },
  {
    id: "jan-dhan-yojana",
    scheme_name: "Pradhan Mantri Jan Dhan Yojana",
    description: "Financial inclusion scheme",
    ministry: "Ministry of Finance",
    department: "Department of Financial Services",
    category: "Financial Services",
    sub_category: "Banking",
    beneficiary_type: "Individuals",
    eligibility: "All citizens without bank account",
    benefits: "Zero balance bank account with insurance cover",
    application_process: "Through banks and CSCs",
    documents_required: ["Aadhaar Card", "Address Proof"],
    official_website: "https://pmjdy.gov.in/",
    launch_date: "2014-08-28"
  }
];

export const loadSampleData = async (MyScheme) => {
  try {
    console.log('📝 Loading sample scheme data...');
    
    let savedCount = 0;
    let updatedCount = 0;

    for (const scheme of sampleSchemes) {
      const schemeData = {
        schemeId: scheme.id,
        schemeName: scheme.scheme_name,
        schemeDescription: scheme.description,
        ministry: scheme.ministry,
        department: scheme.department,
        category: scheme.category,
        subCategory: scheme.sub_category,
        beneficiaryType: scheme.beneficiary_type,
        eligibility: scheme.eligibility,
        benefits: scheme.benefits,
        applicationProcess: scheme.application_process,
        documentsRequired: scheme.documents_required || [],
        officialWebsite: scheme.official_website,
        launchDate: scheme.launch_date ? new Date(scheme.launch_date) : null,
        lastUpdated: new Date()
      };

      const existingScheme = await MyScheme.findOne({ schemeId: schemeData.schemeId });
      
      if (existingScheme) {
        await MyScheme.updateOne({ schemeId: schemeData.schemeId }, schemeData);
        updatedCount++;
      } else {
        await MyScheme.create(schemeData);
        savedCount++;
      }
    }

    console.log(`✅ Sample data loaded: ${savedCount} new, ${updatedCount} updated`);
    return { saved: savedCount, updated: updatedCount, total: sampleSchemes.length };
  } catch (error) {
    console.error('❌ Error loading sample data:', error.message);
    throw error;
  }
};