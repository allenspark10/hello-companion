import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import api from '../services/api';

const Search = ({ onResultSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    setError(null);

    try {
      // Search through all catalogs
      const manifest = await api.getManifest();
      let allResults = [];

      for (const catalog of manifest.catalogs) {
        try {
          const catalogData = await api.getCatalog(catalog.type, catalog.id, {
            search: searchQuery
          });
          
          if (catalogData.metas) {
            allResults = [...allResults, ...catalogData.metas];
          }
        } catch (err) {
          console.error(`Failed to search catalog ${catalog.id}:`, err);
        }
      }

      // Filter results by query (client-side filtering)
      const filtered = allResults.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setResults(filtered);
    } catch (err) {
      setError('Search failed');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (item) => {
    onResultSelect(item);
    setQuery('');
    setResults([]);
    if (onClose) onClose();
  };

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <SearchIcon className="search-input-icon" />
        <input
          type="text"
          placeholder="Search for movies, shows..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input-field"
          autoFocus
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="search-clear-btn"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {loading && (
        <div className="search-loading">
          <div className="spinner"></div>
          <p>Searching...</p>
        </div>
      )}

      {error && (
        <div className="search-error">
          <p>{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((item) => (
            <div
              key={item.id}
              className="search-result-item"
              onClick={() => handleResultClick(item)}
            >
              {item.poster && (
                <img
                  src={item.poster}
                  alt={item.name}
                  className="search-result-poster"
                />
              )}
              <div className="search-result-info">
                <h4>{item.name}</h4>
                <p className="search-result-meta">
                  {item.type} {item.releaseInfo && `• ${item.releaseInfo}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="search-empty">
          <p>No results found for "{query}"</p>
        </div>
      )}

      <style jsx>{`
        .search-container {
          position: relative;
          width: 100%;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input-icon {
          position: absolute;
          left: 1rem;
          width: 1.25rem;
          height: 1.25rem;
          color: #888;
          pointer-events: none;
        }

        .search-input-field {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.875rem 3rem 0.875rem 3rem;
          border-radius: 2rem;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .search-input-field:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.15);
          border-color: #e50914;
        }

        .search-clear-btn {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 0.5rem;
          transition: color 0.2s ease;
        }

        .search-clear-btn:hover {
          color: white;
        }

        .search-loading,
        .search-error,
        .search-empty {
          text-align: center;
          padding: 2rem;
          color: #888;
        }

        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(229, 9, 20, 0.3);
          border-top-color: #e50914;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.5rem;
          background: #1a1a1a;
          border-radius: 0.75rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
          max-height: 400px;
          overflow-y: auto;
          z-index: 100;
        }

        .search-result-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          cursor: pointer;
          transition: background 0.2s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .search-result-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .search-result-poster {
          width: 60px;
          height: 90px;
          object-fit: cover;
          border-radius: 0.5rem;
        }

        .search-result-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .search-result-info h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .search-result-meta {
          font-size: 0.875rem;
          color: #888;
        }
      `}</style>
    </div>
  );
};

export default Search;