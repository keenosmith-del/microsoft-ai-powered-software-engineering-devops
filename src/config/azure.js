const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

const credential = new DefaultAzureCredential();

const azureConfig = {
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    tenantId: process.env.AZURE_TENANT_ID,
    resourceGroup: process.env.AZURE_RESOURCE_GROUP,
    foundryResourceName: process.env.FOUNDRY_RESOURCE_NAME,
    foundryProjectName: process.env.FOUNDRY_PROJECT_NAME,
    foundryProjectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT,
    openAIDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    embeddingDeployment: process.env.AZURE_EMBEDDING_DEPLOYMENT,
};

module.exports = {
    credential,
    azureConfig,
};