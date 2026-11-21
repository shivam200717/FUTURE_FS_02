import mongoose, { Schema } from 'mongoose';

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/** Atomically increments and returns the next number for a named sequence. */
export async function nextSequence(name: string): Promise<number> {
  const doc: any = await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc.seq;
}
