import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  // get user object using userId
  // generate access token and refresh token using utility functions
  // save the refresh token in database using utility functions ( using save method )
  // return access and refresh tokens

  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({
      validBeforeSave: false,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate access and refresh tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from request body ✅
  // check if all required fields are present ✅
  // check if user is already registered using email or username ✅
  // check if avatar is given or not ✅
  // upload avatar and cover image to cloudinary using utility functions ✅
  // create a new user ✅
  // check wheter is it uploaded successfully
  // remove password and refreshToken from user object in response
  // check if user created successfully
  // return success message and user details using ApiResponce

  // Implement your code here

  const { email, password, username, fullName } = req.body;

  if (
    [email, password, username, fullName].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const userExists = await User.findOne({
    $or: [{ email }, { username }], // $or operator is used to perform OR operation on multiple fields
  });

  if (userExists) {
    throw new ApiError(400, "User already exists");
  }

  const avatarPath = req.files?.avatar?.[0]?.path;
  // const coverImagePath = req.files?.coverImage[0]?.path;

  let coverImagePath;

  if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
    coverImagePath = req.files?.coverImage?.[0]?.path;
  }

  if (!avatarPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarPath);
  const coverImage = await uploadOnCloudinary(coverImagePath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar to cloudinary");
  }

  const user = await User.create({
    email,
    password,
    username: username.toLowerCase(),
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // Exclude sensitive fields when returning the created user
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(201)
    .json(new ApiResponce(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get required email and password from request body
  // check if email and password are provided
  // validate is user present in database using email or username
  // check if password is correct
  // generate access token and refresh token
  // send cookies
  // return access token and user details using ApiResponce

  // implementation

  const { email, username, password } = req.body;

  if ((!username && !email) || !password) {
    throw new ApiError(400, "required credentials are missing");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(401, "User not registered");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(404, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const cookieOptions = {
    httpOnly: true, // Cookies will only be sent over HTTPS so they can't be read by JavaScript on the client-side
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponce(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, //we need to send this as the client can be in a mobule device and can't access cookies directly
        },
        "User logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  //we can only  logout a user when the user is loggen in so we need to check if user is authenticated
  //to logout use we have to remove accessToken and refreshToken from cookies but to do this we need the user object which we dont have here so we need a middleware which will authenticate the user and add the user object to req object "req.user=user"

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true, //here new:true is to return the updated document, not the original
    }
  );

  const cookieOptions = {
    httpOnly: true, // Cookies will only be sent over HTTPS so they can't be read by JavaScript on the client-side
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponce(200, {}, "User logged out successfully"));
});

//endpoint for whent the access token expired so re-generating both access and refresh tokens
const refreshAccessToken = asyncHandler(async (req, res) => {
  // get refresh token from request cookies
  // validate the refresh token using the JWT library
  // if the token is valid, generate new access token and refresh token
  // send cookies
  // return new access token and user details using ApiResponce

  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  const decodedRefreshToken = JWT.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  if (!decodedRefreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decodedRefreshToken._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "User not registered");
  }

  if (decodedRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshTokens(user._id);

  const cookieOptions = {
    httpOnly: true, // Cookies will only be sent over HTTPS so they can't be read by JavaScript on the client-side
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", newRefreshToken, cookieOptions)
    .json(
      new ApiResponce(
        200,
        {
          user,
          accessToken,
          refreshToken,
        },
        "Access token refreshed successfully"
      )
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // get current user from req.user
  // get new password and old password from request body
  // check if old password is correct
  // update the password of user
  // return success message using ApiResponce

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "required credentials are missing");
  }

  const user = req.user;

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "old password is incorrect");
  }

  const updatedUserData = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        password: newPassword,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponce(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponce(200, req.user, "user details fetched successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // get the local file path from request file
  // upload the avatar to cloudinary using cloudinary uploadOnCloudinary function
  // then find the user by id and update user's avatar using query operators

  const newAvatarFilePath = req.file?.path;

  if (!newAvatarFilePath) {
    throw new ApiError(400, "Avatar is required");
  }

  const newAvatar = await uploadOnCloudinary(newAvatarFilePath);

  const updatedUserData = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: newAvatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponce(200, updatedUserData, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // get the local file path from request file
  // upload the avatar to cloudinary using cloudinary uploadOnCloudinary function
  // then find the user by id and update user's avatar using query operators

  const newCoverImageFilePath = req.file?.path;

  if (!newCoverImageFilePath) {
    throw new ApiError(400, "Avatar is required");
  }

  const newCoverImage = await uploadOnCloudinary(newCoverImageFilePath);

  const updatedUserData = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: newCoverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponce(200, updatedUserData, "Cover Image updated successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // get current user from req.user
  // find and update user's username and fullName using query operators
  // return success message using ApiResponce

  const { username, fullName } = req.body;

  if (!username && !fullName) {
    throw new ApiError(400, "required credentials are missing");
  }

  const user = User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        username: username.toLowerCase(),
        fullName,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponce(200, user, "Account details updated successfully"));
});

//mongoDB aggregation pipelines -

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params; //when we search any channel the url will contain username as a search parameter

  if (!username.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.aggregate([
    {
      // $match: match the user with the provided username
      $match: {
        username: username.toLowerCase(),
      },
      //now we have the user with the required username in the pipeline
    },
    {
      // $lookup: fetch the subscribers using the user's id and the syntax is 

      // $lookup:{
      //      from: "collectionName",
      //      localField: "fieldFromCurrentDocument", 
      //      foreignField: "fieldFromCollectionDocument", 
      //      as: "newFieldName"
      // }

      $lookup:{
        from: "subscriptions",          //in "from" we have to write the name of the collection from where we want to fetch the data
        localField: "_id",              //in "localField" we have to write the field from the current document
        foreignField: "channel",        //in "foreignField" we have to write the field from the document in the "from" collection
        as: "subscribers"               //in "as" we have to write the name of the new field in the current document
      }
      //now we have the user with the required username and the subscribers in the pipeline
      //now we have another field called "subscribers" in the current document the datatype of the subscribers is an array in which each element is an object of the user who is a subscriber of the current user
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"                
        //now we have the user with the required username, the subscribers and the users who are subscribed by the current user in the pipeline
      }
    },
    {
      // $addfield: add a new field to the current document, the syntax is $addFields:{fieldName: { $expression }}
      $addFields:{
        subscribersCount: { 
          $size: "$subscribers"
        },
        subscribedToCount: {
           $size: "$subscribedTo" 
        },
        isSubscribed:{
          //$if : condition to check, if true then true, if false then false it requires two arguments, first argument is the condition, second argument is the value if the condition is true and the value if the condition is false the syntax is $if(condition, valueIfTrue, valueIfFalse)
          // $in : checks if the current user is present in the array of subscribers, it requires two arguments, first argument is the array, second argument is the value to check, syntax is $in(array, value)

          $if:{
            $in: ["$subscribers", req.user._id],
            then: true,
            else: false
          }
        }
      }
    },
    {
      // $project: project only the required fields from the current document, the syntax is 
      // $project:{
      //      fieldName: 1
      // } or 
      // $project:{
      //      fieldName: 0
      // }
      //  1 means include the field, 

      $project:{
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount:1,
        subscribedToCount:1,
        isSubscribed:1,
        
      }
    }
  ]);

  if(!channel?.length){
    throw new ApiError(404, "User not found");
  }

  return res
  .status(200)
  .json(
    new ApiResponce(
      200,
      channel[0],
      "User channel profile fetched successfully"
    )
  )

});

const getWatchHistory = asyncHandler(async (req,res) => {
  const user = await User.aggregate[
    {
      $match:{
        _id : new mongoose.Types.ObjectId(req.user._id) //we need to use  mongoose.Types.ObjectId here to convert the string id to ObjectId
        // we are using match to filter the user by their id
        //here we telling get the user from User model whose _id is equal to req.user._id
      }
    },
    {
      $lookup:{
        from: "videos",          
        localField: "watchHistory",     
        foreignField: "_id",         
        as: "watchHistory",
        //in each video object the have a owner field which is the id of the user who uploaded the video
        // so we need to perform a lookup operation for each video object to get the owner details,but we dont need full details of the owner so we will perform a projection operation to get only the required fields
        pipeline: [
          {
            $lookup:{
              from:"users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              //now for each owner object we need to perform a projection operation to get only the required fields
              pipeline: [
                {
                  $project:{
                    username: 1,
                    fullName: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first: "$owner" //we are getting the first element of the owner array which is the owner of the current video
                //we are doing this because we currently have watchHistory which is a array,inside this a video object , inside this object we have owner field which was a array and inside this array there is an object of user who uploaded the video so we are getting the first owner object which is the owner of the current video
                // previously WatchHistory(array)->Video(Object)->Owner(Array)->User(object)
                // now WatchHistory(array)->Video(Object)->Owner(object)
              }
            }
          }
        ]
      }
      //here we are telling like get all the video objects from video collection whose _id matches with the video _ids stored in the watchHistory field of the current user
    }
  ]


  return res
 .status(200)
 .json(
    new ApiResponce(
      200,
      user[0].watchHistory,
      "User watch history fetched successfully"
    ))
})





export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserCoverImage,
  updateUserAvatar,
  getUserChannelProfile,
};
