const {
    successResponse,
    errorResponse,
    requiredmessage,
    saveModel,
    updateModel: updateModelHelper,
    selectWithJoins,
} = require("../../../helper/index.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

const plain = (r) => (r && r.toJSON ? r.toJSON() : r);

const todayLocal = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const hasDuplicateLine = (items) => {
    const seen = new Set();
    for (const r of items) {
        const k = `${Number(r.itemId)}|${r.type}|${Number(r.groupId || 0)}|${Number(r.subGroupId || 0)}`;
        if (seen.has(k)) return true;
        seen.add(k);
    }
    return false;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getItemMasterMap = async (companyId) => {
    const rows = await selectWithJoins(
        "itemmaster",
        [],
        { companyId, delete: 0 },
        ["itemId", "itemCode", "itemName", "unit", "weight"],
    );
    return new Map((rows || []).map((r) => [Number(r.itemId), plain(r)]));
};

const getCreateMasterMap = async (companyId) => {
    const rows = await selectWithJoins(
        "createmaster",
        [],
        { companyId, delete: 0 },
        [
            "createMasterId",
            "type",
            "description",
            "actualItem",
            "code",
            "totalWeight",
            "status",
        ],
    );
    return new Map(
        (rows || []).map((r) => [Number(r.createMasterId), plain(r)]),
    );
};

const calcBomTreeTotalWeight = async (bomId) => {
    const rows = await selectWithJoins(
        "bomItem",
        [],
        { bomId, delete: 0 },
        ["weight"],
    );
    let total = 0;
    for (const r of rows || []) {
        const w = parseFloat(r.weight);
        if (!Number.isNaN(w) && w > 0) total += w;
    }
    return Number(total.toFixed(3));
};


// Weight of the selected Group / Sub Group.
// Selected node + ALL sub groups below it (any depth) -> sum of weight of
// every BOM item that belongs to them.
const calcBomGroupWeight = async (bomId, companyId, groupId, subGroupId) => {
    const nodes = (
        (await selectWithJoins("bomItem", [], { bomId, delete: 0 }, [])) || []
    ).map(plain);
    if (nodes.length === 0) {
        return { total: 0, matchedCount: 0, childMatchedCount: 0 };
    }

    const subs = (
        (await selectWithJoins(
            "subgroup",
            [],
            { companyId, delete: 0 },
            ["subGroupId", "groupId", "parentSubGroupId"],
        )) || []
    ).map(plain);

    const subSet = new Set();
    const addWithChildren = (id) => {
        if (!id || subSet.has(id)) return;
        subSet.add(id);
        subs
            .filter((s) => Number(s.parentSubGroupId) === id)
            .forEach((s) => addWithChildren(Number(s.subGroupId)));
    };

    if (subGroupId) {
        addWithChildren(Number(subGroupId));
    } else {
        subs
            .filter((s) => Number(s.groupId) === Number(groupId))
            .forEach((s) => addWithChildren(Number(s.subGroupId)));
    }

    const items = (
        (await selectWithJoins("itemmaster", [], { companyId, delete: 0 }, [
            "itemId",
            "groupId",
            "subGroupId",
        ])) || []
    ).map(plain);
    const itemMap = new Map(items.map((i) => [Number(i.itemId), i]));

    // group se match karne wale saare BOM items (root + child)
    const matched = nodes.filter((n) => {
        const it = itemMap.get(Number(n.itemId));
        if (!it) return false;
        const g = Number(it.groupId || 0);
        const sg = Number(it.subGroupId || 0);
        if (subGroupId) return subSet.has(sg);
        return g === Number(groupId) || subSet.has(sg);
    });

    // sirf child items (root = parentId null, usse count nahi karna)
    // real child items only: not root, and not a parent of any other row
    const parentIds = new Set(
        nodes.filter((n) => n.parentId != null).map((n) => Number(n.parentId)),
    );
    const childMatched = matched.filter(
        (n) => n.parentId != null && !parentIds.has(Number(n.bomItemId)),
    );

    const total = childMatched.reduce((sum, n) => {
        const w = parseFloat(n.weight);
        return sum + (Number.isNaN(w) ? 0 : w);
    }, 0);

    return {
        total: Number(total.toFixed(3)),
        matchedCount: matched.length,
        childMatchedCount: childMatched.length,
    };
};

// ---------------------------------------------------------------------------
// DROPDOWNS
// ---------------------------------------------------------------------------

const getFinishedGoodsOptions = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const completeBoms = await selectWithJoins(
            "bom",
            [],
            { companyId, delete: 0, setupStatus: "complete" },
            ["finishedGoodsItemId"],
        );

        const fgIds = [
            ...new Set(
                (completeBoms || [])
                    .map((b) => b.finishedGoodsItemId)
                    .filter((id) => id != null),
            ),
        ];

        if (fgIds.length === 0) {
            return successResponse(
                res,
                [],
                "No finished goods with complete BOM found",
            );
        }

        const itemMap = await getItemMasterMap(companyId);
        const list = fgIds
            .map((id) => {
                const m = itemMap.get(Number(id));
                if (!m) return null;
                return {
                    itemId: m.itemId,
                    itemCode: m.itemCode,
                    itemName: m.itemName,
                    label: `${m.itemCode} - ${m.itemName}`,
                };
            })
            .filter(Boolean);

        return successResponse(
            res,
            list,
            "Finished goods options fetched successfully",
        );
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

const getCreateMasterOptions = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const rows = await selectWithJoins(
            "createmaster",
            [],
            { companyId, delete: 0, status: "active" },
            [
                "createMasterId",
                "type",
                "description",
                "actualItem",
                "code",
                "totalWeight",
                "status",
            ],
            [["createMasterId", "DESC"]],
        );

        const list = (rows || []).map((r) => {
            const row = plain(r);
            return {
                createMasterId: row.createMasterId,
                type: row.type,
                description: row.description,
                code: row.code,
                totalWeight: row.totalWeight,
                actualItem: row.actualItem,
                label: row.description || row.code || `CM-${row.createMasterId}`,
            };
        });

        return successResponse(
            res,
            list,
            "Create Master items fetched successfully",
        );
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

const getGroupOptions = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const finishedGoodsItemId =
            Number(req.query.finishedGoodsItemId) || null;
        if (!finishedGoodsItemId) {
            return successResponse(res, [], "Select Finished Goods first");
        }

        // latest complete BOM of this finished good (same one auto-fetch uses)
        const boms = await selectWithJoins(
            "bom",
            [],
            { companyId, finishedGoodsItemId, setupStatus: "complete", delete: 0 },
            ["bomId"],
            [["bomId", "DESC"]],
        );
        if (!boms || boms.length === 0) {
            return successResponse(res, [], "No complete BOM found");
        }
        const bomId = plain(boms[0]).bomId;

        // // items used inside that BOM
        // const nodes = (
        //     (await selectWithJoins("bomItem", [], { bomId, delete: 0 }, [
        //         "itemId",
        //         "parentId",
        //     ])) || []
        // ).map(plain);

        // // only child items; skip the root/parent item (parentId null)
        // const childNodes = nodes.filter((n) => n.parentId != null);


        const nodes = (
            (await selectWithJoins("bomItem", [], { bomId, delete: 0 }, [
                "bomItemId",
                "itemId",
                "parentId",
            ])) || []
        ).map(plain);

        // ids of every row that has at least one child under it (parents)
        const parentIds = new Set(
            nodes.filter((n) => n.parentId != null).map((n) => Number(n.parentId)),
        );

        // real child items = not root (parentId null) AND not a parent of anything
        const childNodes = nodes.filter(
            (n) => n.parentId != null && !parentIds.has(Number(n.bomItemId)),
        );

        const itemIds = [...new Set(childNodes.map((n) => Number(n.itemId)))];
        if (itemIds.length === 0) {
            return successResponse(res, [], "BOM has no child items");
        }

        const items = (
            (await selectWithJoins(
                "itemmaster",
                [],
                { companyId, delete: 0, itemId: itemIds },
                ["itemId", "groupId", "subGroupId"],
            )) || []
        ).map(plain);

        const mains = (
            (await selectWithJoins(
                "itemgroup",
                [],
                { companyId, delete: 0 },
                ["itemGroupId", "groupName", "itemCategoryId"],
            )) || []
        ).map(plain);

        const subs = (
            (await selectWithJoins(
                "subgroup",
                [],
                { companyId, delete: 0 },
                [
                    "subGroupId",
                    "subGroupName",
                    "groupId",
                    "parentSubGroupId",
                    "itemCategoryId",
                ],
            )) || []
        ).map(plain);

        const subById = new Map(subs.map((s) => [Number(s.subGroupId), s]));

        const usedGroupIds = new Set(); // items with NO sub group -> main group
        const usedSubIds = new Set(); // items with a sub group -> that sub group only

        for (const it of items) {
            const sid = Number(it.subGroupId) || 0;
            if (sid) {
                usedSubIds.add(sid);
            } else if (it.groupId) {
                usedGroupIds.add(Number(it.groupId));
            }
        }

        const data = [
            ...mains
                .filter((g) => usedGroupIds.has(Number(g.itemGroupId)))
                .map((g) => ({
                    id: `G-${g.itemGroupId}`,
                    label: g.groupName,
                    groupId: g.itemGroupId,
                    subGroupId: null,
                    itemCategoryId: g.itemCategoryId,
                })),
            ...subs
                .filter((s) => usedSubIds.has(Number(s.subGroupId)))
                .map((s) => ({
                    id: `S-${s.subGroupId}`,
                    label: s.subGroupName,
                    groupId: s.groupId,
                    subGroupId: s.subGroupId,
                    itemCategoryId: s.itemCategoryId,
                })),
        ];

        return successResponse(res, data, "Group options fetched successfully");
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};






const getAutoFetchValues = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const type = String(req.query.type || req.body.type || "").trim();
        const createMasterId = Number(
            req.query.createMasterId || req.body.createMasterId,
        );
        const finishedGoodsItemId = Number(
            req.query.finishedGoodsItemId || req.body.finishedGoodsItemId,
        );

        if (!type || !["BOM", "Manual", "Quotation"].includes(type)) {
            return errorResponse(
                res,
                "Valid type (BOM / Manual / Quotation) is required",
            );
        }
        if (!createMasterId) {
            return errorResponse(res, "createMasterId is required");
        }

        const cmRows = await selectWithJoins(
            "createmaster",
            [],
            { createMasterId, companyId, delete: 0 },
            ["createMasterId", "code", "description", "totalWeight"],
        );
        if (!cmRows || cmRows.length === 0) {
            return errorResponse(res, "Selected item not found in Create Master");
        }
        const cm = plain(cmRows[0]);

        // Manual
        if (type === "Manual") {
            return successResponse(
                res,
                { weight: null, rate: null, source: "manual" },
                "Manual entry – weight & rate to be filled by user",
            );
        }

        // Quotation
        if (type === "Quotation") {
            const weight =
                cm.totalWeight != null && cm.totalWeight !== ""
                    ? String(cm.totalWeight)
                    : null;

            let rate = null;
            if (cm.code) {
                const pricingRows = await selectWithJoins(
                    "createpricing",
                    [],
                    { code: String(cm.code).trim(), companyId, delete: 0 },
                    ["exShowroomPrice", "code", "description", "effectiveDate"],
                    [["effectiveDate", "DESC"]],
                );
                if (pricingRows && pricingRows.length > 0) {
                    const p = plain(pricingRows[0]);
                    if (p.exShowroomPrice != null && p.exShowroomPrice !== "") {
                        rate = String(p.exShowroomPrice);
                    }
                }
            }

            const notes = [];
            if (weight == null) notes.push("Total weight not set in Create Master");
            if (!cm.code) notes.push("Create Master code is empty");
            else if (rate == null)
                notes.push(`No Create Pricing found for code ${cm.code}`);

            return successResponse(
                res,
                { weight, rate, source: "quotation", createMasterCode: cm.code },
                notes.length ? notes.join(". ") : "Quotation values fetched",
            );
        }

        // BOM
        const groupId = Number(req.query.groupId || req.body.groupId) || null;
        const subGroupId =
            Number(req.query.subGroupId || req.body.subGroupId) || null;

        if (!finishedGoodsItemId) {
            return errorResponse(
                res,
                "finishedGoodsItemId is required when type is BOM",
            );
        }
        if (!groupId) {
            return errorResponse(res, "Group is required when type is BOM");
        }

        const boms = await selectWithJoins(
            "bom",
            [],
            { companyId, finishedGoodsItemId, setupStatus: "complete", delete: 0 },
            ["bomId", "bomCode", "bomName"],
            [["bomId", "DESC"]],
        );

        if (!boms || boms.length === 0) {
            return errorResponse(
                res,
                "No complete BOM found for the selected Finished Goods",
            );
        }

        const bom = plain(boms[0]);
        const {
            total: groupWeight,
            matchedCount,
            childMatchedCount,
        } = await calcBomGroupWeight(bom.bomId, companyId, groupId, subGroupId);

        let message = "BOM group weight fetched";
        if (groupWeight <= 0) {
            if (matchedCount === 0) {
                message = `No item of this group found in BOM ${bom.bomCode}`;
            } else if (childMatchedCount === 0) {
                message = `This group exists only on the main/root item of BOM ${bom.bomCode}. No child item has the same group, so weight cannot be fetched.`;
            } else {
                message = `Child items of this group found in BOM ${bom.bomCode}, but none of them has a weight yet. You can enter the weight manually.`;
            }
        }

        return successResponse(
            res,
            {
                weight: groupWeight > 0 ? String(groupWeight) : null,
                rate: null,
                source: "bom",
                bomId: bom.bomId,
                bomCode: bom.bomCode,
            },
            message,
        );
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};


// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

const createModelPrice = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const {
            financialYearId,
            finishedGoodsItemId,
            modelName,
            referenceModelPriceId,
            effectiveDate,
            currentDate,
            status,
            items,
        } = req.body;

        if (!finishedGoodsItemId) {
            return errorResponse(res, "Finished Goods is required");
        }
        if (!Array.isArray(items) || items.length === 0) {
            return errorResponse(res, "Please add at least one component");
        }

        // finished goods must have complete BOM
        const hasBom = await selectWithJoins(
            "bom",
            [],
            {
                companyId,
                finishedGoodsItemId,
                setupStatus: "complete",
                delete: 0,
            },
            ["bomId"],
        );
        if (!hasBom || hasBom.length === 0) {
            return errorResponse(
                res,
                "Selected Finished Goods does not have a complete BOM",
            );
        }

        const cmMap = await getCreateMasterMap(companyId);
        const errors = [];
        items.forEach((row, idx) => {
            if (!cmMap.has(Number(row.itemId))) {
                errors.push({
                    row: idx + 1,
                    reason: `Item (createMasterId=${row.itemId}) not found in Create Master`,
                });
            }
            if (!["BOM", "Manual", "Quotation"].includes(row.type)) {
                errors.push({ row: idx + 1, reason: `Invalid type "${row.type}"` });
            }
            if (row.type === "BOM" && !row.groupId) {
                errors.push({
                    row: idx + 1,
                    reason: "Group is required when type is BOM",
                });
            }
        });
        if (errors.length > 0) {
            return errorResponse(
                res,
                `Validation failed (${errors.length} error(s))`,
                errors,
            );
        }

        if (hasDuplicateLine(items)) {
            return errorResponse(
                res,
                "Duplicate rows: same item, type and group added more than once.",
            );
        }

        const existingForFg =
            (await selectWithJoins(
                "modelprice",
                [],
                { companyId, finishedGoodsItemId, delete: 0 },
                ["modelPriceId"],
            )) || [];
        const isSecond = existingForFg.length > 0;
        const cleanName = String(modelName || "").trim();

        if (isSecond) {
            const refOk = existingForFg.some(
                (r) => Number(r.modelPriceId) === Number(referenceModelPriceId),
            );
            if (!refOk)
                return errorResponse(res, "Please select a valid Reference.");
            if (!cleanName)
                return errorResponse(res, "Model Price Name is required.");
            if (!effectiveDate)
                return errorResponse(res, "Effective Date is required.");
            if (String(effectiveDate).slice(0, 10) < todayLocal())
                return errorResponse(res, "Effective Date cannot be a past date.");
        }

        const { billNo } = await generateVoucherNo({
            companyId,
            financialYearId,
            tableName: "modelprice",
            idColumn: "modelPriceId",
            prefixFor: "MODELPRICE",
        });
        const totalValue = items.reduce((sum, row) => {
            const v = parseFloat(row.value);
            return sum + (Number.isNaN(v) ? 0 : v);
        }, 0);

        const header = await saveModel("modelprice", {
            companyId,
            financialYearId,
            modelPriceNo: billNo,
            finishedGoodsItemId,
            modelName: isSecond ? cleanName : null,
            referenceModelPriceId: isSecond ? Number(referenceModelPriceId) : null,
            effectiveDate: isSecond ? String(effectiveDate).slice(0, 10) : null,
            currentDate: currentDate || new Date(),
            totalValue: Number(totalValue.toFixed(2)),
            status: status || "active",
            createdBy: req.employeeId || null,
            delete: 0,
        });

        let order = 0;
        for (const row of items) {
            await saveModel("modelpriceitem", {
                modelPriceId: header.modelPriceId,
                itemId: Number(row.itemId),
                type: row.type,
                groupId: row.type === "BOM" ? row.groupId || null : null,
                subGroupId: row.type === "BOM" ? row.subGroupId || null : null,
                weight: row.weight != null ? String(row.weight) : null,
                rate: row.rate != null ? String(row.rate) : null,
                value: row.value != null ? String(row.value) : null,
                sortOrder: order++,
                delete: 0,
            });
        }

        return successResponse(
            res,
            { modelPriceId: header.modelPriceId },
            "Model Price created successfully",
        );
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

