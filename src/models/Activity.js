import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "Call",
        "Email",
        "Meeting",
        "Demo",
        "Follow-up",
        "Reminder",
        "Note",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

activitySchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
activitySchema.index({ lead: 1, createdAt: -1 });
activitySchema.index({ customer: 1, createdAt: -1 });
activitySchema.index({ deal: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
