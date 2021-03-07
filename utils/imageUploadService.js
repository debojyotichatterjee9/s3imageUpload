// var AWSXRay = require('aws-xray-sdk');
const AWS = require('aws-sdk');
const CLOUDFRONT = require('aws-cloudfront-sign')
const config = require('config');


exports.ImageService = class ImageService {

    constructor(params) {
        this.base64Image = params && params.base64Image ? params.base64Image : '';
        this.userId = params && params.userId ? params.userId : '';
        this.prevImage = params && params.prevImage ? params.prevImage : '';
        this.imageCategory = params && params.imageCategory ? params.imageCategory : '';
    }

    allowedFileTypes = ['jpg', 'jpeg', 'png', 'tiff'] // ARRAY OF ALLOW IMAGE EXTENSIONS

    /**
     * FUNCTION TO CHECK IF THE STRING IS IN BASE64 FORMAT
     * INFO: ADDITIONAL OPTION PARAMETERS TO PASS
        {
        allowMime: boolean value,
        mimeRequired: boolean value,
        paddingRequired: boolean value,
        allowEmpty: boolean value,
    }
     * @param {String} base64String 
     * @param {Object} options 
     */
    isValidBase64(base64String = this.base64Image, options = { mimeRequired: true, allowEmpty: false }) {
        if (base64String instanceof Boolean || typeof base64String === 'boolean') {
            return false
        }

        if (!(options instanceof Object)) {
            options = {}
        }

        if (options.allowEmpty === false && base64String === '') {
            return false
        }

        var regex = '(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}==|[A-Za-z0-9+\/]{3}=)?'
        var mimeRegex = '(data:\\w+\\/[a-zA-Z\\+\\-\\.]+;base64,)'

        if (options.mimeRequired === true) {
            regex = mimeRegex + regex
        } else if (options.allowMime === true) {
            regex = mimeRegex + '?' + regex
        }

        if (options.paddingRequired === false) {
            regex = '(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}(==)?|[A-Za-z0-9+\\/]{3}=?)?'
        }

        return (new RegExp('^' + regex + '$', 'gi')).test(base64String)
    }

    /**
     * FUNCTION TO CHECK THE TYPE OF THE IMAGE (FILE EXTENSION)
     * @param {String} base64String 
     */
    isValidImageType(base64String = this.base64Image) {

        const fileType = base64String.split(';')[0].split('/')[1];

        return this.allowedFileTypes.includes(fileType.toLowerCase());
    }

    /**
     * FUNCTION TO CHECK THE SIZE OF THE IMAGE FILE
     * @param {Number} allowedSize 
     * @param {String} base64String 
     */
    isGreaterThan(allowedSize = 3, base64String = this.base64Image) { //Default size is set to 3 MB
        let [stringLength, sizeInKB, sizeInMB] = [base64String.length, '', ''];
        let imageSize = (stringLength * (3 / 4));

        // checking if padding is present and appling the algorithm as required
        // Ref: https://en.wikipedia.org/wiki/Base64#Padding
        if (base64String.slice(-2) === '==') {
            imageSize = imageSize - 2;
            sizeInKB = imageSize / Math.pow(1024, 1);
            sizeInMB = imageSize / Math.pow(1024, 2);
            // console.log(sizeInMB);
        }
        else if (base64String.slice(-1) === '=') {
            imageSize = imageSize - 2;
            sizeInKB = imageSize / Math.pow(1024, 1);
            sizeInMB = imageSize / Math.pow(1024, 2);
            // console.log(sizeInMB);
        }
        else {
            sizeInKB = imageSize / Math.pow(1024, 1);
            sizeInMB = imageSize / Math.pow(1024, 2);
            // console.log(sizeInMB);
        }
        if (sizeInMB > allowedSize) {
            return true;
        }
        return false;
    }

    /**
     * FUNCTION TO UPLOLOAD THE AVATAR IMAGE FILE TO AMAZON S3 BUCKET
     * @param {String} base64Image 
     * @param {String} userId 
     */
    async uploadToS3Bucket(base64Image = this.base64Image, userId = this.userId, prevImage = this.prevImage, imageCategory = this.imageCategory) {
        const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, FILE_UPLOAD_BUCKET, region } = config.get('aws');
        //turning on the logger to print log entries in the console,
        AWS.config.logger = console;
        let s3;
        // Configuring AWS with access and secret key.
        if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
            AWS.config.update({ accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY, region: region });
            // Creating a s3 instance with credentials

            s3 = new AWS.S3({
                params: {
                    Bucket: FILE_UPLOAD_BUCKET
                },
                region: region,
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY
            });
        }
        else {
            AWS.config.update({ region: region });
            // Creating a s3 instance with credentials
            s3 = new AWS.S3({
                params: {
                    Bucket: FILE_UPLOAD_BUCKET
                },
                region: region,
            });
        }
        const type = base64Image.split(';')[0].split('/')[1];
        const imageBuffer = new Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const { v4: uuidv4 } = require('uuid');
        const filename = uuidv4().replace(/[ -]/g, '');
        const params = {
            Bucket: FILE_UPLOAD_BUCKET,
            Key: `assets/images/${imageCategory}/${userId}/${filename}.${type}`, // the path, filename and type. (type is not required)
            Body: imageBuffer,
            // ACL: 'public-read', // granting public access to the sub resource object
            ContentEncoding: 'base64', // required
            ContentType: `image/${type}` // required (Notice the back ticks)
        }
        let amazonResponse = {};
        try {
            // delete previous image if prevImage exists
            if(prevImage) {
                const delResp = await s3.deleteObject({
                    Bucket: FILE_UPLOAD_BUCKET,
                    Key: `uploads/${imageCategory}/${userId}/${prevImage}`,
                }, async (err, data) => {
                    if (err) {
                        console.log("Error: Object delete failed.");
                    }
                    else {
                        console.log("Success: Object delete successful.");
                    }
                });
            }


            //uploading the object to the bucket
            const { ETag, Location, Key, Bucket } = await s3.upload(params).promise();
            amazonResponse = {
                eTag: ETag,
                location: Location,
                key: Key,
                bucket: Bucket
            }


        }
        catch (error) {
            console.log(error)
            const { message, code, time, statusCode } = error
            amazonResponse = {
                message,
                code,
                time,
                statusCode
            }
        }


// You can also use the putObject function to replace an existing object and/or upload a new object 
        // try {
            //uploading the object to the bucket
            // const { ETag } = await s3.putObject(params).promise();
            // amazonResponse = {
            //     eTag: ETag,
            //     filename,
            //     type
            // }

        // } catch (error) {
        //     const { message, code, time, statusCode } = error
        //     amazonResponse = {
        //         message,
        //         code,
        //         time,
        //         statusCode
        //     }
        // }

        // console.log(amazonResponse);

        return amazonResponse;
    }
};