function runDockerCommand(args, challenge, logPrefix = '', cwd = null) {
  return new Promise((resolve, reject) => {
    const logs = [];
    const cmd = 'docker';
    const child = spawn(cmd, args, { cwd });

    let lastStdout = '';
    let lastStderr = '';

    child.stdout.on('data', (data) => {
      const msg = data.toString();
      lastStdout = msg;
      logs.push(`[STDOUT] ${logPrefix}: ${msg}`);
      if (challenge && Array.isArray(challenge.logs)) challenge.logs.push(`[STDOUT] ${logPrefix}: ${msg}`);
      process.stdout.write(msg); // For debugging
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString();
      lastStderr = msg;
      logs.push(`[STDERR] ${logPrefix}: ${msg}`);
      if (challenge && Array.isArray(challenge.logs)) challenge.logs.push(`[STDERR] ${logPrefix}: ${msg}`);
      process.stderr.write(msg); // For debugging
    });

    child.on('close', (code) => {
      if (code === 0) {
        logs.push(`[SUCCESS] ${logPrefix}`);
        if (challenge && Array.isArray(challenge.logs)) challenge.logs.push(`[SUCCESS] ${logPrefix}`);
        resolve(lastStdout.trim());
      } else {
        logs.push(`[ERROR] ${logPrefix}: exited with code ${code}`);
        if (challenge && Array.isArray(challenge.logs)) challenge.logs.push(`[ERROR] ${logPrefix}: exited with code ${code}`);
        reject(new Error(`${logPrefix} failed with code ${code}\n${lastStderr}`));
      }
    });

    child.on('error', (err) => {
      logs.push(`[ERROR] ${logPrefix}: ${err.message}`);
      if (challenge && Array.isArray(challenge.logs)) challenge.logs.push(`[ERROR] ${logPrefix}: ${err.message}`);
      reject(err);
    });
  });
}