import { AIProjectClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';

const projectEndpoint = process.env.FOUNDRY_PROJECT_ENDPOINT;

if (!projectEndpoint) {
    throw new Error(
        'FOUNDRY_PROJECT_ENDPOINT is not configured.',
    );
}

export const foundryClient = new AIProjectClient(
    projectEndpoint,
    new DefaultAzureCredential(),
);