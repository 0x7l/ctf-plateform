const {createLogger, format, transports} = require('winston');
const {combine, timestamp, printf, colorize, errors} = format;

const logLevels = {
    levels: {
        debug: 5,
        info: 4,
        warn: 3,
        error: 2,
        critical: 1,
    },
    colors: {
        debug: 'cyan',
        info: 'green',
        warn: 'yellow',
        error: 'red',
        critical: 'magenta bold'
    }
};

require('winston').addColors(logLevels.colors);

const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level}: ${stack || message}`;
});

const logger = createLogger({
    levels: logLevels.levels,
    level: 'debug',
    format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/critical.log', level: 'critical' })
    ]
});

module.exports = logger;