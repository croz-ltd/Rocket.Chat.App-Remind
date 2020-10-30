import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {IJobContext, IProcessor} from '@rocket.chat/apps-engine/definition/scheduler';

export class ScheduleProcessor implements IProcessor {
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    public async processor(jobContext: IJobContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const reminder = modify
            .getCreator()
            .startMessage()
            .setSender(jobContext.sender)
            .setRoom(jobContext.room)
            .setText(jobContext.text)
            .setUsernameAlias(jobContext.alias);

        await modify.getCreator().finish(reminder);

        return Promise.resolve(undefined);
    }
}
