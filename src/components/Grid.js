import { useState, useEffect } from "react";
import Tile from "./Tile";

function Grid() {
  const [gridData, setGridData] = useState(() => {
    const initialGrid = [];
    for (let r = 1; r < 21; r++) {
      for (let c = 1; c < 21; c++) {
        initialGrid.push({
          rowNum: r,
          colNum: c,
          songName: null,
          artistName: null,
          coverArtUrl: null,
          isSelected: false,
          username: null,
          lastUpdated: null,
          link: null,
          albumName: null,
        });
      }
    }
    return initialGrid;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [globalLastEditTimestamp, setGlobalLastEditTimestamp] = useState(null);
  const [editCooldownDuration, setEditCooldownDuration] = useState(0);

  const fetchGridData = async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/allTiles");

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const {
        tiles: fetchedData,
        editCooldownSeconds,
        globalLastEditTimestamp: backendGlobalTimestamp,
      } = await response.json();
      setEditCooldownDuration(editCooldownSeconds); // Store total cooldown duration
      setGlobalLastEditTimestamp(backendGlobalTimestamp); // Store the global last edit timestamp

      // Create a map for quick lookup of fetched tiles by their coordinates
      const fetchedTilesMap = new Map();
      fetchedData.forEach((tile) => {
        fetchedTilesMap.set(`${tile.rowNum}-${tile.colNum}`, tile);
      });

      // Create a new grid array, merging fetched data into the correct positions
      const updatedGrid = [];
      for (let r = 1; r < 21; r++) {
        for (let c = 1; c < 21; c++) {
          const key = `${r}-${c}`;
          const fetchedTile = fetchedTilesMap.get(key);
          if (fetchedTile) {
            updatedGrid.push(fetchedTile); // Use fetched data if available
          } else {
            // Otherwise, use a default blank tile for this position
            updatedGrid.push({
              rowNum: r,
              colNum: c,
              songName: null,
              artistName: null,
              coverArtUrl: null,
              isSelected: false,
              username: null,
              lastUpdated: null,
              link: null,
              albumName: null,
            });
          }
        }
      }
      setGridData(updatedGrid); // Update the state with the fully merged grid
    } catch (err) {
      setError(err);
      console.error("Failed to fetch grid data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGridData();
  }, []);

  // Timer countdown logic based on globalLastEditTimestamp
  useEffect(() => {
    let timerInterval;
    if (globalLastEditTimestamp && editCooldownDuration > 0) {
      const lastEditDate = new Date(globalLastEditTimestamp);
      timerInterval = setInterval(() => {
        const now = new Date();
        const elapsedSeconds = (now.getTime() - lastEditDate.getTime()) / 1000;
        const remaining = Math.max(0, editCooldownDuration - elapsedSeconds);
        setCooldownSeconds(Math.ceil(remaining)); // Round up to show full seconds remaining
      }, 1000);
    } else {
      setCooldownSeconds(0); // No cooldown if no global updates or duration is 0
    }

    return () => clearInterval(timerInterval); // Cleanup on unmount or dependency change
  }, [globalLastEditTimestamp, editCooldownDuration]); // Dependencies are the global timestamp and the total duration

  // Format the time (MM:SS)
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-700 text-lg font-semibold">
          Loading grid data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-100 text-red-700 p-4 rounded-lg shadow-md">
        <div className="font-bold">Error:</div>
        <div className="ml-2">{error.message}</div>
        <div className="text-sm mt-2">
          Please check the server console for more details.
        </div>
      </div>
    );
  }

  // Determine if editing is currently disabled
  const isEditDisabled = cooldownSeconds > 0;

  return (
    <div className="app-container">
      {" "}
      {/* Use app-container for overall layout */}
      <div className="timer-display">
        Time until next edit: <strong>{formatTime(cooldownSeconds)}</strong>
        {isEditDisabled && (
          <span className="cooldown-active-message"> (Editing disabled)</span>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${20}, 1fr)`,
          gap: "1px",
          padding: "10px",
          maxWidth: `${20 * 30 + (20 - 1) * 1 + 20}px`,
          margin: "20px auto",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        }}
        className="grid-container"
      >
        {gridData.map((cellData) => {
          return (
            <Tile
              key={`${cellData.rowNum}-${cellData.colNum}`}
              rowNum={cellData.rowNum}
              colNum={cellData.colNum}
              songName={cellData.songName}
              artistName={cellData.artistName}
              coverArtUrl={cellData.coverArtUrl}
              isSelected={cellData.isSelected}
              username={cellData.username}
              lastUpdated={cellData.lastUpdated}
              spotifyLink={cellData.link}
              albumName={cellData.albumName}
              onUpdateSuccess={fetchGridData} // Pass Grid's fetchGridData for updates
              onCellClick={() =>
                console.log(
                  `Cell clicked: (${cellData.rowNum}, ${cellData.colNum})`
                )
              }
              isEditDisabled={isEditDisabled} // Pass cooldown status to Tile
            />
          );
        })}
      </div>
    </div>
  );
}

export default Grid;
