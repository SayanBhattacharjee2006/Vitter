import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel id")
    }

    if(channelId.toString() === req.user._id.toString()){
        throw new ApiError(400,"user not allowed to subscribe own channel")
    }
    
    const isChannelExistAsUser = await User.findById(channelId)

    if(!isChannelExistAsUser){
        throw new ApiError(404,"Channel does not exist as a user ")
    }

    const isUserAlreadyASub = await Subscription.findOne(
        {
            subscriber:req.user._id,
            channel:channelId
        }
    )

    if(isUserAlreadyASub){
        await isUserAlreadyASub.deleteOne();
        return res.status(200).json(new ApiResponse(200,{subscribed:false},"Unsubscribed Successfull"))
    }

    const newSubs = await Subscription.create({
        subscriber:req.user._id,
        channel:channelId
    })

    if(!newSubs){
        throw new ApiError(500,"something went wrong while subscribing")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            newSubs,
            "Subscribed Successfull"
        ))

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel id")
    }

    const isChannelExistAsUser = await User.findById(channelId)

    if(!isChannelExistAsUser){
        throw new ApiError(404,"Channel does not exist as")
    }

    const allSubscribers = await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
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
                subscriber:{
                    $first:"$subscriber"
                }
            }
        }
    ])

    if(!allSubscribers.length){
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                [],
                "Channel has no subscriber"
            )
        )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                allSubscribers,
                "Channel subscribers fetched successfully"
            )
        )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid channel id")
    }

    const isSubscriberExistAsUser = await User.findById(subscriberId)

    if(!isSubscriberExistAsUser){
        throw new ApiError(404,"Channel does not exist as")
    }

    const allSubscribedChannels = await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channel",
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
                channel:{
                    $first:"$channel"
                }
            }
        }
    ])

    if(!allSubscribedChannels.length){
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                [],
                "No subscribed channels"
            )
        )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                allSubscribedChannels,
                "subscribed channels fetched successfully"
            )
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}