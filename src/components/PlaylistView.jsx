import { useEffect, useState } from "react";
import TrackCard from "./TrackCard";

const SORT_OPTIONS = [
    { label: "Default", value: "default" },
    { label: "Title (A-Z)", value: "name" },
    { label: "Artist (A-Z)", value: "artist" },
    { label: "Album (A-Z)", value: "album" },
    { label: "Duration", value: "duration" },
    { label: "Popularity", value: "popularity" },
    { label: "Release Date", value: "release_date" },
];

export default function PlaylistView({ playlist, onBack }) {
    const [tracks, setTracks] = useState([]);
    const [sorted, setSorted] = useState([]);
    const [sortBy, setSortBy] = useState("default");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // fetch tracks when playlist changes
    useEffect(() => {
        setLoading(true);
        fetch(`/api/playlists/${playlist.id}/tracks`, { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                const trackList = Array.isArray(data) ? data : [];
                setTracks(trackList);
                setSorted(trackList); // start with default order
            })
            .finally(() => setLoading(false));
    }, [playlist.id]);

    // re-sort whenever sortBy changes
    useEffect(() => {
        if (sortBy === "default") {
            setSorted([...tracks]);
            return;
        }

        const copy = [...tracks];

        copy.sort((a, b) => {
            switch (sortBy) {
                case "name":
                    return a.name.localeCompare(b.name);
                case "artist":
                    return a.artists[0].name.localeCompare(b.artists[0].name);
                case "album":
                    return a.album.name.localeCompare(b.album.name);
                case "duration":
                    return a.duration_ms - b.duration_ms;
                case "popularity":
                    return b.popularity - a.popularity; // high to low
                case "release_date":
                    return new Date(b.album.release_date) - new Date(a.album.release_date); // newest first
                default:
                    return 0;
            }
        });

        setSorted(copy);
    }, [sortBy, tracks]);

    // push the sorted order back to spotify
    async function handleSaveOrder() {
        setSaving(true);
        try {
            await fetch(`/api/playlists/${playlist.id}/tracks`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                // spotify needs track URIs in the new order, not just IDs
                body: JSON.stringify({ uris: sorted.map(t => t.uri) })
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000); // reset confirmation after 2s
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <p>Loading tracks...</p>;

    return (
        <div className="playlist-view">
            {/* back button to return to playlist list */}
            <button onClick={onBack}>← Back to Playlists</button>

            <h2>{playlist.name}</h2>
            {playlist.description && (
                <p className="playlist-description">{playlist.description}</p>
            )}
            <p>{tracks.length} tracks</p>

            {/* sort controls */}
            <div className="sort-controls">
                <label>Sort by: </label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    {SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                {/* only show save button if user has changed the order */}
                {sortBy !== "default" && (
                    <button onClick={handleSaveOrder} disabled={saving}>
                        {saving ? "Saving..." : saved ? "Saved!" : "Save Order to Spotify"}
                    </button>
                )}
            </div>

            {/* track list */}
            <div className="playlist-tracks">
                {sorted.map(track => (
                    <TrackCard key={track.id} track={track} />
                ))}
            </div>
        </div>
    );
}
