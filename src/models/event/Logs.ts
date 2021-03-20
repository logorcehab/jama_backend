import mongoose, { Schema, Document } from 'mongoose';
export interface IEventLog extends Document {
    _id: string;
    logs: {
        timestamp: number;
        value: string;
    }[];
}

const EventLog: Schema= new Schema({

    logs: [{
        timestamp: Number,
        value: String,
    }],
})
export default mongoose.model<IEventLog>("EventLog", EventLog)
