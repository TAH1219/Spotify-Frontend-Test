const CLIENT_ID = import.meta.env.VITE_SC_CLIENT_ID;
console.log("SoundCloud CLIENT_ID: ", CLIENT_ID);
const BASE_URL = "https://api-v2.soundcloud.com";

export async function searchTracks(query) {
  const url = `${BASE_URL}/search/tracks?q=${encodeURIComponent(
    query
  )}&client_id=${CLIENT_ID}&limit=20`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("SoundCloud API error");
  }

  return res.json();
}
