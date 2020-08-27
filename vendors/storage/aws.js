const AWS = require('aws-sdk')
const { accessKeyId, secretAccessKey, bucketName, defaultRegion } = require('./config');

const S3 = new AWS.S3({
    accessKeyId,
    secretAccessKey,
    region: defaultRegion,
})
function saveFile(directoryName, fileName, fileStream) {
    return new Promise((resolve, reject) => {
        S3.upload({
            Key: `${directoryName}/${fileName}`,
            Bucket: bucketName,
            Body: fileStream,
            ACL: 'public-read',
        }, (err, data) => {
            if (err) return reject(err);
            return resolve({ url: data.Location, data });
        })
    })
}

// function deleteFile(directoryName, fileName) {
//     return false;
// }

// function getFile(directoryName, fileName) {
//     return false;
// }

// function getDirectoryFiles(directoryName) {
//     return false;
// }
function updateItemPermissions(directoryName, fileName, permissions) {
    return new Promise((resolve, reject) => {
        S3.putObjectAcl({ Bucket: directoryName, Key: fileName, ACL: permissions}, (err) => {
            if (err) return reject(err);
            return resolve(true)
        })
    })
}

function getBucketLocation() {
    return new Promise((resolve, reject) => {
        S3.getBucketLocation({
            Bucket: bucketName
        }, (err, data) => {
            if (err) return reject(err);
            return resolve(data);
        })
    })
}

module.exports = {
    saveFile,
    updateItemPermissions,
    getBucketLocation,
    // getFile,
    // deleteFile,
    // getDirectoryFiles,
}