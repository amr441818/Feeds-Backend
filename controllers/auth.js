const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
exports.signup = (req, res, next) => {
  //validation result
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("validation faild!!");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  bcrypt
    .hash(password, 12)
    .then((hashPass) => {
      const user = new User({
        email: email,
        password: hashPass,
        name: name,
      });
      return user.save();
    })
    .then((result) => {
      res.status(201).json({ message: "User Created!!", userId: result._id });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  let loadedUser;
  User.findOne({ email: email })
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("user not found!");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = userDoc;
      return bcrypt.compare(password, userDoc.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("password wrong!!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        { email: loadedUser.email, userId: loadedUser._id.toString() },
        "veryimportantsecretsomesecret",
        { expiresIn: "1h" }
      );
      res.json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
