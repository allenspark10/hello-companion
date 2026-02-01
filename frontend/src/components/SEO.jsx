import { useEffect } from 'react';

function SEO({
    title = "Anime Shrine - Stream & Download Anime Free",
    description = "Watch and download anime in Hindi, English, Tamil, Telugu & Japanese. Stream dual audio anime series and movies in HD quality for free.",
    keywords = "anime, anime streaming, download anime, Hindi dubbed anime, English dub anime, multi-audio anime, free anime, anime HD",
    image = "https://i.ibb.co/21cjCj0B/Chat-GPT-Image-Nov-4-2025-12-10-10-AM.png",
    url = "https://animeshrine.xyz/",
    type = "website"
}) {
    useEffect(() => {
        // Update title
        document.title = title;

        // Helper to create or update meta
        const setMeta = (name, content, isProperty = false) => {
            const attr = isProperty ? 'property' : 'name';
            let element = document.querySelector(`meta[${attr}="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attr, name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        setMeta('description', description);
        setMeta('keywords', keywords);
        setMeta('og:title', title, true);
        setMeta('og:description', description, true);
        setMeta('og:image', image, true);
        setMeta('og:url', url, true);
        setMeta('og:type', type, true);
        setMeta('twitter:card', 'summary_large_image', true);
        setMeta('twitter:title', title, true);
        setMeta('twitter:description', description, true);
        setMeta('twitter:image', image, true);

        // Canonical link
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            document.head.appendChild(link);
        }
        link.setAttribute('href', url);

        // Google Tag Manager
        const gtmId = process.env.REACT_APP_GTM_ID || 'GTM-W62ZJD67';

        // Check if GTM script already exists
        if (!document.querySelector(`script[src*="${gtmId}"]`)) {
            // GTM Script
            const gtmScript = document.createElement('script');
            gtmScript.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;
            document.head.appendChild(gtmScript);

            // GTM noscript iframe
            const noscript = document.createElement('noscript');
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
            iframe.height = '0';
            iframe.width = '0';
            iframe.style.display = 'none';
            iframe.style.visibility = 'hidden';
            noscript.appendChild(iframe);
            document.body.insertBefore(noscript, document.body.firstChild);
        }

    }, [title, description, keywords, image, url, type]);

    return null;
}

export default SEO;

