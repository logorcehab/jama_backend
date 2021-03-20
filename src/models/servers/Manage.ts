import mongoose, { Schema, Document } from 'mongoose';
export interface IServerManager {
    _id: string;
    online: boolean;
    running: boolean;
    last_pulse: number;
}

const ServerManager: Schema = new Schema({

    online: Boolean,
    running: Boolean,
    last_pulse: Number,
})
export declare type IServerManagerDocument = IServerManager & Document;
export default mongoose.model<IServerManagerDocument>("ServerManager", ServerManager)
