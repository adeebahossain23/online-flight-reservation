const LocalStrategy = require("passport-local").Strategy;

const initializePassport = (passport, connection) => {
  const authenticateUser = (email, password, done) => {
    connection.query(
      `SELECT * FROM user WHERE email="${email}"`,
      (err, results) => {
        if (err) {
          console.log(err);
          return;
        }

        if (results.length === 0) {
          return done(null, false, {
            message: "Oops! No user with that email!",
          });
        }

        const user = results[0];

        try {
          if (user.password !== password) {
            return done(null, false, { message: "Oops! Wrong password!" });
          } else {
            return done(null, user);
          }
        } catch (e) {
          return done(e);
        }
      }
    );
  };

  const authenticateAdmin = (email, password, done) => {
    connection.query(
      `SELECT * FROM admin WHERE email="${email}"`,
      (err, results) => {
        if (err) {
          console.log(err);
          return;
        }

        if (results.length === 0) {
          return done(null, false, {
            message: "Oops! No admin with that email!",
          });
        }

        const admin = results[0];

        try {
          if (admin.password !== password) {
            return done(null, false, { message: "Oops! Wrong password!" });
          } else {
            return done(null, admin);
          }
        } catch (e) {
          return done(e);
        }
      }
    );
  };

  const userLocalStrategy = new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    authenticateUser
  );

  const adminLocalStrategy = new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    authenticateAdmin
  );

  passport.use("user-local", userLocalStrategy);
  passport.use("admin-local", adminLocalStrategy);

  const entitySerialize = (entity, done) => {
    done(null, entity.id);
  };

  const entityDeserialize = (id, done) => {
    connection.query(`SELECT * FROM user WHERE id="${id}"`, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }

      if (results.length === 0) {
        connection.query(
          `SELECT * FROM admin WHERE id="${id}"`,
          (err, results) => {
            if (err) {
              console.log(err);
              return;
            }

            if (results.length === 0) {
              return done(null, false, {
                message: "Oops! No entity with that id!",
              });
            }

            const admin = results[0];

            try {
              done(null, admin);
            } catch (e) {
              done(e);
            }
          }
        );
      } else {
        const user = results[0];

        try {
          done(null, user);
        } catch (e) {
          done(e);
        }
      }
    });
  };

  passport.serializeUser(entitySerialize);
  passport.deserializeUser(entityDeserialize);
};

module.exports = initializePassport;
