import { useState } from "react";

function Tile({
  rowNum,
  colNum,
  songName,
  artistName,
  coverArtUrl,
  username,
  lastUpdated,
  spotifyLink,
  onCellClick,
  albumName,
  onUpdateSuccess
}) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [newUsername, setNewUsername] = useState(username);

  const formattedLastUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString()
    : "N/A";

  const handleTileClick = () => {
    setShowModal(true);
    onCellClick();
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  const handleEditClick = () => {
    handleCloseModal();
    setShowEditModal(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSong(null);
    setNewUsername(username);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`/api/spotify-search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSong = (song) => {
    setSelectedSong(song);
    setSearchResults([]);
    setSearchQuery(song.name);
  };

  const handleSaveEdit = async () => {
    // The server will now handle all cooldown logic.

    if (!selectedSong) {
      alert("Please select a song.");
      return;
    }

    if (!newUsername.trim()) {
      alert("Please enter a username.");
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 15) {
      alert("Username must be between 3 and 15 characters long.");
      return;
    }

    try {
      const response = await fetch(`/api/tiles/${rowNum}/${colNum}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedSong: selectedSong,
          username: newUsername,
          rowNum: rowNum,
          colNum: colNum,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update tile: ${response.status}`);
      }

      const result = await response.json();
      console.log("Tile update successful:", result);

      onUpdateSuccess();
      handleCloseEditModal();
    } catch (error) {
      console.error("Error saving tile edit:", error);
      alert(`Error saving tile: ${error.message}`);
    }
  };

  return (
    <>
      <div className="tile" onClick={handleTileClick}>
        <img
          className="tile-image"
          src={
            coverArtUrl ||
            "https://upload.wikimedia.org/wikipedia/commons/9/99/Black_square.jpg"
          }
          alt={`${songName || "Unknown Song"} cover`}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://placehold.co/100x100/CCCCCC/333333?text=No+Image";
          }}
        />
      </div>

      {showModal && (
        <div
          className="modal"
          style={{ display: showModal ? "block" : "none" }}
          onClick={handleCloseModal}
        >
          <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={handleCloseModal}>
              &times;
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <img
                  src={
                    coverArtUrl ||
                    "https://upload.wikimedia.org/wikipedia/commons/9/99/Black_square.jpg"
                  }
                  alt={`${songName || "Unknown Song"} cover`}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://placehold.co/150x150/CCCCCC/333333?text=No+Image";
                  }}
                />
              </div>
              <div style={{ textAlign: "center" }}>
                <h2 style={{ margin: "0 0 10px 0", fontSize: "1.5em" }}>
                  {songName || "No Song Title"}
                </h2>
                <p style={{ margin: "5px 0" }}>
                  <strong>Artist:</strong> {artistName || "N/A"}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Album:</strong> {albumName}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Added by:</strong> {username || "N/A"}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Last Updated:</strong> {formattedLastUpdated}
                </p>
                {spotifyLink && (
                  <a
                    href={spotifyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "15px",
                      padding: "8px 15px",
                      backgroundColor: "#1DB954",
                      color: "white",
                      textDecoration: "none",
                      borderRadius: "25px",
                      fontWeight: "bold",
                    }}
                  >
                    Listen on Spotify
                  </a>
                )}
                <button
                  onClick={handleEditClick}
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: "150px",
                    margin: "20px auto 0 auto",
                    padding: "10px 15px",
                    backgroundColor: "#457b9d",
                    color: "white",
                    border: "none",
                    borderRadius: "25px",
                    cursor: "pointer",
                    fontSize: "1em",
                    fontWeight: "bold",
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="modal"
          style={{ display: showEditModal ? "block" : "none" }}
          onClick={handleCloseEditModal}
        >
          <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={handleCloseEditModal}>
              &times;
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <div style={{ marginBottom: '15px', width: '100%', maxWidth: '400px', display: 'flexbox', flexDirection: 'row'}}>
                <input
                  type="text"
                  placeholder="Search Spotify song:"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: 'calc(95% - 70px)', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', marginRight: '5px' }}
                />
                <button onClick={handleSearch} disabled={isSearching} style={{ padding: '10px 15px', borderRadius: '5px', border: 'none', backgroundColor: '#1DB954', color: 'white', cursor: 'pointer' }}>
                  {isSearching ? '...' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '5px', width: '100%', maxWidth: '400px', marginBottom: '15px' }}>
                  {searchResults.map(song => (
                    <div
                      key={song.id}
                      onClick={() => handleSelectSong(song)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        backgroundColor: selectedSong && selectedSong.id === song.id ? '#e6f7ff' : 'white',
                      }}
                    >
                      <img src={song.album.images[2]?.url || 'https://placehold.co/50x50/CCCCCC/333333?text=No+Image'} alt="Album Cover" style={{ width: '50px', height: '50px', marginRight: '10px', borderRadius: '3px' }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9em' }}>{song.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8em', color: '#555' }}>{song.artists.map(a => a.name).join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedSong && (
                <div style={{ marginBottom: '15px', padding: '10px', border: '1px dashed #1DB954', borderRadius: '5px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Selected: {selectedSong.name}</p>
                  <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>by {selectedSong.artists.map(a => a.name).join(', ')}</p>
                </div>
              )}

              <div style={{ marginBottom: '15px', width: '100%', maxWidth: '400px' }}>
                <label htmlFor="usernameInput" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Username (3 - 15 characters):</label>
                <input
                  id="usernameInput"
                  type="text"
                  placeholder="Enter your username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', width: '100%', maxWidth: '400px' }}>
                <button onClick={handleSaveEdit} style={{ padding: '10px 20px', borderRadius: '25px', border: 'none', backgroundColor: '#4CAF50', color: 'white', cursor: 'pointer', flexGrow: 1 }}>
                  Send
                </button>
                <button onClick={handleCloseEditModal} style={{ padding: '10px 20px', borderRadius: '25px', border: 'none', backgroundColor: '#f44336', color: 'white', cursor: 'pointer', flexGrow: 1 }}>
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Tile;