import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "./axiosInstance";
import { Link } from 'react-router-dom';
import "./userHome.css";

export default function UserHome() {
    const location = useLocation();
    const navigate = useNavigate();
    const userEmail = sessionStorage.getItem("email");
    let [name, setName] = useState("");
    let [mealData, setmealData] = useState({email: userEmail, meal: "", calories: 0});
    let [mealError, setmealError] = useState("");
    let [meals, setMeals] = useState([]);
    let [editingMeal, setEditingMeal] = useState(null);
    const [userCalorieLimit, setUserCalorieLimit] = useState(0);
    const totalCalories = meals.reduce((sum, meal) => sum + Number(meal.calories), 0);

    useEffect(() => {
        if (!userEmail) {
            navigate("/");
            return;
        }
        let fetchUserDetails = async () => {
            try {
                const res = await axiosInstance.get("/user-name", {
                    params: { email: userEmail }
                });
                if (res.data.success) {
                    setName(res.data.name);
                    setUserCalorieLimit(res.data.calorie_limit);
                } else {
                    console.error(res.data.message);
                }
            } catch (err) {
                console.error(err);
            }
        };
        let fetchMealsToday = async () => {
            try {
                const res = await axiosInstance.post("/meals-today", {email: userEmail});
                if (res.data.success) {
                    setMeals(res.data.meals);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchUserDetails();
        fetchMealsToday();
    }, [userEmail, navigate]); //dependencies array to re run function whenever these updated
    
    let change = (event) => {
        setmealData((currData) => {
            return {...currData, [event.target.name]: event.target.value};
        });
    }

    let addMeal = async (event) => {
        event.preventDefault();
        try {
            const response =  await axiosInstance.post("/add-meal",mealData);
            if(response.data.success) {
                const newMeal = {
                    meal_id: response.data.meal_id,
                    meal_name: mealData.meal,
                    calories: response.data.calories,
                };
                setMeals((prevMeals) => [...prevMeals, newMeal]);
                setmealData({email: userEmail, meal: "", calories: 0});
                setmealError("");
            } else {
                setmealError(response.data.message);
            }
        } catch (err) {
            console.log(err);
            setmealError("Something went wrong. Pls try again");
        }
    }

    let handleDeleteMeal = async (mealId) => {
        try {
            const res = await axiosInstance.delete(`/delete-meal/${mealId}`);
            if (res.data.success) {
            setMeals(meals.filter(meal => meal.meal_id !== mealId));
            } else {
            console.error(res.data.message);
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    let handleEditMeal = (meal) => {
        setEditingMeal(meal);
    };
    
    return (
        <div className="user-home-page">
            <div className="hero-section">
                <div className="hero-text-container">
                    <div className="left">
                        <h1>Welcome, </h1>
                        <h1>{name}!</h1>
                    </div>
                    <div className="right">
                        <p>Total Calories Consumed Today:</p>
                        <h2>{totalCalories.toFixed(2)} / {userCalorieLimit} kcal</h2>
                    </div>
                </div>
            </div>
            <div className="main-content">
                <h3>Log Your Meals</h3>
                <form onSubmit={addMeal}>
                    <label htmlFor="meal">Meal Name</label>
                    <input id="meal" name="meal" placeholder="e.g. 2 rotis with paneer curry" value={mealData.meal} onChange={change}></input><br></br>
                    <button type="submit">Add</button>
                </form>
                {mealError && (<p style={{ color: "red", marginTop: "1em" }}>{mealError}</p>)}

                <h2>Today's Meals:</h2>
                {meals.length === 0 ? (<p>No meals logged today yet.</p>) : (
                    <ul>
                        {meals.map((meal, index) => (
                            <li key={meal.meal_id}>
                                <div className="meal-info">
                                    <strong>{meal.meal_name}</strong>: {meal.calories} kcal
                                </div>
                                <div className="meal-actions">
                                    <button onClick={() => handleDeleteMeal(meal.meal_id)}>Delete</button>
                                    <button onClick={() => handleEditMeal(meal)}>Edit</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {editingMeal && (
                    <div className="modal-overlay" onClick={() => setEditingMeal(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Edit Meal</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                            const res = await axios.put(`/edit-meal/${editingMeal.meal_id}`, {
                                meal: editingMeal.meal_name,
                                calories: editingMeal.calories
                            });
                            if (res.data.success) {
                                const updatedMeals = meals.map(m =>
                                m.meal_id === editingMeal.meal_id ? editingMeal : m
                                );
                                setMeals(updatedMeals);
                                setEditingMeal(null);
                            } else {
                                console.error(res.data.message);
                            }
                            } catch (err) {
                            console.error(err);
                            }
                        }}>
                            <label>Meal Name</label>
                            <input
                            value={editingMeal.meal_name}
                            onChange={e => setEditingMeal({...editingMeal, meal_name: e.target.value})}
                            />
                            <label>Calories</label>
                            <input
                            value={editingMeal.calories}
                            onChange={e => setEditingMeal({...editingMeal, calories: e.target.value})}
                            />
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setEditingMeal(null)}>Cancel</button>
                        </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
