const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const helmet = require("helmet");
const dotenv = require("dotenv");
// const MONGODB_URI =
//   "mongodb+srv://amrsalah1999:amr1999@cluster0.doapyuu.mongodb.net/messages";
// "mongodb+srv://amrsalrequireah1999:amr1999@cluster0.doapyuu.mongodb.net/messages";

// multer configration
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + "-" + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const app = express();

const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");
const compression = require("compression");
dotenv.config();
// app.use(bodyParser.urlencoded()) // for forms not json
app.use(bodyParser.json());
app.use("/images", express.static(path.join(__dirname, "images")));
// some headers for cors errors

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use(helmet());
app.use(compression());
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);
app.use("/", (req, res, next) => {
  res.send("App is running");
  next();
});

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(`${process.env.MONGODB_URI}`)
  .then((result) => {
    const server = app.listen(process.env.PORT || 8080);
    const io = require("./socket").init(server, {
      cors: {
        origin: (origin, callback) => {
          // Replace "http://localhost:3000" with the server's origin from the request headers
          const serverOrigin = origin;
          callback(null, serverOrigin);
        },
        // "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });
    io.on("connection", (socket) => {
      console.log("connected!!!!!");
    });
  })
  .catch((err) => console.log(err.message));
