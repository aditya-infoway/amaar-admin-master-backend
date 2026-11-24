const puppeteer = require("puppeteer");
const db = require("../../../modelses/index.js");
const {
  errorResponse,
  requiredmessage,
  getBlobTempPublicUrl,
} = require("../../../helper/index.js");

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const numberToWords = (num) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const hundreds = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + hundreds(n % 100) : "");
  };

  if (num === 0) return "Zero Only";
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;

  let out = "";
  if (crore) out += hundreds(crore) + " Crore ";
  if (lakh) out += hundreds(lakh) + " Lakh ";
  if (thousand) out += hundreds(thousand) + " Thousand ";
  if (rest) out += hundreds(rest);
  return out.trim() + " Only";
};

const printCashReceipt = async (req, res) => {
  let browser;
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const paymentId = Number(req.params.id);
    if (!paymentId) return requiredmessage(res, "Receipt id is required.");

    // ---- Receipt ----
    const receipt = await db.payment.findOne({
      where: { paymentId, companyId, voucherType: "CASH RECEIPT", delete: 0 },
      raw: true,
    });
    if (!receipt) return requiredmessage(res, "Cash Receipt not found.");

    // ---- Opp account (received from) ----
    const receiver = await db.account.findOne({
      where: { id: receipt.accountId, companyId },
      raw: true,
    });

    // ---- Company details (financial year ke companyDetailsId se, warna pehla) ----
    let company = null;
    if (receipt.financialYearId) {
      const fy = await db.financialyear.findOne({
        where: { financialYearId: receipt.financialYearId, companyId },
        raw: true,
      });
      if (fy?.companyDetailsId) {
        company = await db.companydetails.findOne({
          where: { companyDetailsId: fy.companyDetailsId, companyId, delete: 0 },
          raw: true,
        });
      }
    }
    if (!company) {
      company = await db.companydetails.findOne({
        where: { companyId, delete: 0 },
        raw: true,
      });
    }

    const amount = Number(receipt.amount);
    const amountInWords = numberToWords(Math.round(amount));
    const formattedDate = new Date(receipt.date).toLocaleDateString("en-GB");
    const logoUrl = company?.logo ? getBlobTempPublicUrl(company.logo) : "";

    const recvName = receiver?.accountName || "";
    const recvAddress =
      receiver?.address1 || receiver?.addressLine1 || receiver?.address || "-";
    const recvMobile = receiver?.mobile || "-";
    const recvPin = receiver?.pincode || receiver?.pinCode || "-";

    const renderCopy = (copyLabel) => `
  <div class="voucher">
    <div class="header-section">
      <div class="logo-wrap">
        ${
          logoUrl
            ? `<img src="${esc(logoUrl)}" class="company-logo" />`
            : `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`
        }
      </div>
      <div class="company-info">
        <div class="company-name">${esc(company?.companyName)}</div>
        <div class="company-details">${esc((company?.addressLine1 || "").toUpperCase())}</div>
        <div class="company-details">
          <b>Dist.</b> ${esc(company?.district || company?.city)}, <b>State:</b> ${esc(company?.state)}, <b>State Code:</b> ${esc(company?.stateCode)}, <b>Pin-</b>${esc(company?.pinCode)}.
        </div>
        ${company?.gstNo ? `<div class="company-details"><b>GSTIN/UIN:</b> ${esc(company.gstNo)}</div>` : ""}
        <div class="company-details"><b>PAN:</b> ${esc(company?.panNo)}</div>
      </div>
    </div>

    <div class="banner">
      <span>RECEIPT VOUCHER</span>
      <span class="copy-tag">${copyLabel}</span>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">Receipt Info</div>
        <table>
          <tr><td>Receipt No:</td><td>${esc(receipt.voucherNo)}</td></tr>
          <tr><td>Date:</td><td>${formattedDate}</td></tr>
          <tr><td>Payment Type:</td><td>${esc(receipt.paymentCollectedByModules || "CR")}</td></tr>
          <tr><td>Payment Mode:</td><td>${esc(receipt.paymentMode || "-")}</td></tr>
          <tr class="amount-row"><td>Amount:</td><td>₹ ${formatCurrency(amount)}</td></tr>
          <tr><td>Narration:</td><td>${esc(receipt.narration || "-")}</td></tr>
        </table>
      </div>
      <div class="panel">
        <div class="panel-title">Received With Thanks From</div>
        <table>
          <tr><td>Name:</td><td>${esc(recvName)}</td></tr>
          <tr><td>Address:</td><td>${esc(recvAddress)}</td></tr>
          <tr><td>Mobile No:</td><td>${esc(recvMobile)}</td></tr>
          <tr><td>Pin Code:</td><td>${esc(recvPin)}</td></tr>
        </table>
      </div>
    </div>

    <div class="sum-box">
      <div>
        <div class="sum-label">The Sum Of :</div>
        <div class="sum-words">${amountInWords}</div>
      </div>
      <div class="sum-amount">₹ ${formatCurrency(amount)}</div>
    </div>

    <div class="signature-section">
      <div class="signature-box">Signature of Customer</div>
      <div class="signature-box">Authorised Signatory</div>
    </div>
  </div>`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt Voucher</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 210mm; height: 297mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1f2937; padding: 14px 20px; background: #fff; }
  .voucher { border: 1px solid #d1d5db; margin-bottom: 16px; page-break-inside: avoid; }
  .header-section { display: flex; align-items: center; gap: 16px; padding: 12px 18px 10px; }
  .logo-wrap { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .company-logo { max-width: 60px; max-height: 60px; object-fit: contain; }
  .company-name { font-size: 19px; font-weight: 700; color: #1e40af; margin-bottom: 3px; }
  .company-details { font-size: 11px; line-height: 1.4; color: #1f2937; }
  .banner { background: #1e40af; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 8px 18px; font-weight: 700; font-size: 13px; letter-spacing: 0.3px; }
  .copy-tag { background: #fff; color: #1e40af; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 4px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px 18px; }
  .panel { border: 1px solid #d1d5db; }
  .panel-title { background: #1e40af; color: #fff; font-weight: 700; font-size: 11.5px; padding: 6px 14px; }
  .panel table { width: 100%; border-collapse: collapse; }
  .panel table td { padding: 8px 14px; font-size: 11.5px; border-bottom: 1px dashed #e5e7eb; vertical-align: top; }
  .panel table tr:last-child td { border-bottom: none; }
  .panel table td:first-child { color: #1f2937; font-weight: 600; width: 38%; white-space: nowrap; }
  .panel table td:last-child { color: #1f2937; font-weight: 600; }
  .panel table tr.amount-row td:last-child { font-weight: 700; font-size: 13px; color: #121418; }
  .tear-line { border-top: 1.5px dashed #0b5eec; margin: 0 0 16px; position: relative; }
  .tear-line::before { content: "✂"; position: absolute; left: -2px; top: -9px; font-size: 14px; color: #0658e6; background: #fff; padding: 0 4px; }
  .sum-box { margin: 0 18px 14px; border: 1.5px solid #1e40af; background: #eef2ff; display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; }
  .sum-label { font-size: 10.5px; color: #6b7280; margin-bottom: 1px; }
  .sum-words { font-weight: 700; font-size: 12.5px; color: #1e40af; }
  .sum-amount { font-size: 18px; font-weight: 700; color: #1e40af; }
  .signature-section { display: flex; justify-content: space-between; padding: 26px 18px 14px; }
  .signature-box { width: 220px; text-align: center; border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 11px; color: #374151; }
</style>
</head>
<body>
  ${renderCopy("Customer Copy")}
  <div class="tear-line"></div>
  ${renderCopy("Company Copy")}
</body>
</html>`;

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="receipt-${String(receipt.voucherNo).replace(/[^\w-]/g, "_")}.pdf"`,
    );
    res.setHeader("Content-Length", pdf.length);
    return res.end(pdf);
  } catch (error) {
    console.error("CASH RECEIPT PDF ERROR:", error);
    return errorResponse(res, "Failed to generate receipt PDF", error);
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { printCashReceipt };