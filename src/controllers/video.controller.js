import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { updateAccountDetails } from "./user.controller.js";

const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

    // Convert to integers
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    const skip = (page - 1) * limit;

    // Build filter conditions
    const filter = { isPublished: true }; // only show published videos

    if (query && query.trim() !== "") {
        filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }

    if (userId) {
        filter.owner = userId;
    }

    // Sort setup
    const sortOptions = {};
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

    // Fetch videos
    const videos = await Video.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("owner", "username avatar");

    // Count total documents for pagination
    const totalVideos = await Video.countDocuments(filter);
    const totalPages = Math.ceil(totalVideos / limit);

    // Response
    return res.status(200).json(
        new ApiResponse(200, {
            videos,
            pagination: {
                totalVideos,
                totalPages,
                currentPage: page,
                limit
            }
        }, "Videos fetched successfully")
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const { title, description } = req.body;
  const user = req.user;

  if (!title || !description) {
    throw new ApiError(400, "Title and description required");
  }

  if (title.length > 30) {
    throw new ApiError(400, "Title must be within 30 characters");
  }

  if (description.length > 1000) {
    throw new ApiError(400, "Description must be within 1000 characters");
  }

  const videoFilePath = req.files?.videoFile?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFilePath) {
    throw new ApiError(400, "video file is required");
  }

  if (!thumbnailPath) {
    throw new ApiError(400, "thumbnail file is required");
  }

  const uploadedVideo = await uploadOnCloudinary(videoFilePath, "video");
  const uploadedThumbnail = await uploadOnCloudinary(thumbnailPath, "image");

  if (!uploadedVideo?.url) {
    throw new ApiError(
      500,
      "Something went wrong while uploading video to cloudinary"
    );
  }

  if (!uploadedThumbnail?.url) {
    throw new ApiError(
      500,
      "Something went wrong while uploading thumbnail to cloudinary"
    );
  }

  const newPublishedVideo = await Video.create({
    videoFile: uploadedVideo.url,
    thumbnail: uploadedThumbnail.url,
    thumbnailPublicId: uploadedThumbnail.public_id,
    videoPublicId: uploadedVideo.public_id,
    title,
    description,
    owner: user._id,
    duration: Math.round(uploadedVideo.duration),
    isPublished: true,
  });

  if (!newPublishedVideo) {
    throw new ApiError(500, "Something went wrong while publishing video ");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, newPublishedVideo, "Video successfully published")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id ");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video successfully fetched"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail

  // get the video from req.params
  // get the video details from req.body
  // check if videoId is valid
  // check if video exists
  // check if user is the owner of the video
  // delete the previous thumbnail from cloudinary
  // upload the new thumbnail to cloudinary
  // update the video details using update as {title,description,thumbnail}
  // save the video as {new:true}
  // return success message

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id ");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "User not authorized to change this video");
  }

  if (video.thumbnailPublicId) {
    await deleteFromCloudinary(video.thumbnailPublicId);
  }

  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!thumbnailPath) {
    throw new ApiError(400, "thumbnail file is required");
  }

  const uploadedThumbnail = await uploadOnCloudinary(thumbnailPath, "image");

  if (!uploadedThumbnail?.url) {
    throw new ApiError(
      500,
      "Something went wrong while uploading thumbnail to cloudinary"
    );
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      title: req.body.title,
      description: req.body.description,
      thumbnail: uploadedThumbnail.url,
      thumbnailPublicId: uploadedThumbnail.public_id,
    },
    {
      new: true,
    }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video successfully updated"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id ");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "User not authorized to delete this video");
  }

  await video.deleteOne();

  await cloudinary.uploader.destroy(video.videoPublicId);
  await cloudinary.uploader.destroy(video.thumbnailPublicId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  //TODO: toggle video publish status

  //first get the videoId from req.params
  //then get the video from videoId
  //check the user is the owner of the video
  //then toggle the isPublished field using update as {isPublished:!video.isPublished}
  //then save the video as {new:true}
  //then return success message

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id ");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "User not authorized to change this video");
  }

  video.isPublished = !video.isPublished;

  const updatedVideo = await video.save({ new: true });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        "Video publish status changed successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
