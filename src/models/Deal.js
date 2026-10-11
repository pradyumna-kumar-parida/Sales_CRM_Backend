import mongoose from "mongoose";

const dealSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0.01,
    },
    probability: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    expectedRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedClosingDate: {
      type: Date,
    },
    stage: {
      type: String,
      enum: [
        "Qualification",
        "Discovery",
        "Proposal",
        "Negotiation",
        "Won",
        "Lost",
      ],
      default: "Qualification",
    },
    description: {
      type: String,
      trim: true,
    },
    lostReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

dealSchema.index({ stage: 1, createdAt: -1 });
dealSchema.index({ assignedTo: 1, stage: 1 });
dealSchema.index({ expectedClosingDate: 1 });

const Deal = mongoose.model("Deal", dealSchema);

export default Deal;
