import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = asyncHandler ( async (userId) => {
  // get user object using userId
  // generate access token and refresh token using utility functions 
  // save the refresh token in database using utility functions ( using save method )
  // return access and refresh tokens

  const user = await User.findById(userId);
  if(!user){
    throw new ApiError(500,"something went wrong while generating access and refresh tokens");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({
    validBeforeSave: false,
  });  

  return { accessToken, refreshToken };
})


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

const loginUser = asyncHandler (async (req,res) => {
  //get required email and password from request body 
  // check if email and password are provided
  // validate is user present in database using email or username
  // check if password is correct
  // generate access token and refresh token
  // send cookies
  // return access token and user details using ApiResponce

  // implementation 

  const {email, username, password } = req.body;

  if(!username && !email || !password ){
      throw new ApiError(400, "required credentials are missing")
  }

  const user = await User.findOne({
    $or: [{ email }, { username }]
  })

  if(!user){
    throw new ApiError(401, "User not registered")
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if(!isPasswordCorrect){
    throw new ApiError(404, "Password is incorrect")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  const cookieOptions = {
    httpOnly:true,// Cookies will only be sent over HTTPS so they can't be read by JavaScript on the client-side
    secure:true
  }


  return res
        .status(200)
        .cookie("accessToken", accessToken , cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
          new ApiResponce(200, {
            user: loggedInUser,
            accessToken,
            refreshToken,//we need to send this as the client can be in a mobule device and can't access cookies directly
          },
           "User logged in successfully")
        )


})

const logOutUser = asyncHandler ( async (req,res) => {
  //we can only  logout a user when the user is loggen in so we need to check if user is authenticated
  //to logout use we have to remove accessToken and refreshToken from cookies but to do this we need the user object which we dont have here so we need a middleware which will authenticate the user and add the user object to req object "req.user=user"

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      }
    },
    {
      new: true,//here new:true is to return the updated document, not the original
    }
  ) 


  const cookieOptions = {
    httpOnly:true,// Cookies will only be sent over HTTPS so they can't be read by JavaScript on the client-side
    secure:true
  }

  return res
       .status(200)
       .clearCookie("accessToken", cookieOptions)
       .clearCookie("refreshToken", cookieOptions)
       .json(
          new ApiResponce(200, {}, "User logged out successfully")
        )


})

export { registerUser, loginUser, logOutUser };