const getModelPriceList = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const headers = await selectWithJoins(
            "modelprice",
            [],
            { companyId, delete: 0 },
            [
                "modelPriceId",
                "finishedGoodsItemId",
                "modelName",
                "currentDate",
                "status",
                "created",
            ],
            [["modelPriceId", "DESC"]],
        );

        if (!headers || headers.length === 0) {
            return successResponse(res, [], "Model Price list fetched successfully");
        }

        const itemMap = await getItemMasterMap(companyId);

        // all lines of all listed models in ONE query
        const modelPriceIds = headers.map((h) => plain(h).modelPriceId);
        const lines = await selectWithJoins(
            "modelpriceitem",
            [],
            { modelPriceId: modelPriceIds, delete: 0 },
            ["modelPriceId", "type"],
            [["sortOrder", "ASC"]],
        );

        // group lines by modelPriceId
        const linesByModel = {};
        for (const l of lines || []) {
            const key = String(l.modelPriceId);
            if (!linesByModel[key]) linesByModel[key] = [];
            linesByModel[key].push(l.type);
        }

        const list = headers.map((h) => {
            const row = plain(h);
            const master = itemMap.get(Number(row.finishedGoodsItemId)) || {};
            const types = linesByModel[String(row.modelPriceId)] || [];
            return {
                modelPriceId: row.modelPriceId,
                finishedGoodsItemId: row.finishedGoodsItemId,
                modelName: row.modelName || master.itemName || "",
                itemCode: master.itemCode || "",
                itemName: master.itemName || "",
                modelPriceNo: row.modelPriceNo,
                effectiveDate: row.effectiveDate,
                currentDate: row.currentDate,
                totalValue: row.totalValue,
                status: row.status,
                created: row.created,
                componentCount: types.length,
                types: [...new Set(types)], // unique, e.g. ["BOM", "Quotation"]
            };
        });

        return successResponse(res, list, "Model Price list fetched successfully");
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

