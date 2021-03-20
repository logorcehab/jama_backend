import mongoose, { Schema, Document } from 'mongoose';
export interface IUserCalendar {
    _id: string;
    has_synchronized_google: boolean;
    google_sync: {
        last_auth: number;
        oauth2_string_data: string;
        oauth2_redirect_token: string;
    };
}

const UserCalendar: Schema =  new Schema({

    has_synchronized_google: Boolean,
    google_sync: {
        last_auth: Number,
        oauth2_string_data: String,
        oauth2_redirect_token: String,
    },
})
export declare type IUserCalendarDocument = IUserCalendar & Document;
export default mongoose.model<IUserCalendarDocument>("UserCalendar", UserCalendar)