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

  /**
   * Convert amount from one currency to another
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @returns {Promise<Object>} Conversion result
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (!amount || amount <= 0) {
        return {
          originalAmount: amount,
          convertedAmount: amount,
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
          exchangeRate: 1.0
        };
      }

      if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
        return {
          originalAmount: amount,
          convertedAmount: amount,
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
          exchangeRate: 1.0
        };
      }

      // Get exchange rates for both currencies
      const [fromRate, toRate] = await Promise.all([
        this.getExchangeRate(fromCurrency),
        this.getExchangeRate(toCurrency)
      ]);

      // Convert: amount_in_from_currency * (to_rate / from_rate)
      const exchangeRate = toRate / fromRate;
      const convertedAmount = Math.round(amount * exchangeRate * 100) / 100;

      return {
        originalAmount: amount,
        convertedAmount: convertedAmount,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        exchangeRate: exchangeRate
      };
    } catch (error) {
      console.error('Error converting currency:', error.message);
      
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency: fromCurrency,
        toCurrency: toCurrency,
        exchangeRate: 1.0,
        error: 'Currency conversion failed, showing original amount'
      };
    }
  }

  /**
   * Convert quotation payload from one currency to another
   * @param {Object} quotationPayload - Quotation payload object
   * @param {string} targetCurrency - Target currency code (default: 'AED')
   * @returns {Promise<Object>} Converted quotation payload
   */
  async convertQuotationCurrency(quotationPayload, targetCurrency = 'AED') {
    try {
      const sourceCurrency = quotationPayload.currency;
      
      if (!sourceCurrency) {
        throw new Error('Source currency not found in quotation payload');
      }

      if (sourceCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
        return quotationPayload;
      }

      // Get exchange rate for conversion
      const conversionResult = await this.convertCurrency(1, sourceCurrency, targetCurrency);
      const exchangeRate = conversionResult.exchangeRate;

      // Create a deep copy of the payload
      const convertedPayload = JSON.parse(JSON.stringify(quotationPayload));

      // Convert items selling prices
      if (convertedPayload.items && Array.isArray(convertedPayload.items)) {
        convertedPayload.items.forEach(item => {
          if (item.sellingPrice) {
            item.sellingPrice = Math.round(item.sellingPrice * exchangeRate * 100) / 100;
          }
        });
      }

      // Convert additional expenses amount
      if (convertedPayload.additionalExpenses && convertedPayload.additionalExpenses.amount) {
        convertedPayload.additionalExpenses.amount = Math.round(convertedPayload.additionalExpenses.amount * exchangeRate * 100) / 100;
      }

      // Convert discount amount (if it's a fixed amount)
      if (convertedPayload.discount && convertedPayload.discountType === 'fixed') {
        convertedPayload.discount = Math.round(convertedPayload.discount * exchangeRate * 100) / 100;
      }

      // Update currency
      convertedPayload.currency = targetCurrency.toUpperCase();

      return convertedPayload;
    } catch (error) {
      console.error('Error converting quotation currency:', error.message);
      
      // Return original payload with error info
      return {
        ...quotationPayload,
        conversionError: error.message
      };
    }
  }
}

module.exports = new CurrencyService();
