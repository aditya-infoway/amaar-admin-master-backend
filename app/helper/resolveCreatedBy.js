// helper/resolveCreatedBy.js
const { selectWithJoins } = require("./index.js");

// 👇 Reserved fixed values — inke alawa jo bhi createdType aayega (Security, Sales Executive, 
// Sales Manager, ya koi bhi naya designation), wo sab "Employee" category maani jayegi
const RESERVED_TYPES = {
  SUPER_ADMIN: "Super Admin",
  BRANCH: "Branch", // abhi table exist nahi karti, isliye branch wala part commented rakha he
};

/**
 * rows: payment rows jinme createdBy + createdType columns hain
 * createdType ab designation store karta he (Security, Sales Executive, etc.) — 
 * "Employee" jaisa fixed string nahi. Isliye:
 * - createdType === "Super Admin" -> companydetails table
 * - createdType === "Branch"      -> branch table (abhi nahi bana, commented)
 * - baaki HAR value (chahe koi bhi designation ho) -> employee table
 */
const resolveCreatedByNames = async (rows) => {
  const map = {};

  const superAdminIds = [...new Set(
    rows.filter(r => r.createdType === RESERVED_TYPES.SUPER_ADMIN && r.createdBy != null)
        .map(r => r.createdBy)
  )];

  // ---- Branch ke liye reserved id filter (abhi table nahi he) ----
  // const branchIds = [...new Set(
  //   rows.filter(r => r.createdType === RESERVED_TYPES.BRANCH && r.createdBy != null)
  //       .map(r => r.createdBy)
  // )];

  // ---- Baaki sab (Security, Sales Executive, Sales Manager, ya koi bhi designation) -> Employee ----
  const employeeIds = [...new Set(
    rows.filter(r =>
      r.createdType !== RESERVED_TYPES.SUPER_ADMIN &&
      r.createdType !== RESERVED_TYPES.BRANCH &&
      r.createdBy != null
    ).map(r => r.createdBy)
  )];

  // ---- Super Admin -> companydetails table ----
  if (superAdminIds.length) {
    const companies = await selectWithJoins(
      "companydetails", [], { companyId: superAdminIds }, ["companyId", "companyName"]
    );
    companies.forEach(c => {
      map[`admin_${c.companyId}`] = c.companyName;
    });
  }

  // ---- Employee -> employee table (designation createdType mein already stored he, wahi dikhega) ----
  if (employeeIds.length) {
    try {
      const employees = await selectWithJoins(
        "employee", [], { id: employeeIds }, ["id", "employeeName"]
      );
      employees.forEach(e => {
        map[`emp_${e.id}`] = e.employeeName;
      });
    } catch (err) {
      // employee table naam/column mismatch ho to bhi crash na ho
    }
  }

  // ---- Branch -> branch table (abhi table exist nahi karti) ----
  // if (branchIds.length) {
  //   const branches = await selectWithJoins(
  //     "branch", [], { branchId: branchIds }, ["branchId", "branchName"]
  //   );
  //   branches.forEach(b => {
  //     map[`branch_${b.branchId}`] = b.branchName;
  //   });
  // }

  return map;
};

/**
 * ek row ke liye resolved naam nikalne ka helper
 * createdType ke exact value se nahi, balki category se map key banega
 */
const getCreatedByName = (map, createdType, createdBy) => {
  if (createdBy == null) return "";

  let key;
  if (createdType === RESERVED_TYPES.SUPER_ADMIN) {
    key = `admin_${createdBy}`;
  } else if (createdType === RESERVED_TYPES.BRANCH) {
    key = `branch_${createdBy}`; // branch table aane tak ye kabhi match nahi hoga, fallback chalega
  } else {
    key = `emp_${createdBy}`; // Security / Sales Executive / Sales Manager / koi bhi designation
  }

  return map[key] || String(createdBy);
};

module.exports = { resolveCreatedByNames, getCreatedByName, RESERVED_TYPES };