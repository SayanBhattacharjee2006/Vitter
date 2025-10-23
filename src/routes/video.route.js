import { Router } from 'express';
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
} from '../controllers/subscription.controller';
import { verifyJWT } from '../middlewares/auth.middleware';
import { upload } from "../middlewares/multer.middleware"

const router = Router();

router.use(verifyJWT);

router
    .route("/")
    .get(getAllVideos)
    .post(
        upload.fields([
            {
                name:"videoFile",
                maxCount:1
            },
            {
                name:"thumbnail",
                maxCount:1
            }
        ]),
        publishAVideo
    )

router
    .route("/:videoId")
    .get(getVideoById)
    .patch(updateVideo)
    .delete(upload.single("thumbnail"),deleteVideo)

router
    .route("/toggle/publish/:videoId")
    .patch(togglePublishStatus)

export default router;