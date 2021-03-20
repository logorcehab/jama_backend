import mongoose, { Schema, Document } from 'mongoose';
export interface IEventSurvey {
    _id: string;
    title: string;
    packed_form: string;
    token: string;
    event_id: string;
    event_created_by: string;
    completed_by: string[];
    responses: {
        user_id: string;
        responses: string[];
    }[];
}

const EventSurvey: Schema = new Schema({

    title: String,
    packed_form: String,
    token: String,
    event_id: String,
    event_created_by: String,
    completed_by: [String],
    responses: [{
        user_id: String,
        responses: [String],
    }],
})
export declare type IEventSurveyDocument = IEventSurvey & Document;
export default mongoose.model<IEventSurveyDocument>("EventSurvey", EventSurvey)
