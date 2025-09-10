import express from "express";
import cors from "cors";
import pg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import axios from "axios";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.FRONTEND_URL, 
  credentials: true
}));

app.use(session({
  secret: "HealthSecretKey",  
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,  
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24,  
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT),  
});

db.connect()
  .then(() => console.log("Postgres connected successfully"))
  .catch(err => console.error("Postgres connection error:", err));


passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser(async (email, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(null, false);
    }
  } catch (err) {
    done(err, null);
  }
});

export { db, app };

const saltRounds = 10;

async function getCaloriesFromNutritionix(mealDescription) {
    try {
        const res = await axios.post("https://trackapi.nutritionix.com/v2/natural/nutrients",
            { query: mealDescription },
            {
                headers: {
                    "x-app-id": process.env.NUTRITIONIX_APP_ID,
                    "x-app-key": process.env.NUTRITIONIX_APP_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        let totalCalories = 0;
        res.data.foods.forEach(food => {
            totalCalories += food.nf_calories;
        });
        return totalCalories;

    } catch (err) {
        console.error("Nutritionix error:", err.response?.data || err);
        throw new Error("Failed to calculate calories. Try again.");
    }
}

async function getSnack(calories) {
    const response = await axios.get("https://api.spoonacular.com/recipes/findByNutrients", {
        params: {
            minCalories: calories - 20,
            maxCalories: calories + 20,
            number: 1,
            apiKey: process.env.SPOON_API
        }
    });
    return response.data[0];
}

app.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ success: true, user: req.user });
  } else {
    console.log("User not authenticated on /me");
    res.json({ success: false, user: null });
  }
});


app.post("/", async (req, res) => {
    const pass = req.body.password;
    console.log(req.body);
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [req.body.email]);
        if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        const valid = await bcrypt.compare(pass, storedHashedPassword);
        if (valid) {
            req.login(user, (err) => {
                if (err) {
                    console.error(err);
                    return res.json({ success: false, message: "Login failed." });
                }
                res.json({ success: true, message: "Login successful." });
            });
        } else {
            res.json({ success: false, message: "Incorrect Password!" });
        }
        } else {
        res.json({ success: false, message: "User not registered. Please sign up first." });
        }
    } catch (err) {
        console.error("Backend error:", err);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
});

app.post("/register", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [req.body.email]);
        if (result.rows.length > 0) {
            res.json({ success: false, message: "User already registered. Please sign in." });
        } else {
            const activity = parseFloat(req.body.activity);
            const hash = await bcrypt.hash(req.body.password, saltRounds);
            await db.query(
                "INSERT INTO users(name,email,password,age,gender,height_cm,weight_kg,activity_level,dietary_preferences,goal) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
                [
                req.body.name,
                req.body.email,
                hash,
                req.body.age,
                req.body.gender,
                req.body.height,
                req.body.weight,
                activity,
                req.body.diet,
                req.body.goal,
                ]
            );
            res.json({ success: true, message: "Successfully Registered" });
        }
    } catch (err) {
        console.error("Backend error:", err);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
});

