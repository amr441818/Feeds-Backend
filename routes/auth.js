const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const { body } = require("express-validator");
const User = require("../models/user");
router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("please enter a valid email")
      .custom((value, { req }) => {
        return User.findOne({ email: value })
          .then((userEmail) => {
            if (userEmail) {
              return Promise.reject("E-mail address alredy exist!");
            }
          })
          .catch((err) => {
            if (!err.statusCode) {
              err.statusCode = 500;
            }
            next(err);
          });
      })
      .normalizeEmail(),
    body("password").trim().isLength({ min: 5 }),
    body("name").trim().not().isEmpty(),
  ],
  authController.signup
);
router.post("/login", authController.login);

module.exports = router;
