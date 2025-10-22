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

const router = Router();

router.use(verifyJWT);


export default router;