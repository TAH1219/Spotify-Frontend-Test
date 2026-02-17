import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { generateCodeVerifier, OAuth2Client } from "@badgateway/oauth2-client";
import fs from "fs";
let codeVerifierGlobal = null;

//const raw = fs.readFileSync(".env");
//console.log("Raw bytes:", raw);
//console.log("As string:", raw.toString());
//console.log("CWD:", process.cwd());

dotenv.config({ path: "./.env" });
//console.log("CLIENT ID:", process.env.SC_CLIENT_ID);
//console.log("CLIENT SECRET:", process.env.SC_CLIENT_SECRET); //<-----DELETE THIS SHIT AFTER TESTING
const app = express();
let accessToken = null;
app.use(cors());
app.use(express.json());

const PORT = 3001;

// ================= LOGIN =================
const client = new OAuth2Client({
  server: "https://api.soundcloud.com",
  authorizationEndpoint: "https://soundcloud.com/connect",
  tokenEndpoint: "https://api.soundcloud.com/oauth2/token",
  clientId: process.env.SC_CLIENT_ID,
  clientSecret: process.env.SC_CLIENT_SECRET,
  redirectUri: process.env.SC_REDIRECT_URI,
  pkce: true, // turns on PKCE automatically
});

const redirectUri = process.env.SC_REDIRECT_URI;

// Step 1: redirect user to SoundCloud login
app.get("/auth/login", async (req, res) => {
  const codeVerifier  = await generateCodeVerifier();
  const uri = await client.authorizationCode.getAuthorizeUri({
    redirectUri: process.env.SC_REDIRECT_URI,
    codeVerifier,
    scope: "",
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
    console.log("full url: "+fullRedirectUrl)
    const tokenSet = await client.authorizationCode.getTokenFromCodeRedirect(
      fullRedirectUrl,
      {
      redirectUri: process.env.SC_REDIRECT_URI,
      codeVerifierGlobal,
    });
    console.log("Access Token:", tokenSet);

    // Store token in memory/session for simplicity
    req.session = { token: accessToken.token };

    res.send("Login successful! You can now call /api/me or /api/search");
  } catch (error) {
    console.error("Access Token Error", error.message);
    res.status(500).json("Authentication failed");
  }
});

// ================= LOGIN CHECK ===============
app.get("/api/me", (req, res) => {
  if (!accessToken) {
    return res.status(401).json({ loggedIn: false });
  }

  res.json({ loggedIn: true });
});

// ================= SEARCH =================

app.get("/api/search", async (req, res) => {
  const query = req.query.q;

  console.log("Search request:", query);

  if (!accessToken) {
    return res.status(401).json({
      error: "Not logged in"
    });
  }

  try {
    const response = await axios.get(
      "https://api-v2.soundcloud.com/search/tracks",
      {
        params: {
          q: query,
          limit: 20
        },
        headers: {
          Authorization: `OAuth ${accessToken}`
        }
      }
    );

    res.json(response.data.collection);

  } catch (err) {
    console.error(
      "SoundCloud error:",
      err.response?.data || err.message
    );

    res.status(500).json({ error: "Search failed" });
  }
});

// ================= START =================

app.listen(3001, () => {
  console.log("Backend running on port 3001");
});
