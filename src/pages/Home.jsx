import { useEffect, useState } from "react";
import Results from "../components/Results"


//import { searchTracks } from "../api/spotify";
import Search from "../components/Search";
import TrackCard from "../components/TrackCard";

export default function Home() {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);


    useEffect(() => {
        fetch("/api/me", { credentials: "include" })
            .then(res => {
                if (res.ok) {
                    setIsLoggedIn(true);
                }
            });
    }, []);
    async function handleSearch(query) {
        console.log("searching for: ", query);
        setLoading(true);

        try {
            const res = await fetch(
                `/api/search?q=${encodeURIComponent(query)}`,{ credentials: "include" }
            );

            const data = await res.json();

            setTracks(data);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="home">

            {!isLoggedIn ? (
                <div style={{ textAlign: "center", marginTop: "50px" }}>
                    <h2>Login to Spotify</h2>

                    <a href="/auth/login">
                        <button>
                            Login with Spotify
                        </button>
                    </a>
                </div>
            ) : (
                <>
                    {/* Existing Search UI */}

                    <Search onSearch={handleSearch} />

                    {loading && <p>Loading...</p>}

                    <Results tracks={tracks} />
                </>
            )}

        </div>
    );
}
