import mongoose, { Schema, Document } from 'mongoose';
export interface IUserEarnings extends Document {
    _id: string;
    earnings: {
        _id: string;
        amount: number;
        type: string;
        name: string;
        timestamp: number;
    }[];
}

const UserEarnings: Schema = new Schema({

    earnings: [{

        amount: Number,
        type: String,
        name: String,
        timestamp: Number,
    }],
})
export default mongoose.model<IUserEarnings>("UserEarnings", UserEarnings)
