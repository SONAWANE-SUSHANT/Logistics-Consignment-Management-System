require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env")
});
const { connectDB, pool } = require("../config/db");

const createCustomers = require("./customer");
const createTrips = require("./trips");
const createConsignments = require("./consignment");
const Customer = require("../models/Customer");
const Trip = require("../models/Trip");
const Consignment = require("../models/Consignment");
const FreightBill = require("../models/FreightBill");

const seedDatabase = async () => {
  try {

    await connectDB();

    console.log("==================================");
    console.log("Starting Logistics Database Seeder");
    console.log("==================================");

    await FreightBill.deleteMany({});
    await Consignment.deleteMany({});
    await Trip.deleteMany({});
    await Customer.deleteMany({});

    const customers = await createCustomers();

    const trips = await createTrips();

    await createConsignments(customers, trips);

    console.log("");
    console.log("==================================");
    console.log("Database Seeded Successfully");
    console.log("==================================");

    await pool.end();

    process.exit(0);

  } catch (error) {

    console.error(error);

    await pool.end();

    process.exit(1);

  }
};

seedDatabase();
