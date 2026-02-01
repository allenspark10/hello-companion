import React from 'react';

/**
 * AudioBadges - Premium SUB/DUB counting badges for anime tiles
 * SUB badge in bottom-left, DUB badge in bottom-right
 * Horizontal layout: "CC 5" and "DUB 3"
 */
const AudioBadges = ({ totalSub, totalDub }) => {
    // Don't render if no audio data
    if (!totalSub && !totalDub) return null;

    return (
        <>
            {/* SUB Badge - Bottom Left */}
            {totalSub > 0 && (
                <div className="audio-badge-sub-container">
                    <div className="audio-badge audio-badge-sub">
                        <span className="badge-label">CC</span>
                        <span className="badge-count">{totalSub}</span>
                    </div>
                </div>
            )}

            {/* DUB Badge - Bottom Right */}
            {totalDub > 0 && (
                <div className="audio-badge-dub-container">
                    <div className="audio-badge audio-badge-dub">
                        <span className="badge-label">DUB</span>
                        <span className="badge-count">{totalDub}</span>
                    </div>
                </div>
            )}
        </>
    );
};

export default AudioBadges;
