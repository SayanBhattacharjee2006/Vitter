import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet

  const { content } = req.body;
  const user = req.user;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Content required ");
  }

  const newTweet = await Tweet.create({
    owner: user._id,
    content: content,
  });

  if (!newTweet) {
    throw new ApiError(500, "something went wrong while creating new tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newTweet, "New Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets

  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id ");
  }

  const userAllTweets = await Tweet.find({ owner: userId }).sort({
    createdAt: -1,
  });

  if (!userAllTweets.length) {
    return res.status(200).json(new ApiResponse(200, [], "user has no tweet"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userAllTweets,
        "All tweets by users fetched successfully"
      )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet

  const { content } = req.body;
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet id");
  }

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "user unauthorised to update the tweet");
  }

  tweet.content = content;
  await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet

  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet id");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "user unauthorised to delete the tweet");
  }

  await tweet.deleteOne()

  return res
    .status(200)
    .json(new ApiResponse(200, [] , "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
