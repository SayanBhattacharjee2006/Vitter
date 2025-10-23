import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { application } from "express";

const createPlaylist = asyncHandler(async (req, res) => {
  const name = req.body?.name?.trim();
  const description = req.body?.description?.trim();
  const user = req.user;
  //TODO: create playlist

  //get the owner from req.user as user must be authenticated already
  //check the name and description field is given or not
  //then create a new playlist object using create
  //check is playlist created or not
  //return the user response

  if (!name || !description) {
    throw new ApiError(400, "name and description are required !");
  }

  const newPlaylist = await Playlist.create({
    name: name,
    description,
    owner: user._id,
  });

  if (!newPlaylist) {
    throw new ApiError(
      500,
      "Something went wrong while creating new playlist!"
    );
  }

  const playlist = await Playlist.findById(newPlaylist._id).select(
    "name description createdAt owner"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "new playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  //TODO: get user playlists

  // get the user id from params
  // check is the id is a valid mongoose ObjectId
  // now using aggregation pipeline match the user's id with the owner id

  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id ");
  }

  const ownerDetails = await User.findById(userId).select(
    "username fullName avatar"
  );

  if (!ownerDetails) {
    throw new ApiError(400, "user not found");
  }

  const allPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        videos: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!allPlaylists.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "user does not have any playlist"));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        playlists: allPlaylists,
        owner: ownerDetails,
        totalPlaylists: allPlaylists.length,
      },
      "All playlist of the user fetched successfully"
    )
  );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  //TODO: get playlist by id
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
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
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              title: 1,
              thumbnail: 1,
              duration: 1,
              views: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
  ]);

  if (!playlist.length) {
    throw new ApiError(500, "No playlist found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist successfully fetched "));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  // Extract playlistId and videoId from req.params.
  // Validate both with isValidObjectId.
  // Verify playlist exists and belongs to the logged-in user.
  // Verify video exists.
  // Check if the video is already in the playlist.
  // If not, push it into the playlist’s videos array.
  // Save and return updated playlist info.

  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlistId");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid Video id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "User not authorized to change the playlist");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in this playlist");
  }

  playlist.videos.push(videoId);
  await playlist.save();

  const updatedPlaylist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              _id: 1,
              thumbnail: 1,
              videoFile: 1,
              title: 1,
              views: 1,
              duration: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        videos: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist[0],
        "Video added to the playlist successfully"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlistId");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid Video id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "User not authorized to change the playlist");
  }

  const videoExists = await Video.exists({ _id: videoId });
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  if (!playlist.videos.some((vId) => vId.toString() === videoId)) {
    throw new ApiError(404, "Video does not exist in this playlist");
  }

  const newVideos = playlist.videos.filter((vId) => vId.toString() !== videoId);
  playlist.videos = newVideos;
  await playlist.save();

  const updatedPlaylist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              _id: 1,
              thumbnail: 1,
              videoFile: 1,
              title: 1,
              views: 1,
              duration: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        videos: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!updatedPlaylist.length) {
    throw new ApiError(404, "Updated playlist not found after removal");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist[0],
        "Video deleted from playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id ");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404,"playlist not found ");
  }

  if(playlist.owner.toString()!==req.user._id.toString()){
    throw new ApiError(403,"Unauthorized user to change this")
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, [], "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {

  //TODO: update playlist

  // check is data updated or not 
  
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if(!isValidObjectId(playlistId)){
    throw new ApiError(400, "invalid playlist id ")
  }

  if(!name && !description){
    throw new ApiError(400, "either of name or description required")
  }

  const playlist = await Playlist.findById(playlistId)

  if(!playlist){
    throw new ApiError(404, "Playlist not found")
  }
  
  if(playlist.owner.toString()!==req.user._id.toString()){
    throw new ApiError(403, "user is not authorized to change the playlist ")
  }

  const updateOptions = {}
  if(name) updateOptions.name = name
  if(description) updateOptions.description = description

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $set:{...updateOptions} },
    { new:true }
  )

  if(!updatedPlaylist){
    throw new ApiError(500,"something went wrong while updating the playlist")
  }


  return res
  .status(200)
  .json(
    new ApiResponse(
      200,
      updatedPlaylist,
      "Playlist updated successfully"
    )
  )


});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
