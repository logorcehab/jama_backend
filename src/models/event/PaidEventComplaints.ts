import mongoose, { Schema, Document } from 'mongoose';
export interface IPaidEventComplaints extends Document {
    _id: string;
    complaints: {
        user_id: string;
        subject: string;
        complaint: string;
        timestamp: number;
    }[];
}

const PaidEventComplaints: Schema = new Schema({

    complaints: [{
        user_id: String,
        subject: String,
        complaint: String,
        timestamp: Number,
    }]
})
export default mongoose.model<IPaidEventComplaints>("PaidEventComplaints", PaidEventComplaints)
