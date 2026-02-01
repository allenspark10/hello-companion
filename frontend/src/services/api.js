import axios from 'axios';

// Prefer same-origin "/api" in production; fall back to explicit URL for local dev
const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = {
  async getManifest() {
    const response = await axios.get(`${API_URL}/manifest`);
    return response.data;
  },

  async getCatalog(type, id, extra = {}) {
    const params = new URLSearchParams(extra).toString();
    const url = `${API_URL}/catalog/${type}/${id}${params ? '?' + params : ''}`;
    const response = await axios.get(url);
    return response.data;
  },

  async getMeta(type, id) {
    const response = await axios.get(`${API_URL}/meta/${type}/${id}`);
    return response.data;
  },

  async getStream(type, id) {
    const response = await axios.get(`${API_URL}/stream/${type}/${id}`);
    return response.data;
  },

  async getRecent(type) {
    const response = await axios.get(`${API_URL}/recent/${type}`);
    return response.data;
  },

  // Paginated recent for Load More functionality
  async getRecentPaginated(type, page = 1, pageSize = 24) {
    const response = await axios.get(`${API_URL}/recent/${type}/paginated?page=${page}&page_size=${pageSize}`);
    return response.data;
  },

  // Optimized Load More: bypasses 24-limit, returns filtered essential data
  async getRecentLoadMore(type, page = 1, pageSize = 48) {
    const response = await axios.get(`${API_URL}/recent/${type}/load-more?page=${page}&page_size=${pageSize}`);
    return response.data;
  },

  async getProxiedStream(streamId) {
    const response = await axios.get(`${API_URL}/stream/proxy/${streamId}`);
    return response.data;
  },

  async getStreamInfo(streamId) {
    const response = await axios.get(`${API_URL}/stream/info/${streamId}`);
    return response.data;
  },

  async cleanupStream(streamId) {
    const response = await axios.delete(`${API_URL}/stream/cleanup/${streamId}`);
    return response.data;
  },

  async getIndex(type) {
    const response = await axios.get(`${API_URL}/index?type=${type}`);
    return response.data;
  },

  // 🔍 Search function for MongoDB backend search
  async getSearchResults(query, type = null) {
    const params = new URLSearchParams({ query });
    if (type) params.append('type', type);

    const response = await axios.get(`${API_URL}/index/search?${params.toString()}`);
    return response.data;
  },

  // 📅 Schedule function - get cached schedule from backend
  async getSchedule() {
    const response = await axios.get(`${API_URL}/schedule`);
    return response.data;
  },

  // 🔥 Ongoing function - get cached ongoing anime from backend
  async getOngoing() {
    const response = await axios.get(`${API_URL}/ongoing`);
    return response.data;
  }
};

export default api;
