const { credential } = require('./azure');

async function testAuthentication() {
    try {
        const token = await credential.getToken(
            'https://cognitiveservices.azure.com/.default'
        );

        console.log('Azure authentication successful.');
        console.log(`Token acquired: ${Boolean(token?.token)}`);
    } catch (error) {
        console.error('Azure authentication failed.');
        console.error(error.message);
        process.exit(1);
    }
}

testAuthentication();