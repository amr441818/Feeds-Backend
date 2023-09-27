const Post = require("../models/post");
const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const io = require("../socket");
exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  try {
    const totalCount = await Post.find().countDocuments();
    totalItems = totalCount;
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "posts fetched!",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("validation faild , enterd data is incorrect");
    error.statusCode = 442;
    throw error;

    // return res.status(442).json({
    //   message: "validation faild , enterd data is incorrect",
    //   errors: errors.array(),
    // });
  }
  if (!req.file) {
    const error = new Error("no image provided!");
    error.statusCode = 442;
    throw error;
  }
  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;

  const post = new Post({
    title: title,
    imageUrl: imageUrl,
    content: content,
    creator: req.userId,
  });

  try {
    await post.save();

    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();
    // send Data through socket io

    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });
    // status 201 for succses but for succses create resourse in server
    res.status(201).json({
      message: "creating succsess!!!!",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSinglePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("post not found");
      error.statusCode = 404;
      // in this then bolck we use thrw insted next() because it will reach cathc auto
      throw error;
    }
    res.status(200).json({ message: "post fetched!", post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("validation faild , enterd data is incorrect");
    error.statusCode = 442;
    throw error;
  }
  const updatedTitle = req.body.title;
  const updatedContent = req.body.content;
  let updatedImageUrl = req.body.image;
  if (req.file) {
    updatedImageUrl = req.file.path.replace("\\", "/");
  }

  if (!updatedImageUrl) {
    const error = new Error("no file packed!!");
    error.statusCode = 422;
    throw error;
  }
  try {
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("post not found!!");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not Authoraized!!");
      // 403 un authorizd
      error.statusCode = 403;
      throw error;
    }
    if (updatedImageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = updatedTitle;
    post.content = updatedContent;
    post.imageUrl = updatedImageUrl;
    const result = await post.save();
    io.getIO().emit("posts", { action: "update", post: result });
    res.status(200).json({ message: "post updated!!", post: result });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  const post = await Post.findById(postId);
  try {
    if (!post) {
      const error = new Error("post not found!!");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not Authoraized!!");
      // 403 un authorizd
      error.statusCode = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);

    const user = await User.findById(req.userId);

    user.posts.pull(postId);
    await user.save();
    io.getIO().emit("posts", { action: "delete", post: postId });
    res.status(200).json({ message: "post deleted!!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error("not Authentecaion!");
        error.statusCode = 401;
        throw error;
      }
      res.status(200).json({ status: user.status });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
exports.updateStatus = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("status must not be empty!!");
    error.statusCode = 442;
    throw error;
  }
  const status = req.body.status;

  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error("not Authentecaion!");
        error.statusCode = 401;
        throw error;
      }
      user.status = status;
      return user.save();
    })
    .then((result) => {
      res
        .status(201)
        .json({ message: "status updated!", status: result.status });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
