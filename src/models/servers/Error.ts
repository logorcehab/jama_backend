import mongoose, { Schema, Document } from 'mongoose';
export interface IServerError {
    _id: string;
    server_name: 'worker' | 'main' | 'testsite'
    message: string;
    stack: string;
    timestamp: number;
    additional_data?: string;
}

const ServerError: Schema = new Schema({

    server_name: String,
    message: String,
    stack: String,
    timestamp: Number,
    additional_data: String,
})
export declare type IServerErrorDocument = IServerError & Document;
export default mongoose.model<IServerErrorDocument>("ServerError", ServerError)

