import mongoose, { Schema, Document } from 'mongoose';
export interface IUserAnalytics extends Document {
    _id: string;
    views: {
        [key: number]: number;
    };
    logs: {
        timestamp: number;
        value: string;
    }[];
    searches: {
        value: string;
        timestamp: number;
    }[];
}

const UserAnalytics: Schema = new Schema({

    views: Object,
    logs: [{
        timestamp: Number,
        value: String
    }],
    searches: [{
        value: String,
        timestamp: Number
    }]
})
export default mongoose.model<IUserAnalytics>("UserAnalytics", UserAnalytics)
