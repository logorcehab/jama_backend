import mongoose, { Schema, Document } from 'mongoose';
export interface IEventTokens extends Document {
    _id: string;
    email_calendar?: string;
}

const EventTokens: Schema = new Schema({

    email_calendar: String
})

export default mongoose.model<IEventTokens>("EventTokens", EventTokens)

