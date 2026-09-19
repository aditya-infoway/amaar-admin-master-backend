const fs = require("fs");
const path = require("path");
const { selectWithJoins } = require("./index.js");

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, dd] = String(d).slice(0, 10).split("-");
  return `${dd}-${m}-${y}`;
};

const getCompanyForMail = async (companyId) => {
  const rows = await selectWithJoins(
    "companydetails",
    [],
    { companyId, delete: 0 },
    ["companyName", "addressLine1", "addressLine2", "city", "pinCode", "state",
     "gstNo", "mobile", "phone", "email", "website", "logo"],
  );
  return rows[0] || {};
};

const buildPurchaseOrderMail = ({ company, supplier, poNumber, poDate, requiredDate, items }) => {
  const attachments = [];
  let logoHtml = "";
  const logoPath = company.logo ? path.join("./Uploadimages", company.logo) : "";
  if (logoPath && fs.existsSync(logoPath)) {
    attachments.push({ filename: path.basename(logoPath), path: logoPath, cid: "companylogo" });
    logoHtml = `<img src="cid:companylogo" alt="Logo" style="max-width:120px;max-height:80px;" />`;
  }

  const line = (v) => (v ? `${esc(v)}<br/>` : "");
  const companyAddr = [company.addressLine1, company.addressLine2].filter(Boolean).join(", ");
  const companyCity = [company.city, company.state, company.pinCode].filter(Boolean).join(", ");
  const vendorAddr = [supplier.addressLine1, supplier.addressLine2].filter(Boolean).join(", ");
  const vendorCity = [supplier.cityName, supplier.stateName, supplier.pincode].filter(Boolean).join(", ");

  const rows = items
    .map(
      (i) => `<tr>
        <td style="border:1px solid #333;padding:8px;">${esc(i.itemName)}</td>
        <td style="border:1px solid #333;padding:8px;text-align:right;">${esc(i.qty)} ${esc(i.uom)}</td>
      </tr>`,
    )
    .join("");



      const itemCount = items.length;
  const intro = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:700px;margin:0 auto 16px auto;line-height:1.6;">
    <p style="margin:0 0 10px 0;">Dear <strong>${esc(supplier.accountName)}</strong>,</p>
    ${company.companyName ? `<p style="margin:0 0 10px 0;">Greetings from <strong>${esc(company.companyName)}</strong>.</p>` : ""}
    <p style="margin:0 0 10px 0;">
      Please find below our Purchase Order <strong>${esc(poNumber)}</strong> dated
      <strong>${fmtDate(poDate)}</strong> for <strong>${itemCount}</strong> item${itemCount > 1 ? "s" : ""}.
      Kindly arrange to supply the items and quantities listed in the table below by
      <strong>${fmtDate(requiredDate)}</strong>.
    </p>
    <p style="margin:0;">
      Please reply to this email to confirm receipt of the order, or to let us know if any
      item is unavailable or the delivery date needs to change.
    </p>
  </div>`;

  const html = `
  ${intro}
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:700px;margin:auto;border:1px solid #333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #333;">
      <tr>
        <td width="30%" style="padding:12px;border-right:1px solid #333;text-align:center;">${logoHtml}</td>
        <td style="padding:12px;">
          <strong style="font-size:16px;">${esc(company.companyName)}</strong><br/>
          ${line(companyAddr)}${line(companyCity)}
          ${company.gstNo ? `GST No: ${esc(company.gstNo)}<br/>` : ""}
          ${company.mobile ? `Mobile: ${esc(company.mobile)}<br/>` : ""}
          ${line(company.email)}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #333;">
      <tr>
        <td width="55%" style="padding:12px;vertical-align:top;">
          <strong>Send to</strong><br/>
          <strong>${esc(supplier.accountName)}</strong><br/>
          ${line(vendorAddr)}${line(vendorCity)}
          ${supplier.gstNo ? `GST No: ${esc(supplier.gstNo)}<br/>` : ""}
          ${supplier.mobileNo ? `Mobile: ${esc(supplier.mobileNo)}` : ""}
        </td>
        <td style="padding:12px;vertical-align:top;">
          Date: <strong>${fmtDate(poDate)}</strong><br/>
          Required Date: <strong>${fmtDate(requiredDate)}</strong><br/>
          PO No: <strong>${esc(poNumber)}</strong>
        </td>
      </tr>
    </table>
    <div style="padding:12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr style="background:#f2f2f2;">
          <th style="border:1px solid #333;padding:8px;text-align:left;">Item Name</th>
          <th style="border:1px solid #333;padding:8px;text-align:right;width:120px;">Qty</th>
        </tr>
        ${rows}
      </table>
    </div>
  </div>`;

  return { subject: `Purchase Order ${poNumber} - ${company.companyName || ""}`, html, attachments };
};

module.exports = { getCompanyForMail, buildPurchaseOrderMail };