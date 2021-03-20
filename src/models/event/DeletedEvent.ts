import mongoose, { Schema, Document } from 'mongoose';
import { IEvent } from './Event';
const DeleteEvent: Schema = new Schema({
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
    users_attending: Object,
    pending_payment: Object,
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
export declare type IDeleteEvent = IEvent & Document;
export default mongoose.model<IDeleteEvent>("DeleteEvent", DeleteEvent)
