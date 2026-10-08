const {
    successResponse,
    errorResponse,
    requiredmessage,
    saveModel,
    updateModel: updateModelHelper,
    selectWithJoins,
} = require("../../../helper/index.js");

const CONTRACTOR_TYPES = [
    "Cutting Manager",
    "Welding Manager",
    "Fitting Manager",
    "Blasting Manager",
    "Paint Manager",
    "Washing Manager",
    "Qc Manager",
];

// roleId of "Contractor Manager"
const getContractorManagerRoleId = async () => {
    const role = await selectWithJoins(
        "role",
        [],
        { delete: 0, roleName: "Contractor Manager" },
        ["roleId"]
    );
    return role && role.length > 0 ? role[0].roleId : null;
};
   0
// ---------------- LIST ----------------
const getContractorTypeList = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

        const roleId = await getContractorManagerRoleId();
        if (!roleId) return successResponse(res, [], "Contractor Manager role not found");

        const employees = await selectWithJoins(
            "employee",
            [],
            { companyId, roleId, delete: 0 },
            ["employeeId", "department", "employeeName", "mobileNumber", "email", "created"],
            [["employeeId", "DESC"]]
        );

        const employeeIds = (employees || []).map((e) => e.employeeId);

        let typeMap = {};
        if (employeeIds.length > 0) {
            const types = await selectWithJoins(
                "employeecontractortype",
                [],
                { employeeId: employeeIds, delete: 0 },
                ["employeeId", "contractorType"]
            );
            typeMap = (types || []).reduce((acc, t) => {
                (acc[t.employeeId] = acc[t.employeeId] || []).push(t.contractorType);
                return acc;
            }, {});
        }

        const data = (employees || []).map((row) => {
            const r = row.toJSON ? row.toJSON() : row;
            return {
                ...r,
                roleName: "Contractor Manager",
                contractorTypes: typeMap[r.employeeId] || [],
            };
        });

        return successResponse(res, data, "Contractor type list fetched successfully");
    } catch (error) {
        return errorResponse(res, "Something Went Wrong", error);
    }
};

// ---------------- UPDATE (replace full set of types) ----------------
const updateContractorType = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

        const { employeeId, contractorTypes } = req.body;

        const roleId = await getContractorManagerRoleId();
        if (!roleId) return errorResponse(res, "Contractor Manager role not found");

        // employee must be a Contractor Manager of this company
        const employee = await selectWithJoins(
            "employee",
            [],
            { employeeId, companyId, roleId, delete: 0 },
            ["employeeId"]
        );
        if (employee.length === 0) {
            return requiredmessage(res, "Contractor manager not found");
        }

        const wanted = [...new Set(contractorTypes)];

        // all rows for this employee, including previously soft-deleted ones
        const existing = await selectWithJoins(
            "employeecontractortype",
            [],
            { employeeId },
            ["employeeContractorTypeId", "contractorType", "delete"]
        );
        const existingMap = {};
        (existing || []).forEach((row) => {
            existingMap[row.contractorType] = row;
        });

        // 1) remove types that are no longer selected
        for (const row of existing || []) {
            if (Number(row.delete) === 0 && !wanted.includes(row.contractorType)) {
                await updateModelHelper(
                    "employeecontractortype",
                    { delete: 1, updated: new Date() },
                    { employeeContractorTypeId: row.employeeContractorTypeId }
                );
            }
        }

        // 2) add new types, or revive soft-deleted ones
        for (const type of wanted) {
            const row = existingMap[type];
            if (!row) {
                await saveModel("employeecontractortype", {
                    companyId,
                    employeeId,
                    contractorType: type,
                    delete: 0,
                });
            } else if (Number(row.delete) === 1) {
                await updateModelHelper(
                    "employeecontractortype",
                    { delete: 0, updated: new Date() },
                    { employeeContractorTypeId: row.employeeContractorTypeId }
                );
            }
        }

        return successResponse(res, {}, "Contractor type updated successfully");
    } catch (error) {
        return errorResponse(res, "Something Went Wrong", error);
    }
};

module.exports = { getContractorTypeList, updateContractorType };