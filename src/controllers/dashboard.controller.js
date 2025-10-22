import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/likes.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import User from "../models/user.model.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const user = req.user

    if (!user) {
        throw new ApiError(401, "User is not authenticated")
    }

    const channelStats = await User.aggregate([
        {
            $match:{
                _id : user._id,
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"_id",
                foreignField:"owner",
                as:"videos",
                pipeline:[
                    {
                        $lookup:{
                            from:"likes",
                            localField:"_id",
                            foreignField:"video",
                            as:"likes"
                        }
                    },
                    {
                        $addFields:{
                            likeCount:{
                                $size:"$likes"
                            }
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $addFields:{
                videoCount:{
                    $size:"$videos"
                },
                subscriberCount:{
                    $size:"$subscribers"
                },
                totalLikes:{
                    $ifNull:[
                        {
                            $sum:"$videos.likeCount"
                        },
                        0
                    ]
                },
                totalViews:{
                    $ifNull:[
                        {
                            $sum:"$videos.views"
                        },
                        0
                    ]
                },
            }
        },
        {
            $project:{
                videoCount:1,
                subscriberCount:1,
                totalLikes:1,
                totalViews:1
            }
        }
    ])

    if(!channelStats.length){
        throw new ApiError(404, "User not found")
    }

    return res
       .status(200)
       .json(
        new ApiResponse(
            200,
            channelStats[0],
            "Channel stats fetched successfully"
        )
       )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const user = req.user

    if(!user){
        throw new ApiError(401, "User is not authenticated")
    }

    const allVideos = await User.aggregate([
        {
            $match:{
                _id:user._id,
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"_id",
                foreignField:"owner",
                as:"videos",
                pipeline:[
                    {
                        $lookup:{
                            from:"likes",
                            localField:"_id",
                            foreignField:"video",
                            as:"likes"
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
                            likeCount:{
                                $size:"$likes"
                            },
                            owner:{
                                $first:"$owner"
                            }
                        }
                    },
                    {
                        $sort:{
                            createdAt:-1
                        }
                    },
                    {
                        $project:{
                            videoFile:1,
                            createdAt:1,
                            title:1,
                            views:1,
                            likeCount:1,
                            owner:1,
                            duration:1,
                            thumbnail:1,
                            isPublished:1
                        }
                    }
                ]
            }
        },
        {
            $project:{
                videos:1
            }
        }
    ])

    if(!allVideos.length){
        //here user present but no videos uploaded
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                [],
                "No videos found for this channel"
            )
        )
    }

    const allUserVideos = allVideos[0].videos
    //now allVideos array is available

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            allUserVideos,
            "Channel videos fetched successfully"
        )
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }