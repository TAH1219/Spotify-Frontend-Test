import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generateCodeVerifier, OAuth2Client } from "@badgateway/oauth2-client";
import session from "express-session";
import FileStore from "session-file-store";

dotenv.config({ path: "./.env" });
console.log("CLIENT ID:", process.env.SC_CLIENT_ID);

const app = express();
const FileStoreSession = FileStore(session);
const PORT = 3001;

app.use(
  cors({
    origin: "http://127.0.0.1:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    store: new FileStoreSession({
      path: "./sessions",
      ttl: 86400,
    }),
    secret: "meoasudhfa41242",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 86400000,
    },
  })
);

const client = new OAuth2Client({
  server: "https://api.spotify.com",
  authorizationEndpoint: process.env.SC_AUTHORIZATION_URL,
  tokenEndpoint: process.env.SC_TOKEN_URL,
  clientId: process.env.SC_CLIENT_ID,
  clientSecret: process.env.SC_CLIENT_SECRET,
  redirectUri: process.env.SC_REDIRECT_URI,
  pkce: true,
});

// ================= LOGIN =================
app.get("/auth/login", async (req, res) => {
  try {
    const codeVerifier = await generateCodeVerifier();

    req.session.codeVerifier = codeVerifier;

    const uri = await client.authorizationCode.getAuthorizeUri({
      redirectUri: process.env.SC_REDIRECT_URI,
      codeVerifier,
      scope: [
        "playlist-read-private",
        "playlist-read-collaborative",
        "playlist-modify-public",
        "playlist-modify-private",
        "user-library-read",
      ],
    });

    console.log("url is " + uri);

    req.session.save((err) => {
      if (err) {
        console.error("Session save error before login redirect:", err);
        return res.status(500).json({ error: "Failed to start login" });
      }

      res.redirect(uri);
    });
  } catch (error) {
    console.error("Login redirect error:", error.message);
    res.status(500).json({ error: "Failed to start login" });
  }
});

// ================= CALLBACK =================
app.get("/auth/callback", async (req, res) => {
  const fullRedirectUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

  try {
    if (!req.session.codeVerifier) {
      return res.status(400).json({ error: "Missing code verifier" });
    }

    const tokenSet = await client.authorizationCode.getTokenFromCodeRedirect(
      fullRedirectUrl,
      {
        redirectUri: process.env.SC_REDIRECT_URI,
        codeVerifier: req.session.codeVerifier,
      }
    );

    console.log("Access Token:", tokenSet);

    req.session.accessToken = tokenSet.accessToken;
    req.session.codeVerifier = null;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error after callback:", err);
        return res.status(500).json({ error: "Authentication failed" });
      }

      res.redirect("http://127.0.0.1:5173");
    });
  } catch (error) {
    console.error("Access Token Error:", error.message);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// ================= LOGIN CHECK =================
app.get("/api/me", (req, res) => {
  console.log("api.me is functioning");

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
  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const params = new URLSearchParams({
      q: query,
      type: "track",
      limit: 10,
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data.tracks.items);
  } catch (err) {
    console.error("Spotify error:", err.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// ================= LOGOUT =================
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }

    res.json({ success: true });
  });
});

// ================= PLAYLISTS =================
app.get("/api/playlists", async (req, res) => {
  const token = req.session.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    console.log("Playlists raw response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(response.status).json({
        error: "Spotify returned non-JSON",
        details: text,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data.items);
  } catch (err) {
    console.error("Playlists error:", err);
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

// ================= PLAYLIST TRACKS =================
app.get("/api/playlists/:id/tracks", async (req, res) => {
  const token = req.session.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    let tracks = [];
    let url = `https://api.spotify.com/v1/playlists/${req.params.id}/items?limit=100&fields=next,items(item(id,name,uri,duration_ms,explicit,preview_url,artists,album))`;

    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      const items = data.items.map((item) => item.item).filter(Boolean);
      tracks = tracks.concat(items);
      url = data.next;
    }

    res.json(tracks);
  } catch (err) {
    console.error("Playlist tracks error:", err.message);
    res.status(500).json({ error: "Failed to fetch playlist tracks" });
  }
});

// ================= CREATE PLAYLIST =================
app.post("/api/playlists", async (req, res) => {
  const token = req.session.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { name, description } = req.body;

  try {
    const response = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("Create playlist error:", err.message);
    res.status(500).json({ error: "Failed to create playlist" });
  }
});

// ================= REPLACE PLAYLIST ITEMS =================
app.put("/api/playlists/:id/items", async (req, res) => {
  const token = req.session.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { uris } = req.body;

  try {
    const chunks = [];
    for (let i = 0; i < uris.length; i += 100) {
      chunks.push(uris.slice(i, i + 100));
    }

    const putRes = await fetch(`https://api.spotify.com/v1/playlists/${req.params.id}/items`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: chunks[0] }),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      return res
        .status(putRes.status)
        .json({ error: err?.error?.message ?? "Spotify PUT failed" });
    }

    for (let i = 1; i < chunks.length; i++) {
      const postRes = await fetch(`https://api.spotify.com/v1/playlists/${req.params.id}/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: chunks[i],
          position: i * 100,
        }),
      });

      if (!postRes.ok) {
        const err = await postRes.json();
        return res
          .status(postRes.status)
          .json({ error: err?.error?.message ?? `Spotify POST chunk ${i} failed` });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Reorder playlist error:", err.message);
    res.status(500).json({ error: "Failed to reorder playlist" });
  }
});

// ================= ADD TRACKS TO PLAYLIST =================
app.post("/api/playlists/:id/items", async (req, res) => {
  const token = req.session.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { uris } = req.body;

  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("Add tracks error:", err.message);
    res.status(500).json({ error: "Failed to add tracks" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});