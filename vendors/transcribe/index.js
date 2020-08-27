const AWS = require('aws-sdk');
const uuid = require('uuid').v4;
const {
    accessKeyId,
    secretAccessKey,
    defaultRegion,
    transcribeBucketName,
    googleProjectId,
    googleClientEmail,
    googlePrivateKey,
} = require('./config');

const googleSpeech = require('@google-cloud/speech');
const googleSpeechClient = new googleSpeech.SpeechClient({ projectId: googleProjectId, credentials: { client_email: googleClientEmail, private_key: googlePrivateKey } });

const transcribeService = new AWS.TranscribeService({
    region: defaultRegion,
    apiVersion: '2017-10-26',
    accessKeyId,
    secretAccessKey,
});

// const params = {
//     LanguageCode: en-US | es-US | en-AU | fr-CA | en-GB | de-DE | pt-BR | fr-FR | it-IT | ko-KR | es-ES | en-IN | hi-IN | ar-SA, /* required */
//     Media: { /* required */
//       MediaFileUri: 'STRING_VALUE'
//     },
//     MediaFormat: mp3 | mp4 | wav | flac, /* required */
//     TranscriptionJobName: 'STRING_VALUE', /* required */
//     MediaSampleRateHertz: 'NUMBER_VALUE',
//     OutputBucketName: 'STRING_VALUE',
//     Settings: {
//       ChannelIdentification: true || false,
//       MaxSpeakerLabels: 'NUMBER_VALUE',
//       ShowSpeakerLabels: true || false,
//       VocabularyName: 'STRING_VALUE'
//     }
// };
function transcribe(audioUrl, langCode, noOfSpeakers) {
    return new Promise((resolve, reject) => {
        const jobName = uuid();
        const params = {
            LanguageCode: langCode,
            Media: { /* required */
                MediaFileUri: audioUrl
            },
            MediaFormat: audioUrl.split('.').pop().toLowerCase(),
            TranscriptionJobName: jobName, /* required */
            OutputBucketName: transcribeBucketName,
        };
        if (noOfSpeakers > 1) {
            params.Settings = {
                MaxSpeakerLabels: noOfSpeakers,
                ShowSpeakerLabels: true,
            }
        }
        transcribeService.startTranscriptionJob(params, function (err, data) {
            if (err) return reject(err);
            return resolve({ jobName, data });
        });
    })
}

function getTranscriptionStatus(jobName) {
    return new Promise((resolve, reject) => {
        const params = {
            TranscriptionJobName: jobName,
        };
        transcribeService.getTranscriptionJob(params, function (err, data) {
            if (err) return reject(err);
            const job = data.TranscriptionJob;

            return resolve({ status: job.TranscriptionJobStatus, data });
        });
    })
}

// setTimeout(() => {
//     const fs = require('fs');
//     const path = require('path');
//     const videoPath = path.join(__dirname, '../../gu.mp4')
//     const fileName = path.join(__dirname, '../../gu.mp3')
//     // Reads a local audio file and converts it to base64
//     const file = fs.readFileSync(fileName);
//     const { supportedTranscribeLangs } = require('./constants')
//     const lang = supportedTranscribeLangs.find(l => l.code === 'gu-IN')
//     console.log('lang is', lang)
//     const utils = require('../../utils')
//     utils.extractAudioFromVideo(videoPath, fileName)
//         .then(() => {

//             utils.getAudioSampleRate(fileName)
//                 .then(sampleRate => {
//                     transcribeGoogle({ langCode: lang.code, fileStream: file, encoding: 'mp3', sampleRate })
//                         .then(r => {
//                             console.log('transcription is')
//                             console.log(r);
//                         })
//                         .catch(err => {
//                             console.log(err);
//                         })
//                 })
//         })

// }, 5000);
// getGoogleTranscriptionStatus('6626112857307537986')
// .then((status) => {
//     console.log(status);
// })

function transcribeGoogle({ langCode, fileBuffer, sampleRate, encoding }) {
    return new Promise((resolve, reject) => {
        console.log('startin transcribe', langCode, encoding, sampleRate, fileBuffer)
        const audioBytes = fileBuffer.toString('base64');

        // The audio file's encoding, sample rate in hertz, and BCP-47 language code
        const audio = {
            content: audioBytes,
        };
        const config = {
            encoding: encoding.toUpperCase(),
            sampleRateHertz: sampleRate,
            languageCode: langCode,
        };
        console.log(config)
        const request = {
            audio: audio,
            config: config,
        };
        // Detects speech in the audio file
        console.log('before recognize')

        googleSpeechClient.longRunningRecognize(request)
            .then((operation) => {
                console.log('operation is ', operation[0].name)
                return resolve(operation[0].name)
            })
            .catch(err => {
                console.log(err);
                return reject(err);
            })
    })
}

function getGoogleTranscriptionStatus(jobName) {
    return new Promise((resolve, reject) => {

        googleSpeechClient.checkLongRunningRecognizeProgress(jobName)
            .then((operation) => {
                let status = 'IN_PROGRESS';

                if (operation.done) {
                    status = 'COMPLETED';
                } else if (operation.error) {
                    status = 'FAILED';
                } else {
                    status = 'IN_PROGRESS';
                }
                return resolve({ status, data: operation })
            })
            .catch(reject)
    })
}

module.exports = {
    transcribe,
    getTranscriptionStatus,
    transcribeGoogle,
    getGoogleTranscriptionStatus,
}