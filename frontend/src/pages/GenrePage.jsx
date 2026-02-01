import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Star, Tag } from 'lucide-react';

const ITEMS_PER_PAGE = 24;

// Normalize genre names: convert URL slugs (slice-of-life) to match genre names (Slice of Life)
const normalizeGenre = (genre) => {
    return genre.toLowerCase().replace(/-/g, ' ');
};

const GenrePage = ({ catalog, onAnimeSelect }) => {
    const { genreName } = useParams();
    const navigate = useNavigate();
    const [filteredAnime, setFilteredAnime] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (catalog) {
            setLoading(true);
            const targetGenre = normalizeGenre(genreName);

            const results = catalog.filter(anime => {
                if (!anime.genres) return false;
                return anime.genres.some(g => normalizeGenre(g) === targetGenre);
            });

            setFilteredAnime(results);
            setPage(1); // Reset page when genre changes
            setLoading(false);
        }
    }, [catalog, genreName]);

    // Pagination
    const displayedAnime = filteredAnime.slice(0, page * ITEMS_PER_PAGE);
    const hasMore = displayedAnime.length < filteredAnime.length;

    const formatGenreTitle = (slug) => {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="container" style={{ paddingTop: '100px', minHeight: '80vh' }}>
            <div className="section-header" style={{ justifyContent: 'center', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                <h1 className="section-title" style={{ fontSize: '2.5rem' }}>
                    <Tag className="w-8 h-8 text-primary" />
                    {formatGenreTitle(genreName)} Anime
                </h1>
                <p className="text-muted">
                    Found {filteredAnime.length} titles in {formatGenreTitle(genreName)}
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <>
                    {filteredAnime.length > 0 ? (
                        <>
                            <div className="anime-grid">
                                {displayedAnime.map(anime => (
                                    <div
                                        key={anime.id}
                                        className="anime-card"
                                        onClick={() => onAnimeSelect(anime)}
                                    >
                                        <div className="anime-card-image">
                                            <img
                                                src={anime.poster}
                                                alt={anime.name}
                                                className="anime-poster"
                                                loading="lazy"
                                            />
                                            <div className="anime-overlay">
                                                <div className="anime-play-btn">
                                                    <Play className="w-8 h-8" fill="white" />
                                                </div>
                                            </div>
                                            <div className="season-badge">
                                                {anime.type === 'movie' ? 'Movie' : 'Series'}
                                            </div>
                                        </div>

                                        <div className="anime-info">
                                            <h3 className="anime-title">{anime.name}</h3>
                                            <div className="anime-meta">
                                                <span className="anime-rating">
                                                    <Star className="w-4 h-4" fill="gold" />
                                                    {anime.imdbRating || 'N/A'}
                                                </span>
                                                <span className="anime-year">{anime.year}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Load More Button */}
                            {hasMore && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    marginTop: '2rem',
                                    marginBottom: '2rem'
                                }}>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        className="btn-primary"
                                        style={{
                                            padding: '1rem 3rem',
                                            fontSize: '1rem',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        Load More ({filteredAnime.length - displayedAnime.length} remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-bold mb-4">No anime found</h2>
                            <p className="text-muted">
                                We couldn't find any anime in the "{formatGenreTitle(genreName)}" genre.
                            </p>
                            <button
                                onClick={() => navigate('/index')}
                                className="btn-primary mt-6"
                            >
                                Browse All Anime
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default GenrePage;
