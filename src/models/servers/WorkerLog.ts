import mongoose, { Schema, Document } from 'mongoose';
export interface IWorkerTask {
    _id: string;
    task_type: string;
    info: string;
    timestamp: number;
}

const WorkerTask: Schema = new Schema({

    task_type: String,
    info: String,
    timestamp: Number
})
export declare type IWorkerTaskDocument = IWorkerTask & Document;
export default mongoose.model<IWorkerTaskDocument>("WorkerTask", WorkerTask)
