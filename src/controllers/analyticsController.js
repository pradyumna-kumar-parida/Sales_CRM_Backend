import Lead from "../models/Lead.js";
import Customer from "../models/Customer.js";
import Deal from "../models/Deal.js";
import Activity from "../models/Activity.js";
import User from "../models/user.js";
export const getOverview = async (req, res, next) => {
  try {
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      totalCustomers,
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      pendingActivities,
      overdueActivities,
      wonDealValues,
      openDealValues,
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ status: "New" }),
      Lead.countDocuments({ status: "Qualified" }),
      Lead.countDocuments({ status: "Converted" }),
      Customer.countDocuments(),
      Deal.countDocuments(),
      Deal.countDocuments({
        stage: { $nin: ["Won", "Lost"] },
      }),
      Deal.countDocuments({ stage: "Won" }),
      Deal.countDocuments({ stage: "Lost" }),
      Activity.countDocuments({ status: "Pending" }),
      Activity.countDocuments({
        status: "Pending",
        dueDate: { $lt: new Date() },
      }),
      Deal.find({ stage: "Won" }).select("value"),
      Deal.find({
        stage: { $nin: ["Won", "Lost"] },
      }).select("expectedRevenue"),
    ]);

    const totalRevenue = wonDealValues.reduce(
      (sum, deal) => sum + deal.value,
      0,
    );

    const expectedRevenue = openDealValues.reduce(
      (sum, deal) => sum + deal.expectedRevenue,
      0,
    );

    const conversionRate =
      totalLeads > 0
        ? Number(((convertedLeads / totalLeads) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      success: true,
      message: "Analytics overview fetched successfully",
      data: {
        leads: {
          total: totalLeads,
          new: newLeads,
          qualified: qualifiedLeads,
          converted: convertedLeads,
          conversionRate,
        },
        customers: {
          total: totalCustomers,
        },
        deals: {
          total: totalDeals,
          open: openDeals,
          won: wonDeals,
          lost: lostDeals,
          totalRevenue,
          expectedRevenue,
        },
        activities: {
          pending: pendingActivities,
          overdue: overdueActivities,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPipeline = async (req, res, next) => {
  try {
    const stages = [
      "Qualification",
      "Discovery",
      "Proposal",
      "Negotiation",
      "Won",
      "Lost",
    ];

    const pipeline = await Deal.aggregate([
      {
        $group: {
          _id: "$stage",
          totalDeals: { $sum: 1 },
          totalValue: { $sum: "$value" },
          expectedRevenue: { $sum: "$expectedRevenue" },
        },
      },
    ]);

    const pipelineMap = new Map(pipeline.map((item) => [item._id, item]));

    const data = stages.map((stage) => {
      const result = pipelineMap.get(stage);

      return {
        stage,
        totalDeals: result?.totalDeals || 0,
        totalValue: result?.totalValue || 0,
        expectedRevenue: result?.expectedRevenue || 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Sales pipeline fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamPerformance = async (req, res, next) => {
  try {
    const employees = await User.find({
      role: "Sales Executive",
    }).select("name email isActive");

    const performance = await Promise.all(
      employees.map(async (employee) => {
        const assignedLeads = await Lead.countDocuments({
          assignedTo: employee._id,
        });

        const convertedLeads = await Lead.countDocuments({
          assignedTo: employee._id,
          status: "Converted",
        });

        const assignedDeals = await Deal.countDocuments({
          assignedTo: employee._id,
        });

        const wonDeals = await Deal.find({
          assignedTo: employee._id,
          stage: "Won",
        }).select("value");

        const totalRevenue = wonDeals.reduce(
          (sum, deal) => sum + deal.value,
          0,
        );

        return {
          employee: {
            _id: employee._id,
            name: employee.name,
            email: employee.email,
            isActive: employee.isActive,
          },
          assignedLeads,
          convertedLeads,
          assignedDeals,
          wonDeals: wonDeals.length,
          totalRevenue,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      message: "Team performance fetched successfully",
      data: performance,
    });
  } catch (error) {
    next(error);
  }
};
