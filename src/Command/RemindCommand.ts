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
        const lastIn: number = fullCommand.lastIndexOf(' in ');
        const when: string = fullCommand.substring(lastIn + 4);
        const what: string = fullCommand.substring(fullCommand.indexOf(who) + who.length + 1, lastIn);

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
                throw new Error(`Sorry, post as user '${postAs.username}' is not a member of target channel '${who.slice(1)}' and will not be able to deliver message. Please add that user to channel first.`);
            }
        } else {
            throw new Error('Sorry, I don\'t recognize who you want me to remind');
        }

        await modify.getScheduler().scheduleOnce(new RemindMeOnceSchedule('hey', when, {
            sender: postAs,
            room: targetRoom,
            text: isMe ? `You asked me to remind you to "${what}".` : `@${me.username} asked me to remind you to "${what}".`,
            alias: aliasHolder.value,
        }));

        const builder = modify
            .getCreator()
            .startMessage()
            .setSender(postAs)
            .setRoom(meAndBotRoom)
            .setText(`:thumbsup: I will remind ${(isMe ? 'you' : who)} to "${what}" in "${when}".`)
            .setUsernameAlias(aliasHolder.value);

        await modify.getCreator().finish(builder);
    }

    private async findDirectChannelOrCreate(postAs: IUser, me: IUser, read: IRead, modify: IModify): Promise<IRoom> {
        console.log('[findMeAndBotRoom] starting');
        let room = await read.getRoomReader().getDirectByUsernames([postAs.username, me.username]);
        console.log('[findMeAndBotRoom] found room', room);
        if (room === undefined) {
            const builder = modify.getCreator().startRoom()
                .setCreator(postAs)
                .setType(RoomType.DIRECT_MESSAGE)
                .setMembersToBeAddedByUsernames([me.username]);

            const status = await modify.getCreator().finish(builder);
            console.log('[findMeAndBotRoom] Status:', status);
            room = await read.getRoomReader().getDirectByUsernames([postAs.username, me.username]);
            console.log('[findMeAndBotRoom] found again room', room);
        }
        console.log('[findMeAndBotRoom] finishing');
        return room;
    }
}
