import { Router } from "express";
import {
    loginUser,
    logOutUser, 
    registerUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateUserAvatar,
    updateUserCoverImage,
    updateAccountDetails, 
    getUserChannelProfile, 
    getWatchHistory
}
     from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ])
    ,registerUser)


router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT,logOutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/account-details").patch(verifyJWT, updateAccountDetails)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)

router.route("/history").get(verifyJWT, getWatchHistory)


export default router;