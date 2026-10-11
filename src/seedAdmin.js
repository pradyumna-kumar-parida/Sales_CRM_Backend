import "dotenv/config";
import connectDB from "./config/db.js";
import User from "./models/user.js";

const createAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({
      role: "Admin",
    });

    if (existingAdmin) {
      console.log("An Admin account already exists.");
      return;
    }

    const admin = await User.create({
      name: "CRM Admin",
      email: "admin@gmail.com",
      password: "Admin@12345",
      role: "Admin",
    });

    console.log("Admin created successfully:", admin.email);
  } catch (error) {
    console.error("Error creating Admin:", error.message);
  } finally {
    process.exit();
  }
};

createAdmin();
