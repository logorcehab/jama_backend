import mongoose, { Schema, Document } from 'mongoose';
import { IMessage } from './Connection';
export interface IUserGuestRating {
    energy: number;
    final_rate: number;
    inquisitive: number;
    punctual: number;
    respectful: number;
    ratingsCounter: number;
}
export interface IUserHostRating {
    competency: number;
    final_rate: number;
    interaction: number;
    punctuality: number;
    ratingsCounter: number;
    value: number;
    venue_signal: number;
    vibe: number;
}
export interface IUser {
    _id: string;
    email: string;
    first_name: string;
    last_name: string;
    username: string
    auth_id: string
    auth_provider: string
    number_of_followers: number;
    number_of_followed: number;
    followed_by: string[];
    following: string[];
    attended_events: string[];
    hosted_events: string[];
    number_of_attended_events: number;
    number_of_hosted_events: number;
    age: string;
    about: string;
    attendance_rate: number;
    balance: number;
    control_panel: {
        show_followers: boolean;
        show_followed: boolean;
        profile_private: boolean;
        disabled_messages: boolean;
        disabled_share: boolean;
    };
    event_highlights: {
        _id: string
        eventId: string
        video: string
    }[]
    current_city: string;
    ethnicity: string;
    rated_events: string[];
    followers_notifs: boolean;
    gender: string;
    headline: string;
    interest_tags: string[];
    last_event_attended: string;
    facebook: string;
    instagram: string;
    linkedin: string;
    twitter: string;
    website: string;
    phone: string;
    profile_image: string;
    profile_image_lg: string;
    profile_video?: string;
    guest_rating: IUserGuestRating;
    host_rating: IUserHostRating;
    sms_notifications: boolean;
    email_notifications: boolean;
    timezone_offset: number;
    paid_bills: string[];
    jama_messages: {
        blocked_by: string[];
        block_messages_from_users: string[];
        connections: {
            _id: string;
            uid: string;
            type: string;
            last_message?: IMessage;
        }[];
        new_messages: {
            _id: string;
            message: string;
            timestamp: number;
            from: string;
        }[];
    };
    additional_info: {
        hometown: string;
    };
    last_ip: string;
    email_confirmation_key?: string;
    logged_first_time?: boolean;
    notifications_settings: {
        events_recommendations_unsubscribe_token: string;
        events_recommendations: boolean;
    };
    creation: {
        timestamp: number;
        ip: string;
    };
    updated: {
        _id: string
        timestamp: string
        ip: string
    }
    locale_language: string;
    account_blocked: boolean;
}

const User: Schema = new Schema({

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
export declare type IUserConnectionLastMessage = Pick<IUser, 'jama_messages'>['jama_messages']['connections'][0]['last_message'];
export declare type IUserEventHighLight = Pick<IUser, 'event_highlights'>['event_highlights']
export declare type IUserDocument = IUser & Document;
export default mongoose.model<IUserDocument>("User", User)
