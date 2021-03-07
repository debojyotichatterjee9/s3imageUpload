const express = require('express');
const router = express.Router();
const usersHelperObj = require('../helpers/usersHelper')
const { v4: uuidv4 } = require('uuid');



/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


/* Upload image to S3. */
router.post('/image/upload', async (req, res, next) => {
	const [ payload ] = [ req.body ];
	if (Object.keys(payload).length === 0) {
        return res.status(400).send({
            error: {
                message: 'Blank payload supplied.'
            }
        });
    }
    if ((!payload.hasOwnProperty('image')) || (payload.image == '')) {
        return res.status(400).send({
            error: {
                message: 'Image missing.'
            }
        });
    }

    if (payload) {
    			const user_id = uuidv4(); //generating a random user_id
                const uploadedAvatarResponse = await usersHelperObj.uploadUserAvatar(user_id, payload);
                if (uploadedAvatarResponse.hasOwnProperty('id') && uploadedAvatarResponse.hasOwnProperty('location')) {
                    res.status(200).send(uploadedAvatarResponse);
                }
                else {
                    res.status(400).send({ error: uploadedAvatarResponse });
                }
            }
            else {
                return res.status(403).send({
                    error: {
                        message: "Bad Request."
                    }
                });
            }
  // res.send('upload image to s3');
});


module.exports = router;
