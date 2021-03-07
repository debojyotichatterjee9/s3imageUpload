
const imageUploadServiceObj = require('../utils/imageUploadService')

exports.uploadUserAvatar = async (userId, payload) => {
    try {

        
        if (payload.hasOwnProperty("image")) {
            const base64Image = payload.image;
            const imageCategory = 'avatar';

            const params = {
                userId,
                base64Image,
                imageCategory
            }
            let imageServiceObj = new imageUploadServiceObj.ImageService(params);
            if (!imageServiceObj.isValidBase64()) {

                return ({
                    message: 'Supplied image is not in base64 format.'
                })
            }
            else if (imageServiceObj.isGreaterThan(5)) { //5 MB

                return ({
                    message: 'Supplied image is greater than 5 MB.'
                })
            }
            else if (!imageServiceObj.isValidImageType()) {
                return ({
                    message: 'Supplied image type is invalid.'
                })
            }
            else {

                const amazonResponse = await imageServiceObj.uploadToS3Bucket();

                if (amazonResponse.hasOwnProperty('eTag') && amazonResponse.hasOwnProperty('location')) {
                    const fileLocation = `${amazonResponse.location}`
                    return ({
                    	id: userId,
                        location: fileLocation
                    });
                }
                else {
                    return ({
                        ref: 'UPLOAD_FAILED',
                        message: amazonResponse.message
                    })
                }
            }
        }
        else {
            return (false);
        }

    }
    catch (err) {
        return {
            ref: 'GENERAL_ERROR',
            message: err.message
        }
    }
}