const fs = require('fs');
const neededDirs = ['tmp'];
const videowikiGenerators = require('@videowiki/generators');
try {
    neededDirs.forEach((dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    })
} catch (e) {
    console.log(e);
}

const mongoose = require('mongoose');
const storageVendor = require('./vendors/storage');

const DB_CONNECTION_URL = process.env.TRANSCRIBER_SERVICE_DATABASE_URL;
const RABBITMQ_SERVER = process.env.RABBITMQ_SERVER;

const rabbitmqService = require('./vendors/rabbitmq');
const { queues } = require('./constants');
const {
    TRANSCRIBE_SUBVIDEOS_QUEUE,
    TRANSCRIBE_VIDEO_QUEUE,
    TRANSCRIBE_FINISH_QUEUE,
    CONVERT_VIDEO_TO_ARTICLE_QUEUE
} = queues;


let channel;
let mongoConnection
mongoose.connect(DB_CONNECTION_URL)
.then((con) => {
    mongoConnection = con.connection;
    con.connection.on('disconnected', () => {
        console.log('Database disconnected! shutting down service')
        process.exit(1);
    })

    rabbitmqService.createChannel(RABBITMQ_SERVER, (err, ch) => {
        if (err) throw err;
        channel = ch;
        channel.on('error', (err) => {
            console.log('RABBITMQ ERROR', err)
            process.exit(1);
        })
        channel.on('close', () => {
            console.log('RABBITMQ CLOSE')
            process.exit(1);
        })

        channel.assertQueue(TRANSCRIBE_VIDEO_QUEUE, { durable: true });
        channel.assertQueue(TRANSCRIBE_FINISH_QUEUE, { durable: true });
        channel.assertQueue(TRANSCRIBE_SUBVIDEOS_QUEUE, { durable: true });

        require('./cronJobs')(channel)

        const { server, app } = videowikiGenerators.serverGenerator({ uploadLimit: 50 })
        
        app.get('/health', (req, res) => {
            const { readyState } = mongoConnection;
            if (readyState !== 1 && readyState !== 2) {
                console.log('DATABASE CONNECTION DROPPED');
                return res.status(503).send('DATABASE CONNECTION DROPPED');
            }
            const { readable, writable } = channel.connection.stream;
            if (!readable || !writable) {
                console.log('RABBITMQ CONNECTION DROPPED');
                return res.status(503).send('RABBITMQ CONNECTION DROPPED');
            }
            storageVendor.getBucketLocation()
            .then(data => {
                return res.status(200).send('OK');
            })
            .catch(err => {
                console.log(err);
                console.log('Invalid bucket configuration');
                return res.status(503).send('Invalid bucket configuration');
            })
        })

        server.listen(4000)

    })

})
.catch(err => {
    console.log('Mongodb connection error', err);
    process.exit(1);
})