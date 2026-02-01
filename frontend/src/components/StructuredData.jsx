import { useEffect } from 'react';

function StructuredData({ type, data }) {
    useEffect(() => {
        let structuredData = {};

        if (type === 'anime') {
            structuredData = {
                "@context": "https://schema.org",
                "@type": "TVSeries",
                "name": data.title,
                "description": data.description,
                "image": data.image,
                "genre": data.genres || [],
                "numberOfSeasons": data.numberOfSeasons || 1,
                "numberOfEpisodes": data.numberOfEpisodes || 0,
                "datePublished": data.datePublished,
                "inLanguage": ["en", "hi", "ta", "te", "ja"]
            };

            // Only include aggregateRating if rating is valid (>= 1.0)
            // Prevents "Rating value is out of range" error for new shows without IMDB ratings
            const rating = parseFloat(data.rating);
            if (rating && rating >= 1.0) {
                structuredData.aggregateRating = {
                    "@type": "AggregateRating",
                    "ratingValue": rating.toString(),
                    "bestRating": "10",
                    "worstRating": "1",
                    "ratingCount": data.ratingCount || "100"
                };
            }
        } else if (type === 'breadcrumb') {
            structuredData = {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": data.map((item, index) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "name": item.name,
                    "item": item.url
                }))
            };
        }

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'dynamic-structured-data-' + type;
        script.textContent = JSON.stringify(structuredData);

        // Remove existing
        const existing = document.getElementById('dynamic-structured-data-' + type);
        if (existing) existing.remove();

        document.head.appendChild(script);

        return () => {
            const s = document.getElementById('dynamic-structured-data-' + type);
            if (s) s.remove();
        };
    }, [type, data]);

    return null;
}

export default StructuredData;
