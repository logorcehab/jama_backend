import mongoose, { Schema, Document } from 'mongoose';
export interface IMessage {
    _id: string;
    from: string;
    message: string;
    timestamp: number;
    attachments: string[];
}
export interface IConnection {
    _id: string;
    type: 'default' | 'group';
    name?: string;
    messages: IMessage[];
    statistics: {
        created_at: number;
        created_by: string;
    };
    users?: {
        _id: string;
        admin: boolean;
    }[];
    image?: string;
    user_1?: string;
    user_2?: string;
}

const Connection: Schema = new Schema({

    type: String,
    name: String,
    messages: [{

        from: String,
        message: String,
        timestamp: Number,
        attachments: [String],
        }],
    statistics: {
        created_at: Number,
        created_by: String,
    },
    users: [{

        admin: Boolean,
    }],
    image: String,
    user_1: String,
    user_2: String,
})
export declare type IConnectionDocument = IConnection & Document;
export default mongoose.model<IConnectionDocument>("Connection", Connection)
