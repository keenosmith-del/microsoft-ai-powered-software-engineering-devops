const OpenAI = require('openai');
const {
    DefaultAzureCredential,
    getBearerTokenProvider,
} = require('@azure/identity');

const { azureConfig } = require('../config/azure');

const credential = new DefaultAzureCredential();

const tokenProvider = getBearerTokenProvider(
    credential,
    'https://ai.azure.com/.default'
);

const client = new OpenAI({
    baseURL: `${azureConfig.foundryProjectEndpoint.replace(/\/+$/, '')}/openai/v1`,
    apiKey: tokenProvider,
});

module.exports = {
    client,
    deployment: azureConfig.openAIDeployment,
};