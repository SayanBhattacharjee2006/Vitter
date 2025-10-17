import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";


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
    $or: [{email},{username}] // $or operator is used to perform OR operation on multiple fields
  })

  if ( userExists) {
    throw new ApiError(400, "User already exists");
  }


  const avatarPath = req.files?.avatar[0]?.path;
  // const coverImagePath = req.files?.coverImage[0]?.path;

  let coverImagePath;

  if(req.files && req.files.coverImage && req.files.coverImage.length > 0){
    coverImagePath = req.files?.coverImage[0]?.path;
  }


  if(!avatarPath){
    throw new ApiError(400, "Avatar is required")
  }

  const avatar = await uploadOnCloudinary(avatarPath);
  const coverImage = await uploadOnCloudinary(coverImagePath);

  if(!avatar){
    throw new ApiError(500, "Failed to upload avatar to cloudinary")
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
  const createdUser = await User.findById(user._id).select('-password -refreshToken');

  return res.status(201).json(
    new ApiResponce(201,createdUser, "User registered successfully"  )
  )

});

export { registerUser };
