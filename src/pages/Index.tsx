import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    // Redirect to the actual Anime Shrine site
    window.location.href = "https://animeshrine.xyz";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">Anime Shrine</h1>
        <p className="text-xl text-gray-400">Redirecting to animeshrine.xyz...</p>
        <div className="mt-6">
          <a 
            href="https://animeshrine.xyz" 
            className="inline-block px-6 py-3 bg-[#e50914] text-white rounded-lg font-semibold hover:bg-[#b91c1c] transition-colors"
          >
            Go to Anime Shrine
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
