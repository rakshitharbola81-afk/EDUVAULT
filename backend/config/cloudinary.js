const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

const uploadToCloudinary = async (filePath, originalname) => {
    return new Promise((resolve, reject) => {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();
        const apiKey = process.env.CLOUDINARY_API_KEY.trim();
        const apiSecret = process.env.CLOUDINARY_API_SECRET.trim();

        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = 'eduvault_notes';

        // Generate SHA-1 Signature
        const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

        const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
        const fileStream = fs.createReadStream(filePath);

        const options = {
            hostname: 'api.cloudinary.com',
            port: 443,
            path: `/v1_1/${cloudName}/auto/upload`,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(json.error?.message || `Cloudinary Error Code: ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(new Error('Invalid response from Cloudinary API'));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        // Write multipart/form-data body
        const writeField = (name, value) => {
            req.write(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
        };

        writeField('api_key', apiKey);
        writeField('timestamp', timestamp);
        writeField('signature', signature);
        writeField('folder', folder);

        req.write(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${originalname}"\r\nContent-Type: application/pdf\r\n\r\n`);

        fileStream.on('data', (chunk) => {
            req.write(chunk);
        });

        fileStream.on('end', () => {
            req.write(`\r\n--${boundary}--\r\n`);
            req.end();
        });

        fileStream.on('error', (streamErr) => {
            req.destroy();
            reject(streamErr);
        });
    });
};

module.exports = { uploadToCloudinary };