var fs = require('fs');
var path = require('path');
var logger = require('winston');
logger.emitErrs = true;

var logDirectory = path.join(__dirname, '../log')
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)
var filename =  path.join(logDirectory, 'all-logs.log')

logger.loggers.add('WWW', {
	console: { level: 'error', label: "WWW", handleExceptions: true, json: false, colorize: true},
	file:    { level: 'info', label: "WWW", filename: filename, maxsize: 5242880, maxFiles: 5, handleExceptions: true, json: true, colorize: false }
	});
logger.loggers.add('AUTH', {
	console: { level: 'info', label: "AUTH", handleExceptions: true, json: false, colorize: true},
	file:    { level: 'info', label: "AUTH", filename: filename, maxsize: 5242880, maxFiles: 5, handleExceptions: true, json: true, colorize: false }
	});

logger.loggers.add('USERS', {
	console: { level: 'info', label: "USERS", handleExceptions: true, json: false, colorize: true},
	file:    { level: 'info', label: "USERS", filename: filename, maxsize: 5242880, maxFiles: 5, handleExceptions: true, json: true, colorize: false }
	});

logger.loggers.add('SQLITE', {
	console: { level: 'info', label: "SQLITE", handleExceptions: true, json: false, colorize: true},
	file:    { level: 'info', label: "SQLITE", filename: filename, maxsize: 5242880, maxFiles: 5, handleExceptions: true, json: true, colorize: false }
	});

logger.loggers.add('GALLERY', {
	console: { level: 'info', label: "GALLERY", handleExceptions: true, json: false, colorize: true},
	file:    { level: 'info', label: "GALLERY", filename: filename, maxsize: 5242880, maxFiles: 5, handleExceptions: true, json: true, colorize: false }
	});


module.exports = logger;

