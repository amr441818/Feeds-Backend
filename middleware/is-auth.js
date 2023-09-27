const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authorToken = req.get("Authorization");
  if (!authorToken) {
    const error = new Error("could not authorization!!!");
    error.statusCode = 401;
    throw error;
  }
  let decodedToken;
  const token = authorToken.split(" ")[1];

  try {
    decodedToken = jwt.verify(token, "veryimportantsecretsomesecret");
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error("Not Authentecated!");
    error.statusCode = 401;
    throw error;
  }
  req.userId = decodedToken.userId;
  next();
};
