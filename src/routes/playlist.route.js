import { Router } from 'express';
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
} from '../controllers/playlist.controller';
import { verifyJWT } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyJWT);

router.route('/').post(createPlaylist);

router.route('/user/:userId').get(getUserPlaylists);

router.route('/:playlistId')
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);
    
router.route('/remove/:videoId/:playlistId').patch(removeVideoFromPlaylist);
router.route('/add/:videoId/:playlistId').patch(addVideoToPlaylist);

export default router;