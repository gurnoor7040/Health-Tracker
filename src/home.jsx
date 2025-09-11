import { useState, useEffect } from "react";
import axiosInstance from "./axiosInstance";
import { useNavigate } from "react-router-dom";
import "./home.css";

export default function Home({ setIsLoggedIn }) {
  const navigate = useNavigate();
  let [formData, setformData] = useState({ email: "", password: "" });
  let [errorMessage, setErrorMessage] = useState("");
  let [showSignUp, setShowSignUp] = useState(false);
  let [mdata, setMData] = useState({
    name: "",
    email: "",
    password: "",
    age: 0,
    gender: "",
    height: 0,
    weight: 0,
    activity: "",
    diet: "",
    goal: "",
  });
  let [merror, setMError] = useState("");

  let change = (event) => {
    setformData((currData) => {
      return { ...currData, [event.target.name]: event.target.value };
    });
  };
  let mChange = (event) => {
    setMData((currData) => {
      return { ...currData, [event.target.name]: event.target.value };
    });
  };

  let submit = async (event) => {
    event.preventDefault();
    try {
      const response = await axiosInstance.post("/", formData, {
        withCredentials: true,
      });

      if (response.data.success) {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("email", formData.email);
        setIsLoggedIn(true);
        setErrorMessage("");
        setformData({ email: "", password: "" });

        navigate("/userHome", { state: { user: formData.email } });
      } else {
        setErrorMessage(response.data.message);
      }
    } catch (err) {
      console.log(err);
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  let mSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axiosInstance.post("/register", mdata, {
        withCredentials: true,
      });

      if (response.data.success) {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("email", mdata.email);
        setIsLoggedIn(true);
        setMError("");

        navigate("/userHome", { state: { user: mdata.email } });
      } else {
        setMError(response.data.message);
      }
    } catch (err) {
      console.log(err);
      setMError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="home-page">
      <div className="hero-section">
          <div className="welcome-text">
            <h1 style={{ color: "white" }}>Welcome</h1>
          </div>
      </div>

      <div className="login-form-section">
          <div className="login-form-box">
            <form onSubmit={submit}>
              <label htmlFor="email">Email</label>
              <br />
              <input
                id="email"
                name="email"
                placeholder="email"
                value={formData.email}
                onChange={change}
                required
              />
              <br />
              <label htmlFor="password">Password</label>
              <br />
              <input
                id="password"
                name="password"
                placeholder="password"
                value={formData.password}
                onChange={change}
                required
              />
              <br />
              <button type="submit">Submit</button>
              <br />
              {errorMessage && <p className="error-message">{errorMessage}</p>}
            </form>

            <div className="divider">
              <hr className="line" />
              <span className="or-text">OR</span>
              <hr className="line" />
            </div>
            <button className="signup-btn" onClick={() => setShowSignUp(true)}>
              Sign Up
            </button>
          </div>
      </div>

      {showSignUp && (
        <div className="modal-overlay" onClick={() => setShowSignUp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Sign Up</h2>
            <form onSubmit={mSubmit}>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                placeholder="Full Name"
                value={mdata.name}
                onChange={mChange}
                required
              />
              <br />
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                placeholder="Email"
                value={mdata.email}
                onChange={mChange}
                required
              />
              <br />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                placeholder="Password"
                value={mdata.password}
                onChange={mChange}
                required
              />
              <br />
              <label htmlFor="age">Age</label>
              <input
                id="age"
                name="age"
                placeholder="Age"
                value={mdata.age}
                onChange={mChange}
                required
              />
              <br />

              <label>Gender</label>
              <br />
              <input
                type="radio"
                id="female"
                name="gender"
                value="Female"
                checked={mdata.gender === "Female"}
                onChange={mChange}
              />
              <label htmlFor="female">Female</label>
              <br />

              <input
                type="radio"
                id="male"
                name="gender"
                value="Male"
                checked={mdata.gender === "Male"}
                onChange={mChange}
              />
              <label htmlFor="male">Male</label>
              <br />

              <label htmlFor="height">Height(in cms)</label>
              <input
                id="height"
                name="height"
                placeholder="Height(cm)"
                value={mdata.height}
                onChange={mChange}
                required
              />
              <br />
              <label htmlFor="weight">Weight(in kgs)</label>
              <input
                id="weight"
                name="weight"
                placeholder="Weight(kg)"
                value={mdata.weight}
                onChange={mChange}
                required
              />
              <br />

              <label>Activity Level</label>
              <br />
              <input
                type="radio"
                id="sedentary"
                name="activity"
                value="1.2"
                checked={mdata.activity === "1.2"}
                onChange={mChange}
              />
              <label htmlFor="sedentary">Sedentary (little/no exercise)</label>
              <br />

              <input
                type="radio"
                id="lightly-active"
                name="activity"
                value="1.375"
                checked={mdata.activity === "1.375"}
                onChange={mChange}
              />
              <label htmlFor="lightly-active">
                Lightly Active (light exercise 1-3 days/week)
              </label>
              <br />

              <input
                type="radio"
                id="moderately-active"
                name="activity"
                value="1.55"
                checked={mdata.activity === "1.55"}
                onChange={mChange}
              />
              <label htmlFor="moderately-active">
                Moderately Active (moderate exercise 3-5 days/week)
              </label>
              <br />

              <input
                type="radio"
                id="very-active"
                name="activity"
                value="1.725"
                checked={mdata.activity === "1.725"}
                onChange={mChange}
              />
              <label htmlFor="very-active">Very Active (hard exercise 6-7 days/week)</label>
              <br />

              <input
                type="radio"
                id="extra-active"
                name="activity"
                value="1.9"
                checked={mdata.activity === "1.9"}
                onChange={mChange}
              />
              <label htmlFor="extra-active">
                Super Active (very hard exercise & physical job)
              </label>
              <br />

              <label>Diet Preference</label>
              <br />
              <input
                type="radio"
                id="vegetarian"
                name="diet"
                value="Vegetarian"
                checked={mdata.diet === "Vegetarian"}
                onChange={mChange}
              />
              <label htmlFor="vegetarian">Vegetarian</label>
              <br />

              <input
                type="radio"
                id="non-vegetarian"
                name="diet"
                value="Non-Vegetarian"
                checked={mdata.diet === "Non-Vegetarian"}
                onChange={mChange}
              />
              <label htmlFor="non-vegetarian">Non-Vegetarian</label>
              <br />

              <label>Goal</label>
              <br />
              <input
                type="radio"
                id="loss"
                name="goal"
                value="Loss"
                checked={mdata.goal === "Loss"}
                onChange={mChange}
              />
              <label htmlFor="loss">Loss</label>
              <br />

              <input
                type="radio"
                id="gain"
                name="goal"
                value="Gain"
                checked={mdata.goal === "Gain"}
                onChange={mChange}
              />
              <label htmlFor="gain">Gain</label>
              <br />

              <input
                type="radio"
                id="maintain"
                name="goal"
                value="Maintain"
                checked={mdata.goal === "Maintain"}
                onChange={mChange}
              />
              <label htmlFor="maintain">Maintain</label>
              <br />

              <button type="submit">Register</button>
            </form>
            <button className="close-btn" onClick={() => setShowSignUp(false)}>
              Close
            </button>
            {merror && <p className="error-message">{merror}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
