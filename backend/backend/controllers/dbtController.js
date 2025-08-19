// controllers/dbtController.js
import { fetchDBTSchemes } from '../utils/scrapers/dbtSchemesScraper.js';

export const getDBTSchemes = async (req, res) => {
  try {
    const data = await fetchDBTSchemes();
    res.json(data);
  } catch (error) {
    console.error('❌ Error in controller:', error);
    res.status(500).json({ error: 'Failed to fetch DBT schemes.' });
  }
};
