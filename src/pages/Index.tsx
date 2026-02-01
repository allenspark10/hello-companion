import { useState } from "react";
import { Search, Play, Calendar, Clock, TrendingUp, Star, ChevronRight } from "lucide-react";

// Mock data for demo
const featuredAnime = [
  { id: 1, title: "Demon Slayer", image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=450&fit=crop", rating: 9.2, episodes: 44 },
  { id: 2, title: "Jujutsu Kaisen", image: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=800&h=450&fit=crop", rating: 8.9, episodes: 48 },
  { id: 3, title: "Attack on Titan", image: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=800&h=450&fit=crop", rating: 9.5, episodes: 87 },
];

const trendingAnime = [
  { id: 1, title: "Solo Leveling", image: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=300&h=400&fit=crop", rating: 9.1, type: "Series" },
  { id: 2, title: "Frieren", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=400&fit=crop", rating: 9.3, type: "Series" },
  { id: 3, title: "Blue Lock", image: "https://images.unsplash.com/photo-1535350356005-fd52b3b524fb?w=300&h=400&fit=crop", rating: 8.7, type: "Series" },
  { id: 4, title: "Spy x Family", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=400&fit=crop", rating: 8.8, type: "Series" },
  { id: 5, title: "One Piece", image: "https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=300&h=400&fit=crop", rating: 9.0, type: "Series" },
  { id: 6, title: "Chainsaw Man", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop", rating: 8.6, type: "Series" },
];

const recentEpisodes = [
  { id: 1, anime: "Solo Leveling", episode: "EP 12", title: "Arise", time: "2h ago" },
  { id: 2, anime: "Frieren", episode: "EP 28", title: "The Journey Continues", time: "5h ago" },
  { id: 3, anime: "Blue Lock", episode: "EP 24", title: "Final Match", time: "1d ago" },
  { id: 4, anime: "Jujutsu Kaisen", episode: "EP 47", title: "Domain Expansion", time: "1d ago" },
];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeHero, setActiveHero] = useState(0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#e50914]/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#e50914] to-[#b91c1c] rounded-lg flex items-center justify-center font-bold text-xl">
              A
            </div>
            <span className="text-2xl font-bold">
              Ani<span className="text-[#e50914]">Next</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="/" className="text-white font-medium hover:text-[#e50914] transition-colors">Home</a>
            <a href="/browse" className="text-gray-400 hover:text-[#e50914] transition-colors">Browse</a>
            <a href="/schedule" className="text-gray-400 hover:text-[#e50914] transition-colors">Schedule</a>
            <a href="/recent" className="text-gray-400 hover:text-[#e50914] transition-colors">Recent</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#141414] border border-[#333] rounded-full pl-10 pr-4 py-2 w-64 text-sm focus:outline-none focus:border-[#e50914] transition-colors"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 h-[70vh] min-h-[500px]">
        <div className="absolute inset-0">
          <img
            src={featuredAnime[activeHero].image}
            alt={featuredAnime[activeHero].title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-[#e50914] text-white text-xs font-bold rounded">FEATURED</span>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-white text-sm">{featuredAnime[activeHero].rating}</span>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">{featuredAnime[activeHero].title}</h1>
            <p className="text-gray-300 mb-6">{featuredAnime[activeHero].episodes} Episodes Available</p>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-gradient-to-r from-[#e50914] to-[#b91c1c] px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#e50914]/30 transition-all">
                <Play className="w-5 h-5 fill-current" />
                Watch Now
              </button>
              <button className="flex items-center gap-2 bg-white/10 backdrop-blur px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20">
                More Info
              </button>
            </div>
          </div>
        </div>

        {/* Hero Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {featuredAnime.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveHero(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === activeHero
                  ? "bg-[#e50914] shadow-lg shadow-[#e50914]/50"
                  : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-[#e50914]" />
              <h2 className="text-2xl font-bold">Trending Now</h2>
            </div>
            <a href="/trending" className="flex items-center gap-1 text-[#e50914] hover:underline">
              View All <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trendingAnime.map((anime) => (
              <div
                key={anime.id}
                className="group relative bg-[#141414] rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-white">{anime.rating}</span>
                    </div>
                    <h3 className="font-semibold text-sm truncate">{anime.title}</h3>
                    <span className="text-xs text-gray-400">{anime.type}</span>
                  </div>
                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#e50914] rounded-lg transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Episodes */}
      <section className="py-12 px-4 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-[#e50914]" />
              <h2 className="text-2xl font-bold">Recent Episodes</h2>
            </div>
            <a href="/recent" className="flex items-center gap-1 text-[#e50914] hover:underline">
              View All <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentEpisodes.map((ep) => (
              <div
                key={ep.id}
                className="bg-[#141414] rounded-lg p-4 border border-[#222] hover:border-[#e50914]/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-1 bg-[#e50914] text-xs font-bold rounded">{ep.episode}</span>
                  <span className="text-xs text-gray-500">{ep.time}</span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-[#e50914] transition-colors">{ep.anime}</h3>
                <p className="text-sm text-gray-400 truncate">{ep.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-[#e50914]" />
              <h2 className="text-2xl font-bold">Weekly Schedule</h2>
            </div>
            <a href="/schedule" className="flex items-center gap-1 text-[#e50914] hover:underline">
              Full Schedule <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
              <button
                key={day}
                className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                  idx === 0
                    ? "bg-gradient-to-r from-[#e50914] to-[#b91c1c] text-white shadow-lg shadow-[#e50914]/30"
                    : "bg-[#141414] text-gray-400 hover:bg-[#1a1a1a] border border-[#222]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="mt-6 bg-[#141414] rounded-lg p-6 border border-[#222]">
            <p className="text-gray-400 text-center">Select a day to view scheduled releases</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] border-t border-[#e50914]/10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#e50914] to-[#b91c1c] rounded-lg flex items-center justify-center font-bold text-xl">
                A
              </div>
              <span className="text-2xl font-bold">
                Ani<span className="text-[#e50914]">Next</span>
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/about" className="hover:text-[#e50914] transition-colors">About</a>
              <a href="/contact" className="hover:text-[#e50914] transition-colors">Contact</a>
              <a href="/privacy" className="hover:text-[#e50914] transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-[#e50914] transition-colors">Terms</a>
            </div>

            <p className="text-sm text-gray-500">
              © 2026 AniNext. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
