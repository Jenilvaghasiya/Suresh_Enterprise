const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class LedgerPDFService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/ledger/ledgerView.hsb');
    this.cssPath = path.join(__dirname, '../templates/ledger/ledgerView.css');
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
    return `${dd}-${mm}-${yyyy}`;
  }

  buildTransactions({ invoices = [], payments = [], fromDate, toDate, openingBalance = 0 }) {
    const start = fromDate ? new Date(fromDate) : null;
    const end = toDate ? new Date(toDate) : null;

    // Opening balance calculation: openingBalance + invoices before start - payments before start
    let opening = Number(openingBalance || 0);
    if (start) {
      const invBefore = invoices
        .filter(inv => new Date(inv.billDate) < start)
        .reduce((s, inv) => s + Number(inv.billValue ?? inv.totalAssesValue ?? 0), 0);
      const payBefore = payments
        .filter(p => new Date(p.createdAt || p.cheque_date || p.updatedAt || p.id) < start)
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      opening = opening + invBefore - payBefore;
    }

    const filterByRange = (date) => {
      const d = new Date(date);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    };

    const txns = [
      ...invoices
        .filter(inv => filterByRange(inv.billDate))
        .map(inv => ({
          date: new Date(inv.billDate),
          reference: inv.invoiceNumber || inv.billNumber || 'Invoice',
          credit: Number(inv.billValue ?? inv.totalAssesValue ?? 0),
          debit: 0,
          type: 'invoice'
        })),
      ...payments
        .filter(pay => filterByRange(pay.createdAt || pay.cheque_date))
        .map(pay => ({
          date: new Date(pay.createdAt || pay.cheque_date),
          reference: pay.remarks || pay.mode_payment || 'Payment',
          credit: 0,
          debit: Number(pay.amount || 0),
          type: 'payment'
        }))
    ].sort((a, b) => a.date - b.date);

    let running = opening;
    let sr = 1;
    const rows = txns.map(t => {
      running += t.credit - t.debit;
      return {
        srNo: sr++,
        date: this.formatDateDDMMYYYY(t.date),
        reference: t.reference,
        credit: t.credit > 0 ? this.formatCurrency(t.credit) : null,
        debit: t.debit > 0 ? this.formatCurrency(t.debit) : null,
        balance: this.formatCurrency(running)
      };
    });

    return {
      openingRow: { date: start ? this.formatDateDDMMYYYY(start) : '-', balance: this.formatCurrency(opening) },
      ledgerEntries: rows,
      closingBalance: running
    };
  }

  async generateLedgerPDF(payload) {
    const [templateContent, cssContent] = await Promise.all([
      fs.readFile(this.templatePath, 'utf-8'),
      fs.readFile(this.cssPath, 'utf-8')
    ]);
    const template = handlebars.compile(templateContent);

    const { openingRow, ledgerEntries, closingBalance } = this.buildTransactions({
      invoices: payload.invoices || [],
      payments: payload.payments || [],
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      openingBalance: payload.openingBalance || 0
    });

    const html = template({
      css: cssContent,
      company: payload.company || {},
      customer: payload.customer || {},
      dateRange: payload.dateRange || null,
      openingRow,
      ledgerEntries,
      closingBalance: this.formatCurrency(closingBalance),
      termsAndConditions: payload.termsAndConditions || [
        { number: 1, text: 'All payments should be made within 30 days from the invoice date.' },
        { number: 2, text: 'Overdue interest will be charged at 18% per annum.' },
        { number: 3, text: 'Any discrepancies in the ledger should be reported within 7 days.' },
        { number: 4, text: 'This is a system-generated report and does not require a signature.' },
        { number: 5, text: 'Subject to Rajkot Jurisdiction.' }
      ]
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

module.exports = new LedgerPDFService();
