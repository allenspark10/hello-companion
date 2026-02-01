import React from 'react';

const DevToolsWarning = ({ isOpen }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            color: 'white',
            fontFamily: 'Arial, sans-serif',
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '500px',
                padding: '2rem',
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
                <h1 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Developer Tools Detected</h1>
                <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', color: '#ccc' }}>
                    For security and performance reasons, please close your browser's Developer Tools to continue using this site.
                </p>
                <p style={{ fontSize: '0.9rem', color: '#888' }}>
                    If you're a developer and need to inspect the site, please contact support.
                </p>
            </div>
        </div>
    );
};

export default DevToolsWarning;
