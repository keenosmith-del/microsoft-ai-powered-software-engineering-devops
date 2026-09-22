require('dotenv').config();

const githubConfig = {
    owner: process.env.GITHUB_OWNER,
    repository: process.env.GITHUB_REPOSITORY,
    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH || 'main',
};

module.exports = {
    githubConfig,
};