import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './home';
import UserHome from './userHome';
import UserProfile from './userProfile';
import UserMealPlan from './userMealPlan';
import Navbar from './Navbar';
import Footer from './Footer';
import ContactUs from './contactUs';
import axiosInstance from './path-to-your-axiosInstance';


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    axiosInstance.get('/me')
      .then((res) => {
        setIsLoggedIn(res.data.success);
      })
      .catch((err) => {
        console.error("Auth check failed", err);
        setIsLoggedIn(false);
      });
  }, []);
  
  return (
    <Router>
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <div style={{ paddingBottom: "60px" }}>
        <Routes>
          <Route path="/" element={<Home setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/userHome" element={<UserHome />} />
          <Route path="/userProfile" element={<UserProfile />} />
          <Route path="/userMealPlan" element={<UserMealPlan />} />
          <Route path="/contactUs" element={<ContactUs />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

export default App;