import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/likes.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    // get the user from req.user
    // get the video from req.params
    // check if videoId is valid
    // find the like document for the current user and video using findOne
    // if like document exists, delete it
    // else, create a new like document with the current user and video ids
    // save the like document

    const user = req.user

    if (!user) {
        throw new ApiError(401, "User is not authenticated")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const isVideoExist = await Video.findById(videoId)

    if (!isVideoExist) {
        throw new ApiError(404, "Video not found")
    }

    const isAlreadyLiked = await Like.findOne({
        video: videoId,
        likedBy: user._id,
    })

    if(isAlreadyLiked){
        await Like.findByIdAndDelete(isAlreadyLiked._id)
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Like removed successfully"
            )
        )
    }

    const newLike = await Like.create({
        video: videoId,
        likedBy: user._id,
    })

    if(newLike){
        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {},
                "Like added successfully"
            )
        )
    }

    throw new ApiError(500, "Failed to toggle like")
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

    // get the user from req.user
    // get the comment from req.params
    // check if commentId is valid
    // find the like document for the current user and comment using findOne
    // if like document exists, delete it
    // else, create a new like document with the current user and comment ids
    // save the like document

    const user = req.user

    if (!user) {
        throw new ApiError(401, "User is not authenticated")
    }

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }

    const isCommentExist = await Comment.findById(commentId)

    if (!isCommentExist) {
        throw new ApiError(404, "Comment not found")
    }

    const isAlreadyLiked = await Like.findOne({
        comment: commentId,
        likedBy: user._id,
    })

    if(isAlreadyLiked){
        await Like.findByIdAndDelete(isAlreadyLiked._id)
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Like removed successfully"
            )
        )
    }

    const newLike = await Like.create({
        comment: commentId,
        likedBy: user._id,
    })

    if(newLike){
        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {},
                "Like added successfully"
            )
        )
    }

    throw new ApiError(500, "Failed to toggle like")
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    const user = req.user

    if (!user) {
        throw new ApiError(401, "User is not authenticated")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID")
    }

    const isTweetExist = await Video.findById(tweetId)

    if (!isTweetExist) {
        throw new ApiError(404, "Tweet not found")
    }

    const isAlreadyLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: user._id,
    })

    if(isAlreadyLiked){
        await Like.findByIdAndDelete(isAlreadyLiked._id)
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Like removed successfully"
            )
        )
    }

    const newLike = await Like.create({
        tweet: tweetId,
        likedBy: user._id,
    })

    if(newLike){
        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {},
                "Like added successfully"
            )
        )
    }

    throw new ApiError(500, "Failed to toggle like")
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    // get the user from req.user
    // find all the like documents for the current user
    // find the video documents associated with the like documents
    // return the videos

    const user = req.user

    if (!user) {
        throw new ApiError(401, "User is not authenticated")
    }

    const likedVideos  = await Like.aggregate([
        {
            $match: {
                likedBy: user._id,
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1,
                                        FullName: 1
                                    }
                                },
                            ]
                        }
                    },
                    {
                        $addFields:{
                        owner:{
                            $first: "$owner"
                            }
                        }  
                    },
                    {
                        $project: {
                            videoFile:1,
                            title:1,
                            description:1,
                            duration:1,
                            thumbnail:1,
                            createdAt:1,
                            views:1,
                            isPublished:1,
                            owner:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                video:{
                    $first: "$video"
                }
            }
        },
        {
            $replaceRoot: {
                newRoot: "$video"
            }
        }
    ])

    
    if(!likedVideos.length){
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                [],
                "No liked videos found"
            )
        )
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            likedVideos,
            "Liked videos fetched successfully"
        )
    )
    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}