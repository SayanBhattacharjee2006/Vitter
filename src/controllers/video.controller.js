import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { updateAccountDetails } from "./user.controller.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const { title, description} = req.body
    const user = req.user

    if(!title || !description ){
        throw new ApiError(400,"Title and description required")
    }

    if(title.length>30){
        throw new ApiError(400,"Title must be within 30 characters")
    }

    if(description.length>1000){
        throw new ApiError(400,"Description must be within 1000 characters")
    }

    const videoFilePath = req.files?.videoFile?.[0]?.path
    const thumbnailPath = req.files?.thumbnail?.[0]?.path

    if(!videoFilePath){
        throw new ApiError(400,"video file is required")
    }

    if(!thumbnailPath){
        throw new ApiError(400,"thumbnail file is required")
    }
    
    const uploadedVideo = await uploadOnCloudinary(videoFilePath,"video")
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailPath,"image")
    
    if(!uploadedVideo?.url){
        throw new ApiError(500,"Something went wrong while uploading video to cloudinary")
    }

    if(!uploadedThumbnail?.url){
        throw new ApiError(500,"Something went wrong while uploading thumbnail to cloudinary")
    }
 

    const newPublishedVideo = await Video.create({
        videoFile:uploadedVideo.url,
        thumbnail:uploadedThumbnail.url,
        title,
        description,
        owner:user._id,
        duration:uploadedVideo.duration,
        isPublished:true
    })

    if(!newPublishedVideo){
        throw new ApiError(500,"Something went wrong while publishing video ")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            newPublishedVideo,
            "Video successfully published"
        )
    )

})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video Id ")
    }

    const video = await Video.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        }
    ])

    if(!video.length){
        throw new ApiError(404,"Video not found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video[0],
            "Video successfully fetched"
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}