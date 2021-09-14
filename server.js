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
  try {
    let name = req.user.name.split(/[ ]+/);
    let firstName = name[0];
    let lastName = name[1];

    connection.query(
      `SELECT * FROM ticket WHERE passport_number = "${req.user.passport_number}"`,
      (err, results) => {
        if (err) {
          console.log(err);
          return;
        }

        if (results.length === 0) {
          req.flash(
            "info",
            "You have no tickets booked though! You may go to Home page to book some!"
          );
        }

        res.render("dashboard.ejs", {
          first_name: firstName,
          last_name: lastName,
          tickets: results.length === 0 || !results ? [] : results,
        });
      }
    );
  } catch (error) {
    // console.log(error);
    res.redirect("/admin");
  }
});

app.get("/flights", (req, res) => {
  connection.query(
    "SELECT * FROM flight ORDER BY airlines ASC",
    (err, results) => {
      if (err) {
        console.log(err);
        return;
      }

      res.render("flights.ejs", {
        domesticFlights: results.filter(
          (flight) => flight.flight_type === "Domestic"
        ),
        internationalFlights: results.filter(
          (flight) => flight.flight_type === "International"
        ),
      });
    }
  );
});

app.post("/flights", (req, res) => {
  let destination = req.body.sort_by_destination;

  if (destination === "") {
    res.redirect("/flights");
  } else {
    connection.query(
      `SELECT * FROM flight WHERE destination="${destination}" ORDER BY airlines ASC`,
      (err, results) => {
        if (err) {
          console.log(err);
          return;
        }

        res.render("flights.ejs", {
          domesticFlights: results.filter(
            (flight) => flight.flight_type === "Domestic"
          ),
          internationalFlights: results.filter(
            (flight) => flight.flight_type === "International"
          ),
        });
      }
    );
  }
});

app.get("/signup", checkNotAuthenticatedForUsers, (req, res) => {
  res.render("signup.ejs");
});

app.get("/login", checkNotAuthenticatedForUsers, (req, res) => {
  res.render("login.ejs");
});

app.get("/admin", checkAuthenticatedForAdmins, (req, res) => {
  connection.query(
    "SELECT user.name, ticket.* FROM user INNER JOIN ticket ON user.passport_number = ticket.passport_number",
    (err, results) => {
      if (err) {
        console.log(err);
        return;
      }

      res.render("admin.ejs", {
        admin_name: req.user.username,
        tickets: results.length === 0 || !results ? [] : results,
      });
    }
  );
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

app.post("/ticket", checkAuthenticatedForUsers, (req, res) => {
  const data = req.body.reserve.split(/[|]+/);

  const flight_id = data[0];
  const flight_no = data[1];
  const airlines = data[2];
  const departure_time = data[3];
  const arrival_time = data[4];
  const source = data[5];
  const destination = data[6];
  const route = data[7];
  const days_of_operation = data[8];

  let currentDate = new Date();
  let month = currentDate.getUTCMonth() + 1;
  let day = currentDate.getUTCDate();
  let year = currentDate.getUTCFullYear();
  let bookingDate = year + "-" + month + "-" + day;

  let seat_numbers = [
    "1A",
    "1B",
    "1C",
    "1D",
    "1E",
    "1F",
    "1G",
    "1H",
    "1I",
    "1J",
    "2A",
    "2B",
    "2C",
    "2D",
    "2E",
    "2F",
    "2G",
    "2H",
    "2I",
    "2J",
    "3A",
    "3B",
    "3C",
    "3D",
    "3E",
    "3F",
    "3G",
    "3H",
    "3I",
    "3J",
    "4A",
    "4B",
    "4C",
    "4D",
    "4E",
    "4F",
    "4G",
    "4H",
    "4I",
    "4J",
    "5A",
    "5B",
    "5C",
    "5D",
    "5E",
    "5F",
    "5G",
    "5H",
    "5I",
    "5J",
    "6A",
    "6B",
    "6C",
    "6D",
    "6E",
    "6F",
    "6G",
    "6H",
    "6I",
    "6J",
  ];

  const getRandomSeatNo = () => {
    return seat_numbers[Math.floor(Math.random() * seat_numbers.length)];
  };

  connection.query(
    `INSERT INTO ticket(ticket_id, flight_id, flight_no, airlines, passport_number, source, destination, departure_time, arrival_time, booking_date, seat_number) VALUES ('${uuid4()}', '${flight_id}', '${flight_no}','${airlines}','${
      req.user.passport_number
    }','${source}','${destination}', '${departure_time}', '${arrival_time}', '${bookingDate}','${getRandomSeatNo()}')`,
    (err, results) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          req.flash(
            "error",
            "You have already booked a ticket for this flight"
          );
          res.redirect("/dashboard");
          return;
        }
      }

      req.flash("success", "Ticket reserved successfully");
      res.redirect("/dashboard");
    }
  );
});

app.delete("/ticket/:id", checkAuthenticatedForUsers, (req, res) => {
  connection.query(
    `DELETE FROM ticket WHERE ticket_id='${req.params.id}'`,
    (err, results) => {
      if (err) {
        console.log(err);
        return;
      }

      req.flash("success", "Ticket cancelled successfully");
      res.redirect("/dashboard");
    }
  );
});

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
            req.flash("error", "Duplicate entry!");
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
