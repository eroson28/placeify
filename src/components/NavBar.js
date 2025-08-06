import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

function NavBar() {
  return (
    <Navbar
      expand="lg"
      className="bg-body-tertiary"
      variant="dark"
      bg="dark"
      data-bs-theme="dark"
    >
      <Container>
        <Navbar.Brand href="index">home</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="https://github.com/eroson28/placeify">
              github
            </Nav.Link>
            <Nav.Link href="/about">about</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;
