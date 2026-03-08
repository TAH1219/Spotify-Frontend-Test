import express from "express";
//import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { generateCodeVerifier, OAuth2Client } from "@badgateway/oauth2-client";
//import fs from "fs";
import session from "express-session";
import FileStore from 'session-file-store'
let codeVerifierGlobal = null; //need to store this in session storage

//const raw = fs.readFileSync(".env");
//console.log("Raw bytes:", raw);
//console.log("As string:", raw.toString());
//console.log("CWD:", process.cwd());

dotenv.config({ path: "./.env" });
console.log("CLIENT ID:", process.env.SC_CLIENT_ID);

const app = express();
let accessToken = null;
app.use(cors({
  origin: "http://127.0.0.1:5173",
  credentials: true
}));
app.use(express.json());
const FileStoreSession = FileStore(session);
const PORT = 3001;

// ================= LOGIN =================
const client = new OAuth2Client({
  server: "https://api.spotify.com",
  authorizationEndpoint: process.env.SC_AUTHORIZATION_URL,
  tokenEndpoint: process.env.SC_TOKEN_URL,
  clientId: process.env.SC_CLIENT_ID,
  clientSecret: process.env.SC_CLIENT_SECRET,
  redirectUri: process.env.SC_REDIRECT_URI,
  pkce: true, // turns on PKCE automatically
});

const redirectUri = process.env.SC_REDIRECT_URI;

app.use(session({
  store: new FileStoreSession({
    path: "./sessions",
    ttl: 86000,
  }),
  secret: "meoasudhfa41242", //js something random
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 86400000 }
}));

// Step 1: redirect user to Spotify login
app.get("/auth/login", async (req, res) => {
  const codeVerifier = await generateCodeVerifier();
  const uri = await client.authorizationCode.getAuthorizeUri({
    redirectUri: process.env.SC_REDIRECT_URI,
    codeVerifier,
    scope: [
      "playlist-read-private",
      "playlist-read-collaborative",
      "playlist-modify-public",
      "playlist-modify-private",
    ]
  });
  codeVerifierGlobal = codeVerifier;
  console.log("url is " + uri);
  res.redirect(uri);
});

// Step 2: handle callback
app.get("/auth/callback", async (req, res) => {
  const fullRedirectUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  try {
    //console.log("i got the code: ", code)
    //console.log("full url: "+fullRedirectUrl)
    const tokenSet = await client.authorizationCode.getTokenFromCodeRedirect(
      fullRedirectUrl,
      {
        redirectUri: process.env.SC_REDIRECT_URI,
        codeVerifier: codeVerifierGlobal,
      });
    console.log("Access Token:", tokenSet);

    // Store token in memory/session for simplicity
    req.session.accessToken = tokenSet.accessToken

    res.redirect("http://127.0.0.1:5173");
  } catch (error) {
    console.error("Access Token Error", error.message);
    res.status(500).json("Authentication failed");
  }
});

// ================= LOGIN CHECK ===============
app.get("/api/me", (req, res) => {
  console.log("api.me is functioning")
  if (!req.session.accessToken) {
    return res.status(401).json({ loggedIn: false });
  }

  res.json({ loggedIn: true });
});

// ================= SEARCH =================

app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  console.log("Search request:", query);

  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const params = new URLSearchParams({
      q: query,
      type: "track",
      limit: 10
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await response.json();
    res.json(data.tracks.items);

  } catch (err) {
    console.error("Spotify error:", err.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// logout stuff
app.post("/auth/logout", (req, res) => {
  //this will destroy the session on the server, browser cookie becomes orphaned
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ success: true })
  });
});

// ================= PLAYLISTS STUFF =================

//this retrieves all playlists belonging to the logged-in user
app.get("/api/playlists", async (req, res) => {
  const token = req.session.accessToken;
  const authHeader = `Bearer ${token}`;
  console.log("AUTH HEADER:", JSON.stringify(authHeader));
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    res.json(data.items);
  } catch (err) {
    console.error("Playlists error:", err);
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

//gets all the tracks inside a specific playlist by playlist id
app.get("/api/playlists/:id/tracks", async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    let tracks = [];
    let url = `https://api.spotify.com/v1/playlists/${req.params.id}/items?limit=100`;

    while (url) {
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      //console.log("TRACKS RESPONSE:", JSON.stringify(data).slice(0, 300));
      tracks.push(...(data.items.filter(Boolean)));
      //tracks = tracks.concat(data.items.map(item => item.track).filter(Boolean));
      url = data.next; // null when we've hit the last page
    }

    console.log("length of tracks is ", tracks.length)
    res.json(tracks);
  } catch (err) {
    console.error("Playlist tracks error:", err);
    res.status(500).json({ error: "Failed to fetch playlist tracks" });
  }
});

// create a new empty playlist on the user's account
app.post("/api/playlists", async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  const { name, description } = req.body;

  try {
    const response = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, description, public: false })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Create playlist error:", err.message);
    res.status(500).json({ error: "Failed to create playlist" });
  }
});

// replace the track order in a playlist (this is how we push a sorted order back to spotify)
app.put("/api/playlists/:id/tracks", async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  const { uris } = req.body;

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${req.params.id}/tracks`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ uris })
      }
    );
    const data = await response.json();
    res.json({ success: true });
  } catch (err) {
    console.error("Reorder playlist error:", err.message);
    res.status(500).json({ error: "Failed to reorder playlist" });
  }
});



// ================= START =================

app.listen(3001, "127.0.0.1", () => {
  console.log("Backend running on port 3001");
});
