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
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

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

      const { tiles: fetchedData } = await response.json();

      const fetchedTilesMap = new Map();
      fetchedData.forEach((tile) => {
        fetchedTilesMap.set(`${tile.rowNum}-${tile.colNum}`, tile);
      });

      const updatedGrid = [];
      for (let r = 1; r < 21; r++) {
        for (let c = 1; c < 21; c++) {
          const key = `${r}-${c}`;
          const fetchedTile = fetchedTilesMap.get(key);
          if (fetchedTile) {
            updatedGrid.push(fetchedTile);
          } else {
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
      setGridData(updatedGrid);
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

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prevTime => prevTime - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  const handleCooldown = (seconds) => {
    setCooldownRemaining(seconds);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  // Initial cooldown fetch
  useEffect(() => {
    const fetchInitialCooldown = async () => {
      try {
        const response = await fetch('/api/user-cooldown');
        if (response.ok) {
          const { cooldownSeconds } = await response.json();
          setCooldownRemaining(cooldownSeconds);
        } else {
          setCooldownRemaining(0);
        }
      } catch (e) {
        console.error('Failed to fetch initial cooldown status:', e);
        setCooldownRemaining(0);
      }
    };
    fetchInitialCooldown();
  }, []);

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

  return (
    <div className="app-container">
      {cooldownRemaining > 0 && (
        <div className="cooldown-timer-display" style={{ textAlign: 'center', margin: '10px 0', fontSize: '1.2em', fontWeight: 'bold', color: '#f1eff8ff' }}>
          {formatTime(cooldownRemaining)}
        </div>
      )}
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
              onUpdateSuccess={fetchGridData}
              onCellClick={() =>
                console.log(
                  `Cell clicked: (${cellData.rowNum}, ${cellData.colNum})`
                )
              }
              onCooldownTriggered={handleCooldown}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Grid;