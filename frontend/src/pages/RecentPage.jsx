import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Star, Loader } from 'lucide-react';
import api from '../services/api';
import AudioBadges from '../components/AudioBadges';

const RecentPage = ({ onAnimeSelect }) => {
    const [recentAnime, setRecentAnime] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 48; // Increased from 24 for optimized Load More

    // Add class to body for CSS targeting
    useEffect(() => {
        document.body.classList.add('recent-page-active');
        return () => {
            document.body.classList.remove('recent-page-active');
        };
    }, []);

    // Load initial page
    useEffect(() => {
        const loadInitial = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('📊 Recent Page - Loading page 1...');

                // Try optimized Load More API first
                try {
                    const data = await api.getRecentLoadMore('series', 1, PAGE_SIZE);
                    if (data.metas && data.metas.length > 0) {
                        setRecentAnime(data.metas);
                        setHasMore(data.hasMore !== false);
                        setTotal(data.total || data.metas.length);
                        setPage(1);
                        console.log(`✅ Loaded ${data.metas.length} items from optimized API`);
                        return;
                    }
                } catch (optimizedErr) {
                    console.log('⚠️ Optimized API failed, trying paginated:', optimizedErr.message);
                }

                // Fallback to paginated API
                try {
                    const data = await api.getRecentPaginated('series', 1, 24);
                    if (data.metas && data.metas.length > 0) {
                        setRecentAnime(data.metas);
                        setHasMore(data.hasMore !== false && data.metas.length === 24);
                        setTotal(data.total || data.metas.length);
                        setPage(1);
                        console.log(`✅ Loaded ${data.metas.length} items from paginated API`);
                        return;
                    }
                } catch (paginatedErr) {
                    console.log('⚠️ Paginated API failed, trying fallback:', paginatedErr.message);
                }

                // Final fallback to original API
                console.log('📊 Using fallback API...');
                const fallbackData = await api.getRecent('series');
                const metas = fallbackData.metas || [];
                setRecentAnime(metas);
                setHasMore(metas.length > PAGE_SIZE);
                setTotal(metas.length);
                setPage(1);
                console.log(`✅ Loaded ${metas.length} items from fallback API`);

            } catch (err) {
                console.error('Error loading recent anime:', err);
                setError('Failed to load recent uploads');
            } finally {
                setLoading(false);
            }
        };

        loadInitial();
    }, []);

    // Load more pages using optimized endpoint
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;

        try {
            setLoadingMore(true);
            const nextPage = page + 1;
            console.log(`📊 Recent Page - Loading page ${nextPage}...`);

            const data = await api.getRecentLoadMore('series', nextPage, PAGE_SIZE);
            const newItems = data.metas || [];

            setRecentAnime(prev => [...prev, ...newItems]);
            setHasMore(data.hasMore !== false);
            setTotal(data.total || recentAnime.length + newItems.length);
            setPage(nextPage);

            console.log(`✅ Loaded ${newItems.length} more items (page ${nextPage})`);
        } catch (err) {
            console.error('Error loading more anime:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [page, hasMore, loadingMore, recentAnime.length]);

    if (error) {
        return (
            <div className="page-container" style={{ marginTop: 'var(--nav-height)', padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Recent Uploads</h2>
                <p style={{ color: 'var(--text-muted)' }}>{error}</p>
            </div>
        );
    }

    return (
        <div className="page-container recent-page-container" style={{ marginTop: 'calc(var(--nav-height) + 0.5rem)', padding: '1rem 0' }}>
            <div className="container">
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-main)', lineHeight: 1.1 }}>
                    Recent Uploads
                </h1>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Latest anime series added to the platform
                    {total > 0 && ` • ${recentAnime.length} of ${total} loaded`}
                </p>

                {loading ? (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(10, 10, 18, 0.95)',
                        zIndex: 99999
                    }}>
                        <div className="raw-spinner" style={{
                            width: '50px',
                            height: '50px',
                            border: '5px solid rgba(168, 85, 247, 0.2)',
                            borderTop: '5px solid #a855f7',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '15px'
                        }}></div>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>Loading...</span>
                    </div>
                ) : recentAnime.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No recent uploads found</p>
                    </div>
                ) : (
                    <>
                        <div className="anime-grid">
                            {recentAnime.map((anime) => (
                                <div key={anime.id} className="anime-card" onClick={() => onAnimeSelect(anime)}>
                                    <div className="anime-card-image">
                                        <img src={anime.poster} alt={anime.name} className="anime-poster desktop-poster" loading="lazy" />
                                        <img
                                            src={anime.background || anime.backdrop || anime.cover || anime.poster}
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

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="load-more-btn"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '1rem 2.5rem',
                                        background: loadingMore ? 'rgba(138, 43, 226, 0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        fontSize: '1rem',
                                        border: 'none',
                                        cursor: loadingMore ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        `Load More (Page ${page + 1})`
                                    )}
                                </button>
                                <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Showing {recentAnime.length} of {total > 0 ? total : 'many'} anime
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Full-screen loading overlay when loading more */}
                {/* Full-screen loading overlay when loading more - PORTAL to body to avoid clipping */}
                {loadingMore && createPortal(
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(10, 10, 18, 0.95)',
                        zIndex: 99999
                    }}>
                        <div className="raw-spinner" style={{
                            width: '50px',
                            height: '50px',
                            border: '5px solid rgba(168, 85, 247, 0.2)',
                            borderTop: '5px solid #a855f7',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '15px'
                        }}></div>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>Loading...</span>
                    </div>,
                    document.body
                )}
            </div>
        </div >
    );
};

export default RecentPage;

