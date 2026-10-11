import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },

    entityType: {
      type: String,
      enum: ["Lead", "Customer", "Deal", "Activity"],
      required: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

timelineSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
timelineSchema.index({ performedBy: 1, createdAt: -1 });

const Timeline = mongoose.model("Timeline", timelineSchema);

export default Timeline;
