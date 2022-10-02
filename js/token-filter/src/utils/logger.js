const winston = require('winston');

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.File({filename: '../logs/token-filter.log'}),
	    new winston.transports.Console({format: winston.format.cli()}),
    ],
});

module.exports = logger;