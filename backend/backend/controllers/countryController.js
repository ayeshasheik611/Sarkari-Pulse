import Country from "../models/countryModel.js";

// GET all countries
export const getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find({});
    res.status(200).json(countries);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch countries", error: error.message });
  }
};

// GET a single country by country code (e.g., /IN, /US)
export const getCountryByCode = async (req, res) => {
  try {
    const code = req.params.code.toUpperCase(); // Make it case-insensitive
    const country = await Country.findOne({ code });

    if (!country) {
      return res.status(404).json({ message: `Country with code '${code}' not found.` });
    }

    res.status(200).json(country);
  } catch (error) {
    res.status(500).json({ message: "Error fetching country", error: error.message });
  }
};
