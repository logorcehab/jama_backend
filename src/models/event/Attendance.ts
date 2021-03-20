import mongoose, { Schema, Document } from 'mongoose';
export interface IEventAttendance extends Document {
    _id: string;
    confirmed: string[];
    code: string;
    tries: {
        [key: string]: {
            code: string;
            ip: string;
            timestamp: number;
        };
    };
}
const EventAttendance: Schema = new Schema({
    confirmed: [String],
    code: String,
    tries: {
        type: Object
    }
})
export default mongoose.model<IEventAttendance>("EventAttendance", EventAttendance)
