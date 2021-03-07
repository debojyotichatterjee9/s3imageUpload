
const { v4: uuidv4 } = require('uuid');
const imageUploadServiceObj = require('../utils/imageUploadService')

exports.uploadUserAvatar = async (userId, payload) => {
    try {

        if (payload.hasOwnProperty("image")) {
            const base64Image = payload.image;
            const imageCategory = 'avatar';
            const prevImage = uuidv4().replace(/[ -]/g, '');
            const params = {
                userId,
                base64Image,
                prevImage,
                imageCategory
            }
            // creating an object for custom imageUploadService
            let imageServiceObj = new imageUploadServiceObj.ImageService(params);
            // checking if the string in the payload is in valid base64 format.
            if (!imageServiceObj.isValidBase64()) {
                return ({
                    message: 'Supplied image is not in base64 format.'
                })
            }
            // checking if file size is more than a specified size.
            else if (imageServiceObj.isGreaterThan(5)) { //5 MB
                return ({
                    message: 'Supplied image is greater than 5 MB.'
                })
            }
            // checking if the file is of valid type
            else if (!imageServiceObj.isValidImageType()) {
                return ({
                    message: 'Supplied image type is invalid.'
                })
            }
            else {
                const amazonResponse = await imageServiceObj.uploadToS3Bucket();
                // if the response from aws is correct return the data
                if (amazonResponse.hasOwnProperty('eTag') && amazonResponse.hasOwnProperty('location')) {
                    const fileLocation = `${amazonResponse.location}`
                    return ({
                        id: userId,
                        location: fileLocation
                    });
                }
                else {
                    // else return error with message
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