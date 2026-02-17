import { useState } from "react";

export default function Search({ onSearch }) {
    const [text, setText] = useState("");
    function handleSubmit(e) {
        e.preventDefault();
        if (!text.trim()) return;
        onSearch(text);
    }

    return (
        <form onSubmit={handleSubmit} className="search">
            <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search for a song..."
        />
        <button type="submit">Search</button>
        </form>
    );
}
