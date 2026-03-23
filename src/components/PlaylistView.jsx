import { useEffect, useState } from "react";
import TrackCard from "./TrackCard";

const SORT_OPTIONS = [
    { label: "Default", value: "default" },
    { label: "Title (A-Z)", value: "name" },
    { label: "Artist (A-Z)", value: "artist" },
    { label: "Album (A-Z)", value: "album" },
    { label: "Duration", value: "duration" },
    { label: "Release Date", value: "release_date" },
];

export default function PlaylistView({ playlist, onBack }) {
    const [tracks, setTracks] = useState([]);
    const [sorted, setSorted] = useState([]);
    const [sortBy, setSortBy] = useState("default");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [dragIndex, setDragIndex] = useState(null);
    const [showAddSongs, setShowAddSongs] = useState(false);
    const [addQuery, setAddQuery] = useState("");
    const [addResults, setAddResults] = useState([]);
    const [addSearching, setAddSearching] = useState(false);
    const [addedTracks, setAddedTracks] = useState(new Set()); // track IDs added via inline search

    // fetch tracks when playlist changes


    useEffect(() => {
        setLoading(true);
        fetch(`/api/playlists/${playlist.id}/tracks`, { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                const trackList = Array.isArray(data) ? data : [];
                // deduplicate by id - handles React Strict Mode double-invoking this effect
                const unique = trackList.filter((track, index, self) =>
                    track?.id && index === self.findIndex(t => t?.id === track.id)
                );
                setTracks(unique);
                setSorted(unique);
            })
            .finally(() => setLoading(false));
    }, [playlist.id]);








    // re-sort whenever sortBy changes
    useEffect(() => {
        if (sortBy === "default") {
            setSorted([...tracks]);
            return;
        }
        console.log("SAMPLE TRACK:", JSON.stringify(tracks[0], null, 2)); // ← add this
        const copy = [...tracks];

        copy.sort((a, b) => {
            // skip null tracks entirely, push them to the bottom
            if (!a || !b) return 0;

            switch (sortBy) {
                case "name":
                    return (a.name ?? "").localeCompare(b.name ?? "");
                case "artist":
                    return (a.artists?.[0]?.name ?? "").localeCompare(b.artists?.[0]?.name ?? "");
                case "album":
                    return (a.album?.name ?? "").localeCompare(b.album?.name ?? "");
                case "duration":
                    return (a.duration_ms ?? 0) - (b.duration_ms ?? 0);
                case "release_date":
                    return new Date(b.album?.release_date ?? 0) - new Date(a.album?.release_date ?? 0);
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
            await fetch(`/api/playlists/${playlist.id}/items`, {
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

    function toggleEditMode() {
        if (!editMode) setSortBy("default"); // reset sort when entering edit mode
        setEditMode(prev => !prev);
    }

    function handleDragStart(index) {
        setDragIndex(index);
    }

    function handleDragOver(e, index) {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;
        const reordered = [...sorted];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(index, 0, moved);
        setSorted(reordered);
        setDragIndex(index);
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragIndex(null);
    }

    function handleRemove(trackId) {
        setSorted(prev => prev.filter(t => t.id !== trackId));
    }

    async function handleAddSearch() {
        if (!addQuery.trim()) return;
        setAddSearching(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(addQuery)}`, { credentials: "include" });
            const data = await res.json();
            setAddResults(data);
        } finally {
            setAddSearching(false);
        }
    }

    async function handleAddTrack(track) {
        await fetch(`/api/playlists/${playlist.id}/items`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uris: [track.uri] })
        });
        // mark as added in the search results list
        setAddedTracks(prev => new Set([...prev, track.id]));
        // append to local track state so it shows up immediately
        setSorted(prev => [...prev, track]);
        setTracks(prev => [...prev, track]);
    }

    if (loading) return <p>Loading tracks...</p>;

    return (
        <div className="playlist-view">
            {/* back button to return to playlist list */}
            <div className="playlist-view-header">
                <button onClick={onBack}>← Back to Playlists</button>
                <button onClick={editMode ? async () => { await handleSaveOrder(); setEditMode(false); } : toggleEditMode}>
                    {editMode ? "Done Editing" : "Edit Playlist"}
                </button>
            </div>

            <h2>{playlist.name}</h2>
            {playlist.description && (
                <p className="playlist-description"
                    dangerouslySetInnerHTML={{ __html: playlist.description }}
                />
            )}
            <p>{tracks.length} tracks</p>

            {/* sort controls */}
            <div className="sort-controls">
                <label>Sort by: </label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} disabled={editMode}>
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

            {/* add songs - always visible */}
            <div className="add-songs">
                <button onClick={() => setShowAddSongs(prev => !prev)}>
                    {showAddSongs ? "Hide Search ▲" : "Add Songs ▼"}
                </button>
                {showAddSongs && (
                    <div className="add-songs-search">
                        <input
                            type="text"
                            value={addQuery}
                            onChange={e => setAddQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAddSearch()}
                            placeholder="Search for a song to add..."
                        />
                        <button onClick={handleAddSearch} disabled={addSearching}>
                            {addSearching ? "Searching..." : "Search"}
                        </button>
                        <div className="add-songs-results">
                            {addResults.map(track => (
                                <div key={track.id} className="add-song-result">
                                    <span>{track.name} — {track.artists?.map(a => a.name).join(", ")}</span>
                                    <button
                                        onClick={() => handleAddTrack(track)}
                                        disabled={addedTracks.has(track.id)}
                                    >
                                        {addedTracks.has(track.id) ? "✓ Added" : "Add"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* track list */}
            <div className="playlist-tracks">
                {sorted.map((track, index) => (
                    <div
                        key={track?.id ?? index}
                        className={`track-row${editMode ? " draggable" : ""}${dragIndex === index ? " dragging" : ""}`}
                        draggable={editMode}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={e => handleDragOver(e, index)}
                        onDrop={handleDrop}
                    >
                        {editMode && (
                            <button className="remove-track" onClick={() => handleRemove(track.id)}>✕</button>
                        )}
                        <TrackCard track={track} inPlaylist={true} />
                    </div>
                ))}
            </div>
        </div>
    );
}
