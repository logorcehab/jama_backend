import mongoose, { Schema, Document } from 'mongoose';
export interface IEventCardPreview extends Document {
    _id: string;
    image: string;
    timestamp: number;
}
const EventCardPreview: Schema = new Schema({
    image: String,
    timestamp: Number
})
export default mongoose.model<IEventCardPreview>("EventCardPreview", EventCardPreview)
