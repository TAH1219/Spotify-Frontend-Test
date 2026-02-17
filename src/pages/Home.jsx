import { useEffect, useState } from "react";

//import { searchTracks } from "../api/soundcloud";
import Search from "../components/Search";
import TrackCard from "../components/TrackCard";

export default function Home() {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);


    useEffect(() => {
        fetch("http://localhost:3001/api/me")
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
                `http://localhost:3001/api/search?q=${encodeURIComponent(query)}`
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
                    <h2>Login to SoundCloud</h2>

                    <a href="http://localhost:3001/auth/login">
                        <button>
                            Login with SoundCloud
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