const getModelPriceById = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const { id } = req.params;

        const headers = await selectWithJoins(
            "modelprice",
            [],
            { modelPriceId: id, companyId, delete: 0 },
            [
                "modelPriceId",
                "finishedGoodsItemId",
                "modelName",
                "currentDate",
                "totalValue",
                "status",
            ],
        );
        if (!headers || headers.length === 0) {
            return requiredmessage(res, "Model Price not found");
        }
        const header = plain(headers[0]);

        const lines = await selectWithJoins(
            "modelpriceitem",
            [],
            { modelPriceId: id, delete: 0 },
            [
                "modelPriceItemId",
                "itemId",
                "type",
                "groupId",
                "subGroupId",
                "weight",
                "rate",
                "value",
                "sortOrder",
            ],
            [["sortOrder", "ASC"]],
        );

        const cmMap = await getCreateMasterMap(companyId);
        const itemMap = await getItemMasterMap(companyId);
        const fgMaster = itemMap.get(Number(header.finishedGoodsItemId)) || {};

        const groupIds = [
            ...new Set((lines || []).map((l) => l.groupId).filter(Boolean)),
        ];
        const subGroupIds = [
            ...new Set((lines || []).map((l) => l.subGroupId).filter(Boolean)),
        ];

        let groupMap = {};
        if (groupIds.length) {
            const gs = await selectWithJoins(
                "itemgroup",
                [],
                { itemGroupId: groupIds, companyId, delete: 0 },
                ["itemGroupId", "groupName"],
            );
            groupMap = (gs || []).reduce((a, g) => {
                a[String(g.itemGroupId)] = plain(g).groupName;
                return a;
            }, {});
        }

        let subGroupMap = {};
        if (subGroupIds.length) {
            const ss = await selectWithJoins(
                "subgroup",
                [],
                { subGroupId: subGroupIds, companyId, delete: 0 },
                ["subGroupId", "subGroupName"],
            );
            subGroupMap = (ss || []).reduce((a, s) => {
                a[String(s.subGroupId)] = plain(s).subGroupName;
                return a;
            }, {});
        }

        const components = (lines || []).map((l) => {
            const row = plain(l);
            const cm = cmMap.get(Number(row.itemId)) || {};
            return {
                modelPriceItemId: row.modelPriceItemId,
                itemId: row.itemId,
                itemDescription: cm.description || "",
                itemCode: cm.code || "",
                type: row.type,
                groupId: row.groupId,
                groupName: row.groupId ? groupMap[String(row.groupId)] || "" : "",
                subGroupId: row.subGroupId,
                subGroupName: row.subGroupId
                    ? subGroupMap[String(row.subGroupId)] || ""
                    : "",
                weight: row.weight,
                rate: row.rate,
                value: row.value,
                sortOrder: row.sortOrder,
            };
        });

        return successResponse(
            res,
            {
                modelPriceId: header.modelPriceId,
                finishedGoodsItemId: header.finishedGoodsItemId,
                finishedGoodsCode: fgMaster.itemCode || "",
                finishedGoodsName: fgMaster.itemName || "",
                modelName: header.modelName,
                modelPriceNo: header.modelPriceNo,
                referenceModelPriceId: header.referenceModelPriceId,
                effectiveDate: header.effectiveDate,
                currentDate: header.currentDate,
                totalValue: header.totalValue,
                status: header.status,
                components,
            },
            "Model Price fetched successfully",
        );
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

