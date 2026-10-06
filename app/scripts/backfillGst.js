const { selectWithJoins } = require("../helper/index.js");
const { backfillGst } = require("../helper/gstLedger.js");

(async () => {
  try {
    const arg = Number(process.argv[2]);
    const ids = arg
      ? [arg]
      : (await selectWithJoins("company", [], { delete: 0 }, ["companyId"])).map((c) => c.companyId);
    for (const id of ids) console.log(id, await backfillGst(id));
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();