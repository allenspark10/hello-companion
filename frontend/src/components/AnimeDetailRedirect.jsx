import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { createSlug } from '../utils/slugify';
import api from '../services/api';

function AnimeDetailRedirect() {
    const { imdbId } = useParams();
    const [slug, setSlug] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTitle = async () => {
            try {
                // We need to fetch the anime title to generate the slug
                // Try to get it from meta API
                // Assuming the ID format is "type-id" or just "id"
                // The current app uses "series-123" or just "123"?
                // Let's look at how the app handles IDs. 
                // It seems to use "series" or "movie" as type.
                // If imdbId is just "21209876-1", we might need to guess type or it's embedded.

                // In the user's example: /series/21209876-1
                // The ID is 21209876-1.

                // Let's try to fetch meta.
                // We might need to know if it's a movie or series.
                // For now, let's assume 'series' if the route is /series/:imdbId

                const type = 'series'; // Default to series for this route
                const data = await api.getMeta(type, imdbId);

                if (data && data.meta && (data.meta.name || data.meta.title)) {
                    setSlug(createSlug(data.meta.name || data.meta.title));
                } else {
                    // Fallback if fetch fails or no title
                    setSlug('anime');
                }
            } catch (e) {
                console.error("Failed to fetch anime for redirect", e);
                setSlug('anime');
            } finally {
                setLoading(false);
            }
        };

        fetchTitle();
    }, [imdbId]);

    if (loading) return <div className="flex items-center justify-center h-screen text-white">Loading redirect...</div>;

    return <Navigate to={`/series/${slug}/${imdbId}`} replace />;
}

export default AnimeDetailRedirect;
