const mongoose = require('mongoose');
const { SchemaNames } = require('./Schemas/utils/schemaNames');

const VideoSchemas = require('./Schemas/Video');

const Video = mongoose.model(SchemaNames.video, VideoSchemas.VideoSchema);

module.exports = {
    Video,
}