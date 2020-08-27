const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CONVERT_STATUS_ENUM = ['transcriping', 'cutting','failed', 'done'];
const VENDOR_ENUM = ['aws', 'gcp'];

const VideoSchema = new Schema({
    videoId: String,
    jobName: String,
    audioUrl: String,

    langCode: String,
    withSubtitle: Boolean,
    videoUrl: String,
    numberOfSpeakers: Number,
    subtitlesUrl: String,
    subtitleType: String,
    transcriptionUrl: String,
    status: { type: String, enum: CONVERT_STATUS_ENUM, default: 'uploading' },
    vendor: { type: String, enum: VENDOR_ENUM, default: 'aws' },
})

module.exports = { VideoSchema };