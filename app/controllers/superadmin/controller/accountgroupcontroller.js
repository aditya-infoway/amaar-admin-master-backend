const {
    successResponse,
    errorResponse,
    requiredmessage,
    saveModel,
    updateModel: updateModelHelper,
    selectWithJoins,
    selectWithJoinsV2,
} = require("../../../helper/index.js");





// Typed main group name ko DB ki spelling/case me normalize karo:
// 1) group master me same naam (kisi bhi case me) -> master ki spelling, e.g. "Cash in Hand"
// 2) pehle se bana main group same naam -> uski spelling
// 3) warna jaisa type kiya (extra spaces hata ke)
const normalizeMainGroupName = async (companyId, rawName) => {
    const clean = String(rawName).trim().replace(/\s+/g, " ");
    const key = clean.toLowerCase();

    const masters = await selectWithJoins("group", [], { delete: 0 }, ["id", "groupName"]);
    const master = masters.find(
        (g) => String(g.groupName).trim().toLowerCase() === key,
    );
    if (master) return master.groupName;

    const mains = await selectWithJoins(
        "accountgroup",
        [],
        { companyId, delete: 0 },
        ["id", "groupName"],
    );
    const main = mains.find(
        (g) => String(g.groupName).trim().toLowerCase() === key,
    );
    return main ? main.groupName : clean;
};


// ---------------- CREATE ----------------
const createAccountGroup = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

        const { groupName, groupId, status } = req.body;

        const mainName = await normalizeMainGroupName(companyId, groupName);

        const exists = await selectWithJoins(
            "accountgroup",
            [],
            { groupId, companyId, delete: 0 },
            ["id", "groupName"]
        );
        if (exists.length > 0) {
            return errorResponse(res, `This group is already a sub group of "${exists[0].groupName}".`)
        }

        const created = await saveModel("accountgroup", {
            companyId,
            groupId,
            groupName: mainName,
            status: status || "active",
            delete: 0,
        });

        return successResponse(res, created, "Account group created successfully");
    } catch (error) {
        return errorResponse(res, "Something Went Wrong", error);
    }
};

// ---------------- LIST ----------------
// GET /list            -> all (table page)
// GET /list?groupId=30 -> only sub groups of that group (Account form dropdown)
const getAccountGroupList = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

        const where = {
            'accountgroup."companyId"': companyId,
            'accountgroup."delete"': 0,
        };
        if (req.query.groupId) {
            where['accountgroup."groupId"'] = req.query.groupId;
        }

        const list = await selectWithJoinsV2(
            "accountgroup",
            [
                {
                    table: '"group"',
                    alias: "g",
                    onClause: { "g.id": { "=": 'accountgroup."groupId"' } },
                },
            ],
            where,
            [
                "accountgroup.id",
                'accountgroup."groupName"',
                'accountgroup."groupId"',
                'g."groupName" AS "subGroupName"',
                "accountgroup.status",
                "accountgroup.created",
            ],
            [["accountgroup.id", "DESC"]],
            0,
            0
        );

        return successResponse(res, list, "Account group list fetched successfully");
    } catch (error) {
        return errorResponse(res, "Something Went Wrong", error);
    }
};

// ---------------- UPDATE ----------------
const updateAccountGroup = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

        const { accountGroupId, groupName, groupId, status } = req.body;

        const existing = await selectWithJoins(
            "accountgroup",
            [],
            { id: accountGroupId, companyId, delete: 0 },
            ["id", "groupId"]
        );
        if (existing.length === 0) return requiredmessage(res, "Account group not found");



        const dup = await selectWithJoins(
            "accountgroup",
            [],
            { groupId, companyId, delete: 0 },
            ["id", "groupName"]
        );
        const taken = dup.find((row) => String(row.id) !== String(accountGroupId));
        if (taken) {
            return errorResponse(res, `This group is already a sub group of "${taken.groupName}".`);
        }


        const mainName = await normalizeMainGroupName(companyId, groupName);

        await updateModelHelper(
            "accountgroup",
            { groupName: mainName, groupId, status: status || "active", updated: new Date() },
            { id: accountGroupId, companyId }
        );

        return successResponse(res, {}, "Account group updated successfully");
    } catch (error) {
        return errorResponse(res, "Something Went Wrong", error);
    }
};

// ---------------- DELETE (soft delete) ----------------
const deleteAccountGroup = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

        const { accountGroupId } = req.body;

        const existing = await selectWithJoins(
            "accountgroup",
            [],
            { id: accountGroupId, companyId, delete: 0 },
            ["id"]
        );
        if (existing.length === 0) return requiredmessage(res, "Account group not found");



        await updateModelHelper(
            "accountgroup",
            { delete: 1, updated: new Date() },
            { id: accountGroupId, companyId }
        );

        return successResponse(res, {}, "Account group deleted successfully");
    } catch (error) {
        return errorResponse(res, "Something Went Wrong", error);
    }
};

module.exports = {
    createAccountGroup,
    getAccountGroupList,
    updateAccountGroup,
    deleteAccountGroup,
};