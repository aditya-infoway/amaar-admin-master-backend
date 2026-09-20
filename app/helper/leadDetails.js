const { selectWithJoins } = require("./index.js");

// Lead details are never copied into quotation / sales order. Always read them live from the lead.
const getLeadMap = async (leadIds, companyId) => {
  const ids = [
    ...new Set(
      leadIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (!ids.length) return new Map();

  const rows = await selectWithJoins(
    "lead",
    [],
    { leadId: ids, companyId },
    ["leadId", "leadCode", "name", "number", "email", "address", "city", "model", "remark"],
  );
  return new Map(rows.map((l) => [String(l.leadId), l]));
};

// Same keys the frontend already receives
const leadDetails = (lead) => ({
  leadCode: lead?.leadCode || "",
  customerName: lead?.name || "",
  mobile: lead?.number || "",
  email: lead?.email || "",
  address: lead?.address || "",
  city: lead?.city || "",
  model: lead?.model ? String(lead.model) : "",
  remark: lead?.remark || "",
});



// work order has no leadId: work order -> sales order -> lead
const getLeadMapBySalesOrder = async (salesOrderIds, companyId) => {
  const ids = [
    ...new Set(
      salesOrderIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (!ids.length) return new Map();

  const salesOrders = await selectWithJoins(
    "salesorder",
    [],
    { salesOrderId: ids, companyId },
    ["salesOrderId", "leadId"],
  );
  const leadMap = await getLeadMap(salesOrders.map((s) => s.leadId), companyId);

  return new Map(
    salesOrders.map((s) => [String(s.salesOrderId), leadMap.get(String(s.leadId))]),
  );
};

module.exports = { getLeadMap, leadDetails, getLeadMapBySalesOrder };

