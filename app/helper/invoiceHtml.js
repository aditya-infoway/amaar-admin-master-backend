const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// value ho tabhi "Label: value" line banao, warna skip
const line = (label, value) =>
  value ? `<b>${label}</b> ${esc(value)}<br/>` : "";

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const words = (n) => {
  if (n === 0) return "";
  if (n < 20) return ones[n] + " ";
  if (n < 100) return tens[Math.floor(n / 10)] + " " + ones[n % 10] + " ";
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + words(n % 100);
  if (n < 100000) return words(Math.floor(n / 1000)) + "Thousand " + words(n % 1000);
  if (n < 10000000) return words(Math.floor(n / 100000)) + "Lakh " + words(n % 100000);
  return words(Math.floor(n / 10000000)) + "Crore " + words(n % 10000000);
};

const amountInWords = (amount) => {
  const total = Math.round(Number(amount || 0) * 100);
  const rupees = Math.floor(total / 100);
  const paise = total % 100;
  let out = words(rupees).trim() || "Zero";
  out += " Rupees";
  if (paise) out += " and " + words(paise).trim() + " Paise";
  return out + " Only.";
};

const fmtDate = (d) => {
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`;
};

function buildInvoiceHtml({ company = {}, party = {}, sale = {}, items = [], isSameState }) {
  const itemRows = items
    .map(
      (i) => `
    <tr class="item">
      <td>${esc(i.itemCode)}</td>
      <td>${esc(i.hsnCode)}</td>
      <td>${esc(i.itemDescription)}</td>
      <td class="r">${fmt(i.basicPrice)}</td>
      <td class="c">${esc(i.uom)}</td>
      <td class="r">${Number(i.qty || 0).toFixed(3)}</td>
      <td class="r">${fmt(i.amount)}</td>
      <td class="r">${fmt(i.taxableAmount)}</td>
    </tr>`,
    )
    .join("");

  // tax slab wise grouping (CGST/SGST ya IGST)
  const slabs = {};
  items.forEach((i) => {
    const k = Number(i.taxPct) || 0;
    slabs[k] = slabs[k] || { taxable: 0, tax: 0 };
    slabs[k].taxable += Number(i.taxableAmount) || 0;
    slabs[k].tax += Number(i.taxAmount) || 0;
  });

  const taxRows = Object.entries(slabs)
    .map(([pct, v]) =>
      isSameState
        ? `<tr><td>CGST</td><td class="r">${fmt(pct / 2)}</td><td class="r">${fmt(v.taxable)}</td><td></td><td class="r">${fmt(v.tax / 2)}</td></tr>
           <tr><td>SGST</td><td class="r">${fmt(pct / 2)}</td><td class="r">${fmt(v.taxable)}</td><td></td><td class="r">${fmt(v.tax / 2)}</td></tr>`
        : `<tr><td>IGST</td><td class="r">${fmt(pct)}</td><td class="r">${fmt(v.taxable)}</td><td></td><td class="r">${fmt(v.tax)}</td></tr>`,
    )
    .join("");

  const totalTax =
    Number(sale.cgstAmount || 0) +
    Number(sale.sgstAmount || 0) +
    Number(sale.igstAmount || 0);
  const grand = Number(sale.grandTotal || 0);
  const subTotal =
    sale.subTotal != null
      ? Number(sale.subTotal)
      : Number(sale.taxableAmount || 0) + Number(sale.discountAmount || 0);

  const partyBlock = (title, place) => `
    <td class="half">
      <b>${title}</b><br/>
      <span class="muted">(${place})</span><br/>
      <b>${esc(party.accountName)}</b><br/>
      ${party.address ? esc(party.address) + "<br/>" : ""}
      ${line("State:", party.stateName)}
      ${line("GSTIN:", party.gstNo)}
      ${line("PAN:", party.panNo)}
    </td>`;

  // company.logo = data URI (base64), controller se aata hai
  const logoHtml = company.logo
    ? `<img src="${company.logo}" alt="logo"/>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice ${esc(sale.salesInvoiceNo)}</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
  th { background: #f2f2f2; text-align: center; }
  .r { text-align: right; } .c { text-align: center; }
  .half { width: 50%; } .muted { color: #444; }
  .title { text-align: center; font-size: 14px; font-weight: bold; }
  tr.item td { border-top: 0; border-bottom: 0; height: 26px; }
  .spacer td { height: 230px; border-top: 0; }
  .sign { height: 70px; text-align: right; vertical-align: bottom; }
  .logo-cell { width: 22%; text-align: center; vertical-align: middle; height: 115px; }
  .logo-cell img { max-width: 100%; max-height: 90px; object-fit: contain; }
  .info-cell { width: 40%; vertical-align: middle; line-height: 1.5; }
  .co-cell { width: 38%; vertical-align: middle; line-height: 1.5; }
  .co-name { font-size: 13px; font-weight: bold; }
  .top { position: relative; text-align: center; font-size: 14px; margin-bottom: 4px; }
  .top .orig { position: absolute; right: 0; top: 3px; font-size: 9px; font-style: italic; }
</style></head><body>
<div class="top">
  TAX INVOICE
  <span class="orig">ORIGINAL FOR RECIPIENT</span>
</div>

<table>
  <tr>
    <td class="logo-cell">${logoHtml}</td>
    <td class="info-cell">
      <div class="co-name">${esc(company.companyName)}</div>
      ${company.address ? esc(company.address) + "<br/>" : ""}
      ${line("Mobile:", company.mobileNo)}
      ${line("Email:", company.email)}
    </td>
    <td class="co-cell">
      ${company.state ? "<b>State:</b> " + esc(company.state) + (company.stateCode ? " (Code: " + esc(company.stateCode) + ")" : "") + "<br/>" : ""}
      ${line("GSTIN:", company.gstNo)}
      ${line("PAN:", company.panNo)}
    </td>
  </tr>
</table>

<table>
  <tr>
    ${partyBlock("Billed to:", "Place of Supply")}
    ${partyBlock("Shipped to:", "Place of Delivery")}
  </tr>
  <tr>
    <td>
      ${line("Invoice No:", sale.salesInvoiceNo)}
      ${line("Invoice Date:", fmtDate(sale.salesDate))}
      ${line("Terms:", sale.terms)}
    </td>
    <td>
      ${line("Sales Order No:", sale.salesOrderNo)}
    </td>
  </tr>
</table>

<table>
  <thead><tr>
    <th>Item Code</th>
    <th>HSN code of Goods/ SAC of Service</th>
    <th>Description of Goods or Service</th>
    <th>Rate/Unit (Rs)</th>
    <th>Unit of Qty.</th>
    <th>Total Qty.</th>
    <th>Value of goods or services (Rs.)</th>
    <th>Amount (Rs.)</th>
  </tr></thead>
  <tbody>
    ${itemRows}
    <tr class="spacer"><td></td><td></td><td>${esc(sale.narration)}</td><td></td><td></td><td></td><td></td><td></td></tr>
  </tbody>
</table>

<table>
  <tr>
    <td style="width:22%"><b>GST in words:</b></td>
    <td style="width:38%">${esc(amountInWords(totalTax))}</td>
    <td style="width:22%"><b>Value of Goods or Service</b></td>
    <td class="r">${fmt(subTotal)}</td>
  </tr>
  <tr>
    <td><b>TOTAL INVOICE VALUE (INR)</b></td>
    <td>${fmt(grand)}</td>
    <td><i>Less: Value of Discount or Abatement</i></td>
    <td class="r">${fmt(sale.discountAmount)}</td>
  </tr>
  <tr>
    <td>TOTAL INVOICE VALUE IN WORD:</td>
    <td>${esc(amountInWords(grand))}</td>
    <td>Total taxable value of Goods or Services</td>
    <td class="r">${fmt(sale.taxableAmount)}</td>
  </tr>
</table>

<table>
  <tr>
    <th>Taxes</th><th>Rate of Tax in %</th><th>Taxable value</th>
    <th>Taxable value for Reverse Charge</th><th>Tax amount</th>
  </tr>
  ${taxRows}
  <tr><td colspan="4"><b>Total value of GST Rs.</b></td><td class="r">${fmt(totalTax)}</td></tr>
  <tr><td colspan="4"><b>Total Rs.</b></td><td class="r"><b>${fmt(grand)}</b></td></tr>
</table>

<table>
  <tr>
    <td style="width:60%">Certified that the particulars given above are true and the amount indicated represents the price actually charged and that there is no flow of additional consideration directly or indirectly from the buyer.</td>
    <td class="sign">
      <b>FOR ${esc(company.companyName)}</b><br/><br/><br/>
      <b>AUTHORISED SIGNATORY</b><br/>(Name &amp; Designation of Signatory)
    </td>
  </tr>
</table>

</body></html>`;
}

module.exports = { buildInvoiceHtml };