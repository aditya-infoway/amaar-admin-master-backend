const db = require("../modelses/index.js");


const WORK_ORDER_STAGES = [
    { key: "CUTTING", label: "Material Cutting", roleId: 6, order: 1 },
    { key: "WELDING", label: "Welding", roleId: 7, order: 2 },
    { key: "BLASTING", label: "Blasting", roleId: 9, order: 3 },
    { key: "PAINT", label: "Paint", roleId: 10, order: 4 },
    { key: "QC", label: "QC", roleId: 12, order: 5 },
];

module.exports = { WORK_ORDER_STAGES };