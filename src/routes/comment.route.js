import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller";

const router = Router();

router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments);
router.route("/:videoId/add").post(addComment);
router.route("/:videoId/update/:commentId").put(updateComment);
router.route("/:videoId/delete/:commentId").delete(deleteComment);

export default router;
