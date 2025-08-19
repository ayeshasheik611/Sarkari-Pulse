// scraper.js
import axios from 'axios';

export const fetchMySchemeData = async () => {
  const response = await axios.get(
    'https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=%5B%5D&keyword=&sort=&from=0&size=100',
    {
      headers: {
        'Referer': 'https://www.myscheme.gov.in/search',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://www.myscheme.gov.in',
        'Host': 'api.myscheme.gov.in',
      }
    }
  );
  return response.data?.results || [];
};
