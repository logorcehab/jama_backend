import mongoose, { Schema, Document } from 'mongoose';
export interface ISocketServerTask {
    _id: string;
    task_type: 'send-message';
    task_data: string;
    timestamp: number;
}

const SocketServerTask: Schema = new Schema({

    task_type: String,
    task_data: String,
    timestamp: Number,
})
export declare type ISocketServerTaskDocument = ISocketServerTask & Document;
export default mongoose.model<ISocketServerTaskDocument>("SocketServerTask", SocketServerTask)

