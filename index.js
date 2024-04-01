const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const dbName = "HeliverseDB";

// Connect to MongoDB using Mongoose
mongoose
  .connect(
    `mongodb+srv://${username}:${password}@cluster0.kysojnx.mongodb.net/${dbName}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Define Mongoose schema
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String },
  email: { type: String, required: true },
  gender: { type: String, enum: ["Male", "Female"], required: true },
  avatar: { type: String, required: true },
  domain: { type: String, required: true },
  available: { type: Boolean, required: true },
});
//
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: { type: Array, required: true },
});

// Create Mongoose model
const User = mongoose.model("User", userSchema, "Users");
const teams = mongoose.model("Team", teamSchema, "Teams");

// To Get All directory
app.get("/", (req, res) => {
  const routes = [
    { path: "/", operation: "GET", description: "Home page" },
    { path: "/allUsers", operation: "GET", description: "Get all users" },
    { path: "/users", operation: "GET", description: "Get paginated users" },
    { path: "/users/:id", operation: "GET", description: "Get a user by ID" },
    { path: "/addUser", operation: "POST", description: "Create a new user" },
    {
      path: "/deleteUser/:id",
      operation: "DELETE",
      description: "Delete a user",
    },
    { path: "/updateUser/:id", operation: "PUT", description: "Update a user" },
    { path: "/addTeam", operation: "POST", description: "Create a new team" },
    { path: "/allTeams", operation: "GET", description: "Get all teams" },
    {
      path: "/deleteTeam/:id",
      operation: "DELETE",
      description: "Delete a team",
    },
  ];

  let html = `
    <html>
      <head>
        <title>API Directory</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0 20px;
            background-color: #f4f4f4;
          }
          h1 {
            background-color: #333;
            color: #fff;
            padding: 10px;
            text-align: center;
          }
          ul {
            list-style-type: none;
            padding: 0;
          }
          li {
            background-color: #fff;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          }
          li strong {
            color: #333;
          }
        </style>
      </head>
      <body>
        <h1>API Directory</h1>
        <ul>`;

  routes.forEach((route) => {
    html += `<li><strong>${route.path}</strong> - ${route.operation}: ${route.description}</li>`;
  });

  html += `
        </ul>
      </body>
    </html>`;

  res.send(html);
});

app.get("/allUsers", async (req, res) => {
  try {
    const allUsers = await User.find({});
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/users", async (req, res) => {
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  let page = parseInt(req.query.page) || DEFAULT_PAGE;
  let limit = parseInt(req.query.limit) || DEFAULT_LIMIT;

  try {
    const totalUsers = await User.countDocuments({});
    const totalPages = Math.ceil(totalUsers / limit);

    // Adjust page to ensure it's within the valid range
    page = Math.max(1, Math.min(page, totalPages));

    const users = await User.find({})
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
//  get single user by id
app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: id };

  try {
    const user = await User.findOne(query);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({
        error: "User not found",
      });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Create a new user
app.post("/addUser", async (req, res) => {
  try {
    const { email } = req.body;
    const allUsers = await User.find({});
    const existingUser = await User.findOne({ email });

    const newUser = {
      id: allUsers[allUsers.length - 1].id + 1,
      ...req.body,
    };

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const addedUser = await User.create(newUser);

    res.status(201).json({
      message: "User added successfully",
      user: addedUser,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ error: "Internal server error", statusCode: 500 });
  }
});

// DELETE User

app.delete("/deleteUser/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: id };

  try {
    const user = await User.deleteOne(query);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({
        error: "User not found",
      });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Update User
app.put("/updateUser/:id", async (req, res) => {
  const updatedUser = req.body;
  const id = req.params.id;
  const query = { _id: id };
  const user = await User.findOne(query);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  try {
    const updated = await User.updateOne(query, { $set: updatedUser });
    res.json({ message: "User updated successfully", statusCode: 200 });
  } catch {}
});

// Create new Team
app.post("/addTeam", async (req, res) => {
  try {
    const { name } = req.body;
    const existingTeam = await teams.findOne({ name });

    const newTeam = req.body;

    if (existingTeam) {
      return res
        .status(400)
        .json({ message: "Team with this Name already exists" });
    }

    const addedTeam = await teams.create(newTeam);

    res.status(201).json({
      message: "Team added successfully",
      user: addedTeam,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error adding Team:", error);
    res.status(500).json({ error: "Internal server error", statusCode: 500 });
  }
});

// Get all Teams
app.get("/allTeams", async (req, res) => {
  try {
    const allTeams = await teams.find({});
    res.json(allTeams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Delete Team
app.delete("/deleteTeam/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: id };

  try {
    const team = await teams.deleteOne(query);
    if (team) {
      res.json(team);
    } else {
      res.status(404).json({
        error: "Team not found",
      });
    }
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
