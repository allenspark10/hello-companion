const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Colors for console output
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m'
};

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'INFO';
    this.logToFile = options.logToFile || false;
    this.logFilePath = options.logFilePath || path.join(__dirname, '../../logs/app.log');
    this.enableColors = options.enableColors !== false;

    // Create logs directory if logging to file
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  // Format log message
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  // Write to file
  writeToFile(formattedMessage) {
    if (this.logToFile) {
      fs.appendFileSync(this.logFilePath, formattedMessage + '\n', 'utf8');
    }
  }

  // Log with specific level
  log(level, message, meta = {}) {
    const levelPriority = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };

    // Check if should log based on level
    if (levelPriority[level] > levelPriority[this.logLevel]) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    // Console output with colors
    if (this.enableColors) {
      console.log(`${COLORS[level]}${formattedMessage}${COLORS.RESET}`);
    } else {
      console.log(formattedMessage);
    }

    // File output
    this.writeToFile(formattedMessage);
  }

  // Convenience methods
  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }

  // Log HTTP request
  logRequest(req) {
    this.info(`${req.method} ${req.url}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  // Log with duration
  logWithDuration(level, message, startTime, meta = {}) {
    const duration = Date.now() - startTime;
    this.log(level, `${message} (${duration}ms)`, meta);
  }
}

// Create singleton instance
const logger = new Logger({
  logLevel: process.env.LOG_LEVEL || 'INFO',
  logToFile: process.env.LOG_TO_FILE === 'true',
  enableColors: true
});

module.exports = logger;