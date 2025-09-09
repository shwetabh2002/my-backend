const axios = require('axios');

class CurrencyService {
  constructor() {
    this.baseUrl = 'https://openexchangerates.org/api/latest.json';
    this.appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get exchange rate for a specific currency
   * @param {string} currencyType - Currency code (e.g., 'AED', 'EUR', 'GBP')
   * @returns {Promise<number>} Exchange rate from USD to the specified currency
   */
  async getExchangeRate(currencyType) {
    try {
      // Check cache first
      const cacheKey = `rate_${currencyType}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.rate;
      }
      // Make API request
      const response = await axios.get(this.baseUrl, {
        params: {
          app_id: this.appId,
          base: 'USD',
          symbols: currencyType.toUpperCase()
        },
        timeout: 10000 // 10 seconds timeout
      });
      const { rates } = response.data;
      const rate = rates[currencyType.toUpperCase()];

      if (!rate) {
        throw new Error(`Currency ${currencyType} not found in exchange rates`);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        rate,
        timestamp: Date.now()
      });
      return rate;
    } catch (error) {
      console.error('Error fetching exchange rate:', error.message);
      
      // Return cached rate if available, even if expired
      const cacheKey = `rate_${currencyType}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.warn(`Using cached exchange rate for ${currencyType}: ${cached.rate}`);
        return cached.rate;
      }
      
      // If no cache and API fails, return 1 (no conversion)
      console.warn(`Failed to fetch exchange rate for ${currencyType}, using 1.0 (no conversion)`);
      return 1.0;
    }
  }

  /**
   * Convert price from USD to target currency
   * @param {number} usdPrice - Price in USD
   * @param {string} currencyType - Target currency code
   * @returns {Promise<Object>} Converted price with currency info
   */
  async convertPrice(usdPrice, currencyType) {
    try {
      if (!currencyType || currencyType.toUpperCase() === 'USD') {
        return {
          originalPrice: usdPrice,
          convertedPrice: usdPrice,
          currency: 'USD',
          exchangeRate: 1.0
        };
      }

      const exchangeRate = await this.getExchangeRate(currencyType);
      const convertedPrice = Math.round(usdPrice * exchangeRate * 100) / 100; // Round to 2 decimal places

      return {
        originalPrice: usdPrice,
        convertedPrice: convertedPrice,
        currency: currencyType.toUpperCase(),
        exchangeRate: exchangeRate
      };
    } catch (error) {
      console.error('Error converting price:', error.message);
      
      // Return original price if conversion fails
      return {
        originalPrice: usdPrice,
        convertedPrice: usdPrice,
        currency: 'USD',
        exchangeRate: 1.0,
        error: 'Currency conversion failed, showing USD price'
      };
    }
  }

  /**
   * Convert multiple prices from USD to target currency
   * @param {Array} items - Array of items with pricing information
   * @param {string} currencyType - Target currency code
   * @returns {Promise<Array>} Items with converted prices
   */
  async convertPrices(items, currencyType) {
    try {
      if (!currencyType || currencyType.toUpperCase() === 'USD') {
        return items.map(item => ({
          ...item,
          pricing: {
            ...item.pricing,
            currency: 'USD'
          }
        }));
      }

      const exchangeRate = await this.getExchangeRate(currencyType);
      
      return items.map(item => {
        const convertedPricing = { ...item.pricing };
        
        // Convert selling price
        if (convertedPricing.sellingPrice) {
          convertedPricing.sellingPrice = Math.round(convertedPricing.sellingPrice * exchangeRate * 100) / 100;
        }
        
        // Convert cost price if available
        if (convertedPricing.costPrice) {
          convertedPricing.costPrice = Math.round(convertedPricing.costPrice * exchangeRate * 100) / 100;
        }
        
        // Convert MSRP if available
        if (convertedPricing.msrp) {
          convertedPricing.msrp = Math.round(convertedPricing.msrp * exchangeRate * 100) / 100;
        }

        convertedPricing.currency = currencyType.toUpperCase();
        convertedPricing.exchangeRate = exchangeRate;

        return {
          ...item,
          pricing: convertedPricing
        };
      });
    } catch (error) {
      console.error('Error converting prices:', error.message);
      
      // Return original items if conversion fails
      return items.map(item => ({
        ...item,
        pricing: {
          ...item.pricing,
          currency: 'USD',
          error: 'Currency conversion failed, showing USD prices'
        }
      }));
    }
  }

  /**
   * Clear the exchange rate cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

module.exports = new CurrencyService();
