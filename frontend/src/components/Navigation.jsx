import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Home, List, Calendar, Clock } from 'lucide-react';

const Navigation = () => {
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [contentFilter, setContentFilter] = useState('all'); // 'all', 'series', 'movie'
    const [sortBy, setSortBy] = useState('recent'); // 'recent', 'latest', 'popular'

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="anime-nav">
            <div className="nav-container">
                <Link to="/" className="nav-brand">
                    <img src="https://i.ibb.co/0bK2hLY/Chat-GPT-Image-Nov-4-2025-12-07-32-AM-upscaled.png" alt="Anime Shrine" className="nav-logo" />
                    <span>Anime Shrine</span>
                </Link>

                {/* Search in Navigation */}
                <div className="nav-search">
                    <Search className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search anime..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim()) {
                                window.location.href = `/index?search=${encodeURIComponent(searchQuery)}`;
                            }
                        }}
                    />
                </div>

                {/* Main Navigation Buttons - NO Completed */}
                <div className="nav-links">
                    <Link to="/" className={`nav-btn ${isActive('/') ? 'active' : ''}`}>
                        <Home className="w-4 h-4" />
                        Home
                    </Link>
                    <Link to="/index" className={`nav-btn ${isActive('/index') ? 'active' : ''}`}>
                        <List className="w-4 h-4" />
                        All Anime
                    </Link>
                    <Link to="/ongoing" className={`nav-btn ${isActive('/ongoing') ? 'active' : ''}`}>
                        <Clock className="w-4 h-4" />
                        Ongoing
                    </Link>
                    <Link to="/schedule" className={`nav-btn ${isActive('/schedule') ? 'active' : ''}`}>
                        <Calendar className="w-4 h-4" />
                        Schedule
                    </Link>
                    <Link to="/recent" className={`nav-btn ${isActive('/recent') ? 'active' : ''}`}>
                        <Clock className="w-4 h-4" />
                        Recent
                    </Link>
                </div>
            </div>

            {/* Filter Box Below Navigation */}
            <div className="filter-box">
                <div className="filter-section">
                    <span className="filter-label">Content Type:</span>
                    <div className="content-type-toggle">
                        <button
                            className={`filter-btn ${contentFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setContentFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`filter-btn ${contentFilter === 'series' ? 'active' : ''}`}
                            onClick={() => setContentFilter('series')}
                        >
                            Series
                        </button>
                        <button
                            className={`filter-btn ${contentFilter === 'movie' ? 'active' : ''}`}
                            onClick={() => setContentFilter('movie')}
                        >
                            Movies
                        </button>
                    </div>
                </div>

                <div className="filter-section">
                    <span className="filter-label">Sort By:</span>
                    <div className="sort-options">
                        <button
                            className={`filter-btn ${sortBy === 'recent' ? 'active' : ''}`}
                            onClick={() => setSortBy('recent')}
                        >
                            Recent
                        </button>
                        <button
                            className={`filter-btn ${sortBy === 'latest' ? 'active' : ''}`}
                            onClick={() => setSortBy('latest')}
                        >
                            Latest
                        </button>
                        <button
                            className={`filter-btn ${sortBy === 'popular' ? 'active' : ''}`}
                            onClick={() => setSortBy('popular')}
                        >
                            Popular
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
