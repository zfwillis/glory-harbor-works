import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    role: {
      type: String,
      enum: ["member", "leader", "pastor"],
      default: "member",
      required: true
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },

    // optional role-specific fields 
    managesUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    availability: [{ day: String, start: String, end: String }]
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
