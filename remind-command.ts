import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

const chrono = require('chrono-node');
const moment = require('moment');

export class RemindCommand implements ISlashCommand {
    public command = 'remind';
    public i18nParamsExample = 'params_example';
    public i18nDescription = 'cmd_description';
    public i18nWhenParse = 'unparsable_when';
    public providesPreview = false;

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        if(context.getArguments().length !== 3){
            throw new Error(i18nParamsExample);
        }

        const now = new Date().getTime();
        let who = context.getArguments()[0];
        const what = context.getArguments()[1];
        let when = context.getArguments()[2];
        let whenStr = 'sometimes';
        let timeout = 0;

        if(who === "me"){
        	who = context.getSender();
        }

        try {
        	when = chrono.parseDate(when).getTime();
        	whenStr = moment(when).from(now);
        	timeout = when - now;
        } catch(e) {
            throw new Error(i18nWhenParse);
        }

        setTimeout(() => {
        	const reminder = modify.getCreator().startMessage()
	            .setSender(context.getSender())
	            .setRoom(who)
	            .setText('Hey! ' + what)
	            .setUsernameAlias('Remind');

        	await modify.getCreator().finish(reminder);
        }, timeout);

        const builder = modify.getCreator().startMessage()
            .setSender(context.getSender())
            .setRoom(context.getRoom())
            .setText('Noted! Will remind you ' + whenStr)
            .setUsernameAlias('Remind');

        await modify.getCreator().finish(builder);
    }
}