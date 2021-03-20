import mongoose, { Schema, Document } from 'mongoose';
export interface IHostRating {
    competency: number;
    punctuality: number;
    vibe: number;
    venue_signal: number;
    interaction: number;
    value: number;
    final_rate: number;
    comment: string;
    timestamp: number;
    event_id: string;
    from_user_id: string;
}
export interface IGuestRating {
    energy: number;
    inquisitive: number;
    punctual: number;
    respectful: number;
    final_rate: number;
    comment: string;
    timestamp: number;
    host_id: string;
    event_id: string;
}
export interface IUserRating extends Document {
    _id: string;
    host: IHostRating[];
    guest: IGuestRating[];
}

const UserRating: Schema = new Schema({

    host: [
    {
        competency: Number,
        punctuality: Number,
        vibe: Number,
        venue_signal: Number,
        interaction: Number,
        value: Number,
        final_rate: Number,
        comment: String,
        timestamp: Number,
        event_id: String,
        from_user_id: String,
    }
    ],
    guest: [
        {
            energy: Number,
            inquisitive: Number,
            punctual: Number,
            respectful: Number,
            final_rate: Number,
            comment: String,
            timestamp: Number,
            host_id: String,
            event_id: String,
        }
    ]
})
export default mongoose.model<IUserRating>("UserRating", UserRating)
