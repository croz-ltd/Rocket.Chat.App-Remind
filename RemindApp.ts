import {IAppAccessors, IConfigurationExtend, ILogger} from '@rocket.chat/apps-engine/definition/accessors';
import {App} from '@rocket.chat/apps-engine/definition/App';
import {IAppInfo} from '@rocket.chat/apps-engine/definition/metadata';
import {SettingType} from '@rocket.chat/apps-engine/definition/settings';

import {RemindCommand} from './src/Command/RemindCommand';
import {ScheduleProcessor} from './src/Processor/ScheduleProcessor';

export class RemindApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async initialize(configuration: IConfigurationExtend): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new RemindCommand(this));
        await configuration.scheduler.registerProcessors([new ScheduleProcessor('remind-app')]);

        await configuration.settings.provideSetting({
            id : 'post-as',
            i18nLabel: 'Post as',
            i18nDescription: 'Choose the username that this integration will post as.\nThe user must already exist.',
            required: true,
            type: SettingType.STRING,
            public: false,
            packageValue: 'rocket.cat',
        });
        await configuration.settings.provideSetting({
            id : 'alias',
            i18nLabel: 'Alias (optional)',
            i18nDescription: 'Choose the alias that will appear before the username in messages.',
            required: false,
            type: SettingType.STRING,
            public: false,
            packageValue: undefined,
        });
    }
}
