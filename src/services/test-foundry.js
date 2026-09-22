const { client, deployment } = require('./foundry');

async function testFoundry() {
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

        console.log('Microsoft Foundry model call successful.');
        console.log('\nModel response:\n');
        console.log(response.choices[0].message.content);
    } catch (error) {
        console.error('Microsoft Foundry model call failed.');
        console.error(error.message);
        process.exit(1);
    }
}

testFoundry();