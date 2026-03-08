import { useEffect, useState } from "react";
import Results from "../components/Results"
import Search from "../components/Search";
import PlaylistPanel from "../components/PlaylistPanel";
import PlaylistView from "../components/PlaylistView";
import TrackCard from "../components/TrackCard";

export default function Home() {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    // null = show panel list, playlist object = show that playlist's tracks
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);

    // which tab is active: "search" or "playlists"
    const [activeTab, setActiveTab] = useState("search");

    useEffect(() => {
        fetch("/api/me", { credentials: "include" })
            .then(res => {
                if (res.ok) setIsLoggedIn(true);
            })
            .finally(() => setAuthChecked(true));
    }, []);

    async function handleSearch(query) {
        setLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
            const data = await res.json();
            setTracks(data);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        await fetch("/auth/logout", { method: "POST", credentials: "include" });
        setIsLoggedIn(false);
    }

    if (!authChecked) return null;

    if (!isLoggedIn) {
        return (
            <div style={{ textAlign: "center", marginTop: "50px" }}>
                <h2>Login to Spotify</h2>
                <a href="/auth/login">
                    <button>Login with Spotify</button>
                </a>
            </div>
        );
    }

    return (
        <div className="home">
            {/* top bar with tabs and logout */}
            <div className="top-bar">
                <button onClick={() => setActiveTab("search")}>Search</button>
                <button onClick={() => { setActiveTab("playlists"); setSelectedPlaylist(null); }}>
                    My Playlists
                </button>
                <button onClick={handleLogout}>Log Out</button>
            </div>

            {/* search tab */}
            {activeTab === "search" && (
                <>
                    <Search onSearch={handleSearch} />
                    {loading && <p>Loading...</p>}
                    <Results tracks={tracks} />
                </>
            )}

            {/* playlists tab */}
            {activeTab === "playlists" && (
                selectedPlaylist
                    ? <PlaylistView
                        playlist={selectedPlaylist}
                        onBack={() => setSelectedPlaylist(null)}
                      />
                    : <PlaylistPanel onSelect={setSelectedPlaylist} />
            )}
        </div>
    );
}