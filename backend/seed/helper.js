const { faker } = require("@faker-js/faker");

const randomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

const randomNumber = (min, max) => {
  return faker.number.int({ min, max });
};

const randomDecimal = (min, max) => {
  return Number(
    faker.number.float({
      min,
      max,
      precision: 0.01,
    }).toFixed(2)
  );
};

const randomDate = (
  start = new Date("2026-04-01"),
  end = new Date("2026-07-31")
) => {
  return faker.date.between({ from: start, to: end });
};

const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

const generateGST = () => {
  const stateCode = faker.helpers.arrayElement([
    "27",
    "24",
    "29",
    "07",
  ]);

  const pan =
    faker.string.alpha({ length: 5, casing: "upper" }) +
    faker.string.numeric(4) +
    faker.string.alpha({ length: 1, casing: "upper" });

  return `${stateCode}${pan}1Z5`;
};

const generatePAN = () => {
  return (
    faker.string.alpha({ length: 5, casing: "upper" }) +
    faker.string.numeric(4) +
    faker.string.alpha({ length: 1, casing: "upper" })
  );
};

const generateVehicleNumber = () => {
  return `MH${randomNumber(12,40)}${faker.string.alpha({
    length:2,
    casing:"upper"
  })}${randomNumber(1000,9999)}`;
};

const generatePhone = () => {
  return `9${faker.string.numeric(9)}`;
};

const generateCustomerCode = (index) => {
  return `CUST-${String(index + 1).padStart(4, "0")}`;
};

const generateTripNumber = (index) => {
  return `TRIP-${String(index + 1).padStart(4, "0")}`;
};

const generateLRNumber = (index) => {
  return `LR-${7501 + index}`;
};

const generateInvoiceNumber = (index) => {
  return `INV-${String(index + 1001)}`;
};

const generateEWayBill = () => {
  return faker.string.numeric(12);
};

module.exports = {
  randomItem,
  randomNumber,
  randomDecimal,
  randomDate,
  formatDate,
  generateGST,
  generatePAN,
  generateVehicleNumber,
  generatePhone,
  generateCustomerCode,
  generateTripNumber,
  generateLRNumber,
  generateInvoiceNumber,
  generateEWayBill,
};