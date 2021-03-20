import mongoose, { Schema, Document } from 'mongoose';
export interface IEventAnalytics extends Document {
    _id: string;
    views: {
        [key: string]: number;
    };
    logs: {
        timestamp: number;
        value: string;
    }[];
}
const EventAnalytics: Schema = new Schema({
    views:{
        type: Object,
    },
    logs: [{
        timestamp: Number,
        value: String
    }],
})
export default mongoose.model<IEventAnalytics>("EventAnalytics", EventAnalytics)
