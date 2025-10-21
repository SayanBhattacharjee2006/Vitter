import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"



const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID")
}

    const isVideoExists = await Video.findById(videoId)

    if(!isVideoExists) {
        throw new ApiError(404, "Video not found")
    }

    const pageNumber = parseInt(page)
    const limitNumber = parseInt(limit)
    const skip = (pageNumber - 1) * limitNumber;


    const comments = await  Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
            //fetches all comments for the given video
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup:{
                from: "likes",
                localField: "id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                },
                likesCount: {
                    $size:"$likes"
                }
            }
        },
        {
            $project:{
                content:1,
                createdAt:1,
                "owner.username":1,
                "owner.avatar":1,
                likesCount:1
            }
        },
        {
            $sort:{
                likesCount:-1
            }
        },
        {
            $skip:skip, // skips the specified number of documents
        },
        {
            $limit: limitNumber // limits the number of documents to the specified number
        }
    ])

    if(!comments.length) {
        throw new ApiError(404, "No comments found for this video")
    }

    const totalComments = await Comment.countDocuments({video: new mongoose.Types.ObjectId(videoId)  })
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {comments,totalComments},
            "Comments fetched successfully"
        )
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    //get the user from req.user
    //get the video from req.params
    //get the comment details from req.body
    //check if all required fields are present
    //check if video is valid
    //create a new comment
    //check if comment created successfully
    //return success message and comment details using ApiResponce

    const user = req.user;

    if(!user) {
        throw new ApiError(401, "User not authenticated")
    }

    const {videoId} = req.params
    const {content} = req.body
    
    if(!content) {
        throw new ApiError(400, "Comment content is required")
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const isVideoExists = await Video.findById(videoId)

    if(!isVideoExists) {
        throw new ApiError(404, "Video not found")
    }

    const newComment = await Comment.create({
        content,
        owner: user._id,
        video: videoId
    })

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            {comment: newComment},
            "Comment added successfully"
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    // get the user from req.user
    // get the comment from req.params
    // get the updated comment details from req.body
    // check if user is the owner of the comment
    // update the comment details
    // check if comment updated successfully
    // return success message using ApiResponce

    const user = req.user;

    if(!user) {
        throw new ApiError(401, "User not authenticated")
    }

    const {commentId} = req.params
    const {content} = req.body

    if(!content || !content.trim()) {
        throw new ApiError(400, "Comment content is required")
    }

    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId)

    if(!comment ) {
        throw new ApiError(404, "Comment not found or not owned by the user")
    }
    if(comment.owner.toString() !== user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content
            }
        },
        {
            new: true
        }
    )

    if(!updatedComment) {
        throw new ApiError(500, "Failed to update the comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {comment: updatedComment},
            "Comment updated successfully"
        )
    )
 
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    //get the user from req.user and the commentId from params 
    //check is user is the owner of the comment
    //delete the comment
    //check if comment deleted successfully
    //return success message using ApiResponce

    const user = req.user;

    if(!user){
        throw new ApiError(401, "User not authenticated")
    }

    const {commentId} = req.params

    if(!commentId){
        throw new ApiError(400, "Comment ID is required")
    }

    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId)

    if(!comment) {
        throw new ApiError(404, "Comment not found or not owned by the user")
    }

    if(comment.owner.toString() !== user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    await Comment.findByIdAndDelete(commentId)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        )
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }