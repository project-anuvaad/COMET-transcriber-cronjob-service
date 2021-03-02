const { exec } = require('child_process');
const fs = require('fs');
const async = require('async');
const uuid = require('uuid');
// silence threashold in seconds
// const SILENECE_THREASHOLD = 1;
// slide duration threashold in seconds
const SLIDE_THREASHOLD = 10;
const LANG_DELIMITERS = {
    'en': '.',
    'hi': '।',
}

// function findNearestDotPosition(afterTime, items) {

// }

function getLangDelimiter(langCode) {
    return LANG_DELIMITERS[langCode] || LANG_DELIMITERS['en'];
}

function downloadFile(url, targetPath) {
    return new Promise((resolve, reject) => {
        exec(`curl ${url} --output ${targetPath}`, (err) => {
            if (err) {
                return reject(err);
            }
            // ffmpeg emits warn messages on stderr, omit it and check if the file exists
            if (!fs.existsSync(targetPath)) {
                return reject(new Error('Failed to download file'));
            }
            return resolve(targetPath);
        })
    })
}

// function divideSpeakerSlidesByDot(slide) {
//     const itemsDuration = parseFloat(slide.items[slide.items.length - 1].end_time) - parseFloat(slide.items[0].start_time);
//     if (itemsDuration <= SLIDE_THREASHOLD) return [slide];
//     const newSlides = [];
//     slide.items.forEach((item) => {
//         item.start_time = parseFloat(item.start_time);
//         item.end_time = parseFloat(item.end_time);
//     })
//     let timeSum = slide.items[0].end_time - slide.items[0].start_time;
//     let firstItem = slide.items[0];
//     let lastItem;
//     let content = slide.items[0].alternatives[0].content;
//     slide.items.forEach((item, itemIndex) => {
//         if (item.type !== 'punctuation') {
//             timeSum += (item.end_time - item.start_time);
//         }
//         if (itemIndex === 0) return;
//         if (item.type === 'punctuation') {
//             content += `${item.alternatives[0].content}`
//         } else {
//             lastItem = item;
//             content += ` ${item.alternatives[0].content}`
//         }
//         if (item.alternatives[0].content === '.' && timeSum >= 10) {
//             newSlides.push({
//                 speakerLabel: slide.speakerLabel,
//                 startTime: firstItem.start_time,
//                 endTime: lastItem.end_time,
//                 content,
//             })
//             content = ''
//             firstItem = slide.items[itemIndex + 1];
//             timeSum = 0
//         } else if (itemIndex === (slide.items.length - 1)) {
//             newSlides.push({
//                 speakerLabel: slide.speakerLabel,
//                 startTime: firstItem.start_time,
//                 endTime: lastItem.end_time,
//                 content,
//             })
//         }

//     })

//     return newSlides;
// }

// function handleSlidesSilence(speakersSlides, videoDuration) {
//     const finalSlides = [...speakersSlides];
//     speakersSlides.forEach((subslides, subslideIndex) => {
//         subslides.forEach((slide, slideIndex) => {
//             if (slideIndex === 0 && subslideIndex !== 0) {
//                 if (speakersSlides[subslideIndex -1][speakersSlides[subslideIndex -1].length - 1].endTime - slide.startTime > SLIDE_THREASHOLD) {
//                     speakersSlides[subslideIndex -1].push({
//                         startTime: speakersSlides[subslideIndex -1][speakersSlides[subslideIndex -1].length - 1].endTime,
//                         endTime: slide.startTime,
//                         content: '',
//                     })
//                 } else {
//                     speakersSlides[subslideIndex -1][speakersSlides[subslideIndex -1].length - 1].endTime = slide.startTime;
//                 }
//             }
//             if (slideIndex !== 0) {
//                 subslides[slideIndex - 1].endTime = slide.startTime;
//             }
//         })
//     })
//     const lastSlide = speakersSlides[speakersSlides.length - 1];
//     // if (lastItem[lastItem.length - 1].endTime !== videoDuration) {
//     // }
//     lastSlide[lastSlide.length - 1].endTime = videoDuration
//     return finalSlides;
// }

// function handleSlidesSilence(speakersSlides, videoDuration) {
//     const finalSlides = [];
//     speakersSlides.forEach((slide, index) => {
//         // Move the intro part to a separate slide
//         if (index === 0 && slide.startTime > SILENECE_THREASHOLD) {
//             finalSlides.push({ startTime: 0, endTime: slide.startTime, content: '' });
//         }
//         finalSlides.push(slide);
//         // Check for silence in between and cut to separate sldies
//         if (index !== 0 && index !== speakersSlides.length - 1) {
//             const nextSlide = speakersSlides[index + 1];
//             // Check for silent parts
//             if ((nextSlide.startTime) > (slide.endTime + SILENECE_THREASHOLD)) {
//                 // If the silent part is smaller than the slide threashold, append it to the previous slide
//                 // Otherwise, create it as a new slide
//                 const silenceTime = nextSlide.startTime - slide.endTime;
//                 if (silenceTime > SLIDE_THREASHOLD) {
//                     finalSlides.push({
//                         startTime: slide.endTime,
//                         endTime: nextSlide.startTime,
//                         content: '',
//                     })
//                 } else {
//                     slide.endTime = nextSlide.startTime;
//                 }
//             } else if (nextSlide.startTime > slide.endTime) {
//                 slide.endTime = nextSlide.startTime;
//             }
//         }
//         // Move the outro part to a separate slide
//         if (index === speakersSlides.length - 1) {
//             if (slide.endTime + SILENECE_THREASHOLD < videoDuration) {
//                 finalSlides.push({
//                     startTime: slide.endTime,
//                     endTime: videoDuration,
//                     content: '',
//                 })
//             } else {
//                 // If outro is not large, just append it to the last slide
//                 finalSlides[finalSlides.length - 1].endTime = videoDuration;
//             }
//         }
//     })
//     return finalSlides;
// }

function getItemContent(item) {
    if (item.type === 'pronunciation') {
        return ` ${item.alternatives[0].content}`
    } else {
        return `${item.alternatives[0].content}`
    }
}

function getNearestStarTime(items) {
    return items.find((i) => i.startTime).startTime;
}

// function getLatestEndTime(items) {
//     return items.reverse().find(i => i.endTime).endTime;
// }

function divideSlidesIntoSubslides(slides) {
    const speakersSlides = [];
    // for each slide, we divide it into subslides based on the speaker label
    for (let index = 0; index < slides.length; index++) {
        const slide = slides[index];
        if (!slide.slideItems) {
            speakersSlides.push(slide);
            continue;
        }
        const subSlides = [];
        let itemsIndex = 0;
        let subSlide = {
            startTime: getNearestStarTime(slide.slideItems),
            content: getItemContent(slide.slideItems[itemsIndex]),
            speakerLabel: slide.slideItems[itemsIndex].speakerLabel,
        }
        // Go through all the items and divide collect them as subslides
        // based on the speaker label
        let nextItem = slide.slideItems[++itemsIndex];
        while( nextItem ) {
            if (nextItem.speakerLabel === subSlide.speakerLabel) {
                subSlide.content += getItemContent(nextItem);

                if (!subSlide.startTime && nextItem.startTime) {
                    subSlide.startTime = nextItem.startTime;
                }
                
                if (nextItem.endTime) {
                    subSlide.endTime = nextItem.endTime;
                }
            } else {
                subSlides.push({ ...subSlide, content: subSlide.content.trim(), duration: (subSlide.endTime - subSlide.startTime) * 1000 });
                subSlide = {
                    startTime: nextItem.startTime || 0,
                    endTime: nextItem.endTime,
                    content: getItemContent(nextItem),
                    speakerLabel: nextItem.speakerLabel,
                }
            }
            nextItem = slide.slideItems[++itemsIndex];
        }
        if (subSlide.startTime !== subSlide.endTime) {
            subSlides.push({...subSlide, content: subSlide.content.trim(), duration: (subSlide.endTime - subSlide.startTime) * 1000 });
        }
        speakersSlides.push(subSlides)
    }
    return speakersSlides;
}

function formatTranscribedSlidesToCut(slides, videoDuration, langCode) {
    const langDelimiter = getLangDelimiter(langCode);

    let finalSlides = [];
    const speakersSlides = [];
    const items = slides
        .reduce((acc, slide) => acc.concat(slide.items.map(item => ({ ...item, speakerLabel: slide.speakerLabel, startTime: parseFloat(item.start_time), endTime: parseFloat(item.end_time) }))), []);

    for (let index = 0; index < items.length; index++) {
        let item = items[index];
        let startTime = item.startTime || 0;
        let endTime = item.endTime || startTime;
        let slideContent = getItemContent(item);
        let nextItem = items[++index];
        let slideItems = [item];
        let prevItem = item;
        while (nextItem &&
                !(
                    (endTime - startTime >= SLIDE_THREASHOLD &&
                    getItemContent(prevItem).trim().indexOf(langDelimiter) === getItemContent(prevItem).trim().length - 1)
                )
            ) {
            prevItem = nextItem;
            if (nextItem.endTime) {
                endTime = nextItem.endTime;
            }
            slideContent += getItemContent(nextItem);
            slideItems.push(nextItem);
            nextItem = items[++index];
        }
        // speakersSlides.push({ slideItems, slideContent, startTime, endTime: slideItems.reduce((acc, item) => item.endTime && item.startTime ? acc + (item.endTime - item.startTime) : acc, startTime) })
        speakersSlides.push({ slideItems, content: slideContent, startTime, endTime: slideItems.reduce((acc, item) => item.endTime && item.startTime ? item.endTime : acc, startTime) })
        index--;
    }
    finalSlides = divideSlidesIntoSubslides(speakersSlides);
    return finalSlides;
}

function getSpeakerNumberFromLabel(speakerLabel) {
    return parseInt(speakerLabel.replace('spk_', ''))
}


function reorderSlidesAndContent(slides) {
    slides.forEach((slide, slideIndex) => {
        slide.position = slideIndex;
        if (slide.content) {
            slide.content.forEach((subslide, subslideIndex) => {
                subslide.position = subslideIndex;
            })
        }
    })

    return slides;
}

function formatSlidesToSlideSpeakerSchema(slides) {
    const formattedSlides = [];
    slides.forEach((subslides, subslidesIndex) => {
        subslides.forEach((slide) => {
            slide.text = slide.content;
            delete slide.content;
            slide.audio = '';
            slide.media = [];
            if (slide.speakerLabel) {
                slide.speakerProfile = {
                    speakerNumber: getSpeakerNumberFromLabel(slide.speakerLabel),
                    speakerGender: 'male',
                }
            }
        })
        formattedSlides.push({
            content: subslides,
            position: subslidesIndex,
            convertStatus: 'done',
        })
    })
    return reorderSlidesAndContent(formattedSlides);
}

function getSpeakersFromSlides(slides) {
    const speakers = [];
    slides.forEach((slide) => {
        slide.content.forEach((subslide) => {
            if (speakers.map(s => s.speakerNumber).indexOf(subslide.speakerProfile.speakerNumber) === -1) {
                speakers.push(subslide.speakerProfile);
            }
        })
    })
    return speakers;
}

// function formatTranscribedSlidesToCut(slides, videoDuration) {
//     let finalSlides = [];
//     const speakersSlides = [];
//     // Collect the same speaker's consicutive slides into one;
//     for (let index = 0; index < slides.length; index++) {
//         const slide = slides[index];
//         let slideContent = slide.content;
//         let subSlides = [slide];
//         let slideStartTime = slide.startTime;
//         let slideEndTime = slide.endTime;
//         let items = [].concat(slide.items);
//         let nextSlide = slides[++index];
//         let totalTime = 0;
//         while (nextSlide && nextSlide.speakerLabel === slide.speakerLabel) {
//             slideContent += ` ${nextSlide.content}`;
//             subSlides.push(nextSlide);
//             slideEndTime = nextSlide.endTime;
//             items = items.concat(nextSlide.items);
//             nextSlide = slides[++index];
//         }
//         index--;
//         const speakerSlideData = {
//             speakerLabel: slide.speakerLabel,
//             startTime: slideStartTime,
//             endTime: slideEndTime,
//             content: slideContent,
//             // subSlides,
//             items,
//         };
//         // If the slide time is greater than the threashold
//         // divide it into sub slides splitted by dots
//         if (slideEndTime - slideStartTime >= SLIDE_THREASHOLD) {
//             divideSpeakerSlidesByDot(speakerSlideData).forEach((s) => speakersSlides.push(s));
//         } else {
//             speakersSlides.push(speakerSlideData);
//         }

