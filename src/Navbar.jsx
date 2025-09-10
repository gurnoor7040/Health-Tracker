import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Navbar.css';

export default function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.get("http://localhost:3000/logout", { withCredentials: true });
      setIsLoggedIn(false);
      sessionStorage.setItem("isLoggedIn", "false");
      window.location.href = "/"; // force refresh to clear stale UI
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="navbar">
      <div className="navbar-container">
        <div className="nav-logo">HealthyMe</div>

        <div className="nav-links">
          {!isLoggedIn && <Link to="/">Home</Link>}
          
          {isLoggedIn && (
            <>
              <Link to="/userHome">My Meals</Link>
              <Link to="/userMealPlan">Meal Plan</Link>
              <Link to="/userProfile">My Profile</Link>
            </>
          )}
          <Link to="/contactUs">Contact Us</Link>
          {isLoggedIn && (
            <>
            <button onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