app.get("/user-name", async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.json({ success: false, message: "Email required" });
    }
    try {
        const result = await db.query("SELECT name, calories FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
            res.json({ success: true, name: result.rows[0].name, calorie_limit: result.rows[0].calories});
        } else {
            res.json({ success: false, message: "User not found" });
        }
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

app.post("/add-meal", async (req,res) => {
    const email = req.body.email;
    const meal = req.body.meal;
    if (!email || !meal) {
        return res.json({ success: false, message: "Email and meal description required." });
    }
    try {
        const totalCalories = await getCaloriesFromNutritionix(meal);
        const result = await db.query("INSERT INTO meals(user_email,meal_name,calories) VALUES($1,$2,$3) RETURNING *",[email,meal,totalCalories]);
        const mealId = result.rows[0].meal_id;
        res.json({success: true, message: "Meal logged", calories: totalCalories, meal_id: mealId });
    } catch(err) {
        console.log(err);
        res.json({ success: false, message: "Failed to calculate calories" });
    }    
});

app.post("/meals-today", async (req, res) => {
    const { email } = req.body;  //destructure the email string
    try {
        const result = await db.query(
            `SELECT meal_id, meal_name, calories, eaten_at
            FROM meals
            WHERE user_email = $1
            AND eaten_at::date = CURRENT_DATE
            ORDER BY eaten_at ASC;`,
            [email]
        );
        res.json({ success: true, meals: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Failed to fetch meals."});
    }
});

app.delete("/delete-meal/:id", async (req, res) => {
    const mealId = parseInt(req.params.id, 10);
    if (isNaN(mealId)) {
        return res.json({ success: false, message: "Invalid meal ID." });
    }
    try {
        const result = await db.query("DELETE FROM meals WHERE meal_id = $1", [mealId]);
        if (result.rowCount > 0) {
        res.json({ success: true, message: "Meal deleted successfully." });
        } else {
        res.json({ success: false, message: "Meal not found." });
        }
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error." });
    }
});

app.put("/edit-meal/:id", async (req, res) => {
    const mealId = parseInt(req.params.id, 10);
    if (isNaN(mealId)) {
        return res.json({success: false, message: "Invalid meal ID."});
    }
    const { meal, calories } = req.body;
    if (!meal || isNaN(calories)) {
        return res.json({success: false, message: "Meal name and numeric calories required."});
    }
    try {
        const result = await db.query(
        "UPDATE meals SET meal_name = $1, calories = $2 WHERE meal_id = $3",
        [meal, calories, mealId]
        );
        if (result.rowCount > 0) {
        res.json({ success: true, message: "Meal updated successfully." });
        } else {
        res.json({ success: false, message: "Meal not found." });
        }
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error." });
    }
});

app.get("/user-details", async (req,res) => {
    const email = req.query.email;
    if (!email) {
        return res.json({success: false, message: "Email required" });
    }
    try {
        const result = await db.query("SELECT* FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({
                success: true,
                name: user.name,
                email: user.email,
                age: user.age,
                gender: user.gender,
                height: user.height_cm,
                weight: user.weight_kg,
                activity: user.activity_level,
                diet: user.dietary_preferences, 
                goal: user.goal
            });
        } else {
            res.json({success: false, message: "User not found"});
        }
    } catch (err) {
        console.error(err);
        res.json({success: false, message: "Server error"});
    }
});

app.put("/update-user-details", async (req, res) => {
    const {
        email, name, age, gender, height, weight,
        activity, diet, goal
    } = req.body;

    if (!email) {
        return res.json({ success: false, message: "Email is required." });
    }
    try {
        await db.query(
            `UPDATE users SET
                name = $1,
                age = $2,
                gender = $3,
                height_cm = $4,
                weight_kg = $5,
                activity_level = $6,
                dietary_preferences = $7,
                goal = $8
             WHERE email = $9`,
            [name, age, gender, height, weight, activity, diet, goal, email]
        );
        res.json({success: true, message: "User details updated successfully." });
    } catch (err) {
        console.error("Update error:", err);
        res.json({success: false, message: "Server error. Could not update user details."});
    }
});

app.get("/get-user-details", async (req,res) => {
    const email = req.query.email;
    if (!email) {
        return res.json({success: false, message: "Email required" });
    }
    try {
        const result = await db.query("SELECT* FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({
                success: true,
                diet_preference: user.dietary_preferences,
                target_calories: user.calories
            });
        } else {
            res.json({success: false, message: "User not found"});
        }
    } catch (err) {
        console.error(err);
        res.json({success: false, message: "Server error"});
    }
});

