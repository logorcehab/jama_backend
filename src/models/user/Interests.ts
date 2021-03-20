import mongoose, { Schema, Document } from 'mongoose';
export interface IUserInterests extends Document {
    _id: string;
    interests: {
        _id: string;
        timestamp: number;
    }[];
}

const UserInterests: Schema = new Schema({

    interests: [{

        timestamp: Number,
    }]
})
export default mongoose.model<IUserInterests>("UserInterests", UserInterests)
