export default function TrackCard({ track }) {

    //if (!t) return null;
    const traq = track?.item ?? track; // normalize
    //if (!t) return null;

    const artwork = traq.album?.images?.[2]?.url;
    const artist = traq.artists?.[0]?.name;

    return (
        <div className="track-card">
            {artwork && (
                <img src={artwork} alt={traq.name} width="200" />
            )}

            <h3>{traq.name}</h3>
            <p>{artist}</p>

            {traq.preview_url ? (
                <audio controls src={traq.preview_url} />
            ) : (
                <p>No preview available</p>
            )}
        </div>
    );
}