const db = require("../modelses/index.js");


const WORK_ORDER_STAGES = [
    { key: "CUTTING", label: "Material Cutting ", roleId: 6, order: 1, categoryStage: "cutting", requiresItemVerification: true },
    { key: "WELDING", label: "Welding", roleId: 7, order: 2, categoryStage: "welding", requiresItemVerification: false },
    { key: "BLASTING", label: "Blasting", roleId: 9, order: 3, categoryStage: "blasting", requiresItemVerification: false },
    { key: "PAINT", label: "Paint", roleId: 10, order: 4, categoryStage: "paint", requiresItemVerification: false },
    { key: "QC", label: "QC", roleId: 12, order: 5, categoryStage: "qc", requiresItemVerification: false },
];

module.exports = { WORK_ORDER_STAGES };