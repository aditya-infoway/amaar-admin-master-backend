// controllers/superadmin/controller/bodyregistercontroller.js
const {
    errorResponse,
    successResponse,
    requiredmessage,
    saveModel,
    selectWithJoins,
} = require("../../../helper/index.js");

// ---- helper: auto values for a new body register ----
const bodyRegisterAuto = async (companyId, companyDetailsId) => {
    const rows = await selectWithJoins(
        "companydetails",
        [],
        { companyDetailsId, companyId, delete: 0 },
        ["companyName", "companyCode"],
    );

    if (!rows.length) return { error: "Company details not found." };

    const { companyName, companyCode } = rows[0];
    if (!companyCode) {
        return {
            error: "Company code is not set. Please add it in Settings > General.",
        };
    }

    const now = new Date();
    const year = now.getFullYear();

    // serial = highest serial used this year for this company + 1
    const used = await selectWithJoins(
        "bodyregister",
        [],
        { companyId, bodyYear: year },
        ["serialNo"],
        [["serialNo", "DESC"]],
    );
    const serialNo = (used.length ? Number(used[0].serialNo) : 0) + 1;

    return {
        companyName,
        bodyYear: year,
        serialNo,
        bodyNumber: `${companyCode}${year}${String(serialNo).padStart(3, "0")}`,
        mfgMonthYear: `${now.toLocaleString("en-US", { month: "short" })}-${year}`,
    };
};

// ---- GET /bodyregister/next?companyDetailsId= ----
const getNextBodyRegister = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId) {
            return requiredmessage(res, "Unauthorized. Please login again.");
        }

        const { companyDetailsId } = req.query;
        if (!companyDetailsId) {
            return requiredmessage(res, "companyDetailsId is required");
        }

        const auto = await bodyRegisterAuto(companyId, companyDetailsId);
        if (auto.error) return requiredmessage(res, auto.error);

        return successResponse(
            res,
            auto,
            "Body register details fetched successfully",
        );
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

// ---- POST /bodyregister/create ----
const createBodyRegister = async (req, res) => {
    try {
        const companyId = req.companyId;
        if (!companyId) {
            return requiredmessage(res, "Unauthorized. Please login again.");
        }

        const {
            workOrderId,
            companyDetailsId,
            vehicleType,
            classOfVehicle,
            typeOfBody,
            engineNo,
            noOfCylinder,
            fuelUsed,
            bodyColour,
            grossVehicleWeight,
        } = req.body;

        if (!workOrderId || !companyDetailsId) {
            return requiredmessage(
                res,
                "workOrderId and companyDetailsId are required",
            );
        }

        const already = await selectWithJoins(
            "bodyregister",
            [],
            { workOrderId, companyId, delete: 0 },
            ["bodyRegisterId"],
        );
        if (already.length) {
            return requiredmessage(
                res,
                "Body register already generated for this work order.",
            );
        }

        const auto = await bodyRegisterAuto(companyId, companyDetailsId);
        if (auto.error) return requiredmessage(res, auto.error);

        await saveModel("bodyregister", {
            companyId,
            workOrderId,
            vehicleType: vehicleType || "",
            classOfVehicle: classOfVehicle || "",
            makerName: auto.companyName,
            bodyNumber: auto.bodyNumber,
            serialNo: auto.serialNo,
            bodyYear: auto.bodyYear,
            engineNo: engineNo || "",
            noOfCylinder: noOfCylinder || "",
            fuelUsed: fuelUsed || "",
            mfgMonthYear: auto.mfgMonthYear,
            bodyColour: bodyColour || "",
            grossVehicleWeight: grossVehicleWeight || "",
            typeOfBody: typeOfBody || "",
            createdBy: String(req.employeeId || "Admin"),
            delete: 0,
        });

        return successResponse(
            res,
            { bodyNumber: auto.bodyNumber },
            "Body register saved successfully",
        );
    } catch (error) {
        return errorResponse(res, error.message || "Something Went Wrong", error);
    }
};

module.exports = {
    getNextBodyRegister,
    createBodyRegister,
};