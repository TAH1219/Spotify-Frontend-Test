import { useEffect, useState } from "react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState("search");
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkLogin();
  }, []);

  async function checkLogin() {
    try {
      const res = await fetch("http://127.0.0.1:3001/api/me", {
        credentials: "include",
      });
      setIsLoggedIn(res.ok);
    } catch {
      setIsLoggedIn(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `http://127.0.0.1:3001/api/search?q=${encodeURIComponent(query)}`,
        {
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setTracks(data);
      setView("search");
    } catch (err) {
      setError("Could not load search results.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPlaylists() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:3001/api/playlists", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load playlists");
      }

      setPlaylists(data);
      setView("playlists");
    } catch (err) {
      setError("Could not load playlists.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("http://127.0.0.1:3001/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    }

    setIsLoggedIn(false);
    setTracks([]);
    setPlaylists([]);
    setQuery("");
    setView("search");
  }

  return (
    <div className="home-page">
      {!isLoggedIn ? (
        <div className="login-wrapper">
          <div className="login-card">
            <h1>Connect to Spotify</h1>
            <p className="subtitle">
              Log in to search tracks and explore your Spotify content.
            </p>

            <a href="http://127.0.0.1:3001/auth/login" className="login-link">
              <button className="login-btn">Login with Spotify</button>
            </a>
          </div>
        </div>
      ) : (
        <div className="app-shell">
          <div className="top-bar">
            <button onClick={() => setView("search")}>Search</button>
            <button onClick={loadPlaylists}>My Playlists</button>
            <button onClick={handleLogout}>Log Out</button>
          </div>

          <div className="panel">
            <form className="search-row" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search for a song..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>

            {loading && <p className="empty-state">Loading...</p>}
            {error && <p className="empty-state">{error}</p>}

            {view === "search" && !loading && (
              <>
                <h2 className="section-title">Search Results</h2>

                {tracks.length === 0 ? (
                  <p className="empty-state">No tracks yet. Search for something.</p>
                ) : (
                  <div className="results-grid">
                    {tracks.map((track) => (
                      <div className="card" key={track.id}>
                        {track.album?.images?.[0] && (
                          <img src={track.album.images[0].url} alt={track.name} />
                        )}
                        <h3>{track.name}</h3>
                        <p>{track.artists?.map((a) => a.name).join(", ")}</p>
                        <p>{track.album?.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {view === "playlists" && !loading && (
              <>
                <h2 className="section-title">My Playlists</h2>

                {playlists.length === 0 ? (
                  <p className="empty-state">No playlists found.</p>
                ) : (
                  <div className="results-grid">
                    {playlists.map((playlist) => (
                      <div className="card" key={playlist.id}>
                        {playlist.images?.[0] && (
                          <img src={playlist.images[0].url} alt={playlist.name} />
                        )}
                        <h3>{playlist.name}</h3>
                        <p>{playlist.owner?.display_name}</p>
                        <p>{playlist.tracks?.total ?? 0} tracks</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}