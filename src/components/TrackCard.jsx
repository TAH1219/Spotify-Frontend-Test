const CLIENT_ID = import.meta.env.VITE_SC_CLIENT_ID;

export default function TrackCard({ track}) {
    if (!track) return null;
    const streamUrl = track.stream_url
        ? `$(track.stream_url)?client_id=${CLIENT_ID}`
        : null;

    return (
        <div className="track-card">
            <img
                src={track.artwork_url || track.user.avatar_url}
                alt={track.title}
                width="200"
        />

        <h3>{track.title}</h3>
        <p>{track.user.username}</p>

        {streamUrl ? (
            <audio controls src={streamURL} />
        ) : (
            <p>No stream available</p>
        )}
        </div>
    );
}
