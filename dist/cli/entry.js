import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolvePostChatAction } from '../app/controller/appFlow.js';
import { readConfig } from '../services/storage/configStore.js';
import { runChatAppFlow, runResumePickerFlow, runSetupFlow, runUpdatePromptFlow, clearLoginState } from './flow.js';
import { createSessionId } from '../app/controller/sessionController.js';
export async function runCli() {
    const argv = await yargs(hideBin(process.argv))
        .option('resume', {
        type: 'boolean',
        default: false,
        describe: 'Choose a saved transcript to resume',
    })
        .help()
        .parse();
    const updateAction = await runUpdatePromptFlow();
    if (updateAction === 'updated') {
        process.stdout.write('MiniChat was updated. Restart `minichat` to use the new version.\n');
        process.exit(0);
    }
    while (true) {
        if (!readConfig()) {
            await runSetupFlow(readConfig);
        }
        let sessionId = createSessionId();
        if (argv.resume) {
            const picked = await runResumePickerFlow();
            if (picked) {
                sessionId = picked;
            }
        }
        const chatResult = await runChatAppFlow(sessionId);
        const nextAction = resolvePostChatAction(chatResult);
        if (nextAction === 'exit' || nextAction === 'stop') {
            if (nextAction === 'stop') {
                await clearLoginState();
            }
            break;
        }
        await clearLoginState();
    }
}
