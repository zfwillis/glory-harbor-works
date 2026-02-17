import mongoose from "mongoose";

const sermonSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    // title, speaker, topic, type, url, 
});
