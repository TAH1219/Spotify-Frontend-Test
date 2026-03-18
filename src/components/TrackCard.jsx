import { useState } from "react";

export default function TrackCard({ track, inPlaylist = false }) {
    const traq = track?.item ?? track;

    const artwork = traq.album?.images?.[2]?.url;
    const artist = traq.artists?.map(a => a.name).join(", ");

    const [showDropdown, setShowDropdown] = useState(false);
    const [playlists, setPlaylists] = useState(null); // null = not yet fetched
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [addedTo, setAddedTo] = useState(new Set()); // playlist IDs already added to
    const [adding, setAdding] = useState(null); // playlist ID currently in-flight

    async function handleToggleDropdown() {
        setShowDropdown(prev => !prev);
        // lazy-fetch playlists on first open
        if (playlists === null && !loadingPlaylists) {
            setLoadingPlaylists(true);
            try {
                const res = await fetch("/api/playlists", { credentials: "include" });
                const data = await res.json();
                setPlaylists(data);
            } finally {
                setLoadingPlaylists(false);
            }
        }
    }

    async function handleAddToPlaylist(playlistId) {
        if (addedTo.has(playlistId) || adding === playlistId) return;
        setAdding(playlistId);
        try {
            await fetch(`/api/playlists/${playlistId}/items`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uris: [traq.uri] })
            });
            setAddedTo(prev => new Set([...prev, playlistId]));
        } finally {
            setAdding(null);
        }
    }

    return (
        <div className="track-card">
            {artwork && (
                <img src={artwork} alt={traq.name} width="200" />
            )}
            <h3>{traq.name}</h3>
            <p>{artist}</p>
            {traq.id && (
                <a
                    href={`https://open.spotify.com/track/${traq.id}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    Open in Spotify
                </a>
            )}

            {/* only show in search results, not inside playlist view */}
            {!inPlaylist && (
                <div className="add-to-playlist">
                    <button onClick={handleToggleDropdown}>
                        {showDropdown ? "Close ▲" : "Add to Playlist ▼"}
                    </button>
                    {showDropdown && (
                        <div className="playlist-dropdown">
                            {loadingPlaylists && <p>Loading...</p>}
                            {playlists?.map(pl => (
                                <div key={pl.id} className="playlist-dropdown-item">
                                    <span>{pl.name}</span>
                                    <button
                                        onClick={() => handleAddToPlaylist(pl.id)}
                                        disabled={adding === pl.id || addedTo.has(pl.id)}
                                    >
                                        {addedTo.has(pl.id) ? "✓ Added" : adding === pl.id ? "Adding..." : "Add"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}