import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Play, Download, Search, Menu, Star, Calendar, Copy, ArrowLeft, ChevronRight, Film, X, Loader, Twitter, Github, Instagram, Facebook, Clock, Send } from 'lucide-react';
import api from './services/api';
import SEO from './components/SEO';
import StructuredData from './components/StructuredData';
import AnimeDetailRedirect from './components/AnimeDetailRedirect';
import AudioBadges from './components/AudioBadges';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import SchedulePage from './pages/SchedulePage';
import OngoingPage from './pages/OngoingPage';
import RecentPage from './pages/RecentPage';
import GenrePage from './pages/GenrePage';
import { createSlug, extractImdbId } from './utils/slugify';
import './AnimeApp.css';
import './OverrideFixes.css';
import useDevToolsProtection from './hooks/useDevToolsProtection';
import DevToolsWarning from './components/DevToolsWarning';

// Add viewport meta tag to prevent zoom on double-tap
if (typeof document !== 'undefined') {
  let viewport = document.querySelector('meta[name=viewport]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
}

// ==================== SMART SCROLL MANAGEMENT ====================
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);

  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
      console.log('🔒 Browser scroll restoration disabled');
    }
  }, []);

  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    // Match anime details: /series/{name}/{id}
    const isAnimeDetails = pathname.match(/^\/series\/[^\/]+\/[^\/]+$/) !== null;
    const isPrevAnimeDetails = prevPathname.match(/^\/series\/[^\/]+\/[^\/]+$/) !== null;
    const isHomepage = pathname === '/' || pathname === '';
    const isPrevEpisodePage = prevPathname.startsWith('/download/');

    console.log(`📍 Scroll Navigation: ${prevPathname} → ${pathname}`);
    console.log(`   isAnimeDetails: ${isAnimeDetails}, isPrevEpisodePage: ${isPrevEpisodePage}`);

    // Homepage: Clear anime details scroll cache
    if (isHomepage) {
      sessionStorage.removeItem('animeDetailsScrollPosition');
      console.log('🏠 Homepage: Cleared scroll cache, scrolling to top');
      window.scrollTo(0, 0);
    }
    // Anime details: Check if we should restore scroll position
    else if (isAnimeDetails) {
      const savedPosition = sessionStorage.getItem('animeDetailsScrollPosition');
      console.log(`📖 Anime details page, saved position: ${savedPosition}`);

      // If we're returning from an episode page and have saved position, restore it
      if (savedPosition && isPrevEpisodePage) {
        const pos = parseInt(savedPosition, 10);
        console.log(`⬆️ Restoring scroll to position: ${pos}px`);
        setTimeout(() => {
          window.scrollTo(0, pos);
          console.log(`✅ Scrolled to: ${window.scrollY}px`);
        }, 800); // Wait for content to load before scrolling
      }
      // If we're navigating between anime details pages or from other pages, scroll to top
      else if (!isPrevAnimeDetails || !savedPosition) {
        console.log('🔝 New anime details page, scrolling to top');
        window.scrollTo(0, 0);
      }
      // If we're on the same anime details page (refresh or coming from another anime details), restore if available
      else if (savedPosition) {
        const pos = parseInt(savedPosition, 10);
        console.log(`♻️ Same anime details, restoring to: ${pos}px`);
        setTimeout(() => {
          window.scrollTo(0, pos);
        }, 800); // Wait for content to load before scrolling
      }
    }
    // All other pages: Scroll to top
    else {
      // Only clear cache if navigating away from anime details to non-episode pages
      if (isPrevAnimeDetails && !pathname.startsWith('/download/')) {
        sessionStorage.removeItem('animeDetailsScrollPosition');
        console.log('🗑️ Cleared scroll cache (leaving anime details)');
      }
      console.log('🔝 Other page, scrolling to top');
      window.scrollTo(0, 0);
    }

    prevPathnameRef.current = pathname;
  }, [pathname]);

  // Save anime details scroll position while on the page
  useEffect(() => {
    // Only save scroll position on anime details pages
    const isAnimeDetails = pathname.match(/^\/series\/[^\/]+\/[^\/]+$/) !== null;
    if (!isAnimeDetails) return;

    console.log('💾 Scroll saver active for anime details page');

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      sessionStorage.setItem('animeDetailsScrollPosition', scrollY.toString());
      console.log(`💾 Saved scroll position: ${scrollY}px`);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      console.log('🛑 Scroll saver deactivated');
    };
  }, [pathname]);

  return null;
};

// ==================== PARSER UTILITIES ====================
const parseAudioLanguages = (filename) => {
  if (!filename) return ['Unknown'];
  const langs = [];
  const lower = filename.toLowerCase();

  // Debug logging
  console.log('🔍 Parsing audio from filename:', filename);

  if (lower.includes('dual') && !lower.includes('sub')) {
    langs.push('English', 'Japanese');
  } else if (lower.includes('sub') && !lower.includes('dual')) {
    langs.push('Japanese');
  } else {
    // Use word boundary matching to avoid false positives (e.g., "tel" in "girlfriend")
    if (/\b(hin|hindi)\b/.test(lower)) langs.push('Hindi');
    if (/\b(tam|tamil)\b/.test(lower)) langs.push('Tamil');
    if (/\b(tel|telugu)\b/.test(lower)) langs.push('Telugu');
    if (/\b(eng|english)\b/.test(lower)) langs.push('English');
    if (/\b(jap|japanese)\b/.test(lower)) langs.push('Japanese');
    if (/\b(kan|kannada)\b/.test(lower)) langs.push('Kannada');
    if (/\b(ben|bengali)\b/.test(lower)) langs.push('Bengali');
    if (/\b(mal|malayalam)\b/.test(lower)) langs.push('Malayalam');
  }

  console.log('✅ Detected languages:', langs.length > 0 ? langs : ['Multi-Audio']);
  return langs.length > 0 ? langs : ['Multi-Audio'];
};

const parseQuality = (filename) => {
  const match = filename?.match(/(\d+p|4K|2K|HD|FHD|UHD)/i);
  return match ? match[0].toUpperCase() : 'HDRip';
};

const parseSize = (stream) => {
  if (stream.title) {
    const match = stream.title.match(/💾\s*([^\n]+)/);
    if (match) return match[1].trim();
  }

  if (stream.name) {
    let match = stream.name.match(/Size[:\s-]*\[([^\]]+)\]/i);
    if (!match) match = stream.name.match(/\[(\d+(?:\.\d+)?\s*(?:MB|GB|KB))\]/i);
    if (!match) match = stream.name.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB))/i);

    if (match) return match[1].trim().toUpperCase();
  }

  return 'Unknown';
};

// ==================== GROUPING UTILITIES ====================
const groupAnimeByBase = (catalog) => {
  const grouped = {};
  const INF = Number.MAX_SAFE_INTEGER;

  catalog.forEach(item => {
    const baseTmdbId = item.id.split('-')[0];
    const itemRank = item.recentRank ?? INF;

    if (!grouped[baseTmdbId]) {
      grouped[baseTmdbId] = {
        ...item,
        baseId: baseTmdbId,
        allSeasons: [item],
        recentRank: itemRank
      };
    } else {
      grouped[baseTmdbId].allSeasons.push(item);
      // Preserve minimal recent rank across seasons of same base
      grouped[baseTmdbId].recentRank = Math.min(grouped[baseTmdbId].recentRank ?? INF, itemRank);
      if (item.videos?.length > grouped[baseTmdbId].videos?.length) {
        const seasons = grouped[baseTmdbId].allSeasons;
        const prevRank = grouped[baseTmdbId].recentRank;
        grouped[baseTmdbId] = { ...item, baseId: baseTmdbId, allSeasons: seasons, recentRank: prevRank };
      }
    }
  });

  return Object.values(grouped);
};

// ==================== SKELETON COMPONENT ====================
const SkeletonCard = () => (
  <div className="anime-card skeleton-card">
    <div className="anime-card-image">
      <div className="skeleton-image"></div>
    </div>
    <div className="skeleton-info">
      <div className="skeleton-title"></div>
      <div className="skeleton-meta"></div>
    </div>
  </div>
);

