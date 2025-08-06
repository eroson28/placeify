const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const dbOperation = require("./dbFiles/dbOperation");
const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// USE BUILD DIRECTORY FOR STATIC FILES
app.use(express.static(path.join(__dirname, "build")));

const redis = require("redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("connect", () => console.log("Connected to Redis!"));
redisClient.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  await redisClient.connect();
})();

app.locals.globalLastEditTimestamp = null;
app.get("/api/allTiles", async function (req, res) {
  try {
    const spotifyAccessToken = app.locals.spotifyAccessToken;
    if (!spotifyAccessToken) {
      return res.status(503).json({
        error:
          "Spotify access token not available. Server not fully initialized or token expired.",
      });
    }
    let dbTiles = await dbOperation.getAllTilesFromDB();
    let trackIDarray = [];
    const tileMap = new Map();
    dbTiles.forEach((tile) => {
      if (tile && typeof tile.link === "string" && tile.link) {
        const spotifyLink = tile.link;
        const trackIdMatch = spotifyLink.match(/\/track\/([a-zA-Z0-9]+)/);

        if (trackIdMatch && trackIdMatch[1]) {
          const trackId = trackIdMatch[1];
          trackIDarray.push(trackId);
          tileMap.set(trackId, tile);
        } else {
          console.warn(
            `Could not extract Spotify track ID from malformed link: ${spotifyLink}`
          );
        }
      }
    });

    const BATCH_SIZE = 50;
    const spotifyTrackData = [];
    for (let i = 0; i < trackIDarray.length; i += BATCH_SIZE) {
      const batch = trackIDarray.slice(i, i + BATCH_SIZE);
      const idsString = batch.join(",");
      const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/tracks?ids=${idsString}`,
        {
          headers: {
            Authorization: `Bearer ${spotifyAccessToken}`,
          },
        }
      );

      if (!spotifyResponse.ok) {
        const errorText = await spotifyResponse.text();
        throw new Error(
          `Failed to fetch Spotify tracks: ${spotifyResponse.status} - ${errorText}`
        );
      }

      const spotifyData = await spotifyResponse.json();
      spotifyTrackData.push(...spotifyData.tracks);
    }

    const enrichedTiles = dbTiles.map((dbTile) => {
      const spotifyLink = dbTile.link;

      let trackId = null;
      let matchingSpotifyTrack = null;

      if (typeof spotifyLink === "string" && spotifyLink.length > 0) {
        const trackIdMatch = spotifyLink.match(/\/track\/([a-zA-Z0-9]+)/);
        if (trackIdMatch && trackIdMatch[1]) {
          trackId = trackIdMatch[1];
          matchingSpotifyTrack = spotifyTrackData.find(
            (track) => track && track.id === trackId
          );
        }
      }

      return {
        ...dbTile,
        songName: matchingSpotifyTrack ? matchingSpotifyTrack.name : null,
        artistName: matchingSpotifyTrack
          ? matchingSpotifyTrack.artists.map((a) => a.name).join(", ")
          : null,
        albumName:
          matchingSpotifyTrack && matchingSpotifyTrack.album
            ? matchingSpotifyTrack.album.name
            : null,
        coverArtUrl:
          matchingSpotifyTrack && matchingSpotifyTrack.album.images.length > 0
            ? matchingSpotifyTrack.album.images[0].url
            : null,
      };
    });

    res.json({
      tiles: enrichedTiles,
    });
    console.log(`Server /api/allTiles: Sending tile data.`);
  } catch (error) {
    console.error("Error fetching all tiles:", error);
    res.status(500).json({ error: "Failed to retrieve tile data" });
  }
});

app.get("/api/spotify-search", async function (req, res) {
  try {
    const spotifyAccessToken = app.locals.spotifyAccessToken;
    if (!spotifyAccessToken) {
      return res
        .status(503)
        .json({ error: "Spotify access token not available." });
    }

    const searchQuery = req.query.query;
    if (!searchQuery) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const spotifySearchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        searchQuery
      )}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
        },
      }
    );

    if (!spotifySearchResponse.ok) {
      const errorText = await spotifySearchResponse.text();
      throw new Error(
        `Spotify search failed: ${spotifySearchResponse.status} - ${errorText}`
      );
    }

    const searchData = await spotifySearchResponse.json();
    const tracks = searchData.tracks.items.map((track) => ({
      id: track.id,
      name: track.name,
      artists: track.artists,
      album: {
        name: track.album.name,
        images: track.album.images,
      },
      external_urls: track.external_urls,
    }));

    res.json(tracks);
  } catch (error) {
    console.error("Error in Spotify search endpoint:", error);
    res.status(500).json({ error: "Failed to perform Spotify search." });
  }
});

app.put("/api/tiles/:rowNum/:colNum", async function (req, res) {
  try {
    const { rowNum, colNum } = req.params;
    const { selectedSong, username: newUsername } = req.body;

    const clientIp = (
      req.headers["x-forwarded-for"] || req.socket.remoteAddress
    )
      .split(",")[0]
      .trim();
    const cooldownPeriodMinutes =
      parseInt(process.env.EDIT_COOLDOWN_MINUTES, 10) || 30;
    const cooldownPeriodSeconds = cooldownPeriodMinutes * 60;
    const cooldownKey = `cooldown:${clientIp}`;

    const onCooldown = await redisClient.get(cooldownKey);

    if (onCooldown) {
      const timeLeftSeconds = await redisClient.ttl(cooldownKey);
      const minutesLeft = Math.ceil(timeLeftSeconds / 60);
      return res
        .status(429)
        .json({
          error: `You must wait approximately ${minutesLeft} more minutes.`,
        });
    }

    if (!selectedSong || !selectedSong.id || !newUsername) {
      return res.status(400).json({ error: "Missing song data or username." });
    }

    const spotifyLink = selectedSong.external_urls
      ? selectedSong.external_urls.spotify
      : null;
    const lastUpdated = new Date().toISOString();

    const updateResult = await dbOperation.updateTile({
      rowNum: rowNum,
      colNum: colNum,
      link: spotifyLink,
      username: newUsername,
      lastUpdated: lastUpdated,
    });

    await redisClient.setEx(cooldownKey, cooldownPeriodSeconds, "on");

    res
      .status(200)
      .json({ message: "Tile updated successfully", updateResult });
  } catch (error) {
    console.error("Error updating tile:", error);
    res.status(500).json({ error: "Failed to update tile data." });
  }
});

app.get("/api/cooldown-time", async function (req, res) {
    try {
        const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim();
        const cooldownKey = `cooldown:${clientIp}`;

        const timeLeftSeconds = await redisClient.ttl(cooldownKey);

        // Redis TTL returns -2 if the key doesn't exist, -1 if it exists but has no expiration,
        // and a positive number for the seconds remaining. Treat -2 as 0.
        const timeRemaining = timeLeftSeconds > 0 ? timeLeftSeconds : 0;

        res.json({ timeRemaining: timeRemaining });
    } catch (error) {
        console.error("Error fetching cooldown time:", error);
        res.status(500).json({ error: "Failed to retrieve cooldown time." });
    }
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "about.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

async function initializeServer() {
  try {
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error(
        "Spotify CLIENT_ID or CLIENT_SECRET not found in environment variables. Please check your .env file."
      );
      process.exit(1);
    }

    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      "base64"
    );
    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: "grant_type=client_credentials",
        method: "POST",
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(
        `Failed to get Spotify token: ${tokenResponse.status} - ${errorText}`
      );
    }

    const tokenData = await tokenResponse.json();
    const spotifyAccessToken = tokenData.access_token;
    console.log(
      "Spotify Access Token obtained:",
      spotifyAccessToken ? "Yes" : "No"
    );

    app.locals.spotifyAccessToken = spotifyAccessToken;

    const editCooldownMinutes = parseInt(
      process.env.EDIT_COOLDOWN_MINUTES || "0",
      10
    );
    app.locals.editCooldownSeconds = editCooldownMinutes * 60;
    console.log(
      `Server Init: Edit cooldown set to: ${editCooldownMinutes} minutes (${app.locals.editCooldownSeconds} seconds)`
    );

    app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
  } catch (error) {
    console.error("Server initialization failed:", error);
    process.exit(1);
  }
}

initializeServer();
