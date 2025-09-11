import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axiosInstance from "./axiosInstance";
import { Link } from 'react-router-dom';
import './UserMealPlan.css';


export default function UserMealPlan() {
  const location = useLocation();
  const userEmail = sessionStorage.getItem("email");
  const [planId, setPlanId] = useState();
  const [planError, setPlanError] = useState("");
  const [targetCalories, setTargetCalories] = useState();
  const [dietPreference, setDietPreference] = useState();
  const [mealPlan, setMealPlan] = useState({});
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(null);
  const [generating, setGenerating] = useState(false);
 
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axiosInstance.get(
          `/get-user-details?email=${userEmail}`
        );
        const { target_calories, diet_preference } = response.data;
        setTargetCalories(target_calories - 400);
        setDietPreference(diet_preference);
      } catch (err) {
        console.error(err);
        setPlanError("Failed to load user preferences");
      }
    };

    const fetchExistingPlan = async () => {
      try {
        const response = await axiosInstance.get(`/get-meal-plan?email=${userEmail}`);
        const meals = response.data.meals;

        const grouped = {};
        meals.forEach(meal => {
          const day = meal.day_of_week;
          const type = meal.meal_type.startsWith("snack") ? "snack" : meal.meal_type;

          if (!grouped[day]) grouped[day] = { breakfast: [], lunch: [], dinner: [], snack: [] };
          grouped[day][type].push(meal);
        });

        setMealPlan(grouped);
      } catch (err) {
        console.error("No existing plan found.");
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      fetchUserInfo();
      fetchExistingPlan();
    }
  }, [userEmail]);

  const getNewPlan = async () => {
    if (!userEmail || !targetCalories || !dietPreference) {
      setPlanError("Missing required data to generate plan.");
      return;
    }

    try {
      setGenerating(true); // Start loading
      const response = await axiosInstance.post("/generate-meal-plan", {
        user_email: userEmail,
        calories: targetCalories,
        diet: dietPreference,
      });

      setPlanId(response.data.plan_id);
      setPlanError("");
      await fetchMealPlan(); 
    } catch (err) {
      console.error("Meal plan generation error:", err);
      setPlanError("Something went wrong. Please try again!");
    } finally {
      setGenerating(false); // Stop loading
    }
  };


  const fetchMealPlan = async () => {
    try {
      const response = await axiosInstance.get(`/get-meal-plan?email=${userEmail}`);
      const meals = response.data.meals;

      const grouped = {};
      meals.forEach(meal => {
        const day = meal.day_of_week;
        const type = meal.meal_type.startsWith("snack") ? "snack" : meal.meal_type;

        if (!grouped[day]) grouped[day] = { breakfast: [], lunch: [], dinner: [], snack: [] };
        grouped[day][type].push(meal);
      });

      setMealPlan(grouped);
    } catch (err) {
      console.error("Failed to load meal plan:", err);
      setPlanError("Could not fetch your meal plan.");
    }
  };

  let regenerateMeal = async (day, type) => {
    try {
      setRegenerating({ day, type }); // Start loading

      const res = await axiosInstance.post("/meal-regenerate", {
        user_email: userEmail,
        dayOfWeek: day,
        mealType: type,
      });

      const newMeal = res.data;

      setMealPlan((prev) => {
        const updatedDay = { ...prev[day] };

        if (type.startsWith("snack")) {
          updatedDay.snack = updatedDay.snack.map((snack) =>
            snack.meal_type === type ? newMeal : snack
          );
        } else {
          updatedDay[type] = [newMeal];
        }

        return {
          ...prev,
          [day]: updatedDay,
        };
      });
    } catch (err) {
      console.error("Error regenerating meal:", err);
      setPlanError("Failed to regenerate the meal.");
    } finally {
      setRegenerating(null); // Stop loading
    }
  };

  return (
    <div className="main-content">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {Object.keys(mealPlan).length > 0 ? (
            <div style={{ marginTop: "20px" }}>
              <h2>Your Weekly Meal Plan</h2>
              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                mealPlan[day] && (
                  <div key={day} className="day-section">
                    <h3 className="day-heading">{day.charAt(0).toUpperCase() + day.slice(1)}</h3>
                    {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                      mealPlan[day][type]?.length > 0 && (
                        <div key={type}>
                          <h4 className="meal-type-heading">{type}</h4>
                          <div className="meal-grid">
                            {mealPlan[day][type].map((meal, index) => (
                              <div key={`${meal.title}-${index}`} className="meal-card">
                                <div className="meal-title">{meal.title}</div>
                                <img
                                  src={meal.image_url}
                                  alt={meal.title}
                                  onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = "/fallback.jpg"; 
                                  }}
                                />
                                <div className="calories">Calories: {meal.calories}</div>
                                <a
                                  href={meal.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="recipe-link"
                                >
                                  View Recipe
                                </a>
                                <button
                                  onClick={() => regenerateMeal(day, meal.meal_type)}
                                  disabled={regenerating?.day === day && regenerating?.type === meal.meal_type}
                                >
                                  🔁 Regenerate
                                </button>

                                {regenerating?.day === day && regenerating?.type === meal.meal_type && (
                                  <span style={{ marginLeft: "10px", fontSize: "0.9rem", color: "#555" }}>
                                    ⏳ Updating...
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )
              ))}
            </div>
          ) : (
            <p>No meal plan found for your account.</p>
          )}
          <div style={{ marginTop: "30px" }}>
            <button onClick={getNewPlan} disabled={generating}>
              {generating ? "⏳ Generating..." : "Generate New Plan"}
            </button>
          </div>
          {planError && <p style={{ color: "red" }}>{planError}</p>}
        </>
      )}
    </div>
  );
}
