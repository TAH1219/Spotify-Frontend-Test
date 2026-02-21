export default function TrackCard({ track }) {
    if (!track) return null;

    const artwork = track.album?.images?.[0]?.url;
    const artist = track.artists?.[0]?.name;

    return (
        <div className="track-card">
            {artwork && (
                <img src={artwork} alt={track.name} width="200" />
            )}

            <h3>{track.name}</h3>
            <p>{artist}</p>

            {track.preview_url ? (
                <audio controls src={track.preview_url} />
            ) : (
                <p>No preview available</p>
            )}
        </div>
    );
}