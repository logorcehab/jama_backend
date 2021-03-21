import mongoose, { Schema, Document } from 'mongoose';
export interface IEventSurveyFormInput {
    type: string;
    question: string;
    options?: string[];
}
export interface IEvent {
    _id: string;
    event_name: string;
    notifications: boolean;
    attachments: string[];
    created_by: string;
    capacity: number;
    display_phone: boolean;
    event_description: string;
    event_image: string;
    event_image_lg: string;
    event_video: string;
    host_contact: string;
    location_instructions: string;
    register_timestamps: string[];
    settings: {
        displayed_components: {
            message_host: boolean;
        };
    };
    tags: string[];
    timestamp_start: number;
    timestamp_end: number;
    rated_by: string[];
    rated_guests: string[];
    users_attending: string[];
    pending_payment: {
        _id: string;
        uid: string;
        amount: string;
    }[];
    pending_payment_confirmation: {
        _id: string;
        uid: string;
        amount: string;
    }[];
    locations: {
        accepted?: string;
        default?: string;
    };
    string_address: string;
    string_location: string;
    interested: {
        _id: string;
        timestamp: number;
    }[];
    price: number;
    has_complaints: boolean;
    payout_executed?: boolean;
    earnings: number;
    places_taken: number;
    surveys: string[];
    creation: {
        timestamp: number;
    };
    sent_notifications: {
        interested_users: {
            three_weeks: boolean;
            one_week: boolean;
            four_days: boolean;
            one_day: boolean;
            one_hour: boolean;
            fifteen_minutes: boolean;
        };
    };
}
const Event: Schema = new Schema({

    event_name: String,
    notifications: Boolean,
    attachments: [String],
    created_by: String,
    capacity: Number,
    display_phone: Boolean,
    event_description: String,
    event_image: String,
    event_image_lg: String,
    event_video: String,
    host_contact: String,
    location_instructions: String,
    register_timestamps: {
        type: Object
    },
    settings: {
        displayed_components: {
            message_host: Boolean,
        },
    },
    tags: [String],
    timestamp_start: Number,
    timestamp_end: Number,
    rated_by: [],
    rated_guests: [],
    users_attending: [String],
    pending_payment: [{
        _id: String,
        uid: String,
        amount: String,
    }],
    pending_payment_confirmation: Object,
    locations: {
        accepted: String,
        default: String,
    },
    String_address: String,
    String_location: String,
    interested: [{

        timestamp: Number,
    }],
    price: Number,
    has_complaints: Boolean,
    payout_executed: Boolean,
    earnings: Number,
    places_taken: Number,
    surveys: [String],
    creation: {
        timestamp: Number,
    },
    sent_notifications: {
        interested_users: {
            three_weeks: Boolean,
            one_week: Boolean,
            four_days: Boolean,
            one_day: Boolean,
            one_hour: Boolean,
            fifteen_minutes: Boolean,
        },
    },
})
export declare type IEventDocument = IEvent & Document;
export default mongoose.model<IEventDocument>("Event", Event)
