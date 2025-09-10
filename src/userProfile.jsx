import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "./axiosInstance";
import { Pencil } from "lucide-react";
import './userProfile.css';

export default function UserProfile() {
    const navigate = useNavigate();
    const userEmail = sessionStorage.getItem("email");
    const [user, setUser] = useState({
        name: "", age: "", gender: "", height: "", weight: "",
        activity: "", diet: "", goal: "", email: userEmail
    });
    const [editingField, setEditingField] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!userEmail) {
            navigate("/");
            return;
        }

        const fetchDetails = async () => {
            try {
                const res = await axiosInstance.get("http://localhost:3000/user-details", {
                    params: { email: userEmail }
                });
                if (res.data.success) {
                    let act = "Sedentary";
                    if (res.data.activity === 1.375) act = "Lightly Active";
                    else if (res.data.activity === 1.55) act = "Moderately Active";
                    else if (res.data.activity === 1.725) act = "Very Active";
                    else if (res.data.activity === 1.9) act = "Extra Active";

                    setUser({
                        name: res.data.name,
                        age: res.data.age,
                        gender: res.data.gender,
                        height: res.data.height,
                        weight: res.data.weight,
                        activity: act,
                        diet: res.data.diet,
                        goal: res.data.goal,
                        email: userEmail
                    });
                }
            } catch (err) {
                setError("Error fetching user details.");
                console.error(err);
            }
        };
        fetchDetails();
    }, [userEmail, navigate]);

    const handleChange = (e) => {
        setUser({ ...user, [e.target.name]: e.target.value });
    };

    const handleSave = async (field) => {
        const activityMap = {
            "Sedentary": 1.2,
            "Lightly Active": 1.375,
            "Moderately Active": 1.55,
            "Very Active": 1.725,
            "Extra Active": 1.9
        };

        const updatedField = { ...user };
        updatedField.activity = activityMap[updatedField.activity] || updatedField.activity;

        try {
            const res = await axiosInstance.put("http://localhost:3000/update-user-details", updatedField);
            if (res.data.success) {
                setEditingField(null);
            } else {
                alert(res.data.message);
            }
        } catch (err) {
            alert("Update failed");
            console.error(err);
        }
    };

    return (
        <div className="main-content">
            <h2>User Profile</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}

            <div><strong>Email:</strong> {user.email}</div>

            {["name", "age", "gender", "height", "weight", "activity", "diet", "goal"].map((field) => (
                <div key={field} className="profile-field">
                    <label className="profile-label">{field.charAt(0).toUpperCase() + field.slice(1)}:</label>

                    {editingField === field ? (
                        <>
                            <input
                                type={["age", "height", "weight"].includes(field) ? "number" : "text"}
                                name={field}
                                value={user[field]}
                                onChange={handleChange}
                                className="profile-input"
                            />
                            <button onClick={() => handleSave(field)} className="save-button">Save</button>
                        </>
                    ) : (
                        <>
                            <span className="profile-value">{user[field]}</span>
                            <Pencil
                                className="edit-icon"
                                size={16}
                                onClick={() => setEditingField(field)}
                            />
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}


/*import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "./axiosInstance";
import { Link } from 'react-router-dom';
import './userProfile.css';
import { Pencil } from 'lucide-react';

export default function UserProfile() {
    const location = useLocation();
    const navigate = useNavigate();
    const userEmail = sessionStorage.getItem("email");
    const [user, setUser] = useState({name: "", age: "", gender: "", height: "", weight: "", activity: "", diet: "", goal: "", email: userEmail});
    const [editMode, setEditMode] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!userEmail) {
            navigate("/");
            return;
        }
        const fetchDetails = async () => {
            try {
                const res = await axiosInstance.get("http://localhost:3000/user-details", {params: { email: userEmail }});
                if (res.data.success) {
                    let act = "Sedentary";
                    if (res.data.activity === 1.375) act = "Lightly Active";
                    else if (res.data.activity === 1.55) act = "Moderately Active";
                    else if (res.data.activity === 1.725) act = "Very Active";
                    else if (res.data.activity === 1.9) act = "Extra Active";

                    setUser({
                        name: res.data.name,
                        age: res.data.age,
                        gender: res.data.gender,
                        height: res.data.height,
                        weight: res.data.weight,
                        activity: act,
                        diet: res.data.diet,
                        goal: res.data.goal,
                        email: userEmail
                    });
                }
            } catch (err) {
                setError("Error fetching user details.");
                console.error(err);
            }
        };
        fetchDetails();
    }, [userEmail, navigate]);

    const handleChange = (e) => {
        setUser({ ...user, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        const activityMap = {
            "Sedentary": 1.2,
            "Lightly Active": 1.375,
            "Moderately Active": 1.55,
            "Very Active": 1.725,
            "Extra Active": 1.9
        };

        const userToSend = {...user,activity: activityMap[user.activity] || 1.2};
        try {
            const res = await axiosInstance.put("http://localhost:3000/update-user-details", userToSend);
            if (res.data.success) {
                setEditMode(false);
            } else {
                alert(res.data.message);
            }
        } catch (err) {
            alert("Update failed");
            console.error(err);
        }
    };

    const logout = async () => {
        try {
            await axiosInstance.get("/logout");
            sessionStorage.clear();
            navigate("/"); 
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <div className="main-content">
            <h2>User Profile</h2>
            {error && <p style={{color: "red"}}>{error}</p>}

            <div><strong>Email:</strong> {user.email}</div>

            {["name", "age", "gender", "height", "weight", "activity", "diet", "goal"].map((field) => (
            <div key={field} className="profile-field">
                <label className="profile-label">{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                {editMode ? (
                    <input
                        type={field === "age" || field === "height" || field === "weight" ? "number" : "text"}
                        name={field}
                        value={user[field]}
                        onChange={handleChange}
                        className="profile-input"
                    />
                ) : (
                    <span className="profile-value">{user[field]}</span>
                )}
                {!editMode && (
                    <Pencil className="edit-icon" size={16} />
                )}
            </div>
        ))}

            <br />
            {editMode ? (
                <>
                    <button onClick={handleSave}>Save</button>
                    <button onClick={() => setEditMode(false)}>Cancel</button>
                </>) : (<button onClick={() => setEditMode(true)}>Edit</button>)}
            <button onClick={logout}>Logout</button>
        </div>
    );
}
*/