const updateModelPrice = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const {
            modelPriceId,
            finishedGoodsItemId,
            modelName,
            effectiveDate,
            currentDate,
            status,
            items,
        } = req.body;

        if (!modelPriceId) return errorResponse(res, "modelPriceId is required");
        if (!finishedGoodsItemId)
            return errorResponse(res, "Finished Goods is required");
        if (!Array.isArray(items) || items.length === 0) {
            return errorResponse(res, "Please add at least one component");
        }

        const existing = await selectWithJoins(
            "modelprice",
            [],
            { modelPriceId, companyId, delete: 0 },
            ["modelPriceId", "modelName", "referenceModelPriceId", "effectiveDate"],
        );
        if (!existing || existing.length === 0) {
            return requiredmessage(res, "Model Price not found");
        }

        const hasBom = await selectWithJoins(
            "bom",
            [],
            {
                companyId,
                finishedGoodsItemId,
                setupStatus: "complete",
                delete: 0,
            },
            ["bomId"],
        );
        if (!hasBom || hasBom.length === 0) {
            return errorResponse(
                res,
                "Selected Finished Goods does not have a complete BOM",
            );
        }
        const old = plain(existing[0]);
        const isSecond = !!old.referenceModelPriceId;
        const cleanName = String(modelName || "").trim();

        if (hasDuplicateLine(items))
            return errorResponse(res, "Duplicate rows: same item, type and group.");

        if (isSecond) {
            if (!cleanName)
                return errorResponse(res, "Model Price Name is required.");
            if (!effectiveDate)
                return errorResponse(res, "Effective Date is required.");
            const newEff = String(effectiveDate).slice(0, 10);
            const oldEff = old.effectiveDate ? String(old.effectiveDate).slice(0, 10) : null;
            if (newEff !== oldEff && newEff < todayLocal())
                return errorResponse(res, "Effective Date cannot be a past date.");
        }

        const cmMap = await getCreateMasterMap(companyId);
        const errors = [];
        items.forEach((row, idx) => {
            if (!cmMap.has(Number(row.itemId))) {
                errors.push({
                    row: idx + 1,
                    reason: `Item (createMasterId=${row.itemId}) not found in Create Master`,
                });
            }
            if (!["BOM", "Manual", "Quotation"].includes(row.type)) {
                errors.push({ row: idx + 1, reason: `Invalid type "${row.type}"` });
            }
            if (row.type === "BOM" && !row.groupId) {
                errors.push({
                    row: idx + 1,
                    reason: "Group is required when type is BOM",
                });
            }
        });
        if (errors.length > 0) {
            return errorResponse(
                res,
                `Validation failed (${errors.length} error(s))`,
                errors,
            );
        }

        const totalValue = items.reduce((sum, row) => {
            const v = parseFloat(row.value);
            return sum + (Number.isNaN(v) ? 0 : v);
        }, 0);

        await updateModelHelper(
            "modelprice",
            {
                finishedGoodsItemId,
                modelName: isSecond ? cleanName : old.modelName,
                effectiveDate: isSecond ? String(effectiveDate).slice(0, 10) : null,
                currentDate: currentDate || null,
                totalValue: Number(totalValue.toFixed(2)),
                status: status || "active",
                updated: new Date(),
            },
            { modelPriceId, companyId },
        );

        // soft-delete old lines
        await updateModelHelper(
            "modelpriceitem",
            { delete: 1, updated: new Date() },
            { modelPriceId },
        );

        let order = 0;
        for (const row of items) {
            await saveModel("modelpriceitem", {
                modelPriceId,
                itemId: Number(row.itemId),
                type: row.type,
                groupId: row.type === "BOM" ? row.groupId || null : null,
                subGroupId: row.type === "BOM" ? row.subGroupId || null : null,
                weight: row.weight != null ? String(row.weight) : null,
                rate: row.rate != null ? String(row.rate) : null,
                value: row.value != null ? String(row.value) : null,
                sortOrder: order++,
                delete: 0,
            });
        }

        return successResponse(res, {}, "Model Price updated successfully");
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

