const axios = require('axios');
const NodeCache = require('node-cache');

class AddonClient {
  constructor(addonUrl) {
    this.addonUrl = addonUrl;
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
  }

  async getManifest() {
    const cacheKey = 'manifest';
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.addonUrl}/manifest.json`);
      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch manifest: ${error.message}`);
    }
  }

  async getCatalog(type, id, extra = {}) {
    const cacheKey = `catalog_${type}_${id}_${JSON.stringify(extra)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams(extra).toString();
      const url = `${this.addonUrl}/catalog/${type}/${id}${params ? '?' + params : ''}.json`;
      
      const response = await axios.get(url);
      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch catalog: ${error.message}`);
    }
  }

  async getMeta(type, id) {
    const cacheKey = `meta_${type}_${id}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.addonUrl}/meta/${type}/${id}.json`);
      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch meta: ${error.message}`);
    }
  }

  async getStream(type, id) {
    // Don't cache streams as they may contain temporary URLs
    try {
      const response = await axios.get(`${this.addonUrl}/stream/${type}/${id}.json`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch stream: ${error.message}`);
    }
  }

  clearCache() {
    this.cache.flushAll();
    console.log('Addon cache cleared');
  }
}

module.exports = AddonClient;