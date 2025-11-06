const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class BillReportPDFService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/report/billReport.hsb');
    this.cssPath = path.join(__dirname, '../templates/report/billReport.css');
  }

  formatCurrency(amount) {
    const n = Number(amount || 0);
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return String(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  formatBillNo(invoice, company) {
    const compId = String(company?.id || '').padStart(4, '0').slice(-4);
    const gstFlag = String(invoice.gst ?? 0).slice(0, 1);
    const invNum = String(invoice.invoiceNumber || '').padStart(6, '0').slice(-6);
    const year = String(invoice.billYear || '').padStart(4, '0').slice(-4);
    return compId + gstFlag + invNum + year;
  }

  buildSummary(invoices) {
    const totals = invoices.reduce((acc, inv) => {
      acc.totalInvoices += 1;
      acc.assessable += Number(inv.totalAssesValue || 0);
      acc.sgst += Number(inv.sgstAmount || 0);
      acc.cgst += Number(inv.cgstAmount || 0);
      acc.igst += Number(inv.igstAmount || 0);
      return acc;
    }, { totalInvoices: 0, assessable: 0, sgst: 0, cgst: 0, igst: 0 });

    return {
      totalInvoices: totals.totalInvoices,
      totalAssessable: this.formatCurrency(totals.assessable),
      totalSgst: this.formatCurrency(totals.sgst),
      totalCgst: this.formatCurrency(totals.cgst),
      totalIgst: this.formatCurrency(totals.igst),
      grandTotal: this.formatCurrency(totals.assessable + totals.sgst + totals.cgst + totals.igst)
    };
  }

  async generateBillReportPDF(payload) {
    const [templateContent, cssContent] = await Promise.all([
      fs.readFile(this.templatePath, 'utf-8'),
      fs.readFile(this.cssPath, 'utf-8')
    ]);
    const template = handlebars.compile(templateContent);

    const { invoices = [], reportTitle = 'Customer Invoice Report', fromDate, toDate, customerNames = [], statusFilter = null } = payload;

    const company = invoices[0]?.CompanyProfile ? {
      name: invoices[0].CompanyProfile.companyName,
      address: invoices[0].CompanyProfile.companyAddress,
      gstin: invoices[0].CompanyProfile.companyGstNumber,
      phone: invoices[0].CompanyProfile.companyPhone,
      email: invoices[0].CompanyProfile.companyEmail,
    } : (payload.company || {});

    const rows = invoices.map((inv, idx) => ({
      srNo: idx + 1,
      invoiceNumber: this.formatBillNo(inv, inv.CompanyProfile || {}),
      billDate: this.formatDateDDMMYYYY(inv.billDate),
      customerName: inv.Customer?.customerName || 'N/A',
      deliverAt: inv.deliveryAt || 'N/A',
      transport: inv.transport || 'N/A',
      lrNumber: inv.lrNumber || 'N/A',
      assessValue: this.formatCurrency(inv.totalAssesValue || 0),
      sgst: this.formatCurrency(inv.sgstAmount || 0),
      cgst: this.formatCurrency(inv.cgstAmount || 0),
      igst: this.formatCurrency(inv.igstAmount || 0),
      status: inv.isActive ? 'Active' : 'Inactive',
      statusClass: inv.isActive ? 'status-active' : 'status-inactive'
    }));

    const summary = this.buildSummary(invoices);

    const html = template({
      css: cssContent,
      reportTitle,
      company,
      dateRange: fromDate || toDate ? `From: ${this.formatDateDDMMYYYY(fromDate)} To: ${this.formatDateDDMMYYYY(toDate)}` : null,
      customerFilter: (customerNames.length > 0) ? customerNames.join(', ') : 'All',
      statusFilter: statusFilter ? statusFilter : 'All',
      summary,
      rows,
      generatedOn: new Date().toLocaleString('en-IN', { hour12: false })
    });

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    await browser.close();
    return pdfBuffer;
  }
}

module.exports = new BillReportPDFService();
