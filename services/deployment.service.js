const Docker = require('dockerode');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const docker = new Docker();

class DeploymentService {
  constructor() {
    this.deploymentPath = path.join(__dirname, '../deployments');
  }

  async initializeDeployment() {
    await fs.mkdir(this.deploymentPath, { recursive: true });
  }

  async deployFromGithub(runningChallenge, challenge) {
    try {
      const deploymentId = runningChallenge._id.toString();
      const repoPath = path.join(this.deploymentPath, deploymentId);

      // Clone repository
      await this.cloneRepository(challenge.github_url, repoPath);

      // Build and run Docker container
      const containerInfo = await this.deployDocker(deploymentId, repoPath);

      // Update running challenge with deployment info
      return {
        dockerImage: containerInfo.Image,
        dockerContainer: containerInfo.Id,
        dockerPort: containerInfo.port,
        deploymentURL: `http://localhost:${containerInfo.port}`,
        deployed: true
      };
    } catch (error) {
      console.error('Deployment failed:', error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  async cloneRepository(githubUrl, targetPath) {
    try {
      execSync(`git clone ${githubUrl} ${targetPath}`, { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Git clone failed: ${error.message}`);
    }
  }

  async deployDocker(deploymentId, repoPath) {
    try {
      // Build Docker image
      await docker.buildImage({
        context: repoPath,
        src: ['Dockerfile', '.']
      }, { t: `ctf-challenge-${deploymentId}` });

      // Create container
      const container = await docker.createContainer({
        Image: `ctf-challenge-${deploymentId}`,
        name: `ctf-challenge-${deploymentId}`,
        ExposedPorts: {
          '80/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '80/tcp': [{ HostPort: '0' }]
          },
          Memory: 512 * 1024 * 1024, // 512MB limit
          SecurityOpt: ['no-new-privileges']
        }
      });

      await container.start();

      // Get container info
      const containerInfo = await container.inspect();
      const port = containerInfo.NetworkSettings.Ports['80/tcp'][0].HostPort;

      return {
        Id: containerInfo.Id,
        Image: containerInfo.Image,
        port: port
      };
    } catch (error) {
      throw new Error(`Docker deployment failed: ${error.message}`);
    }
  }

  async stopAndRemove(runningChallenge) {
    try {
      if (runningChallenge.dockerContainer) {
        const container = docker.getContainer(runningChallenge.dockerContainer);
        await container.stop();
        await container.remove();
      }

      // Cleanup deployment directory
      const deploymentDir = path.join(this.deploymentPath, runningChallenge._id.toString());
      await fs.rm(deploymentDir, { recursive: true, force: true });

      return true;
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }
}

module.exports = new DeploymentService();