//     }
//     finalSlides = handleSlidesSilence(speakersSlides, videoDuration);
//     return finalSlides;
// }

function getRemoteFileDuration(url) {
    return new Promise((resolve, reject) => {
        exec(`ffprobe -i ${url} -show_entries format=duration -v quiet -of csv="p=0"`, (err, stdout, stderr) => {
            if (err) {
                return reject(err);
            }
            if (stderr) {
                return reject(stderr);
            }
            const duration = parseFloat(stdout.replace('\\n', ''));
            resolve(duration);
        })
    })
}

function formatCutTime(seconds) {
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds - (hours * 3600)) / 60);
    seconds = seconds - (hours * 3600) - (minutes * 60);
    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }
    let time = hours + ':' + minutes + ':' + seconds;
    if ((parseFloat(seconds) === parseFloat(seconds) || parseFloat(seconds) === 0) && String(seconds).indexOf('.') === -1) {
        time += '.000';
    }
    if (time.length < 12) {
        for (let i = 0; i < Array(12 - time.length).length; i++) {
            time += '0';
        }
    }
    return time.substr(0, 12);
}

function getFileExtension(url) {
    return url.split('.').pop().toLowerCase();
}

function cleanupFiles(files) {
    files.forEach((file) => {
        fs.unlink(file, () => { });
    })
}

function breakVideoIntoSlides(videoPath, parsedTranscription, langCode) {
    return new Promise((resolve, reject) => {
        getRemoteFileDuration(videoPath)
            .then((videoDuration) => {
                const slides = formatTranscribedSlidesToCut(parsedTranscription, videoDuration, langCode);
                return resolve(slides);
            })
            .catch(reject)
    })
}

function extractAudioFromVideo(videoPath, targetPath) {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -y -i ${videoPath} -map 0:a:0 ${targetPath}`;
        exec(command, (err) => {
            if (err) return reject(err);
            if (!fs.existsSync(targetPath)) return reject(new Error('Something went wrong'));
            return resolve(targetPath);
        })
    })
}

function getAudioSampleRate(audioPath) {
    return new Promise((resolve, reject) => {
        const command = `ffprobe -loglevel error -select_streams a -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 ${audioPath}`
        exec(command, (err, stdout) => {
            if (err) return reject(err);
            return resolve(parseInt(stdout))
        })
    })
}

function cutSlidesIntoVideos(slides, videoPath) {
    return new Promise((resolve, reject) => {
        const videoCuts = [];
        slides.forEach((subslide) => {
            videoCuts.push((cb) => {
                const targetPath = `tmp/${uuid()}-${uuid()}.${getFileExtension(videoPath)}`;
                // const targetPath = `tmp/${index}-${uuid()}.${videoPath.split('.').pop()}`;
                cutVideo(videoPath, targetPath, subslide.startTime, subslide.endTime - subslide.startTime)
                    .then(() => {
                        cb(null, { ...subslide, video: targetPath })
                    })
                    .catch(cb);
            })
        })

        async.series(videoCuts, (err, result) => {
            if (err) return reject(err);
            return resolve(result);
        })
    })
}

function cutVideo(videoPath, targetPath, start, end) {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -y -ss ${formatCutTime(start)} -i ${videoPath} -t ${end} ${targetPath}`;
        exec(command, (err) => {
            if (err) return reject(err);
            if (!fs.existsSync(targetPath)) return reject(new Error('Something went wrong'));
            return resolve(targetPath);
        })
    })
}

module.exports = {
    formatCutTime,
    cutSlidesIntoVideos,
    getRemoteFileDuration,
    formatTranscribedSlidesToCut,
    downloadFile,
    getFileExtension,
    getSpeakersFromSlides,
    formatSlidesToSlideSpeakerSchema,
    cleanupFiles,
    breakVideoIntoSlides,
    extractAudioFromVideo,
    getAudioSampleRate,
}