import TrackCard from "./TrackCard";

export default function Results({ tracks }) {
    if (!tracks || tracks.length === 0) return null;

    return (
        <div className="results">
            {tracks.map((track) => (
                <TrackCard key={track.id} track={track} />
            ))}
        </div>
    );
}