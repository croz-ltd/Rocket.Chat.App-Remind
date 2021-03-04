import {ILogger, IModify, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {App} from '@rocket.chat/apps-engine/definition/App';
import {IRoom, RoomType} from '@rocket.chat/apps-engine/definition/rooms';
import {ISlashCommand, SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {IUser} from '@rocket.chat/apps-engine/definition/users';
import {RemindMeOnceSchedule} from '../Schedule/RemindMeOnceSchedule';

export class RemindCommand implements ISlashCommand {
    public command = 'remind';
    public i18nParamsExample = 'params_example';
    public i18nDescription = 'cmd_description';
    public providesPreview = false;
    private log: ILogger;

    constructor(private readonly app: App) {
        this.log = app.getLogger();
    }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify): Promise<void> {
        if (context.getArguments().length < 3) {
            throw new Error('Usage: /remind [me or @someone or #channel] [what] [when]');
        }

        const postAsHolder = await read.getEnvironmentReader().getSettings().getById('post-as');
        const aliasHolder = await read.getEnvironmentReader().getSettings().getById('alias');

        this.log.debug('[RemindMe] Will try to post as:', postAsHolder.value, 'with alias', aliasHolder.value);

        const postAs: IUser = await read.getUserReader().getByUsername(postAsHolder.value);
        const me: IUser = context.getSender();
        const meAndBotRoom: IRoom = await this.findDirectChannelOrCreate(postAs, me, read, modify);

        this.log.debug('[RemindMe] Will post as:', postAs.username, '[', postAs.id, ']');

        // TODO: Maybe find better way ti parse message...
        const fullCommand: string = context.getArguments().join(' ');
        const who: string = context.getArguments()[0];
        // const lastIn: number = fullCommand.lastIndexOf(' in ');
        const lastIn: number = this.regexLastIndexOf(fullCommand, new RegExp(' (in|at) '));
        const when: string = fullCommand.substring(lastIn + 4);
        const what: string = fullCommand.substring(fullCommand.indexOf(who) + who.length + 1, lastIn);

        if (lastIn <= 0) {
            await this.sendMessageToCreator('Fail to understand when you want me to remind you. :confused:', postAs, aliasHolder.value, meAndBotRoom, modify);
            throw new Error('Fail to understand when you want me to remind you. :confused:');
        }

        const isMe: boolean = who === 'me' || who === `@${me.username}`;

        let targetRoom: IRoom;

        if (isMe) {
            targetRoom = meAndBotRoom;
        } else if (who[0] === '@') {
            const targetUser = await read.getUserReader().getByUsername(who.slice(1));
            targetRoom = await this.findDirectChannelOrCreate(postAs, targetUser, read, modify);
        } else if (who[0] === '#') {
            targetRoom = (await read.getRoomReader().getByName(who.slice(1))) as IRoom;

            const postAsInTargetRoom = targetRoom.userIds?.find((uid) => uid === postAs.id);
            if (!postAsInTargetRoom && targetRoom.type === RoomType.PRIVATE_GROUP) {
                const errorMessage = `Sorry, post as user '${postAs.username}' is not a member of target channel '${who.slice(1)}' and will not be able to deliver message. Please add that user to channel first.`;
                await this.sendMessageToCreator(errorMessage, postAs, aliasHolder.value, meAndBotRoom, modify);
                throw new Error(errorMessage);
            }
        } else {
            await this.sendMessageToCreator('Sorry, I don\'t recognize who you want me to remind', postAs, aliasHolder.value, meAndBotRoom, modify);
            throw new Error('Sorry, I don\'t recognize who you want me to remind');
        }

        await modify.getScheduler().scheduleOnce(new RemindMeOnceSchedule('remind-app', when, {
            sender: postAs,
            room: targetRoom,
            text: isMe ? `You asked me to remind you to "${what}".` : `@${me.username} asked me to remind you to "${what}".`,
            alias: aliasHolder.value,
        }));

        const message = `:thumbsup: I will remind ${(isMe ? 'you' : who)} to "${what}" in "${when}".`;
        await this.sendMessageToCreator(message, postAs, aliasHolder.value, meAndBotRoom, modify);
    }

    private async findDirectChannelOrCreate(postAs: IUser, me: IUser, read: IRead, modify: IModify): Promise<IRoom> {
        let room = await read.getRoomReader().getDirectByUsernames([postAs.username, me.username]);
        if (room === undefined) {
            const builder = modify.getCreator().startRoom()
                .setCreator(postAs)
                .setType(RoomType.DIRECT_MESSAGE)
                .setMembersToBeAddedByUsernames([me.username]);

            const status = await modify.getCreator().finish(builder);
            room = await read.getRoomReader().getDirectByUsernames([postAs.username, me.username]);
        }
        return room;
    }

    private async sendMessageToCreator(message: string, postAs: IUser, alias: string, meAndBotRoom: IRoom, modify: IModify) {
        const builder = modify
            .getCreator()
            .startMessage()
            .setSender(postAs)
            .setRoom(meAndBotRoom)
            .setText(message)
            .setUsernameAlias(alias);

        await modify.getCreator().finish(builder);
    }

    private regexLastIndexOf(input: string, regex: RegExp, startpos?: number): number {
        regex = (regex.global) ? regex : new RegExp(regex.source, 'g' + (regex.ignoreCase ? 'i' : '') + (regex.multiline ? 'm' : ''));
        if (typeof (startpos) === 'undefined') {
            startpos = input.length;
        } else if (startpos < 0) {
            startpos = 0;
        }
        const stringToWorkWith = input.substring(0, startpos + 1);
        let lastIndexOf = -1;
        let nextStop = 0;
        let result;
        // tslint:disable-next-line:no-conditional-assignment
        while ((result = regex.exec(stringToWorkWith)) != null) {
            lastIndexOf = result.index;
            regex.lastIndex = ++nextStop;
        }
        return lastIndexOf;
    }
}
