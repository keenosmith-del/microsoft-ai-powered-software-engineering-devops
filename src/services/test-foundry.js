const { client, deployment } = require('./foundry');
const { azureConfig } = require('../config/azure');

async function testFoundry() {
    const startedAt = Date.now();

    const endpoint = azureConfig.foundryProjectEndpoint;

    let endpointHost = null;
    let endpointPath = null;

    try {
        const parsedEndpoint = new URL(endpoint);

        endpointHost = parsedEndpoint.hostname;
        endpointPath = parsedEndpoint.pathname;
    } catch {
        // Endpoint validation below will report the configuration problem.
    }

    const diagnosticContext = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        endpointHost,
        endpointPath,
        deployment: deployment || null,
        endpointConfigured: Boolean(endpoint),
        deploymentConfigured: Boolean(deployment),
    };

    console.log('\n=== MICROSOFT FOUNDRY DIAGNOSTIC TEST ===');
    console.log(JSON.stringify(diagnosticContext, null, 2));

    if (!endpoint) {
        console.error(
            JSON.stringify(
                {
                    ...diagnosticContext,
                    status: 'FAILED',
                    error: 'FOUNDRY_PROJECT_ENDPOINT is not configured.',
                },
                null,
                2
            )
        );

        process.exit(1);
    }

    if (!deployment) {
        console.error(
            JSON.stringify(
                {
                    ...diagnosticContext,
                    status: 'FAILED',
                    error: 'AZURE_OPENAI_DEPLOYMENT is not configured.',
                },
                null,
                2
            )
        );

        process.exit(1);
    }

    try {
        const response = await client.chat.completions.create({
            model: deployment,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a Microsoft Azure AI engineering test agent. Respond concisely.',
                },
                {
                    role: 'user',
                    content:
                        'Confirm that the Foundry model endpoint is operational.',
                },
            ],
            max_completion_tokens: 100,
        });

        const elapsedMs = Date.now() - startedAt;

        const responseHeaders = response._request_id
            ? {
                requestId: response._request_id,
            }
            : {};

        console.log('\n=== FOUNDRY REQUEST SUCCESS ===');

        console.log(
            JSON.stringify(
                {
                    ...diagnosticContext,
                    status: 'SUCCESS',
                    elapsedMs,
                    ...responseHeaders,
                },
                null,
                2
            )
        );

        console.log('\nModel response:\n');
        console.log(response.choices[0].message.content);
    } catch (error) {
        const elapsedMs = Date.now() - startedAt;

        const response = error?.response;
        const headers = response?.headers;

        let retryAfter = null;
        let requestId = null;
        let apiRequestId = null;

        if (headers) {
            if (typeof headers.get === 'function') {
                retryAfter = headers.get('retry-after');
                requestId = headers.get('x-request-id');
                apiRequestId = headers.get('apim-request-id');
            } else {
                retryAfter =
                    headers['retry-after'] ??
                    headers['Retry-After'] ??
                    null;

                requestId =
                    headers['x-request-id'] ??
                    headers['X-Request-ID'] ??
                    null;

                apiRequestId =
                    headers['apim-request-id'] ??
                    headers['Apim-Request-Id'] ??
                    null;
            }
        }

        const diagnosticError = {
            ...diagnosticContext,
            status: 'FAILED',
            elapsedMs,

            error: {
                name: error?.name ?? null,
                message: error?.message ?? null,
                code: error?.code ?? null,
                type: error?.type ?? null,
                status: error?.status ?? response?.status ?? null,
                requestId,
                apiRequestId,
                retryAfter,
                cause: error?.cause
                    ? {
                        name: error.cause.name ?? null,
                        message: error.cause.message ?? null,
                        code: error.cause.code ?? null,
                    }
                    : null,
            },
        };

        console.error('\n=== FOUNDRY REQUEST FAILED ===');

        console.error(JSON.stringify(diagnosticError, null, 2));

        process.exit(1);
    }
}

testFoundry();