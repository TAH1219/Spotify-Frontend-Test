import { useEffect, useState } from "react";

// displays the user's list of playlists in a sidebar panel
// onSelect is called with a playlist object when the user clicks one
export default function PlaylistPanel({ onSelect }) {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    // fetch playlists on mount
    useEffect(() => {
        fetch("/api/playlists", { credentials: "include" })
            .then(res => res.json())
            .then(data => {
            console.log("SAMPLE PLAYLIST:", JSON.stringify(data[0], null, 2));
            setPlaylists(data);
        })
            .finally(() => setLoading(false));
    }, []);

    async function handleCreate() {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch("/api/playlists", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, description: "" })
            });
            const created = await res.json();
            // add the new playlist to the top of the list without refetching
            setPlaylists(prev => [created, ...prev]);
            setNewName("");
        } finally {
            setCreating(false);
        }
    }

    if (loading) return <p>Loading playlists...</p>;

    return (
        <div className="playlist-panel">
            <h2>Your Playlists</h2>

            {/* create new playlist input */}
            <div className="create-playlist">
                <input
                    type="text"
                    placeholder="New playlist name..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                />
                <button onClick={handleCreate} disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                </button>
            </div>

            {/* playlist list */}
            <ul className="playlist-list">5
                {playlists.map(playlist => (
                    <li
                        key={playlist.id}
                        onClick={() => onSelect(playlist)}
                        style={{ cursor: "pointer" }}
                    >
                        {/* show playlist cover if it exists */}
                        {playlist.images?.[0]?.url && (
                            <img src={playlist.images[0].url} alt={playlist.name} width="40" />
                        )}
                        <span>{playlist.name}</span>
                        <span style={{ color: "gray", fontSize: "0.8em" }}>
                            {playlist.items?.total != null ? ` ${playlist.items.total} tracks` : ""}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
