import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { generateCodeVerifier, OAuth2Client } from "@badgateway/oauth2-client";
import fs from "fs";
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
  cookie: {secure:false, maxAge:86400000}
}));

// Step 1: redirect user to Spotify login
app.get("/auth/login", async (req, res) => {
  const codeVerifier  = await generateCodeVerifier();
  const uri = await client.authorizationCode.getAuthorizeUri({
    redirectUri: process.env.SC_REDIRECT_URI,
    codeVerifier,
    scope: "",
  });
  codeVerifierGlobal = codeVerifier;
  //console.log("url is " + uri);
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
  if (!token) {
    return res.status(401).json({
      error: "Not logged in"
    });
  }

  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/search", //maybe try api-v2 if this doesnt work
      {
        params: {
          q: query,
          type: "track",  //maybe remove type: track if its not returning albums or artists
          limit: 10,
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    res.json(response.data.tracks.items); //spotify wraps results in tracks.items

  } catch (err) {
    console.error(
      "Spotify error:",
      err.response?.data || err.message
    );

    res.status(500).json({ error: "Search failed" });
  }
});

// ================= START =================

app.listen(3001, "127.0.0.1", () => {
  console.log("Backend running on port 3001");
});
