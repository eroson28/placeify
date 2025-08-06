import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./NavBar";
import Grid from "./Grid";

function App() {
  return (
    <div className="app-container">
      {" "}
      {/* This div will manage the overall app layout */}
      <Navbar />
      <div className="grid-centering-wrapper">
        {" "}
        {/* This wrapper centers the Grid */}
        <Grid />
      </div>
    </div>
  );
}

export default App;
