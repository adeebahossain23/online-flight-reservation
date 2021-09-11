const express = require("express");
const app = express();
const path = require("path");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const uuid4 = require("uuid4");
const methodOverride = require("method-override");
const initializePassport = require("./passportConfig");

require("dotenv").config();

app.use(express.static(path.join(__dirname, "/public")));
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride("_method"));

app.set("view engine", "ejs");

console.clear();

const connection = mysql.createConnection({
  host: `${process.env.MYSQL_DB_HOST}`,
  user: process.env.MYSQL_DB_USER,
  database: process.env.MYSQL_DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log("Connected to database");
});

initializePassport(passport, connection);

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/dashboard", checkAuthenticatedForUsers, (req, res) => {
  res.render("dashboard.ejs", { name: req.user.name });
});

app.get("/signup", checkNotAuthenticatedForUsers, (req, res) => {
  res.render("signup.ejs");
});

app.get("/login", checkNotAuthenticatedForUsers, (req, res) => {
  res.render("login.ejs");
});

app.get("/admin", checkAuthenticatedForAdmins, (req, res) => {
  res.render("admin.ejs", { admin_name: req.user.username });
});

app.get("/admin_login", checkNotAuthenticatedForAdmins, (req, res) => {
  res.render("admin_login.ejs");
});

app.post(
  "/login",
  checkNotAuthenticatedForUsers,
  passport.authenticate("user-local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.post(
  "/admin_login",
  checkNotAuthenticatedForAdmins,
  passport.authenticate("admin-local", {
    successRedirect: "/admin",
    failureRedirect: "/admin_login",
    failureFlash: true,
  })
);

app.post("/signup", checkNotAuthenticatedForUsers, (req, res) => {
  const {
    full_name,
    phone_number,
    passport_number,
    email,
    password,
    confirm_password,
  } = req.body;

  // res.send(req.body);

  if (password !== confirm_password) {
    req.flash("error", "Passwords do not match!");
    res.status("400").redirect(301, "/signup");
    return;
  } else {
    connection.query(
      `INSERT INTO user (id, name, passport_number, phone_number, email, password) VALUES ("${uuid4()}", "${full_name}", "${passport_number}", "${phone_number}", "${email}", "${password}")`,
      (err, results) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            console.log("Duplicate entry");
            req.flash("error", "Duplicate entry");
            res.status(400).redirect(301, "/signup");
            return;
          }
        } else {
          req.flash("success", "You are registered! Now login...");
          res.status(200).redirect(301, "/login");
        }
      }
    );
  }
});

app.delete("/logout", (req, res) => {
  req.logOut();
  req.flash("success", "You are logged out!");
  res.redirect("/login");
});

app.delete("/admin_logout", (req, res) => {
  req.logOut();
  req.flash("success", "You are logged out!");
  res.redirect("/admin_login");
});

function checkAuthenticatedForUsers(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

function checkAuthenticatedForAdmins(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/admin_login");
}

function checkNotAuthenticatedForUsers(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }

  next();
}

function checkNotAuthenticatedForAdmins(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/admin");
  }

  next();
}

app.listen(process.env.SERVER_PORT, () => {
  console.log(
    `My server is running on port ${process.env.SERVER_PORT}! Ready to do some fun!?`
  );
});
