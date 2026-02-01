import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Loader, Play } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const SchedulePage = ({ catalog, onAnimeSelect }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeDay, setActiveDay] = useState('');

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Initialize active day from URL hash or default to today
    useEffect(() => {
        const hash = location.hash.replace('#', '').toLowerCase();
        const dayFromHash = days.find(d => d.toLowerCase() === hash);

        if (dayFromHash) {
            setActiveDay(dayFromHash);
        } else {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            // Capitalize first letter
            const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);
            setActiveDay(todayCapitalized);
            // Set hash for today if no hash exists
            if (!hash) {
                navigate(`/schedule#${todayCapitalized.toLowerCase()}`, { replace: true });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.hash]);

    // Handle hash changes from browser back/forward buttons
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '').toLowerCase();
            const dayFromHash = days.find(d => d.toLowerCase() === hash);
            if (dayFromHash) {
                setActiveDay(dayFromHash);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                setLoading(true);
                // Fetch cached schedule from backend (no AniList fetching needed)
                const data = await api.getSchedule();

                if (data.schedule && Object.keys(data.schedule).length > 0) {
                    setSchedule(data.schedule);
                } else {
                    setSchedule({});
                }
            } catch (error) {
                console.error('Failed to fetch schedule:', error);
                setSchedule({});
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, []);

    const getAnimeInCatalog = (titleObj) => {
        if (!catalog || catalog.length === 0) return null;
        const normalize = (str) => str?.toLowerCase().replace(/[^\w\s]/g, '') || '';

        const titles = [titleObj?.english, titleObj?.romaji, titleObj?.native].filter(Boolean);

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

    const convertTime = (timeStr) => {
        try {
            if (!timeStr) return { ist: 'N/A', utc: 'N/A' };

            let hours, minutes;

            // Handle different time formats
            if (typeof timeStr === 'string') {
                // Format: "HH:MM" or "HH:MM:SS"
                const parts = timeStr.split(':');
                if (parts.length < 2) return { ist: timeStr, utc: timeStr };

                hours = parseInt(parts[0], 10);
                minutes = parseInt(parts[1], 10);
            } else {
                return { ist: 'N/A', utc: 'N/A' };
            }

            if (isNaN(hours) || isNaN(minutes)) return { ist: timeStr, utc: timeStr };

            // JST to IST: JST is UTC+9, IST is UTC+5:30, so IST = JST - 3:30
            let istHours = hours - 3;
            let istMinutes = minutes - 30;

            if (istMinutes < 0) {
                istMinutes += 60;
                istHours -= 1;
            }

            if (istHours < 0) istHours += 24;
            if (istHours >= 24) istHours -= 24;

            // Format IST in 12-hour format
            const istAmPm = istHours >= 12 ? 'PM' : 'AM';
            const istHour12 = istHours % 12 || 12;
            const istFormatted = `${istHour12}:${String(istMinutes).padStart(2, '0')} ${istAmPm} IST`;

            // JST to UTC: UTC = JST - 9
            let utcHours = hours - 9;
            if (utcHours < 0) utcHours += 24;
            if (utcHours >= 24) utcHours -= 24;

            // Format UTC in 24-hour format
            const utcFormatted = `${String(utcHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} UTC`;

            return { ist: istFormatted, utc: utcFormatted };
        } catch (error) {
            console.error('Time conversion error:', error, timeStr);
            return { ist: String(timeStr), utc: String(timeStr) };
        }
    };

    // Process schedule items with AniList title conversion (from backend cache)
    const getDaySchedule = () => {
        if (!schedule || Object.keys(schedule).length === 0) {
            return [];
        }

        // Handle different possible schedule structures
        const dayData = schedule[activeDay];
        if (Array.isArray(dayData)) {
            return dayData;
        }

        // Try to find the day in a different case
        const dayLower = activeDay.toLowerCase();
        for (const [key, value] of Object.entries(schedule)) {
            if (key.toLowerCase() === dayLower && Array.isArray(value)) {
                return value;
            }
        }

        return [];
    };

    const currentSchedule = getDaySchedule()
        .map(item => {
            // Use AniList title data from backend cache
            let catalogItem = null;

            if (item.anilistTitle) {
                // Use AniList title data from backend to find in catalog
                catalogItem = getAnimeInCatalog(item.anilistTitle);
            }

            // Fallback: try direct title match if AniList didn't work
            if (!catalogItem) {
                const normalize = (str) => str?.toLowerCase().replace(/[^\w\s]/g, '') || '';
                const target = normalize(item.title);
                catalogItem = catalog?.find(catItem => {
                    const itemTitle = normalize(catItem.name || catItem.title);
                    if (itemTitle === target) return true;
                    if (itemTitle.includes(target) && target.length >= 4) return true;
                    if (target.includes(itemTitle) && itemTitle.length >= 4) return true;
                    return false;
                }) || null;
            }

            return {
                ...item,
                catalogItem,
                displayTitle: item.anilistTitle?.english || item.anilistTitle?.romaji || item.title
            };
        })
        .filter(item => item.catalogItem !== null);

    // Generate gradient colors based on index
    const getGradientStyle = (index) => {
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'linear-gradient(135deg, #ff8a80 0%, #ea6100 100%)',
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className="container" style={{ paddingTop: '100px', minHeight: '80vh' }}>
            <div className="schedule-header">
                <h1 className="section-title" style={{ justifyContent: 'center', fontSize: '2.5rem', marginBottom: '1rem' }}>
                    <Calendar className="w-8 h-8 text-primary" />
                    Release Schedule
                </h1>
                <p className="text-muted" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    Showing anime from your catalog airing on {activeDay}
                </p>

                <div className="day-filters">
                    {days.map(day => {
                        const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                        const todayCapitalized = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
                        const isToday = day === todayCapitalized;

                        return (
                            <button
                                key={day}
                                className={`day-btn ${activeDay === day ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveDay(day);
                                    navigate(`/schedule#${day.toLowerCase()}`, { replace: true });
                                }}
                            >
                                {day}
                                {isToday && ' (Today)'}
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading ? (
                <div className="page-loader-overlay">
                    <div className="circular-loader"></div>
                </div>
            ) : (
                <>
                    <div className="anime-grid" style={{ padding: '0 1rem' }}>
                        {currentSchedule.length > 0 ? (
                            currentSchedule.map((item, index) => {
                                const times = convertTime(item.time);
                                const catalogItem = item.catalogItem;
                                const gradientStyle = getGradientStyle(index);

                                return (
                                    <div
                                        key={`${item.title}-${index}`}
                                        className="anime-card"
                                        onClick={() => catalogItem && onAnimeSelect(catalogItem)}
                                        style={{
                                            cursor: catalogItem ? 'pointer' : 'default',
                                            background: 'var(--bg-card)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div className="anime-card-image" style={{ position: 'relative' }}>
                                            <img
                                                src={catalogItem.poster || catalogItem.background || 'https://via.placeholder.com/300x450'}
                                                alt={catalogItem.name}
                                                className="anime-poster"
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/300x450';
                                                }}
                                            />
                                            {/* Subtle gradient overlay */}
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: '30%',
                                                background: `linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)`,
                                                pointerEvents: 'none'
                                            }} />
                                            <div className="anime-overlay">
                                                <div className="anime-play-btn">
                                                    <Play className="w-8 h-8" fill="white" />
                                                </div>
                                            </div>
                                            {/* Time badge */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '0.5rem',
                                                right: '0.5rem',
                                                background: 'rgba(0, 0, 0, 0.8)',
                                                backdropFilter: 'blur(8px)',
                                                padding: '0.4rem 0.6rem',
                                                borderRadius: '8px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                border: '1px solid rgba(138, 43, 226, 0.3)'
                                            }}>
                                                <Clock className="w-3 h-3" />
                                                {times.ist.split(' ')[0]}
                                            </div>
                                        </div>
                                        <div className="card-info" style={{
                                            padding: '1rem',
                                            position: 'relative',
                                            background: 'rgba(0, 0, 0, 0.6)',
                                            backdropFilter: 'blur(4px)'
                                        }}>
                                            <h3 className="card-title" style={{
                                                color: 'white',
                                                marginBottom: '0.5rem',
                                                fontSize: '0.95rem',
                                                fontWeight: '600',
                                                textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                                            }}>
                                                {catalogItem.name}
                                            </h3>
                                            <div style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--primary)',
                                                fontWeight: '600',
                                                marginTop: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}>
                                                <Clock className="w-4 h-4" />
                                                {times.ist}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-muted)',
                                                marginTop: '0.25rem'
                                            }}>
                                                {times.utc}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-10 text-muted" style={{ gridColumn: '1 / -1' }}>
                                <p>No anime from your catalog scheduled for {activeDay}</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SchedulePage;
