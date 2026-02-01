import { useEffect, useState } from 'react';

/**
 * Light DevTools Protection Hook
 * - Disables right-click in production
 * - Detects if DevTools is open and shows a warning
 * - Only runs in production environment
 */
const useDevToolsProtection = () => {
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
    const isProduction = process.env.NODE_ENV === 'production';

    useEffect(() => {
        if (!isProduction) {
            console.log('🛡️ DevTools protection is disabled in development mode');
            return;
        }

        // Disable right-click
        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        // Basic keyboard shortcut blocking
        const handleKeyDown = (e) => {
            // F12
            if (e.keyCode === 123) {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
            if ((e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67))) {
                e.preventDefault();
                return false;
            }

            // Ctrl+U (View Source)
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                return false;
            }

            // Cmd+Option+I (Mac)
            if (e.metaKey && e.altKey && e.keyCode === 73) {
                e.preventDefault();
                return false;
            }
        };

        // DevTools detection using window size
        const detectDevTools = () => {
            const threshold = 160;
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;

            if (widthThreshold || heightThreshold) {
                setIsDevToolsOpen(true);
            } else {
                setIsDevToolsOpen(false);
            }
        };

        // Add event listeners
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        // Check for DevTools every 1 second
        const devToolsInterval = setInterval(detectDevTools, 1000);

        // Cleanup
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            clearInterval(devToolsInterval);
        };
    }, [isProduction]);

    return { isDevToolsOpen, isProtected: isProduction };
};

export default useDevToolsProtection;
