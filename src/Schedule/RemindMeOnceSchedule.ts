import {IRoom} from '@rocket.chat/apps-engine/definition/rooms';
import {IOnetimeSchedule} from '@rocket.chat/apps-engine/definition/scheduler';
import {IUser} from '@rocket.chat/apps-engine/definition/users';

export interface IRemindMeData {
    sender: IUser;
    room: IRoom;
    text: string;
    alias: string;
}

export class RemindMeOnceSchedule implements IOnetimeSchedule {
    public id: string;
    public when: string;
    public data?: IRemindMeData;

    constructor(id: string, when: string, data?: IRemindMeData) {
        this.id = id;
        this.when = when;
        this.data = data;
    }
}
