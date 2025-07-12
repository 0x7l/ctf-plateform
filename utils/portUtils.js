const { spawn } = require('child_process');
const os = require('os');
const logger = require('./logger');

function getPortScanCommand() {
  const platform = os.platform();
  logger.debug(`Detected platform: ${platform}`);
  if (platform === 'linux') {
    return {
      cmd: 'ss',
      args: ['-tuln'],
      parser: (data) => {
        return data.split('\n')
          .filter(line => line.includes(':'))
          .map(line => {
            const match = line.match(/:(\d+)/);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter(port => port);
      }
    };
  } else if (platform === 'win32') {
    return {
      cmd: 'netstat',
      args: ['-ano'],
      parser: (data) => {
        return data.split('\n')
          .filter(line => line.includes(':'))
          .map(line => {
            const match = line.match(/:(\d+)/);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter(port => port);
      }
    };
  } else if (platform === 'darwin') {
    return {
      cmd: 'netstat',
      args: ['-anv'],
      parser: (data) => {
        return data.split('\n')
          .filter(line => line.includes('.'))
          .map(line => {
            const match = line.match(/\.([0-9]+)\s/);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter(port => port);
      }
    };
  } else {
    logger.critical(`Unsupported platform for port scanning: ${platform}`);
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Returns a Promise that resolves to a Set of ports currently in use

function getUsedPorts() {
  return new Promise((resolve, reject) => {
    logger.debug('Starting port scan');
    const startTime = Date.now();

    try {
      const { cmd, args, parser } = getPortScanCommand();
      const child = spawn(cmd, args);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stderr += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.warn(`Port scan stderr: ${data.toString().trim()}`);
      });

      child.on('error', (err) => {
        logger.critical(`Port scan error: ${err.message}`, { error: err });
        reject(err);
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code !== 0) {
          const errorMsg = `Port scan failed with code ${code}: ${stderr.trim()}`;
          logger.error(errorMsg, { exitCode: code, durationMs: duration });
          return reject(new Error(errorMsg));
        }

        try {
          const portsArray = parser(stdout);
          const ports = new Set(portsArray.filter(port => !isNaN(port)));

          logger.debug(`Port scan completed in ${duration}ms`, {
            portsFound: ports.size,
            durationMs: duration,
            os: os.platform()
          });
          resolve(ports);
        } catch (parseError) {
          logger.error(`Failed to Parse port scan output: ${parseError.message}`, {
            error: parseError.message,
            rawOutput: stdout
          });
          reject(parseError);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Returns avaialble ports (works cross-plateform)
async function findAvailablePorts(start = 1024, end = 65534, exclude = []) {
  logger.info('Searching for available ports', { range: `${start}-${end}` });
  const usedPorts = await getUsedPorts();
  const available = [];
  for (let port = start; port <= end && available.length < 10; port++) {
    if (!usedPorts.has(port) && !exclude.includes(port)) {
      available.push(port);
    }
  }
  logger.info('Available ports found', { ports: available });
  return available;
}

module.exports = { getUsedPorts, findAvailablePorts };