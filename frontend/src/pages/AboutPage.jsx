import React from 'react';
import SEO from '../components/SEO';

const AboutPage = () => {
    return (
        <>
            <SEO
                title="About Anime Shrine - Free Anime Streaming Platform"
                description="Learn about Anime Shrine, your destination for streaming and downloading anime in Hindi, English, Tamil, Telugu & Japanese. Free HD anime with no registration."
                keywords="about anime shrine, anime streaming platform, multi-language anime, free anime"
            />

            <div style={{
                padding: '2rem 1rem',
                maxWidth: '900px',
                margin: '0 auto',
                animation: 'fadeIn 0.5s ease'
            }}>
                <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    marginBottom: '2rem',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    About Anime Shrine
                </h1>

                {/* Original About Content */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '2rem 1.5rem',
                    marginBottom: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    lineHeight: '1.7'
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        What is Anime Shrine?
                    </h2>
                    <p style={{
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        marginBottom: '1rem'
                    }}>
                        Anime Shrine is an indexer and player interface for content available on third-party services (e.g., public CDNs).
                        We do not host or store any files on our servers. Links are aggregated from publicly available sources.
                    </p>
                </div>

                {/* SEO Content */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '2rem 1.5rem',
                    marginBottom: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    lineHeight: '1.7'
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Watch & Download Anime in Multiple Languages
                    </h2>
                    <p style={{
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        marginBottom: '1rem'
                    }}>
                        Welcome to <strong>Anime Shrine</strong>, your ultimate destination for streaming and downloading anime in multiple languages.
                        We offer a vast collection of anime series and movies with <strong>Hindi dubbed</strong>, <strong>English dub</strong>,
                        <strong>Tamil</strong>, <strong>Telugu</strong>, and <strong>Japanese</strong> audio options. Whether you prefer watching
                        anime in your native language or experiencing it in the original Japanese with subtitles, we've got you covered.
                    </p>
                    <p style={{
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        marginBottom: '1rem'
                    }}>
                        Our platform features the latest anime releases as well as classic favorites, all available in <strong>HD quality</strong>.
                        From action-packed shonen series to heartwarming slice-of-life shows, our extensive library caters to every anime fan's taste.
                        Stream your favorite anime online for free or download episodes to watch offline at your convenience.
                    </p>

                    <h2 style={{
                        fontSize: '1.4rem',
                        fontWeight: '700',
                        marginTop: '1.5rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Popular Hindi Dubbed Anime & Multi-Audio Collection
                    </h2>
                    <p style={{
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        marginBottom: '1rem'
                    }}>
                        Discover trending <strong>Hindi dubbed anime</strong> series including popular titles with dual audio and multi-audio options.
                        Our collection is regularly updated with new episodes and series, ensuring you never miss out on the latest anime content.
                        Watch popular anime like Naruto, One Piece, Attack on Titan, Demon Slayer, and many more in your preferred language.
                    </p>
                    <p style={{
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        marginBottom: '0'
                    }}>
                        Anime Shrine provides a seamless streaming experience with fast loading times and high-quality video playback.
                        Browse our catalog by genre, year, or popularity to find your next favorite anime. Join thousands of anime fans
                        who trust Anime Shrine for their daily dose of anime entertainment. Start watching now - completely free, no registration required!
                    </p>
                </div>

                {/* Features Section */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '2rem 1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    lineHeight: '1.7'
                }}>
                    <h2 style={{
                        fontSize: '1.4rem',
                        fontWeight: '700',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Why Choose Anime Shrine?
                    </h2>
                    <ul style={{
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        lineHeight: '2',
                        paddingLeft: '1.5rem'
                    }}>
                        <li>✨ <strong>Free Streaming</strong> - No subscription or registration required</li>
                        <li>🎬 <strong>HD Quality</strong> - Watch anime in high definition</li>
                        <li>🌍 <strong>Multiple Languages</strong> - Hindi, English, Tamil, Telugu, Japanese</li>
                        <li>📥 <strong>Download Option</strong> - Save episodes for offline viewing</li>
                        <li>🔄 <strong>Regular Updates</strong> - New episodes added frequently</li>
                        <li>📱 <strong>Mobile Friendly</strong> - Watch on any device</li>
                    </ul>
                </div>
            </div>
        </>
    );
};

export default AboutPage;
