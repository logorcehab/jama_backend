import mongoose, { Schema } from 'mongoose';
import { IUserDocument } from './User';
const DisactivatedUser: Schema = new Schema({

    email: String,
    first_name: String,
    last_name: String,
    username: String,
    auth_id: String,
    auth_provider: String,
    number_of_followers: Number,
    number_of_followed: Number,
    followed_by: [String],
    following: [String],
    attended_events: [String],
    hosted_events: [String],
    number_of_attended_events: Number,
    number_of_hosted_events: Number,
    age: String,
    about: String,
    attendance_rate: Number,
    balance: Number,
    control_panel: {
        show_followers: Boolean,
        show_followed: Boolean,
        profile_private: Boolean,
        disabled_messages: Boolean,
        disabled_share: Boolean,
    },
    event_highlights: [{

        eventId: String,
        video: String
    }],
    current_city: String,
    ethnicity: String,
    rated_events: [String],
    followers_notifs: Boolean,
    gender: String,
    headline: String,
    interest_tags: [String],
    last_event_attended: String,
    facebook: String,
    instagram: String,
    linkedin: String,
    twitter: String,
    website: String,
    phone: String,
    profile_image: String,
    profile_image_lg: String,
    profile_video: String,
    guest_rating: {
        energy: Number,
        final_rate: Number,
        inquisitive: Number,
        punctual: Number,
        respectful: Number,
        ratingsCounter: Number
    },
    host_rating: {
        competency: Number,
        final_rate: Number,
        interaction: Number,
        punctuality: Number,
        ratingsCounter: Number,
        value: Number,
        venue_signal: Number,
        vibe: Number,
    },
    sms_notifications: Boolean,
    email_notifications: Boolean,
    timezone_offset: Number,
    paid_bills: [String],
    jama_messages: {
        blocked_by: [String],
        block_messages_from_users: [String],
        connections: [{

            uid: String,
            type: String,
            last_message: [{

                from: String,
                message: String,
                timestamp: Number,
                attachments: [String],
            }],
        }],
        new_messages: [{

            message: String,
            timestamp: Number,
            from: String,
        }],
    },
    additional_info: {
        hometown: String,
    },
    last_ip: String,
    email_confirmation_key: String,
    logged_first_time: Boolean,
    notifications_settings: {
        events_recommendations_unsubscribe_token: String,
        events_recommendations: Boolean,
    },
    creation: {
        timestamp: Number,
        ip: String,
    },
    updated: {

        timestamp: String,
        ip: String
    },
    locale_language: String,
    account_blocked: Boolean,
})
export default mongoose.model<IUserDocument>("DisactivatedUser", DisactivatedUser)