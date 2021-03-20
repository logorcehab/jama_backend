import mongoose, { Schema, Document } from 'mongoose';
export interface ITag extends Document {
    _id: string;
    count: number;
    value: string;
}

const Tag: Schema = new Schema({

    count: Number,
    value: String,
})
export default mongoose.model<ITag>("Tag", Tag)