const deleteModelPrice = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");

        const { modelPriceId } = req.body;

        const existing = await selectWithJoins(
            "modelprice",
            [],
            { modelPriceId, companyId, delete: 0 },
            ["modelPriceId"],
        );
        if (!existing || existing.length === 0) {
            return requiredmessage(res, "Model Price not found");
        }

        await updateModelHelper(
            "modelprice",
            { delete: 1, updated: new Date() },
            { modelPriceId, companyId },
        );
        await updateModelHelper(
            "modelpriceitem",
            { delete: 1, updated: new Date() },
            { modelPriceId },
        );

        return successResponse(res, {}, "Model Price deleted successfully");
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};



const getNextModelPriceNo = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");
        const { financialYearId } = req.query;
        if (!financialYearId)
            return errorResponse(res, "Financial Year not found in session.");

        const { billNo } = await generateVoucherNo({
            companyId,
            financialYearId,
            tableName: "modelprice",
            idColumn: "modelPriceId",
            prefixFor: "MODELPRICE",
        });
        return successResponse(res, { modelPriceNo: billNo }, "Number generated");
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

const getReferenceOptions = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId)
            return requiredmessage(res, "Unauthorized. Please login again.");
        const finishedGoodsItemId = Number(req.query.finishedGoodsItemId) || null;
        if (!finishedGoodsItemId)
            return successResponse(res, [], "Select Finished Goods first");

        const rows = await selectWithJoins(
            "modelprice",
            [],
            { companyId, finishedGoodsItemId, delete: 0 },
            ["modelPriceId", "modelPriceNo", "modelName"],
            [["modelPriceId", "DESC"]],
        );
        const itemMap = await getItemMasterMap(companyId);
        const fgName = (itemMap.get(finishedGoodsItemId) || {}).itemName || "";

        const list = (rows || []).map(plain).map((r) => ({
            modelPriceId: r.modelPriceId,
            label: [r.modelPriceNo, r.modelName || fgName].filter(Boolean).join(" - "),
        }));
        return successResponse(res, list, "References fetched successfully");
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

module.exports = {
    getFinishedGoodsOptions,
    getCreateMasterOptions,
    getGroupOptions,
    getNextModelPriceNo,
    getReferenceOptions,
    getAutoFetchValues,
    createModelPrice,
    getModelPriceList,
    getModelPriceById,
    updateModelPrice,
    deleteModelPrice,
};