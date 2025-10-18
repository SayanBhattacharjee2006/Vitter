import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import JWT from "jsonwebtoken";
import User from "../models/user.model";


export const verifyJWT = asyncHandler ( async (req, res, next) =>{
    // Extract JWT token from request headers or cookies
    // Validate the JWT token using the JWT library
    // If the token is valid, attach the decoded user object to the request object
    // If the token is invalid or expired, return an error response

    try {

    const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Access token is required");
    }

    const decodedToken = await JWT.verify(token, process.env.ACCESS_TOKEN_SECRET)//verify method do verify the token with secret key and return decoded token the decoded token actually contains user data or we can say payload which we saved while creating token
        console.log(decodedToken);

        const user = await User.findById(decodedToken._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user;
        next();

    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token" );
        
    }
})