// ==================== HERO CAROUSEL ====================
const HeroCarousel = ({ items, onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  // Auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      goNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [goNext]);

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }
    if (touchStart - touchEnd < -75) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      className="hero-carousel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hero-nav">
        <button
          className="hero-arrow hero-arrow-left"
          aria-label="Previous"
          onClick={goPrev}
        >
          <ChevronRight className="w-5 h-5" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button
          className="hero-arrow hero-arrow-right"
          aria-label="Next"
          onClick={goNext}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
        >
          <img src={item.background || item.poster} alt={item.name} className="hero-bg" />
          <div className="hero-overlay">
            <div className="hero-content">
              <h1 className="hero-title">{item.name}</h1>
              <div className="hero-meta">
                <span><Calendar className="w-4 h-4" /> {item.year || 'N/A'}</span>
                <span><Star className="w-4 h-4 text-yellow-400" /> {item.imdbRating || 'N/A'}</span>
                <span>{item.type === 'movie' ? 'Movie' : 'Series'}</span>
              </div>
              {item.genres && item.genres.length > 0 && (
                <div className="hero-genres" style={{
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem'
                }}>
                  {item.genres.slice(0, 4).map((genre, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(138, 43, 226, 0.2)',
                      border: '1px solid rgba(138, 43, 226, 0.4)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      {genre}
                    </span>
                  ))}
                </div>
              )}
              <p className="hero-desc">{item.description || 'No description available.'}</p>
              <div className="hero-actions">
                <button className="btn-primary" onClick={() => onSelect(item)}>
                  <Play className="w-5 h-5 inline mr-2" /> Watch Now
                </button>
                <button className="btn-secondary" onClick={() => onSelect(item)}>
                  More Info
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="hero-dots">
        {items.map((_, index) => (
          <div
            key={index}
            className={`hero-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};

// ==================== FOOTER COMPONENT ====================
const Footer = () => (
  <footer className="site-footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-col">
          <div className="nav-brand" style={{ marginBottom: '1rem' }}>
            <img src="https://i.ibb.co/0bK2hLY/Chat-GPT-Image-Nov-4-2025-12-07-32-AM-upscaled.png" alt="Anime Shrine" style={{ height: '40px' }} />
            Anime Shrine
          </div>
          <p className="footer-desc">
            Your ultimate destination for downloading anime in high quality. We provide fast downloads with multiple quality options and hosting servers.
          </p>
          <div className="social-links">
            <a href="https://discord.gg/yourinvite" target="_blank" rel="noreferrer" className="social-btn" aria-label="Discord">
              <img src="https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Discord" style={{ width: '20px' }} />
            </a>
            <a href={process.env.REACT_APP_TELEGRAM_URL || 'https://t.me/Anime_Canon'} target="_blank" rel="noreferrer" className="social-btn" aria-label="Telegram">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/2048px-Telegram_logo.svg.png" alt="Telegram" style={{ width: '20px' }} />
            </a>
            <a href="#" className="social-btn" aria-label="Twitter">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="social-btn" aria-label="GitHub">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h3>Quick Links</h3>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/index">All Anime</Link>
            <Link to="/ongoing">Ongoing Series</Link>
            <Link to="/schedule">Release Schedule</Link>
            <Link to="/recent">Recent Uploads</Link>
            <Link to="/completed">Completed Series</Link>
          </div>
        </div>

        <div className="footer-col">
          <h3>Popular Genres</h3>
          <div className="footer-links" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <Link to="/genre/action">Action</Link>
            <Link to="/genre/adventure">Adventure</Link>
            <Link to="/genre/comedy">Comedy</Link>
            <Link to="/genre/drama">Drama</Link>
            <Link to="/genre/fantasy">Fantasy</Link>
            <Link to="/genre/romance">Romance</Link>
            <Link to="/genre/sci-fi">Sci-Fi</Link>
            <Link to="/genre/slice-of-life">Slice of Life</Link>
            <Link to="/genre/supernatural">Supernatural</Link>
            <Link to="/genre/isekai">Isekai</Link>
            <Link to="/genre/horror">Horror</Link>
            <Link to="/genre/mystery">Mystery</Link>
            <Link to="/genre/thriller">Thriller</Link>
            <Link to="/genre/school">School</Link>
            <Link to="/genre/sports">Sports</Link>
            <Link to="/genre/mecha">Mecha</Link>
            <Link to="/genre/psychological">Psychological</Link>
          </div>
        </div>

        <div className="footer-col">
          <h3>Information</h3>
          <div className="footer-links">
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/dmca">DMCA</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Made with ❤️ for anime fans</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}>
          Disclaimer: This site does not store any files on its server. All contents are provided by non-affiliated third parties.
        </p>
        <p style={{ marginTop: '0.5rem' }}>© 2026 Anime Shrine. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

// ==================== HOME PAGE WITH MANUAL SEARCH (ENTER KEY ONLY) ====================
const HomePage = ({ catalog, onAnimeSelect, sortBy, setSortBy, contentType, setContentType, loading }) => {
  const navigate = useNavigate();
  const location = useLocation(); // Add useLocation hook to monitor URL changes
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // What we're actually searching for
  const [page, setPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [ongoingFeed, setOngoingFeed] = useState([]);
  const [ongoingLoading, setOngoingLoading] = useState(true);
  const ITEMS_PER_PAGE = 12;

  const groupedCatalog = groupAnimeByBase(catalog);

  // Parse search from URL on mount and when URL changes
  useEffect(() => {
    const parseUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlSearch = params.get('search') || params.get('q') || '';
      const hash = (window.location.hash || '').replace('#', '').toLowerCase();

      // Update both input and active search
      if (urlSearch !== searchQuery) {
        setSearchQuery(urlSearch);
        setActiveSearchQuery(urlSearch);
        // Trigger search if URL has search param
        if (urlSearch) {
          performSearch(urlSearch);
        } else {
          // Clear search results if no search param in URL
          setSearchResults([]);
        }
      }

      // Handle hash for filters
      if (!hash) return;
      const [typePart, sortPart] = hash.split('_');
      const mappedType = typePart === 'series' || typePart === 'movie' ? typePart : null;
      const mappedSort = sortPart === 'latest' || sortPart === 'popular' || sortPart === 'recent' ? sortPart : null;
      if (mappedType && mappedType !== contentType) setContentType(mappedType);
      if (mappedSort && mappedSort !== sortBy) setSortBy(mappedSort);
      if (mappedType || mappedSort) setPage(1);
    };

    parseUrl();

    const onPopState = () => parseUrl();
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [location.search]); // Add location.search as dependency so effect re-runs when URL changes

  // Function to perform the actual search
  const performSearch = async (query) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      console.log(`🔍 Searching backend for: "${trimmedQuery}"`);
      const data = await api.getSearchResults(trimmedQuery, null); // Don't filter by type - show both series and movies
      console.log(`✅ Found ${data.results.length} results`);

      // Group results by base ID
      const groupedResults = groupAnimeByBase(data.results);
      setSearchResults(groupedResults);
      setActiveSearchQuery(trimmedQuery);
    } catch (error) {
      console.error('❌ Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Enter key press
  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedQuery = searchQuery.trim();

      // Update URL
      if (trimmedQuery.length > 0) {
        const params = new URLSearchParams(window.location.search);
        params.set('search', trimmedQuery);
        const hash = window.location.hash;
        const newUrl = `?${params.toString()}${hash}`;
        window.history.pushState({}, '', newUrl);

        // Perform search
        performSearch(trimmedQuery);
        setPage(1);
      } else {
        // Clear search
        handleClearSearch();
      }
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearchQuery('');
    setSearchResults([]);
    setPage(1);

    // Remove search param from URL
    const params = new URLSearchParams(window.location.search);
    params.delete('search');
    params.delete('q');
    const hash = window.location.hash;
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}${hash}` : `/${hash}`;
    window.history.pushState({}, '', newUrl);

    document.querySelector('.search-input')?.focus();
  };

  const pushHash = (type, sort) => {
    const t = type || contentType;
    const s = sort || sortBy;
    const nextHash = `#${t}_${s}`;

    // Preserve search params
    const params = new URLSearchParams(window.location.search);
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}${nextHash}` : `/${nextHash}`;

    if (window.location.href !== window.location.origin + newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  };

  // Note: We don't re-search when contentType changes anymore since search shows all types

  // Helper to map ongoing data to catalog items
  const getAnimeInCatalog = useCallback((titleObj) => {
    if (!catalog) return null;
    const normalize = (str) => str?.toLowerCase().replace(/[^\w\s]/g, '') || '';
    const titles = [titleObj?.english, titleObj?.romaji, titleObj?.native].filter(Boolean);
    return catalog.find(item => {
      const itemTitle = normalize(item.name || item.title);
      return titles.some(t => {
        const target = normalize(t);
        if (itemTitle === target) return true;
        if ((itemTitle.includes(target) || target.includes(itemTitle)) && target.length >= 4 && itemTitle.length >= 4) {
          return true;
        }
        return false;
      });
    });
  }, [catalog]);

  // Fetch ongoing feed (Mongo-backed)
  useEffect(() => {
    const loadOngoing = async () => {
      try {
        setOngoingLoading(true);
        const data = await api.getOngoing();
        const mapped = (data.media || [])
          .map((anime) => {
            const catalogItem = getAnimeInCatalog(anime.title);
            if (!catalogItem) return null;
            return {
              ...catalogItem,
              coverImage: anime.coverImage,
              nextAiringEpisode: anime.nextAiringEpisode,
              averageScore: anime.averageScore
            };
          })
          .filter(Boolean)
          .slice(0, 12);
        setOngoingFeed(mapped);
      } catch (err) {
        console.error('❌ Ongoing load failed:', err);
        setOngoingFeed([]);
      } finally {
        setOngoingLoading(false);
      }
    };
    loadOngoing();
  }, [getAnimeInCatalog]);

  // Use search results if we have an active search, otherwise use catalog
  const displaySource = activeSearchQuery.trim().length > 0 ? searchResults : groupedCatalog;

  const filteredAnime = displaySource
    .filter(item => {
      // If searching, show all types regardless of tab selection
      if (activeSearchQuery) return true;
      const matchesType = contentType === 'all' || item.type === contentType;
      return matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'latest') return (b.year || 0) - (a.year || 0);
      if (sortBy === 'popular') return (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0);
      if (sortBy === 'recent') {
        const aRecent = a.isRecent ? 1 : 0;
        const bRecent = b.isRecent ? 1 : 0;
        if (aRecent !== bRecent) return bRecent - aRecent;
        if (aRecent === 1 && bRecent === 1) {
          const ar = a.recentRank ?? Number.MAX_SAFE_INTEGER;
          const br = b.recentRank ?? Number.MAX_SAFE_INTEGER;
          return ar - br;
        }
        return 0;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredAnime.length / ITEMS_PER_PAGE);
  const displayedAnime = filteredAnime.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = page < totalPages;

  // Get featured items for carousel (random 5 from catalog)
  const featuredItems = React.useMemo(() => {
    if (!catalog || catalog.length === 0) return [];
    // Filter for items with wide images or just high rated ones
    const candidates = catalog.filter(i => i.poster && (i.imdbRating > 7 || i.year > 2023));
    return candidates.sort(() => 0.5 - Math.random()).slice(0, 5);
  }, [catalog]);

  const recentRail = React.useMemo(
    () => catalog.filter(i => i.isRecent || i.recentRank !== undefined).slice(0, 12),
    [catalog]
  );

  const moviesRail = React.useMemo(
    () => catalog.filter(i => i.type === 'movie').slice(0, 12),
    [catalog]
  );

  const ongoingRail = ongoingFeed.length ? ongoingFeed : [];

  const popularRail = React.useMemo(() => {
    const scored = [...catalog].sort((a, b) => (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0));
    return scored.slice(0, 12);
  }, [catalog]);

  const railSets = [
    { title: 'Popular of all time', items: popularRail },
    { title: 'Ongoing Now', items: ongoingRail.length ? ongoingRail : filteredAnime.slice(0, 12), loadMore: () => navigate('/ongoing') },
    { title: 'Recent Uploads', items: recentRail.length ? recentRail : filteredAnime.slice(0, 12), loadMore: () => navigate('/recent') },
    { title: 'Movies Spotlight', items: moviesRail.length ? moviesRail : filteredAnime.filter(i => i.type === 'movie').slice(0, 12), loadMore: () => navigate('/index#movies') }
  ];

  const randomGrid = React.useMemo(() => {
    const shuffled = [...catalog].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 50);
  }, [catalog]);

  const renderRail = (title, items, loadMore) => {
    if (!items || items.length === 0) return null;
    return (
      <section className="home-rail" key={title}>
        <div className="home-rail-header">
          <div className="home-rail-title">{title}</div>
          {loadMore && (
            <button className="rail-load-more" aria-label={`See more ${title}`} onClick={loadMore}>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="home-rail-track">
          {items.map((anime) => (
            <div className="home-rail-card" key={anime.baseId || anime.id} onClick={() => onAnimeSelect(anime)}>
              <div className="anime-card">
                <div className="anime-card-image">
                  <img
                    src={anime.poster}
                    alt={anime.name}
                    className="anime-poster"
                    loading="lazy"
                  />
                  {anime.allSeasons && anime.allSeasons.length > 1 && (
                    <div className="season-badge">{anime.allSeasons.length} Seasons</div>
                  )}
                  <AudioBadges totalSub={anime.totalSub} totalDub={anime.totalDub} />
                </div>
                <div className="anime-info">
                  <h3 className="anime-title">{anime.name}</h3>
                  <div className="anime-meta">
                    {anime.year && (
                      <span className="anime-year">
                        <Calendar className="w-4 h-4" />
                        {anime.year}
                      </span>
                    )}
                    {anime.imdbRating && (
                      <span className="anime-rating">
                        <Star className="w-4 h-4" fill="gold" />
                        {anime.imdbRating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="home-page">
      {!activeSearchQuery && <HeroCarousel items={featuredItems} onSelect={onAnimeSelect} />}

      <div className="home-header">
        {/* Search status indicator */}
        {
          activeSearchQuery && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: '0.5rem'
            }}>
              {isSearching ? (
                <span>🔍 Searching...</span>
              ) : (
                <span>
                  Found {filteredAnime.length} result{filteredAnime.length !== 1 ? 's' : ''} for "{activeSearchQuery}"
                </span>
              )}
            </div>
          )
        }
      </div >

      {/* Full-screen loading overlay during search */}
      {isSearching && (
        <div className="page-loader-overlay">
          <div className="circular-loader"></div>
        </div>
      )}

      {loading && displayedAnime.length === 0 && !activeSearchQuery ? (
        <div className="anime-grid">
          {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !isSearching && displayedAnime.length === 0 ? (
        <div className="no-results">
          <p>{activeSearchQuery ? `No results found for "${activeSearchQuery}"` : 'No anime found'}</p>
          {activeSearchQuery && (
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>
              Try a different search term or check the Index page
            </p>
          )}
        </div>
      ) : (
        <>
          {!activeSearchQuery && (
            loading ? (
              <div className="home-rail home-rail-skeleton">
                <div className="home-rail-header">
                  <div className="home-rail-title">Loading…</div>
                </div>
                <div className="home-rail-track">
                  {[...Array(6)].map((_, idx) => (
                    <div className="home-rail-card" key={idx}>
                      <div className="anime-card skeleton-card">
                        <div className="anime-card-image">
                          <div className="skeleton-image"></div>
                        </div>
                        <div className="skeleton-info">
                          <div className="skeleton-title"></div>
                          <div className="skeleton-meta"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {railSets.map((rail) => renderRail(rail.title, rail.items, rail.loadMore))}
                <section className="home-grid">
                  <div className="home-grid-header">
                    <div className="home-grid-title">Explore More</div>
                  </div>
                  <div className="home-grid-body">
                    {randomGrid.map((anime) => (
                      <div key={anime.baseId || anime.id} className="home-grid-card anime-card" onClick={() => onAnimeSelect(anime)}>
                        <div className="anime-card-image">
                          <img
                            src={anime.poster}
                            alt={anime.name}
                            className="anime-poster"
                            loading="lazy"
                          />
                          <AudioBadges totalSub={anime.totalSub} totalDub={anime.totalDub} />
                        </div>
                        <div className="anime-info">
                          <h3 className="anime-title">{anime.name}</h3>
                          <div className="anime-meta">
                            {anime.year && (
                              <span className="anime-year">
                                <Calendar className="w-4 h-4" />
                                {anime.year}
                              </span>
                            )}
                            {anime.imdbRating && (
                              <span className="anime-rating">
                                <Star className="w-4 h-4" fill="gold" />
                                {anime.imdbRating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Load More Button - Redirects to Recent Page */}
                <div className="load-more-container" style={{ marginTop: '3rem' }}>
                  <button
                    onClick={() => window.location.href = '/recent'}
                    className="load-more-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    Load More Recent Uploads
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <p className="load-more-text">
                    View all recent anime additions
                  </p>
                </div>
              </>
            )
          )}

          {activeSearchQuery && (
            <>
              <div className="anime-grid mobile-landscape-grid">
                {displayedAnime.map((anime) => (
                  <div key={anime.baseId || anime.id} className="anime-card" onClick={() => onAnimeSelect(anime)}>
                    <div className="anime-card-image">
                      <img
                        src={anime.poster}
                        alt={anime.name}
                        className="anime-poster desktop-poster"
                        loading="lazy"
                      />
                      <img
                        src={anime.background || anime.poster}
                        alt={anime.name}
                        className="anime-poster mobile-backdrop"
                        loading="lazy"
                      />
                      {anime.allSeasons && anime.allSeasons.length > 1 && (
                        <div className="season-badge">{anime.allSeasons.length} Seasons</div>
                      )}
                      <AudioBadges totalSub={anime.totalSub} totalDub={anime.totalDub} />
                    </div>
                    <div className="anime-info">
                      <h3 className="anime-title">{anime.name}</h3>
                      <div className="anime-meta">
                        {anime.year && (
                          <span className="anime-year">
                            <Calendar className="w-4 h-4" />
                            {anime.year}
                          </span>
                        )}
                        {anime.imdbRating && (
                          <span className="anime-rating">
                            <Star className="w-4 h-4" fill="gold" />
                            {anime.imdbRating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore ? (
                <div className="load-more-container">
                  <button onClick={() => setPage(page + 1)} className="load-more-btn" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem 2rem',
                    background: '#8a2be2',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '1rem',
                    margin: '0 auto',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)',
                    transition: 'all 0.3s ease'
                  }}>
                    Load More
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <p className="load-more-text">
                    Showing {displayedAnime.length} of {filteredAnime.length}
                  </p>
                </div>
              ) : displayedAnime.length > 0 && (
                <div style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  background: 'rgba(102, 126, 234, 0.1)',
                  borderRadius: '12px',
                  marginTop: '2rem',
                  border: '1px solid rgba(102, 126, 234, 0.2)'
                }}>
                  <h2 style={{
                    fontSize: '1.2rem',
                    marginBottom: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.95)',
                    fontWeight: '700'
                  }}>
                    🎬 You've reached the end!
                  </h2>
                  <p style={{
                    fontSize: '0.95rem',
                    marginBottom: '1.5rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: '1.6'
                  }}>
                    Can't find what you're looking for? Try searching or browse our complete alphabetical index.
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => {
                        document.querySelector('.search-input')?.focus();
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <Search className="w-4 h-4" />
                      Search Anime
                    </button>
                    <a
                      href="https://animeshrine.xyz/index"
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        textDecoration: 'none',
                        transition: 'transform 0.2s, background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                    >
                      📚 Browse Index
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div >
  );
};
// ==================== INDEX PAGE ====================
// Domain configuration - change this to update all links
const INDEX_DOMAIN = 'https://animeshrine.xyz'; // Change this for production: 'https://animeshrine.xyz'

const IndexPage = ({ onAnimeSelect, catalog }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize contentType from hash BEFORE first render to prevent race condition
  const getInitialContentType = () => {
    const hash = (window.location.hash || '').replace('#', '').toLowerCase();
    if (hash === 'movies' || hash === 'movie') {
      return 'movie';
    } else if (hash === 'anime' || hash === 'series') {
      return 'series';
    }
    return 'series'; // default
  };

  const [contentType, setContentType] = useState(getInitialContentType()); // 'series' or 'movie'
  const [indexData, setIndexData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLetters, setExpandedLetters] = useState({});
  const hasRestoredScroll = useRef(false);

  // Redirect to homepage if search query is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get('search') || params.get('q');
    if (searchQuery) {
      // Use replace to avoid adding to browser history
      navigate(`/?search=${encodeURIComponent(searchQuery)}`, { replace: true });
    }
  }, [location.search, navigate]);

  // Sync with URL hash (#anime or #movies)
  useEffect(() => {
    const handleHashChange = () => {
      console.log('🔍 IndexPage Hash:', window.location.hash);
      const hash = (window.location.hash || '').replace('#', '').toLowerCase();
      console.log('🔍 Parsed hash:', hash, 'Current contentType:', contentType);
      if (hash === 'movies' || hash === 'movie') {
        console.log('✅ Setting contentType to movie');
        setContentType('movie');
      } else if (hash === 'anime' || hash === 'series') {
        console.log('✅ Setting contentType to series');
        setContentType('series');
      }
    };

    // Run on mount to handle direct links
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []); // Use event listener instead of location.hash dependency

  // Cache keys for localStorage
  const CACHE_KEY_PREFIX = 'animeshrine_index_';
  const getExpandedLettersCacheKey = useCallback(() => `${CACHE_KEY_PREFIX}expanded_${contentType}`, [contentType]);
  const getScrollPositionCacheKey = useCallback(() => `${CACHE_KEY_PREFIX}scroll_${contentType}`, [contentType]);

  // Load index data
  useEffect(() => {
    const loadIndex = async () => {
      try {
        setLoading(true);
        console.log('📥 IndexPage - Loading index for contentType:', contentType);
        const data = await api.getIndex(contentType);
        console.log('📥 IndexPage - Loaded index data:', data?.letters?.length, 'letters, total:', data?.total);
        setIndexData(data);

        // Try to restore expanded letters from cache
        const cachedExpandedLetters = localStorage.getItem(getExpandedLettersCacheKey());
        if (cachedExpandedLetters) {
          try {
            const parsed = JSON.parse(cachedExpandedLetters);
            setExpandedLetters(parsed);
            console.log('📦 Restored expanded letters from cache:', parsed);
          } catch (e) {
            console.warn('Failed to parse cached expanded letters:', e);
            // Auto-expand first letter as fallback
            if (data.letters && data.letters.length > 0) {
              setExpandedLetters({ [data.letters[0]]: true });
            }
          }
        } else {
          // Auto-expand first letter if no cache
          if (data.letters && data.letters.length > 0) {
            setExpandedLetters({ [data.letters[0]]: true });
          }
        }
      } catch (error) {
        console.error('Failed to load index:', error);
        setIndexData(null);
      } finally {
        setLoading(false);
      }
    };

    loadIndex();
  }, [contentType, getExpandedLettersCacheKey]);

  // Restore scroll position after data loads and expanded letters are set
  useEffect(() => {
    if (!loading && indexData && Object.keys(expandedLetters).length > 0 && !hasRestoredScroll.current) {
      // Longer delay to ensure DOM is fully rendered with expanded sections
      setTimeout(() => {
        const cachedScrollPosition = localStorage.getItem(getScrollPositionCacheKey());
        if (cachedScrollPosition) {
          const scrollY = parseInt(cachedScrollPosition, 10);
          // Scroll using multiple methods to ensure it works
          window.scrollTo(0, scrollY);
          document.documentElement.scrollTop = scrollY;
          document.body.scrollTop = scrollY;
          console.log('📜 Restored scroll position:', scrollY);
        }
        hasRestoredScroll.current = true;
      }, 300);
    }
  }, [loading, indexData, expandedLetters, getScrollPositionCacheKey]);

  // Save expanded letters to cache whenever it changes
  useEffect(() => {
    if (Object.keys(expandedLetters).length > 0) {
      localStorage.setItem(getExpandedLettersCacheKey(), JSON.stringify(expandedLetters));
      console.log('💾 Saved expanded letters to cache:', expandedLetters);
    }
  }, [expandedLetters, contentType, getExpandedLettersCacheKey]);

  const toggleLetter = (letter) => {
    setExpandedLetters(prev => {
      const isCurrentlyExpanded = prev[letter];
      // Accordion behavior: Close all others, toggle current
      // If we are closing the current one, return empty object
      // If we are opening a new one, return object with just that letter
      const newState = isCurrentlyExpanded ? {} : { [letter]: true };

      // Scroll to the letter section after state update (always scroll, even if already expanded)
      setTimeout(() => {
        const letterElement = document.getElementById(`letter-section-${letter}`);
        if (letterElement) {
          const headerOffset = 100; // Offset for fixed header
          const elementPosition = letterElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, isCurrentlyExpanded ? 0 : 100); // No delay if already expanded, small delay if expanding

      return newState;
    });
  };

  // Continuously save scroll position as user scrolls
  useEffect(() => {
    if (!loading && indexData) {
      const handleScroll = () => {
        const scrollY = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
        localStorage.setItem(getScrollPositionCacheKey(), scrollY.toString());
      };

      // Save scroll position on scroll with debouncing
      let scrollTimeout;
      const debouncedHandleScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, 150);
      };

      window.addEventListener('scroll', debouncedHandleScroll, { passive: true });
      document.addEventListener('scroll', debouncedHandleScroll, { passive: true });

      return () => {
        window.removeEventListener('scroll', debouncedHandleScroll);
        document.removeEventListener('scroll', debouncedHandleScroll);
        clearTimeout(scrollTimeout);
      };
    }
  }, [loading, indexData, getScrollPositionCacheKey]);

  const handleItemClick = (item) => {
    // Capture scroll position immediately before navigation
    const scrollY = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
    localStorage.setItem(getScrollPositionCacheKey(), scrollY.toString());
    console.log('💾 Saved scroll position before navigation:', scrollY);

    // Find the anime in the catalog
    const anime = catalog.find(a => {
      const baseId = a.id.split('-')[0];
      const itemBaseId = item.id.split('-')[0];
      return a.type === contentType && (a.id === item.id || baseId === itemBaseId);
    });

    if (anime) {
      // Group with all seasons if available
      const baseTmdbId = anime.id.split('-')[0];
      const allRelatedSeasons = catalog.filter(a => {
        const baseId = a.id.split('-')[0];
        return baseId === baseTmdbId && a.type === contentType;
      });

      const groupedAnime = {
        ...anime,
        baseId: baseTmdbId,
        allSeasons: allRelatedSeasons.length > 1 ? allRelatedSeasons : [anime]
      };

      // Use the app's navigation instead of opening new tab
      onAnimeSelect(groupedAnime);
    } else {
      // If anime not found in catalog, create a minimal object from index data
      console.log(`⚠️ Anime not found in catalog, creating from index data: ${item.name}`);
      const minimalAnime = {
        id: item.id,
        name: item.name,
        poster: item.poster,
        type: contentType,
        year: item.year,
        imdbRating: item.imdbRating,
        baseId: item.id.split('-')[0],
        allSeasons: [{
          id: item.id,
          name: item.name,
          poster: item.poster,
          type: contentType,
          year: item.year,
          imdbRating: item.imdbRating
        }]
      };
      onAnimeSelect(minimalAnime);
    }
  };

  if (loading) {
    return (
      <div className="page-loader-overlay">
        <div className="circular-loader"></div>
      </div>
    );
  }

  if (!indexData || !indexData.data) {
    return (
      <div className="index-page">
        <div className="no-index-data">
          <p>No index data available. Please sync the catalog first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="index-page">
      <div className="index-header">
        <h1>Alphabetical Index</h1>
        <div className="index-type-selector">
          <button
            className={`index-type-btn ${contentType === 'series' ? 'active' : ''}`}
            onClick={() => {
              setContentType('series');
              window.history.replaceState({}, '', '/index#anime');
              setExpandedLetters({});
              // Clear scroll cache when switching types
              localStorage.removeItem(getScrollPositionCacheKey());
            }}
          >
            <Play className="w-4 h-4" />
            Series
          </button>
          <button
            className={`index-type-btn ${contentType === 'movie' ? 'active' : ''}`}
            onClick={() => {
              setContentType('movie');
              window.history.replaceState({}, '', '/index#movies');
              setExpandedLetters({});
              // Clear scroll cache when switching types
              localStorage.removeItem(getScrollPositionCacheKey());
            }}
          >
            <Film className="w-4 h-4" />
            Movies
          </button>
        </div>
        <p className="index-info">Total: {indexData.total} {contentType === 'series' ? 'series' : 'movies'}</p>
      </div>

      {/* Alphabet Button Bar */}
      <div className="alphabet-filter">
        {indexData.letters.map(letter => {
          const isActive = expandedLetters[letter];
          return (
            <button
              key={letter}
              className={`letter-btn ${isActive ? 'active' : ''}`}
              onClick={() => toggleLetter(letter)}
            >
              {letter.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="index-content">
        {indexData.letters.map(letter => {
          const items = indexData.data[letter] || [];
          const isExpanded = expandedLetters[letter];

          return (
            <div key={letter} id={`letter-section-${letter}`} className="index-letter-section">
              <button
                className="index-letter-header"
                onClick={() => toggleLetter(letter)}
              >
                <span className="letter-label">{letter}</span>
                <span className="letter-count">({items.length})</span>
                <span className="letter-toggle">{isExpanded ? '^' : '>'}</span>
              </button>

              {isExpanded && (
                <div className="index-items-grid">
                  {items.map(item => (
                    <a
                      key={item.id}
                      href={`${INDEX_DOMAIN}/${contentType}/${item.id}`}
                      className="index-item"
                      onClick={(e) => {
                        e.preventDefault();
                        handleItemClick(item);
                      }}
                    >
                      {item.poster && (
                        <img src={item.poster} alt={item.name} className="index-item-poster" />
                      )}
                      <div className="index-item-info">
                        <h3 className="index-item-name">{item.name}</h3>
                        {item.year && <span className="index-item-year">{item.year}</span>}
                        {item.imdbRating && (
                          <span className="index-item-rating">⭐ {item.imdbRating}</span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== DETAIL PAGE (FIXED - NO LOOPS) ====================
const AnimeDetailPage = ({ catalog = [], onEpisodeSelect }) => {
  const { imdbId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Try to get anime from location state, or find in catalog, or null (will fetch)
  const [anime, setAnime] = useState(location.state?.anime || catalog.find(a => a.id === imdbId || a.id.endsWith(`-${imdbId}`)) || null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [fullAnimeData, setFullAnimeData] = useState(anime);
  const [metaFetched, setMetaFetched] = useState(false);

  // Initialize selectedSeason from hash BEFORE first render to prevent race condition
  const getInitialSeason = () => {
    const hash = window.location.hash || '';
    if (hash.startsWith('#season-')) {
      const s = Number(hash.replace('#season-', ''));
      if (!isNaN(s) && s >= 0) {
        console.log('🎯 Initializing selectedSeason from hash:', s);
        return s;
      }
    }
    return null; // Will be set by useEffect once data loads
  };

  const [selectedSeason, setSelectedSeason] = useState(getInitialSeason());
  const [episodesPage, setEpisodesPage] = useState(1);
  const [movieStreams, setMovieStreams] = useState([]);
  const [loadingMovieStreams, setLoadingMovieStreams] = useState(false);
  const EPISODES_PER_PAGE = 100;

  // Fetch anime data - always fetch fresh when imdbId changes
  useEffect(() => {
    if (!imdbId) return;

    const fetchAnime = async () => {
      // Fix ID format: strip "tmdb:" prefix and ensure "-1" suffix
      let apiId = imdbId;
      if (apiId.includes(':')) {
        // Convert "tmdb:288589" to "288589-1"
        apiId = apiId.split(':')[1] + '-1';
      } else if (!apiId.includes('-')) {
        // Add "-1" suffix if missing
        apiId = apiId + '-1';
      }

      console.log(`🔄 Fetching fresh data for: ${imdbId} (API ID: ${apiId})`);

      // 1. Try to find in catalog first for quick initial display
      const found = catalog.find(a => a.id === imdbId || a.id.endsWith(`-${imdbId}`) || a.id === `tmdb:${apiId.split('-')[0]}`);
      if (found) {
        setAnime(found);
        setFullAnimeData(found);
      }

      // 2. Always fetch fresh data from API (even if found in catalog)
      // This ensures we have episodes, ratings, etc.
      try {
        const data = await api.getMeta('series', apiId);
        if (data && data.meta) {
          setAnime(data.meta);
          setFullAnimeData(data.meta);
        } else {
          // Try movie if series fails
          const movieData = await api.getMeta('movie', apiId);
          if (movieData && movieData.meta) {
            setAnime(movieData.meta);
            setFullAnimeData(movieData.meta);
          }
        }
      } catch (e) {
        console.error("Failed to fetch anime details", e);
        // If fetch fails but we have catalog data, keep using it
        if (!found) {
          setAnime(null);
          setFullAnimeData(null);
        }
      }
    };

    fetchAnime();
  }, [imdbId, catalog]);

  useEffect(() => {
    if (!fullAnimeData) return;

    console.log(`🔄 Anime changed to: ${fullAnimeData.name} (${fullAnimeData.id})`);
    // ... rest of effect
    setMetaFetched(false);
    setSelectedSeason(null);
    setLoadingMeta(false);
    setEpisodesPage(1);
  }, [fullAnimeData?.id, fullAnimeData?.type]); // Use optional chaining

  // SEO and Structured Data
  const slug = fullAnimeData ? createSlug(fullAnimeData.name || fullAnimeData.title) : '';
  const animeUrl = fullAnimeData ? `https://animeshrine.xyz/series/${slug}/${imdbId}` : '';
  const posterUrl = fullAnimeData?.poster || '';

  if (!fullAnimeData) {
    // We still need to run hooks, so we can't return early here if we want to follow rules strictly.
    // However, simpler is to just return loading here IF we ensure no hooks are below.
    // But we have hooks below. So we must NOT return here.
  }

  const allSeasons = fullAnimeData?.allSeasons || (fullAnimeData ? [fullAnimeData] : []);
  const seasons = [...new Set(allSeasons.flatMap(a =>
    a.videos?.map(v => v.season !== undefined ? v.season : 1) || []
  ))].sort((a, b) => a - b);

  const hasVideos = allSeasons.some(a => a.videos && a.videos.length > 0);

  useEffect(() => {
    if (!fullAnimeData) return;
    const totalVideos = allSeasons.reduce((sum, a) => sum + (a.videos?.length || 0), 0);
    console.log(`📊 Current state - Total videos: ${totalVideos}, Seasons: [${seasons.join(', ')}], hasVideos: ${hasVideos}`);
  }, [allSeasons, seasons, hasVideos, fullAnimeData]);

  // Handle deep-link via hash (e.g., #episode-4-1 or #season-2)
  useEffect(() => {
    const handleHashChange = () => {
      if (!fullAnimeData) return;
      const hash = window.location.hash || '';
      if (!hash) return;

      if (hash.startsWith('#episode-')) {
        const parts = hash.replace('#episode-', '').split('-');
        const s = Number(parts[0]);
        const e = Number(parts[1]);
        const ep = allSeasons.flatMap(a => a.videos || []).find(v => (v.season !== undefined ? v.season : 1) === (s !== undefined && s >= 0 ? s : 1) && v.episode === e);
        if (ep) onEpisodeSelect(ep, fullAnimeData);
      } else if (hash.startsWith('#season-')) {
        const s = Number(hash.replace('#season-', ''));
        console.log('🔄 Hash handler triggered - URL:', window.location.href);
        console.log('🔄 Current selectedSeason:', selectedSeason, '→ New season:', s);
        console.log('🔄 Available seasons:', seasons);
        if ((s || s === 0) && seasons.includes(s)) {
          console.log('✅ Setting selectedSeason to:', s);
          setSelectedSeason(s);
        } else {
          console.log('❌ Season', s, 'not found in available seasons');
        }
      } else if (hash.startsWith('#page-')) {
        const p = Number(hash.replace('#page-', ''));
        if (p && p > 0) setEpisodesPage(p);
      }
    };

    // Run on mount and when data changes
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAnimeData?.id, seasons.length, location]); // Added location to detect back navigation

  useEffect(() => {
    if (!fullAnimeData) return;
    if (selectedSeason === null) {
      // Check if there's a season hash - if so, don't auto-select, let hash handler do it
      const hash = window.location.hash || '';
      if (hash.startsWith('#season-')) {
        console.log('⏭️ Skipping auto-select, hash specifies season:', hash);
        return;
      }

      if (seasons.length > 0) {
        console.log(`🎯 Auto-selecting Season ${seasons[0]}`);
        setSelectedSeason(seasons[0]);
      } else if (hasVideos) {
        console.log(`🎯 Defaulting to Season 1 (no season info in videos)`);
        setSelectedSeason(1);
      }
    } else {
      if (selectedSeason === 'movies') return;

      const currentSeasonEpisodes = allSeasons
        .flatMap(a => a.videos || [])
        .filter(v => (v.season !== undefined ? v.season : 1) === selectedSeason);

      if (currentSeasonEpisodes.length === 0 && seasons.length > 0) {
        for (const season of seasons) {
          const seasonEpisodes = allSeasons
            .flatMap(a => a.videos || [])
            .filter(v => (v.season !== undefined ? v.season : 1) === season);
          if (seasonEpisodes.length > 0) {
            console.log(`🔄 Auto-switching to Season ${season} (Season ${selectedSeason} has no episodes)`);
            setSelectedSeason(season);
            setEpisodesPage(1);
            break;
          }
        }
      }
    }
  }, [seasons, selectedSeason, hasVideos, allSeasons, fullAnimeData]);

  useEffect(() => {
    if (!anime) return;
    const loadFullMeta = async () => {
      if (metaFetched) {
        console.log(`⏭️ Skipping meta fetch - already fetched`);
        return;
      }

      if (anime.videos?.length > 0) {
        console.log(`📺 Anime already has ${anime.videos.length} videos from catalog, fetching meta for complete data...`);
      } else {
        console.log(`📺 Anime has no videos, fetching meta...`);
      }

      setLoadingMeta(true);
      setMetaFetched(true);

      try {
        console.log(`📥 Fetching full meta for: ${anime.type}/${anime.id}`);
        const metaResponse = await api.getMeta(anime.type, anime.id);

        if (metaResponse?.meta) {
          setFullAnimeData(prev => {
            const metaVideos = metaResponse.meta.videos || [];
            const preservedAllSeasons = prev?.allSeasons || (prev ? [prev] : []);

            const updated = {
              ...(prev || {}),
              ...metaResponse.meta,
              videos: metaVideos.length > 0 ? metaVideos : (prev?.videos || []),
            };

            if (metaVideos.length > 0) {
              updated.allSeasons = preservedAllSeasons.map(seasonItem => ({
                ...seasonItem,
                ...metaResponse.meta,
                videos: metaVideos,
              }));
              updated.videos = metaVideos;
              console.log(`📺 Setting ${metaVideos.length} videos in allSeasons`);
            } else if (preservedAllSeasons.length > 0) {
              updated.allSeasons = preservedAllSeasons.map(seasonItem => ({
                ...seasonItem,
                ...metaResponse.meta,
              }));
            } else {
              updated.allSeasons = [{ ...updated, videos: metaVideos }];
            }

            const totalVideos = updated.videos?.length || 0;
            const totalInSeasons = updated.allSeasons?.reduce((sum, s) => sum + (s.videos?.length || 0), 0) || 0;
            console.log(`📊 Videos loaded: ${totalVideos} in main, ${totalInSeasons} in allSeasons`);
            return updated;
          });
          console.log(`✅ Loaded full meta: ${metaResponse.meta.name} with ${metaResponse.meta.videos?.length || 0} videos`);

          // For movies, automatically fetch streams
          if (anime.type === 'movie') {
            const movieId = metaResponse.meta.id || anime.id;
            loadMovieStreams(movieId);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to load meta:`, error.message);
      } finally {
        setLoadingMeta(false);
      }
    };

    const loadMovieStreams = async (movieId) => {
      try {
        setLoadingMovieStreams(true);
        console.log(`🎬 Fetching streams for movie: ${anime.type}/${movieId}`);
        const streamData = await api.getStream(anime.type, movieId);

        // Sort streams by quality: 480p -> 720p -> 1080p -> HDRip
        const qualityOrder = { '480p': 1, '720p': 2, '1080p': 3, 'hdrip': 4 };
        const sortedStreams = (streamData.streams || []).sort((a, b) => {
          const qualityA = (a.name || '').toLowerCase();
          const qualityB = (b.name || '').toLowerCase();

          const orderA = qualityOrder[qualityA] || 999;
          const orderB = qualityOrder[qualityB] || 999;

          return orderA - orderB;
        });

        setMovieStreams(sortedStreams);
        console.log(`✅ Loaded ${sortedStreams.length} streams for movie (sorted by quality)`);
      } catch (error) {
        console.error(`❌ Failed to load movie streams:`, error.message);
        setMovieStreams([]);
      } finally {
        setLoadingMovieStreams(false);
      }
    };

    loadFullMeta();
  }, [anime?.id, anime?.type, anime?.videos, metaFetched]);

  const shouldShowLoading = loadingMeta && !hasVideos;

  if (!fullAnimeData) {
    return (
      <div className="page-loader-overlay">
        <div className="custom-loader"></div>
      </div>
    );
  }

  if (shouldShowLoading) {
    return (
      <div className="page-loader-overlay">
        <div className="custom-loader"></div>
      </div>
    );
  }

  let effectiveSeason = selectedSeason ?? (seasons.length > 0 ? seasons[0] : 1);

  const getAllEpisodes = (season) => {
    return allSeasons.flatMap(a =>
      (a.videos || []).filter(v => (v.season !== undefined ? v.season : 1) === season)
    );
  };

  let episodes = getAllEpisodes(effectiveSeason);

  if (episodes.length === 0 && seasons.length > 0) {
    console.log(`⚠️ No episodes found for Season ${effectiveSeason}, searching other seasons...`);
    for (const season of seasons) {
      const seasonEpisodes = getAllEpisodes(season);
      console.log(`🔍 Season ${season}: ${seasonEpisodes.length} episodes`);
      if (seasonEpisodes.length > 0) {
        effectiveSeason = season;
        episodes = seasonEpisodes;
        console.log(`✅ Switching to Season ${season} with ${episodes.length} episodes`);
        break;
      }
    }
  }

  if (episodes.length === 0) {
    episodes = allSeasons.flatMap(a => a.videos || []);
    effectiveSeason = seasons.length > 0 ? seasons[0] : 1;
    console.log(`⚠️ No episodes by season, showing all ${episodes.length} videos`);
  }

  console.log(`📺 Final: Season ${effectiveSeason}, ${episodes.length} episodes`);

  return (
    <>
      <SEO
        title={`${fullAnimeData.name || fullAnimeData.title} - Watch in Hindi, English, Tamil, Telugu | Anime Shrine`}
        description={`Watch ${fullAnimeData.name || fullAnimeData.title} with multi-audio support. ${fullAnimeData.description || ''} Available in Hindi, English, Tamil, Telugu, Japanese.`}
        keywords={`${fullAnimeData.name || fullAnimeData.title}, ${fullAnimeData.name || fullAnimeData.title} in hindi, ${fullAnimeData.name || fullAnimeData.title} download, ${fullAnimeData.genres?.join(', ')}`}
        image={posterUrl}
        url={animeUrl}
        type="video.tv_show"
      />

      <StructuredData
        type="anime"
        data={{
          title: fullAnimeData.name || fullAnimeData.title,
          description: fullAnimeData.description || '',
          image: posterUrl,
          genres: fullAnimeData.genres || [],
          numberOfSeasons: seasons.length || 1,
          numberOfEpisodes: allSeasons.reduce((sum, a) => sum + (a.videos?.length || 0), 0),
          datePublished: fullAnimeData.year,
          rating: fullAnimeData.imdbRating,
          ratingCount: "100"
        }}
      />

      <StructuredData
        type="breadcrumb"
        data={[
          { name: "Home", url: "https://animeshrine.xyz/" },
          { name: "Anime", url: "https://animeshrine.xyz/index" },
          { name: fullAnimeData.name || fullAnimeData.title, url: animeUrl }
        ]}
      />

      <div className="detail-page">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft className="w-6 h-6" />
          Back
        </button>

        <div className="detail-hero">
          <img src={fullAnimeData.background || fullAnimeData.poster} alt={fullAnimeData.name} className="detail-bg" />
          <div className="detail-hero-overlay">
            <div className="detail-hero-inner">
              <img src={fullAnimeData.poster} alt={fullAnimeData.name} className="detail-poster" />
              <div className="detail-hero-content">
                <h1 className="detail-title">{fullAnimeData.name}</h1>
                <div className="detail-meta">
                  {fullAnimeData.year && <span>{fullAnimeData.year}</span>}
                  {fullAnimeData.imdbRating && <><span>•</span><span>⭐ {fullAnimeData.imdbRating}</span></>}
                  {fullAnimeData.genres && fullAnimeData.genres.length > 0 && (
                    <><span>•</span><span>{fullAnimeData.genres.join(', ')}</span></>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-content">
          {/* Mobile-only Title Box */}
          <div className="detail-info-grid mobile-title-box" style={{ display: 'none', marginBottom: '1rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: 'white' }}>{fullAnimeData.name}</h1>
          </div>

          {/* Metadata Info Boxes (Year, Rating, Genres) */}
          {(fullAnimeData.year || fullAnimeData.imdbRating || (fullAnimeData.genres && fullAnimeData.genres.length > 0)) && (
            <div className="detail-info-grid">
              {fullAnimeData.year && (
                <div className="info-item">
                  <span className="info-label">Year:</span>
                  <span className="info-value">{fullAnimeData.year}</span>
                </div>
              )}
              {fullAnimeData.imdbRating && (
                <div className="info-item">
                  <span className="info-label">Rating:</span>
                  <span className="info-value">⭐ {fullAnimeData.imdbRating}</span>
                </div>
              )}
              {fullAnimeData.genres && fullAnimeData.genres.length > 0 && (
                <div className="info-item info-item-genres">
                  <span className="info-label">Genres:</span>
                  <span className="info-value">{fullAnimeData.genres.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {fullAnimeData.description && (
            <div className="detail-description">
              <h2>Description</h2>
              <p>{fullAnimeData.description}</p>
            </div>
          )}

          {fullAnimeData.type === 'series' && seasons.length > 0 && (
            <div className="detail-info-grid">
              <div className="info-item">
                <span className="info-label">Seasons:</span>
                <span className="info-value">{seasons.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Episodes:</span>
                <span className="info-value">{allSeasons.reduce((sum, a) => sum + (a.videos?.length || 0), 0)}</span>
              </div>
            </div>
          )}

          <div className="episodes-section">
            <h2>{fullAnimeData.type === 'movie' ? 'Available Streams' : 'Episodes'}</h2>

            {fullAnimeData.type === 'movie' ? (
              // Movie: Show quality options directly
              <div className="episodes-grid">
                {loadingMovieStreams ? (
                  <div className="no-episodes">
                    <Loader className="w-8 h-8 animate-spin" />
                    <p>Loading streams...</p>
                  </div>
                ) : movieStreams.length > 0 ? (
                  movieStreams.map((stream, index) => (
                    <div
                      key={index}
                      className="episode-card"
                      onClick={() => {
                        const slug = createSlug(fullAnimeData.name || fullAnimeData.title);
                        navigate(`/download/${slug}/${imdbId}/movie/quality/${index}`, {
                          state: { stream, anime: fullAnimeData, episode: { episode: 1 } }
                        });
                      }}
                    >
                      <div className="episode-number">{parseQuality(stream.name)}</div>
                      <div className="episode-info">
                        <h4 className="episode-title">{parseQuality(stream.name)}</h4>
                        <div className="episode-audio">
                          <span className="audio-label">💾 {parseSize(stream)} • 🔊 {parseAudioLanguages(stream.title || stream.name).join(', ')}</span>
                        </div>
                      </div>
                      <div className="episode-actions">
                        <Play className="w-5 h-5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-episodes">
                    <p>No streams available</p>
                  </div>
                )}
              </div>
            ) : (
              // Series: Show episodes as before
              <>
                <div className="season-tabs">
                  {fullAnimeData.movies && Object.keys(fullAnimeData.movies).length > 0 && (
                    <button
                      onClick={() => setSelectedSeason('movies')}
                      className={`season-tab ${selectedSeason === 'movies' ? 'active' : ''}`}
                      style={{ borderColor: '#60a5fa', color: selectedSeason === 'movies' ? '#fff' : '#60a5fa' }}
                    >
                      Movies
                    </button>
                  )}

                  {seasons.length > 1 && seasons.map((season) => (
                    <button
                      key={season}
                      onClick={() => {
                        console.log(`🔄 Switching to Season ${season}`);
                        setSelectedSeason(season);
                        setEpisodesPage(1);
                        // Use current location pathname to preserve slug
                        window.history.replaceState(null, '', `${window.location.pathname}#season-${season}`);
                      }}
                      className={`season-tab ${selectedSeason === season ? 'active' : ''}`}
                    >
                      {season === 0 ? 'Season 00' : `Season ${season}`}
                    </button>
                  ))}
                </div>

                {selectedSeason === 'movies' ? (
                  <div className="episodes-grid">
                    {Object.entries(fullAnimeData.movies)
                      .sort(([keyA], [keyB]) => {
                        const numA = parseInt(keyA.replace('movie', '')) || 0;
                        const numB = parseInt(keyB.replace('movie', '')) || 0;
                        return numA - numB;
                      })
                      .map(([key, id]) => (
                        <div
                          key={key}
                          className="episode-card"
                          onClick={() => navigate(`/movie/${id}`)}
                        >
                          <div className="episode-number">MOV</div>
                          <div className="episode-info">
                            <h4 className="episode-title">{key.replace(/([a-zA-Z]+)(\d+)/, '$1 $2').replace(/^\w/, c => c.toUpperCase())}</h4>
                            <div className="episode-audio">
                              <span className="audio-label">Click to watch movie</span>
                            </div>
                          </div>
                          <div className="episode-actions">
                            <Play className="w-5 h-5" />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <>
                    {effectiveSeason === 0 && (
                      <div className="season-info-box" style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        color: '#e2e8f0'
                      }}>
                        <div style={{ fontSize: '1.25rem' }}>ℹ️</div>
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '600', color: '#60a5fa' }}>Special Content</h4>
                          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                            Season 00 contains OVAs, Specials, Movies, and Extra episodes related to this series.
                          </p>
                        </div>
                      </div>
                    )}

                    {episodes.length > EPISODES_PER_PAGE && (
                      <div className="episodes-pagination-info">
                        <p>
                          Showing {((episodesPage - 1) * EPISODES_PER_PAGE) + 1} - {Math.min(episodesPage * EPISODES_PER_PAGE, episodes.length)} of {episodes.length} episodes
                        </p>
                      </div>
                    )}

                    <div className="episodes-grid">
                      {episodes.length > 0 ? (
                        episodes
                          .slice((episodesPage - 1) * EPISODES_PER_PAGE, episodesPage * EPISODES_PER_PAGE)
                          .map((episode) => (
                            <div
                              key={episode.id}
                              className="episode-card"
                              onClick={() => {
                                const slug = createSlug(fullAnimeData.name || fullAnimeData.title);
                                navigate(`/download/${slug}/${imdbId}/${episode.episode}`, {
                                  state: { anime: fullAnimeData, episode }
                                });
                              }}
                            >
                              <div className="episode-number">EP {episode.episode === 0 ? '00' : episode.episode}</div>
                              <div className="episode-info">
                                <h4 className="episode-title">{episode.title || (episode.episode === 0 ? 'Episode 00' : `Episode ${episode.episode}`)}</h4>
                                <div className="episode-audio">
                                  <span className="audio-label">Click to download</span>
                                </div>
                              </div>
                              <div className="episode-actions">
                                <Play className="w-5 h-5" />
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="no-episodes">
                          <p>No episodes available</p>
                          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
                            Debug: {allSeasons.reduce((sum, a) => sum + (a.videos?.length || 0), 0)} total videos found
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {episodes.length > EPISODES_PER_PAGE && (
              <div className="episodes-pagination">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, episodesPage - 1);
                    setEpisodesPage(newPage);
                    window.history.replaceState(null, '', `${window.location.pathname}#page-${newPage}`);
                  }}
                  disabled={episodesPage === 1}
                  className="pagination-btn"
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {episodesPage} of {Math.ceil(episodes.length / EPISODES_PER_PAGE)}
                </span>
                <button
                  onClick={() => {
                    const newPage = Math.min(Math.ceil(episodes.length / EPISODES_PER_PAGE), episodesPage + 1);
                    setEpisodesPage(newPage);
                    window.history.replaceState(null, '', `${window.location.pathname}#page-${newPage}`);
                  }}
                  disabled={episodesPage >= Math.ceil(episodes.length / EPISODES_PER_PAGE)}
                  className="pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ==================== STREAM PAGE ====================
const StreamPage = ({ stream, anime, episode, onBack }) => {
  const [activeTab, setActiveTab] = useState('download'); // 'episodes', 'download', 'comments'
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Ensure we have full anime data (with seasons/episodes)
  // If passed via state, it might be incomplete if not fully loaded? 
  // Usually AnimeDetailPage passes full object.
  const allSeasons = anime.allSeasons || [anime];
  const seasons = [...new Set(allSeasons.flatMap(a => a.videos?.map(v => v.season !== undefined ? v.season : 1) || []))].sort((a, b) => a - b);
  // Allow Season 0 selection
  const [selectedSeason, setSelectedSeason] = useState(episode.season !== undefined ? episode.season : (seasons[0] !== undefined ? seasons[0] : 1));

  const currentEpisodes = allSeasons
    .flatMap(a => a.videos || [])
    .filter(v => (v.season !== undefined ? v.season : 1) === selectedSeason);

  const handleEpisodeClick = (ep) => {
    // Navigate to new episode
    // We need to fetch the stream for this new episode first?
    // Or just navigate to detail page and let it handle?
    // Better: Navigate to detail page with hash to open modal? 
    // Or better: Redirect to /watch/... but we need stream URL.
    // Since we don't have stream URL for other episodes here without fetching,
    navigate(`/series/${createSlug(anime.name)}/${anime.id}#episode-${ep.season}-${ep.episode}`);
  };

  return (
    <div className="episode-page">
      {/* Video Player Section */}
      <div className="video-container">
        <iframe
          src={stream.url}
          className="video-player"
          allowFullScreen
          title="Video Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      <div className="container">
        <div className="episode-content">
          {/* Main Content */}
          <div className="episode-main">
            <div className="episode-header">
              <h1 className="episode-title">
                {anime.type === 'movie' ? anime.name : (episode.episode === 0 ? 'Episode 00' : `Episode ${episode.episode}`)}
              </h1>
              <Link to={`/series/${createSlug(anime.name)}/${anime.id}`} className="anime-link">
                {anime.name}
              </Link>
              <div className="detail-meta" style={{ marginTop: '0.5rem' }}>
                <span><Calendar className="w-4 h-4" /> {anime.year}</span>
                <span><Clock className="w-4 h-4" /> {parseSize(stream)}</span>
                <span><Star className="w-4 h-4 text-yellow-400" /> {anime.imdbRating}</span>
              </div>
            </div>

            <div className="episode-tabs">
              <button
                className={`tab-btn ${activeTab === 'episodes' ? 'active' : ''}`}
                onClick={() => setActiveTab('episodes')}
              >
                Episodes
              </button>
              <button
                className={`tab-btn ${activeTab === 'download' ? 'active' : ''}`}
                onClick={() => setActiveTab('download')}
              >
                Download Links
              </button>
              <button
                className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                Comments
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'episodes' && (
                <div className="episodes-list">
                  {seasons.length > 1 && (
                    <div className="season-tabs" style={{ marginBottom: '1rem' }}>
                      {seasons.map(s => (
                        <button
                          key={s}
                          className={`season-tab ${selectedSeason === s ? 'active' : ''}`}
                          onClick={() => setSelectedSeason(s)}
                        >
                          {s === 0 ? 'Season 00' : `Season ${s}`}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="episodes-grid">
                    {currentEpisodes.map(ep => (
                      <div
                        key={ep.id || `${ep.season}-${ep.episode}`}
                        className={`episode-card ${ep.episode === episode.episode && ep.season === episode.season ? 'active-episode' : ''}`}
                        onClick={() => handleEpisodeClick(ep)}
                        style={{
                          border: ep.episode === episode.episode && ep.season === episode.season ? '1px solid var(--primary)' : ''
                        }}
                      >
                        <div className="episode-number">EP {ep.episode === 0 ? '00' : ep.episode}</div>
                        <div className="episode-info">
                          <h4 className="episode-title">{ep.title || (ep.episode === 0 ? 'Episode 00' : `Episode ${ep.episode}`)}</h4>
                        </div>
                        <div className="episode-actions">
                          <Play className="w-5 h-5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'download' && (
                <div className="download-section">
                  <div className="download-server">
                    <div className="server-info">
                      <span className="server-name">Stream/Download</span>
                      <span className="server-quality">{parseQuality(stream.name)} • {parseSize(stream)}</span>
                    </div>
                    <a href={stream.url} download className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      <Download className="w-4 h-4 inline mr-2" /> Download
                    </a>
                  </div>

                  <div className="download-helper" style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>External Players</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button onClick={() => {
                        const url = stream.url;
                        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                        if (isMobile) {
                          window.location.href = `vlc://${url.replace(/^https?:\/\//, '')}`;
                        } else {
                          const m3uContent = `#EXTM3U\n#EXTINF:-1,${anime.name} - Episode ${episode.episode}\n${url}`;
                          const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = `${anime.name}-E${episode.episode}.m3u`;
                          link.click();
                          alert('📝 M3U playlist downloaded! Open with VLC.');
                        }
                      }} className="btn-secondary">
                        <Play className="w-4 h-4 inline mr-2" /> Open in VLC
                      </button>

                      <button onClick={() => {
                        navigator.clipboard.writeText(stream.url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }} className="btn-secondary">
                        <Copy className="w-4 h-4 inline mr-2" /> {copied ? 'Copied!' : 'Copy URL'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="comments-section">
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px' }}>
                    <p>Comments are powered by Disqus.</p>
                    {/* Disqus Embed Code would go here */}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Sidebar */}
          <div className="episode-sidebar">
            <div className="sidebar-card">
              <img src={anime.poster} alt={anime.name} style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{anime.name}</h3>
              <div className="sidebar-meta" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span><strong>Type:</strong> {anime.type === 'movie' ? 'Movie' : 'TV Series'}</span>
                <span><strong>Status:</strong> {anime.year > 2023 ? 'Ongoing' : 'Completed'}</span>
                <span><strong>Episodes:</strong> {currentEpisodes.length}</span>
                <span><strong>Genres:</strong> {anime.genres?.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== DOWNLOAD PAGE ====================
const DownloadPage = ({ stream, anime, episode, onBack }) => {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getTelegramPostUrl = () => {
    try {
      const base = 'https://animeshrinexyz.blogspot.com/2025/11/shrine.html';
      let id = '';
      // Prefer explicit code provided by addon when available
      if (stream && typeof stream.code === 'string' && stream.code.trim().length > 0) {
        id = stream.code.trim();
      }
      try {
        if (!id) {
          const url = new URL(stream.url);
          const match = url.pathname.match(/\/dl\/([^/]+)/);
          if (match && match[1]) id = match[1];
        }
      } catch (_) {
        // If URL constructor fails (unlikely), fallback to regex on raw string
        if (!id) {
          const m = (stream.url || '').match(/\/dl\/([^/]+)/);
          if (m && m[1]) id = m[1];
        }
      }
      if (!id) return base; // fallback to base if id not found
      // Ensure we append ?start=<id> with no trailing slash after .html
      return `${base}?start=${id}`;
    } catch (e) {
      return 'https://animeshrinexyz.blogspot.com/2025/11/shrine.html';
    }
  };

  return (
    <div className="download-page">
      <button onClick={onBack} className="back-btn-page">
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="download-container">
        <h1>📥 Download</h1>

        <div className="download-info-box">
          <div className="download-detail">
            <span className="label">Anime</span>
            <span className="value">{anime.name}</span>
          </div>
          {anime.type !== 'movie' && (
            <>
              <div className="download-detail">
                <span className="label">Season</span>
                <span className="value">{episode?.season === 0 ? '00' : (episode?.season || 1)}</span>
              </div>
              <div className="download-detail">
                <span className="label">Episode</span>
                <span className="value">{episode.episode === 0 ? '00' : episode.episode}</span>
              </div>
            </>
          )}
          <div className="download-detail">
            <span className="label">Quality</span>
            <span className="value">{parseQuality(stream.name)}</span>
          </div>
          <div className="download-detail">
            <span className="label">Size</span>
            <span className="value">{parseSize(stream)}</span>
          </div>
          <div className="download-detail">
            <span className="label">Audio</span>
            <span className="value">{parseAudioLanguages(stream.title || stream.name).join(', ')}</span>
          </div>
        </div>

        <button onClick={() => {
          setDownloading(true);
          const link = document.createElement('a');
          link.href = stream.url;
          link.download = anime.type === 'movie'
            ? `${anime.name}-${parseQuality(stream.name)}.mkv`
            : `${anime.name}-E${episode.episode === 0 ? '00' : episode.episode}.mkv`;
          link.click();
          setTimeout(() => setDownloading(false), 3000);
        }} className="btn-download-big" disabled={downloading}>
          <Download className="w-6 h-6" />
          {downloading ? 'Starting...' : 'Download Now'}
        </button>

        {(() => {
          const tgUrl = getTelegramPostUrl();
          const href = tgUrl || (process.env.REACT_APP_TELEGRAM_POST_URL || '#');
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="btn-telegram-file">
              <Send className="w-5 h-5" />
              Get File on Telegram
            </a>
          );
        })()}

        <div className="download-helper">
          <p className="helper-text">
            ⚠️ If slow, copy URL and use <strong>IDM</strong>/<strong>ADM</strong>:
          </p>
          <button onClick={() => {
            const text = stream.url;
            const tryClipboard = async () => {
              try { await navigator.clipboard.writeText(text); return true; } catch (_) { return false; }
            };
            const fallback = () => {
              const el = document.createElement('textarea');
              el.value = text; el.style.position = 'fixed'; el.style.left = '-9999px';
              document.body.appendChild(el); el.select();
              try { document.execCommand('copy'); } catch (_) { }
              document.body.removeChild(el);
            };
            tryClipboard().then(ok => {
              if (!ok) fallback();
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }} className="btn-copy-url">
            <Copy className="w-5 h-5" />
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== EPISODE OPTIONS MODAL ====================
const EpisodeOptionsModal = ({ episode, anime, onClose, onStream, onDownload, preloadedStream = null }) => {
  const [streams, setStreams] = useState(preloadedStream ? [preloadedStream] : []);
  const [loading, setLoading] = useState(!preloadedStream);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // If preloaded stream is provided (for movies), use it directly
    if (preloadedStream) {
      setStreams([preloadedStream]);
      setLoading(false);
      return;
    }

    const loadStreams = async () => {
      setLoading(true);
      try {
        console.log(`🎬 Fetching streams for: ${anime.type}/${episode.id}`);
        const streamData = await api.getStream(anime.type, episode.id);

        // Sort streams by quality: 480p -> 720p -> 1080p -> HDRip
        const qualityOrder = { '480p': 1, '720p': 2, '1080p': 3, 'hdrip': 4 };
        const sortedStreams = (streamData.streams || []).sort((a, b) => {
          const qualityA = (a.name || '').toLowerCase();
          const qualityB = (b.name || '').toLowerCase();

          const orderA = qualityOrder[qualityA] || 999;
          const orderB = qualityOrder[qualityB] || 999;

          return orderA - orderB;
        });

        setStreams(sortedStreams);
        console.log(`✅ Loaded ${sortedStreams.length} streams (sorted by quality)`);
      } catch (error) {
        console.error(`❌ Failed to load streams:`, error.message);
        setStreams([]);
      } finally {
        setLoading(false);
      }
    };

    loadStreams();
  }, [anime.type, episode.id, preloadedStream]);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="options-modal"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${currentY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease'
        }}
      >
        <button onClick={onClose} className="modal-close-btn">
          <X className="w-6 h-6" />
        </button>

        <h2 className="options-title">{anime.name}</h2>
        {anime.type === 'movie' ? (
          <p className="options-subtitle">{preloadedStream ? parseQuality(preloadedStream.name) : 'Select Quality'}</p>
        ) : (
          <p className="options-subtitle">Episode {episode.episode === 0 ? '00' : episode.episode}</p>
        )}

        <div className="quality-options">
          <h3>{preloadedStream ? 'Stream Options' : 'Select Quality'}</h3>

          {loading ? (
            <div className="loading-3d-container">
              <div className="scene-3d">
                <div className="word-3d">
                  {"Loading".split('').map((letter, index) => (
                    <div
                      key={index}
                      className="letter-wrap-3d"
                      style={{ animationDelay: `${0.1125 * index}s` }}
                    >
                      <div className="letter-3d" data-letter={letter}>
                        <span className="letter-panel-3d" aria-hidden="true">{letter}</span>
                        <span className="letter-panel-3d" aria-hidden="true">{"Wait..."[index] || ''}</span>
                        <span className="letter-panel-3d" aria-hidden="true">{letter}</span>
                        <span className="letter-panel-3d" aria-hidden="true">{"Wait..."[index] || ''}</span>
                        <span className="letter-panel-3d" aria-hidden="true">{letter}</span>
                        <span className="letter-panel-3d" aria-hidden="true">{"Wait..."[index] || ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : streams.length === 0 ? (
            <div className="no-streams">
              <p>No streams available{anime.type === 'movie' ? ' for this movie' : ' for this episode'}</p>
            </div>
          ) : (
            streams.map((stream, index) => (
              <div key={index} className="quality-card">
                <div className="quality-info">
                  <div className="quality-badge">{parseQuality(stream.name)}</div>
                  <div className="quality-details">
                    <div className="quality-size">💾 {parseSize(stream)}</div>
                    <div className="quality-audio">🔊 {parseAudioLanguages(stream.title || stream.name).join(', ')}</div>
                  </div>
                </div>
                <div className="quality-actions">
                  <button onClick={() => onStream(stream)} className="action-btn stream-btn">
                    <Play className="w-4 h-4" />
                    Stream
                  </button>
                  <button onClick={() => onDownload(stream)} className="action-btn download-btn">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StreamPageWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { stream, anime, episode } = location.state || {};

  if (!stream || !anime) return <Navigate to="/" />;

  return <StreamPage stream={stream} anime={anime} episode={episode} onBack={() => navigate(-1)} />;
};

const DownloadPageWrapper = () => {
  const location = useLocation();
  const { slug, imdbId, episode: episodeNumber } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState([]);
  const [anime, setAnime] = useState(null);
  const [video, setVideo] = useState(null); // Store the video object with season info
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStreams = async () => {
      try {
        setLoading(true);

        // Try to use anime from location state first
        const stateAnime = location.state?.anime;
        const stateEpisode = location.state?.episode;

        if (stateAnime) {
          console.log(`✅ Using anime from state: ${stateAnime.name}, ${stateAnime.videos?.length || 0} videos`);
          setAnime(stateAnime);

          // Find the episode in the anime's videos
          const videos = stateAnime.allSeasons
            ? stateAnime.allSeasons.flatMap(s => s.videos || [])
            : (stateAnime.videos || []);

          console.log(`📺 Looking for episode ${episodeNumber} in ${videos.length} videos`);

          // Try to get season from location state (when coming from detail page)
          const s1 = stateEpisode?.season;
          const s2 = location.state?.season;
          const requestedSeason = s1 !== undefined ? s1 : s2;

          console.log(`🎯 Requested season:`, requestedSeason);

          // Find episode - if season is specified, match both season and episode
          let video;
          if (requestedSeason !== undefined) {
            video = videos.find(v =>
              String(v.episode) === String(episodeNumber) &&
              v.season === requestedSeason
            );
            console.log(`🔍 Searching for S${requestedSeason}E${episodeNumber}`);
          } else {
            // Fallback: just match by episode number (for backward compatibility)
            video = videos.find(v => String(v.episode) === String(episodeNumber));
            console.log(`🔍 Searching for episode ${episodeNumber} (no season specified)`);
          }

          if (!video) {
            console.error(`❌ Episode ${episodeNumber} not found in ${videos.length} videos`);
            setError(`Episode ${episodeNumber} not found`);
            return;
          }

          console.log(`✅ Found video:`, video);

          // Store video for season info
          setVideo(video);

          // Fetch streams
          const streamData = await api.getStream(stateAnime.type, video.id);
          setStreams(streamData.streams || []);
        } else {
          // Fallback: fetch anime metadata (this might not have videos)
          console.log(`⚠️ No anime in state, fetching from API`);
          const metaResponse = await api.getMeta(imdbId.startsWith('tt') ? 'series' : 'movie', imdbId);

          if (!metaResponse?.meta) {
            setError('Anime not found');
            return;
          }

          setAnime(metaResponse.meta);

          const videos = metaResponse.meta.videos || [];
          console.log(`📺 Fetched ${videos.length} videos from API`);

          const video = videos.find(v => String(v.episode) === String(episodeNumber)) || videos[0];

          if (!video) {
            setError(`Episode ${episodeNumber} not found`);
            return;
          }

          // Store video for season info
          setVideo(video);

          const streamData = await api.getStream(metaResponse.meta.type, video.id);
          setStreams(streamData.streams || []);
        }

      } catch (err) {
        console.error('Failed to load streams:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStreams();
  }, [imdbId, episodeNumber, location.state]);

  if (!loading && error || !anime) {
    return (
      <div className="download-page">
        <button onClick={() => navigate(-1)} className="back-btn-page">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="download-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: '#ef4444', fontSize: '1.2rem' }}>❌ {error || 'Failed to load'}</p>
        </div>
      </div>
    );
  }

  if (!loading && streams.length === 0) {
    return (
      <div className="download-page">
        <button onClick={() => navigate(-1)} className="back-btn-page">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="download-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p>No streams available for this episode</p>
        </div>
      </div>
    );
  }

  // Show quality selection page
  return (
    <div className="download-page">
      <button onClick={() => navigate(-1)} className="back-btn-page">
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>


      {loading && (
        <div className="loading-3d-container">
          <div
            className="animate-spin rounded-full h-16 w-16"
            style={{
              border: '4px solid transparent',
              borderTopColor: '#a855f7',
              borderBottomColor: '#a855f7'
            }}
          ></div>
        </div>
      )}




      <div className="download-container">
        <h1>📥 Download {anime?.name || 'Loading...'}</h1>
        {anime?.type !== 'movie' && <p className="episode-subtitle">Episode {episodeNumber === '0' ? '00' : episodeNumber}</p>}

        <h2 className="quality-selection-heading">Select Quality</h2>

        <div className="quality-grid">
          {streams.map((stream, index) => (
            <div
              key={index}
              className="quality-card-download"
              onClick={() => {
                const episode = {
                  episode: episodeNumber,
                  season: video?.season !== undefined ? video.season : 1 // Use season from video object
                };
                navigate(`/download/${slug}/${imdbId}/${episodeNumber}/quality/${index}`, {
                  state: { stream, anime, episode }
                });
              }}
            >
              <div className="quality-badge-large">{parseQuality(stream.name)}</div>
              <div className="quality-details-download">
                <div className="detail-row">
                  <span className="detail-icon">💾</span>
                  <span className="detail-text">{parseSize(stream)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">🔊</span>
                  <span className="detail-text">{parseAudioLanguages(stream.title || stream.name).join(', ')}</span>
                </div>
              </div>
              <div className="download-arrow">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div >
  );
};

const DownloadFinalPageWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { stream, anime, episode } = location.state || {};

  if (!stream || !anime) return <Navigate to="/" />;

  return <DownloadPage stream={stream} anime={anime} episode={episode} onBack={() => navigate(-1)} />;
};

// ==================== MAIN APP ====================
const AppContent = () => {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('popular');
  const [contentType, setContentType] = useState('series');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const PREV_LOGO_URL = 'https://i.ibb.co/0bK2hLY/Chat-GPT-Image-Nov-4-2025-12-07-32-AM-upscaled.png';
  const [logoSrc, setLogoSrc] = useState(PREV_LOGO_URL);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoading(true);
        console.log('🚀 Starting catalog load...');

        const manifest = await api.getManifest();
        const catalogs = manifest.catalogs || [];

        const catalogsToFetch = [
          ...catalogs.filter(c => c.type === 'series').slice(0, 2),
          ...catalogs.filter(c => c.type === 'movie').slice(0, 2)
        ];

        console.log(`📦 Fetching ${catalogsToFetch.length} catalogs:`,
          catalogsToFetch.map(c => `${c.type}/${c.id}`));

        const catalogPromises = catalogsToFetch.map(cat =>
          api.getCatalog(cat.type, cat.id).catch(err => {
            console.error(`❌ Failed ${cat.type}/${cat.id}:`, err.message);
            return { metas: [] };
          })
        );
        // Also fetch recent series/movies (optional movies)
        const recentSeriesPromise = api.getRecent('series').catch(() => ({ metas: [] }));
        const recentMoviesPromise = api.getRecent('movie').catch(() => ({ metas: [] }));

        const [catalogResults, recentSeries, recentMovies] = await Promise.all([
          Promise.all(catalogPromises),
          recentSeriesPromise,
          recentMoviesPromise
        ]);

        // Transform data: convert total_sub/total_dub to camelCase for consistency
        const transformMeta = (m) => ({
          ...m,
          totalSub: m.total_sub || m.totalSub || 0,
          totalDub: m.total_dub || m.totalDub || 0
        });

        const recentSeriesMetas = (recentSeries.metas || []).map((m, i) => transformMeta({ ...m, isRecent: true, recentRank: i }));
        const recentMovieMetas = (recentMovies.metas || []).map((m, i) => transformMeta({ ...m, isRecent: true, recentRank: i }));
        const allMetas = [
          ...catalogResults.flatMap(result => (result.metas || []).map(transformMeta)),
          ...recentSeriesMetas,
          ...recentMovieMetas
        ];

        console.log(`✅ Loaded ${allMetas.length} items from catalogs`);

        const uniqueMetas = Array.from(
          new Map(allMetas.map(meta => [meta.id, meta])).values()
        );

        console.log(`📊 Total unique items: ${uniqueMetas.length}`);
        setCatalog(uniqueMetas);

      } catch (err) {
        console.error('❌ Catalog load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  // Swap logo and favicon, and enlarge displayed logo
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let linkEl = document.querySelector('link[rel="icon"]');
    const currentFavicon = linkEl?.href;
    if (currentFavicon) setLogoSrc(currentFavicon);
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'icon';
      document.head.appendChild(linkEl);
    }
    linkEl.href = PREV_LOGO_URL;
    linkEl.sizes = '64x64';
    linkEl.type = 'image/png';

    // Add high-res Apple touch icon for better visibility on devices
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = PREV_LOGO_URL;
    appleIcon.sizes = '180x180';
  }, []);

  const handleAnimeSelect = (anime) => {
    const slug = createSlug(anime.name || anime.title);
    const type = anime.type === 'movie' ? 'movie' : 'series';
    // Fix ID format: convert "tmdb:288589" to "288589-1"
    let formattedId = anime.id;
    if (formattedId && formattedId.includes(':')) {
      formattedId = formattedId.split(':')[1] + '-1';
    } else if (formattedId && !formattedId.includes('-')) {
      formattedId = formattedId + '-1';
    }
    navigate(`/${type}/${slug}/${formattedId}`, { state: { anime } });
  };

  const handleEpisodeSelect = (episode, anime, preloadedStream = null) => {
    setSelectedEpisode({ ep: episode, anime, preloadedStream });
    setShowModal(true);
    const currentPath = window.location.pathname;
    window.history.replaceState({ modal: false }, '', currentPath);
    if (anime.type === 'movie') {
      window.history.pushState({ modal: true }, '', `${currentPath}#quality-${episode.title || 'default'}`);
    } else {
      window.history.pushState({ modal: true }, '', `${currentPath}#episode-${episode.season || 1}-${episode.episode}`);
    }
  };

  const handleStream = (stream) => {
    setShowModal(false);
    const anime = selectedEpisode.anime;
    const slug = createSlug(anime.name || anime.title);
    navigate(`/watch/${slug}/${anime.id}/${selectedEpisode.ep.episode}`, {
      state: { stream, anime, episode: selectedEpisode.ep }
    });
  };

  const handleDownload = (stream) => {
    setShowModal(false);
    const anime = selectedEpisode.anime;
    const slug = createSlug(anime.name || anime.title);
    navigate(`/download/${slug}/${anime.id}/${selectedEpisode.ep.episode}`, {
      state: { stream, anime, episode: selectedEpisode.ep }
    });
  };

  return (
    <div className="anime-app">
      <nav className={`anime-nav ${location.pathname === '/recent' ? 'recent-page-nav' : ''}`}>
        <div className="nav-container">
          <h1 className="nav-brand" onClick={() => navigate('/')}>
            <img src={logoSrc} alt="Anime Shrine" style={{ height: '56px', width: 'auto', marginRight: '8px', verticalAlign: 'middle' }} />
            Anime Shrine
          </h1>

          {/* Mobile Action Buttons */}
          <div className="mobile-actions" style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button
              className="mobile-search-btn"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'none'  // Hidden by default, shown on mobile via CSS
              }}
            >
              <Search className="w-6 h-6" />
            </button>
            <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(!showMobileMenu)}>
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>


          {/* Search Bar in Navigation */}
          <div className={`nav-search ${showMobileSearch ? 'mobile-visible' : ''}`} style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
            <Search className="search-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search anime..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.95rem'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const searchQuery = e.target.value.trim();
                  // Navigate to homepage with search - don't use replace so page actually updates
                  navigate(`/?search=${encodeURIComponent(searchQuery)}`);
                  setShowMobileSearch(false); // Close search after search
                  e.target.value = ''; // Clear input after search
                }
              }}
            />
          </div>

          <div className={`nav-links ${showMobileMenu ? 'mobile-open' : ''}`}>
            <button onClick={() => navigate('/')} className={location.pathname === '/' ? 'active' : ''}>Home</button>
            <button onClick={() => navigate('/index')} className={location.pathname.startsWith('/index') ? 'active' : ''}>Completed</button>
            <button onClick={() => navigate('/ongoing')} className={location.pathname === '/ongoing' ? 'active' : ''}>Ongoing</button>
            <button onClick={() => navigate('/schedule')} className={location.pathname === '/schedule' ? 'active' : ''}>Schedule</button>
            <button onClick={() => navigate('/recent')} className={location.pathname === '/recent' ? 'active' : ''}>Recent</button>
          </div>
        </div>
      </nav>

      {/* Filter Box Below Navigation */}
      <div className="filter-box" style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div className="filter-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="filter-label" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Content Type:</span>
          <div className="content-type-toggle" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`filter-btn ${contentType === 'series' ? 'active' : ''}`}
              onClick={() => setContentType('series')}
              style={{
                padding: '0.5rem 1.25rem',
                background: contentType === 'series' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${contentType === 'series' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                color: contentType === 'series' ? 'white' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Series
            </button>
            <button
              className={`filter-btn ${contentType === 'movie' ? 'active' : ''}`}
              onClick={() => setContentType('movie')}
              style={{
                padding: '0.5rem 1.25rem',
                background: contentType === 'movie' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${contentType === 'movie' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                color: contentType === 'movie' ? 'white' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Movies
            </button>
          </div>
        </div>

        <div className="filter-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="filter-label" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Sort By:</span>
          <div className="sort-options" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`filter-btn ${sortBy === 'recent' ? 'active' : ''}`}
              onClick={() => setSortBy('recent')}
              style={{
                padding: '0.5rem 1.25rem',
                background: sortBy === 'recent' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'recent' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                color: sortBy === 'recent' ? 'white' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Recent
            </button>
            <button
              className={`filter-btn ${sortBy === 'latest' ? 'active' : ''}`}
              onClick={() => setSortBy('latest')}
              style={{
                padding: '0.5rem 1.25rem',
                background: sortBy === 'latest' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'latest' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                color: sortBy === 'latest' ? 'white' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Latest
            </button>
            <button
              className={`filter-btn ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => setSortBy('popular')}
              style={{
                padding: '0.5rem 1.25rem',
                background: sortBy === 'popular' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'popular' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                color: sortBy === 'popular' ? 'white' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Popular
            </button>
          </div>
        </div>
      </div>

      {showMobileMenu && (
        <div className="menu-overlay" onClick={() => setShowMobileMenu(false)}></div>
      )}

      <main className="anime-main">
        <Routes>
          <Route path="/" element={
            <HomePage
              catalog={catalog}
              onAnimeSelect={handleAnimeSelect}
              sortBy={sortBy}
              setSortBy={setSortBy}
              contentType={contentType}
              setContentType={setContentType}
              loading={loading}
            />
          } />
          <Route path="/index" element={<IndexPage onAnimeSelect={handleAnimeSelect} catalog={catalog} />} />
          <Route path="/schedule" element={<SchedulePage catalog={catalog} onAnimeSelect={handleAnimeSelect} />} />
          <Route path="/ongoing" element={<OngoingPage catalog={catalog} onAnimeSelect={handleAnimeSelect} />} />
          <Route path="/recent" element={
            <>
              <SEO title="Recent Uploads | Anime Shrine" description="Discover the latest anime series added to our platform." />
              <RecentPage onAnimeSelect={handleAnimeSelect} />
            </>
          } />
          <Route path="/genre/:genreName" element={<GenrePage catalog={catalog} onAnimeSelect={handleAnimeSelect} />} />
          <Route path="/completed" element={<Navigate to="/index" replace />} />
          <Route path="/index/admin" element={<AdminPage />} />
          <Route path="/series/:slug/:imdbId" element={<AnimeDetailPage catalog={catalog} onEpisodeSelect={handleEpisodeSelect} />} />
          <Route path="/movie/:slug/:imdbId" element={<AnimeDetailPage catalog={catalog} onEpisodeSelect={handleEpisodeSelect} />} />
          <Route path="/series/:imdbId" element={<AnimeDetailRedirect />} />
          <Route path="/movie/:imdbId" element={<AnimeDetailRedirect />} />
          <Route path="/watch/:slug/:imdbId/:episode" element={<StreamPageWrapper />} />
          <Route path="/download/:slug/:imdbId/:episode" element={<DownloadPageWrapper />} />
          <Route path="/download/:slug/:imdbId/movie/quality/:qualityIndex" element={<DownloadFinalPageWrapper />} />
          <Route path="/download/:slug/:imdbId/:episode/quality/:qualityIndex" element={<DownloadFinalPageWrapper />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={
            <div className="static-page">
              <h1>Contact Us</h1>
              <div className="static-card">
                <p>Have questions, feedback, or a takedown request? Reach out to us.</p>
                <p><strong>Email:</strong> <a href="mailto:animeshrine@proton.me">animeshrine@proton.me</a></p>
              </div>
            </div>
          } />
          <Route path="/dmca" element={
            <div className="static-page">
              <h1>DMCA Policy</h1>
              <div className="static-card">
                <p>Anime Shrine is a search/indexing service. We do not upload, host, or store any files on our servers. All media links point to content hosted by third‑party networks (e.g. CDNs) over which we have no control.</p>
                <p>If you are a rights holder and believe a link on our site infringes your copyright, please send a notice to <a href="mailto:animeshrine@proton.me">animeshrine@proton.me</a>. We will review and, where appropriate, remove the listing.</p>
                <p>Please include the following in your notice:</p>
                <ul>
                  <li>Description of the copyrighted work</li>
                  <li>URL of the infringing material</li>
                  <li>Your contact information</li>
                  <li>A statement of good faith belief</li>
                  <li>A statement that the information is accurate and that you are authorized to act</li>
                </ul>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Note: We cannot remove content from third-party services; we can only delist links from our site. For permanent removal, please contact the original host through their DMCA or abuse process.</p>
              </div>
            </div>
          } />
          <Route path="/privacy" element={
            <div className="static-page">
              <h1>Privacy Policy</h1>
              <div className="static-card">
                <p>At Anime Shrine, we take your privacy seriously.</p>
                <p>We do not collect any personal data from our users. We do not use cookies for tracking purposes.</p>
                <p>Any data stored (such as your watchlist or preferences) is saved locally on your device using LocalStorage.</p>
              </div>
            </div>
          } />
          <Route path="/terms" element={
            <div className="static-page">
              <h1>Terms of Service</h1>
              <div className="static-card">
                <p>By using Anime Shrine, you agree to the following terms:</p>
                <ul>
                  <li>This site is for educational and entertainment purposes only.</li>
                  <li>We do not host any files. All content is provided by third-party services.</li>
                  <li>You agree not to use this site for any illegal activities.</li>
                </ul>
              </div>
            </div>
          } />
        </Routes>
      </main>

      {showModal && selectedEpisode && (
        <EpisodeOptionsModal
          episode={selectedEpisode.ep}
          anime={selectedEpisode.anime}
          preloadedStream={selectedEpisode.preloadedStream || null}
          onClose={() => {
            setShowModal(false);
            window.history.replaceState(null, '', window.location.pathname);
          }}
          onStream={handleStream}
          onDownload={handleDownload}
        />
      )}

      <Footer />
    </div>
  );
}


export default function AnimeDownloadApp() {
  // Temporarily disabled for debugging
  // const { isDevToolsOpen } = useDevToolsProtection();
  const isDevToolsOpen = false;

  return (
    <>
      <DevToolsWarning isOpen={isDevToolsOpen} />
      <BrowserRouter>
        <ScrollToTop />
        <AppContent />
      </BrowserRouter>
    </>
  );
}
