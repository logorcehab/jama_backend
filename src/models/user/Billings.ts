import mongoose, { Schema, Document } from 'mongoose';
export interface IBilling {
    _id: string;
    amount: number;
    timestamp: number;
    payment_service: string;
    client_ip: string;
    event_id: string;
    participation_type: string;
    payment_scope: string;
}
export interface IUserBillings extends Document {
    _id: string;
    billings: IBilling[];
}

const Billing: Schema = new Schema({

    billings: [{

        amount: Number,
        timestamp: Number,
        payment_service: String,
        client_ip: String,
        event_id: String,
        participation_type: String,
        payment_scope: String,
    }]
})
export default mongoose.model<IUserBillings>("Billing", Billing)