app.post("/generate-meal-plan", async (req,res) => {
    const user_email = req.body.user_email;
    const apiKey = process.env.SPOON_API;
    const diet = req.body.diet;
    const calories = req.body.calories;

    console.log(user_email);

    if (!user_email) {
        return res.status(400).json({ error: "user_email is required" });
    }
    try {
        const response = await axios.get("https://api.spoonacular.com/mealplanner/generate", {
            params: {
                timeFrame: "week",
                targetCalories: calories,
                diet: diet,
                apiKey: apiKey,
            },
        });
        const data = response.data;
        const dailyNutrients = {};
        const mealsToInsert = [];

        for(const [day,info] of Object.entries(data.week)) {
            dailyNutrients[day] = info.nutrients;

            info.meals.forEach((meal, index)=> {
                mealsToInsert.push({
                    day_of_week: day,
                    meal_type: ["breakfast", "lunch", "dinner"][index] || `meal${index + 1}`,
                    title: meal.title,
                    calories: parseFloat((info.nutrients.calories / 3).toFixed(2)),
                    source_url: meal.sourceUrl,
                    image_url: meal.image?.startsWith("http")
                        ? meal.image
                        : `https://spoonacular.com/recipeImages/${meal.image}`,
                    ready_in: meal.readyInMinutes,
                    servings: meal.servings,
                });
            });
        }

        for (const day of Object.keys(data.week)) {
            const snackResponse = await axios.get("https://api.spoonacular.com/recipes/complexSearch", {
                params: {
                    number: 6, 
                    maxCalories: 140,
                    minCalories: 120,
                    diet: diet || "vegetarian",
                    sort: "random",
                    addRecipeInformation: true,
                    apiKey,
                    nocache: Date.now(), 
                },
            });

            const allSnacks = snackResponse.data.results || [];
            const shuffled = allSnacks.sort(() => 0.5 - Math.random());
            const selectedSnacks = shuffled.slice(0, 3);

            for (let i = 0; i < selectedSnacks.length; i++) {
                const snack = selectedSnacks[i];
                mealsToInsert.push({
                    day_of_week: day,
                    meal_type: `snack${i + 1}`,
                    title: snack.title,
                    calories: 130,
                    source_url: snack.sourceUrl,
                    image_url: snack.image?.startsWith("http")
                        ? snack.image
                        : `https://spoonacular.com/recipeImages/${snack.image}`,
                    ready_in: snack.readyInMinutes || 10,
                    servings: snack.servings || 1,
                });
            }
        }
        await db.query(
            `DELETE FROM meal_plans WHERE user_email = $1`,
            [user_email]
        );
        const planResult = await db.query(
            `INSERT INTO meal_plans (user_email, daily_nutrients) 
            VALUES ($1, $2) RETURNING plan_id`,
            [user_email, dailyNutrients]
        );
        const plan_id = planResult.rows[0].plan_id;

        for (const meal of mealsToInsert) {
            await db.query(
                `INSERT INTO meal_plan_meals 
                (plan_id, user_email, day_of_week, meal_type, title, calories, source_url, image_url, ready_in, servings)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                plan_id,
                user_email,
                meal.day_of_week,
                meal.meal_type,
                meal.title,
                meal.calories,
                meal.source_url,
                meal.image_url,
                meal.ready_in,
                meal.servings,
                ]
            );
        }
        res.status(201).json({ message: "Meal plan stored successfully", plan_id });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong. Pls try again!" });
    }
});

app.get("/get-meal-plan", async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        const planResult = await db.query(
            `SELECT plan_id FROM meal_plans 
             WHERE user_email = $1 
             ORDER BY generated_at DESC 
             LIMIT 1`,
            [email]
        );

        if (planResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "No meal plan found for this user." });
        }

        const plan_id = planResult.rows[0].plan_id;
        const mealResult = await db.query(
            `SELECT day_of_week, meal_type, title, calories, source_url, image_url, ready_in, servings
             FROM meal_plan_meals 
             WHERE plan_id = $1 AND user_email = $2
             ORDER BY day_of_week, 
                      CASE 
                        WHEN meal_type = 'breakfast' THEN 1
                        WHEN meal_type = 'lunch' THEN 2
                        WHEN meal_type = 'dinner' THEN 3
                        WHEN meal_type = 'snack' THEN 4
                        ELSE 5
                      END`,
            [plan_id, email]
        );
        res.json({ success: true, meals: mealResult.rows });
    } catch (err) {
        console.error("Meal plan fetch error:", err);
        res.status(500).json({ success: false, message: "Server error. Could not fetch meal plan." });
    }
});

app.post("/meal-regenerate", async (req, res) => {
  const { user_email, dayOfWeek, mealType } = req.body;

  if (!user_email || !dayOfWeek || !mealType) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const prefResult = await db.query(
      "SELECT calories, dietary_preferences FROM users WHERE email = $1",
      [user_email]
    );
    if (prefResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const { calories, dietary_preferences } = prefResult.rows[0];
    const mealTypeLower = mealType.toLowerCase();
    const isSnack = mealTypeLower.startsWith("snack");

    let matchedMeal;

    if (isSnack) {
        const snackRes = await axios.get("https://api.spoonacular.com/recipes/complexSearch", {
            params: {
                number: 5, 
                minCalories: 100,
                maxCalories: 180,
                diet: dietary_preferences,
                sort: "random",
                addRecipeInformation: true,
                apiKey: process.env.SPOON_API,
                nocache: Date.now(), 
            }
        });

        const snacks = snackRes.data.results;
        if (snacks.length === 0) {
        return res.status(404).json({ error: "No snack found." });
        }

        matchedMeal = snacks[Math.floor(Math.random() * snacks.length)];

    } else {
      const mealRes = await axios.get("https://api.spoonacular.com/mealplanner/generate", {
        params: {
          timeFrame: "day",
          targetCalories: calories - 400,
          diet: dietary_preferences,
          apiKey: process.env.SPOON_API,
        },
      });

      const mealList = mealRes.data.meals;
      const mealTypeMap = {
        breakfast: 0,
        lunch: 1,
        dinner: 2,
      };

      const index = mealTypeMap[mealTypeLower];
      matchedMeal = mealList?.[index];

      if (!matchedMeal) {
        return res.status(404).json({ error: `No ${mealType} found.` });
      }
    }

    // Get full recipe info
    const recipeId = matchedMeal.id;
    const fullMeal = await axios.get(`https://api.spoonacular.com/recipes/${recipeId}/information`, {
      params: {
        includeNutrition: true,
        apiKey: process.env.SPOON_API,
      },
    });

    const recipe = fullMeal.data;
    const title = recipe.title;
    const caloriess = recipe.nutrition?.nutrients?.find((n) => n.name === "Calories")?.amount || 0;
    const source_url = recipe.sourceUrl;
    const image_url = recipe.image?.startsWith("http")
        ? recipe.image
        : `https://spoonacular.com/recipeImages/${recipe.image}`;
    const ready_in = recipe.readyInMinutes;
    const servings = recipe.servings || 1;

    // Update the right meal/snack
    const updateQuery = `
      UPDATE meal_plan_meals
      SET title = $1, calories = $2, source_url = $3, image_url = $4, ready_in = $5, servings = $6
      WHERE user_email = $7 AND day_of_week = $8 AND meal_type = $9
      RETURNING *;
    `;
    const values = [
      title,
      caloriess,
      source_url,
      image_url,
      ready_in,
      servings,
      user_email,
      dayOfWeek,
      mealTypeLower, // e.g., snack2
    ];

    const updatedMeal = await db.query(updateQuery, values);

    if (updatedMeal.rows.length === 0) {
      return res.status(404).json({ error: "Meal not found to update." });
    }

    res.json(updatedMeal.rows[0]);
  } catch (error) {
    console.error("Meal regeneration error:", error.message);
    res.status(500).json({ error: "Failed to regenerate meal." });
  }
});


app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie("connect.sid"); 
    res.json({ success: true, message: "Logged out" });
  });
});

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
