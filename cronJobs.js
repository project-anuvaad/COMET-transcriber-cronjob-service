const CronJob = require('cron').CronJob;
const fs = require('fs');
const async = require('async');
const path = require('path');
const { updateItemPermissions, saveFile } = require('./vendors/storage');

const { queues, TRANSCRIPTIONSCRIPTS_DIRECTORY } = require('./constants');
const { TRANSCRIBE_FINISH_QUEUE } = queues;

const videoHandler = require('./dbHandlers/video');
const transcribeService = require('./vendors/transcribe');

module.exports = (channel) => {
    const breakTranscribedIntoSlidesJob = new CronJob({
        cronTime: '* * * * *',
        onTick: function () {
            console.log('tick')
            if (!channel) return;
            videoHandler.find({ status: 'transcriping', jobName: { $exists: true } })
                .then((videos) => {
                    if (!videos || videos.length === 0) return;
                    const processVideosFuncArray = [];
                    let pendingCount = 0;
                    let doneCount = 0;
                    videos.forEach((video) => {
                        processVideosFuncArray.push(cb => {
                            if (video.vendor === 'aws' || !video.vendor) {
                                return transcribeService.getTranscriptionStatus(video.jobName)
                                    .then(({ status, data }) => {
                                        if (status && status.toLowerCase() === 'completed') {
                                            doneCount++;
                                            console.log(data);
                                            const transcriptionUrl = data.TranscriptionJob.Transcript.TranscriptFileUri;
                                            const parts = transcriptionUrl.split('/');
                                            const fileName = parts.pop();
                                            const directoryName = parts.pop()
                                            updateItemPermissions(directoryName, fileName, 'public-read')
                                                .then(() => {
                                                    return videoHandler.updateById(video._id, { status: 'cutting', transcriptionUrl: data.TranscriptionJob.Transcript.TranscriptFileUri })
                                                })
                                                .then(res => {
                                                    const msg = {
                                                        videoId: video.videoId,
                                                        langCode: video.langCode,
                                                        withSubtitle: video.withSubtitle,
                                                        videoUrl: video.videoUrl,
                                                        numberOfSpeakers: video.numberOfSpeakers,
                                                        transcriptionUrl,
                                                        subtitlesUrl: video.subtitle,
                                                        subtitleType: video.subtitleType,
                                                        vendor: video.vendor,
                                                    };
                                                    channel.sendToQueue(TRANSCRIBE_FINISH_QUEUE, new Buffer(JSON.stringify(msg)), { persistent: true });
                                                    console.log('cutting ', res);
                                                    cb();
                                                })
                                                .catch(err => {
                                                    console.log(err)
                                                    cb()
                                                })
                                        } else {
                                            pendingCount++;
                                            setTimeout(() => {
                                                cb();
                                            });
                                        }
                                    })
                                    .catch(err => {
                                        cb();
                                        console.log('error getting transcription status', video, err);
                                    })
                            } else if (video.vendor === 'gcp') {
                                return transcribeService.getGoogleTranscriptionStatus(video.jobName)
                                    .then(({ status, data }) => {
                                        if (status && status.toLowerCase() === 'completed') {
                                            doneCount++;
                                            const transcriptionText = data.result.results
                                                .map(result => result.alternatives[0].transcript)
                                                .join('\n');
                                            const transcriptionScriptPath = path.join(__dirname, 'tmp', `transcription_file_${Date.now()}.txt`)
                                            let transcriptionScriptUrl = '';
                                            fs.writeFile(transcriptionScriptPath, transcriptionText, (err) => {
                                                if (err) throw err;

                                                saveFile(TRANSCRIPTIONSCRIPTS_DIRECTORY, transcriptionScriptPath.split('/').pop(), fs.createReadStream(transcriptionScriptPath))
                                                    .then(res => {
                                                        transcriptionScriptUrl = res.url;
                                                        fs.unlink(transcriptionScriptPath, () => { })
                                                        return videoHandler.updateById(video._id, { status: 'cutting', transcriptionUrl: transcriptionScriptUrl })
                                                    })
                                                    .then(res => {
                                                        const msg = {
                                                            videoId: video.videoId,
                                                            langCode: video.langCode,
                                                            withSubtitle: video.withSubtitle,
                                                            videoUrl: video.videoUrl,
                                                            numberOfSpeakers: video.numberOfSpeakers,
                                                            transcriptionScriptUrl,
                                                            transcriptionScriptContent: transcriptionText,
                                                            subtitlesUrl: video.subtitle,
                                                            subtitleType: video.subtitleType,
                                                            vendor: video.vendor,
                                                        };
                                                        channel.sendToQueue(TRANSCRIBE_FINISH_QUEUE, new Buffer(JSON.stringify(msg)), { persistent: true });
                                                        console.log('cutting ', res);
                                                        cb();
                                                    })
                                                    .catch(err => {
                                                        console.log(err)
                                                        cb();
                                                    })
                                            })
                                        } else {
                                            pendingCount++;
                                            setTimeout(() => {
                                                cb();
                                            });
                                        }
                                    })
                                    .catch(err => {
                                        console.log(err);
                                        cb();
                                    })
                            } else {
                                videoHandler.updateById(video._id, { status: 'cutting' })
                                .then(() => {
                                    doneCount++;
                                    cb()
                                })
                                .catch(err => {
                                    console.log(err);
                                    cb()
                                })
                            }
                        })

                    })

                    async.parallelLimit(processVideosFuncArray, 10, (err => {
                        console.log('pending', pendingCount)
                        console.log('done', doneCount);
                        console.log('tock', err)
                    }))

                })
                .catch(err => {
                    console.log('error finding videos', err);
                })
        }
    })

    breakTranscribedIntoSlidesJob.start();
}