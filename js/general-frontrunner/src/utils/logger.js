require('dotenv').config();
const winston = require('winston');


if (!process.env.NODE_ENV) {
    console.log('Missing env var NODE_ENV');
    process.exit(1);
};

// logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.File({
            filename: '../logs/road-runner.log'
        })
    ],
});

if (process.env.NODE_ENV != 'PRODUCTION') {
    logger.add(new winston.transports.Console({
        format: winston.format.cli(),
    }));
}

module.exports = logger;
