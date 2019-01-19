import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import chrono from 'chrono-node';
import * as moment from 'moment';

export class RemindCommand implements ISlashCommand {
    public command = 'remind';
    public i18nParamsExample = 'params_example';
    public i18nDescription = 'cmd_description';
    public providesPreview = false;

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        if(context.getArguments().length !== 3){
            throw new Error('Usage: /remind [me or @someone or #channel] [what] [when]');
        }

        const sender: IUser = await read.getUserReader().getById('rocket.cat');
        const me: string = context.getSender().username;
        const nowTs: number = new Date().getTime();
        const who: string = context.getArguments()[0];
        const what: string = context.getArguments()[1];
        const when: string = context.getArguments()[2];

        let targetRoom: IRoom;
        let whenStr: string = 'sometimes';
        let timeout: number = 0;

        if(who === "me"){
            targetRoom = await read.getRoomReader().getByName(me + ' x ' + me) as IRoom;
        } else if(who[0] === '@'){
            const endUser = who.slice(1);

            targetRoom = await read.getRoomReader().getByName(me + ' x ' + endUser) as IRoom;
            if( targetRoom === undefined ){
                targetRoom = await read.getRoomReader().getByName(endUser + ' x ' + me) as IRoom;
            }
            if( targetRoom === undefined){
                throw new Error('Sorry, I don\'t recognize who you want me to remind');
            }
        } else if(who[0] === '#'){
            targetRoom = await read.getRoomReader().getByName(who.slice(1)) as IRoom;
        } else {
            throw new Error('Sorry, I don\'t recognize who you want me to remind');
        }

        try {
        	const whenTs: number = chrono.parseDate(when).getTime();
        	whenStr = moment(when).from(nowTs);
        	timeout = whenTs - nowTs;
        } catch(e) {
            throw new Error('Sorry, I don\'t understand when you want me to remind');
        }

        setTimeout(() => {
        	const reminder = modify.getCreator().startMessage()
	            .setSender(context.getSender())
                .setRoom(targetRoom)
	            .setText('Hey! ' + what)
	            .setUsernameAlias('Remind');

        	modify.getCreator().finish(reminder);
        }, timeout);

        const builder = modify.getCreator().startMessage()
            .setSender(context.getSender())
            .setRoom(context.getRoom())
            .setText('Noted! Will remind you ' + whenStr)
            .setUsernameAlias('Remind');

        await modify.getCreator().finish(builder);
    }
}