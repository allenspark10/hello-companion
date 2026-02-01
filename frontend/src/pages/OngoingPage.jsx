import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, Calendar, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const OngoingPage = ({ catalog, onAnimeSelect }) => {
    const [ongoingAnime, setOngoingAnime] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOngoing = async () => {
            try {
                setLoading(true);
                // Fetch cached ongoing anime from backend
                const data = await api.getOngoing();

                if (data.media && Array.isArray(data.media)) {
                    setOngoingAnime(data.media);
                } else {
                    setOngoingAnime([]);
                }
            } catch (error) {
                console.error('Failed to fetch ongoing anime:', error);
                setOngoingAnime([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOngoing();
    }, []);

    const getAnimeInCatalog = (titleObj) => {
        if (!catalog) return null;
        const normalize = (str) => str?.toLowerCase().replace(/[^\w\s]/g, '') || '';

        const titles = [titleObj.english, titleObj.romaji, titleObj.native].filter(Boolean);

        return catalog.find(item => {
            const itemTitle = normalize(item.name || item.title);
            return titles.some(t => {
                const target = normalize(t);
                // Exact match is best
                if (itemTitle === target) return true;
                // If one includes the other, ensure it's a significant match
                if (itemTitle.includes(target) || target.includes(itemTitle)) {
                    // Avoid matching short common words like "One", "The", "Case" unless exact
                    if (target.length < 4 || itemTitle.length < 4) return false;
                    return true;
                }
                return false;
            });
        });
    };

    return (
        <div className="container" style={{ paddingTop: '100px', minHeight: '80vh' }}>
            <div className="section-header" style={{ justifyContent: 'center', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                <h1 className="section-title" style={{ fontSize: '2.5rem' }}>
                    <TrendingUp className="w-8 h-8 text-primary" />
                    Trending Ongoing Series
                </h1>
                <p className="text-muted">Top airing anime right now</p>
            </div>

            {loading ? (
                <div className="page-loader-overlay">
                    <div className="circular-loader"></div>
                </div>
            ) : (
                <div className="anime-grid">
                    {ongoingAnime
                        .filter(anime => getAnimeInCatalog(anime.title))
                        .map(anime => {
                            const catalogItem = getAnimeInCatalog(anime.title);
                            const title = anime.title.english || anime.title.romaji;

                            return (
                                <div
                                    key={anime.id}
                                    className="anime-card"
                                    onClick={() => catalogItem && onAnimeSelect(catalogItem)}
                                >
                                    <div className="anime-card-image">
                                        <img
                                            src={anime.coverImage.extraLarge || anime.coverImage.large}
                                            alt={title}
                                            className="anime-poster"
                                        />
                                        <div className="anime-overlay">
                                            <div className="anime-play-btn">
                                                <Play className="w-8 h-8" fill="white" />
                                            </div>
                                        </div>
                                        {anime.nextAiringEpisode && (
                                            <div className="season-badge" style={{ background: 'var(--primary)' }}>
                                                EP {anime.nextAiringEpisode.episode} Soon
                                            </div>
                                        )}
                                    </div>

                                    <div className="anime-info">
                                        <h3 className="anime-title">{title}</h3>
                                        <div className="anime-meta">
                                            <span className="anime-rating">
                                                <Star className="w-4 h-4" fill="gold" />
                                                {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A'}
                                            </span>
                                            <span style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                WATCH NOW
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
            {!loading && ongoingAnime.filter(anime => getAnimeInCatalog(anime.title)).length === 0 && (
                <div className="text-center text-muted" style={{ padding: '2rem' }}>
                    <p>No trending ongoing anime found in your catalog.</p>
                </div>
            )}
        </div>
    );
};

export default OngoingPage;
