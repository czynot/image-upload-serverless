const { v4: uuidv4 } = require('uuid');
const FileType = require('file-type');
const AWS = require('aws-sdk')

const s3 = new AWS.S3()

const mimes = ['image/jpeg', 'image/png', 'image/jpg'];

const Responses = {
    _200(data = {}){
        return {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Origin': '*',
            },
            statusCode: 200,
            body: JSON.stringify(data)
        }
    },

    _400(data = {}){
        return {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Origin': '*',
            },
            statusCode: 400,
            body: JSON.stringify(data)
        }
    },    
};

exports.handler = async event => {
    try {
        console.log("starting execution")
        
        const body = JSON.parse(event.body)

        console.log(body);

        if (!body || !body.image || !body.mime) {
            return Responses._400({ message: 'incorrect body on request' })
        }

        if (!mimes.includes(body.mime)) {
            return Responses._400({ message: 'mime is not allowed' })
        }

        let imageData = body.image;
        if (body.image.substring(0,7) === 'base64,') {
            imageData = body.image.substring(7, body.image.length)
        }

        console.log("got all data")

        const buffer = Buffer.from(imageData, 'base64');
        const fileInfo = await FileType.fromBuffer(buffer);
        const detectedExt = fileInfo.ext
        const detectedMime = fileInfo.mime

        if (detectedMime !== body.mime) {
            return Responses._400({ message: 'mime types don\'t match' });
        }

        const name = uuidv4();
        const key = `${name}.${detectedExt}`;

        console.log('writing image to s3')

        await s3.putObject({
            Body: buffer,
            Key: key,
            ContentType: body.mime,
            Bucket: process.env.imageUploadBucket,
            ACL: 'public-read',
        }).promise();

        const url = `https://${process.env.imageUploadBucket}.s3-${process.env.region}.amazonaws.com/${key}`

        return Responses._200({
            imageURL: url
        });


    } catch (error) {
        console.log('error', error);

        return Responses._400({ message: error.message || 'failed to upload image' })
    }
}