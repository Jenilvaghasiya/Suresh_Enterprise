const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class PDFService {
    constructor() {
        this.templatePath = path.join(__dirname, '../templates/bill/billView.hsb');
        this.cssPath = path.join(__dirname, '../templates/bill/billView.css');
    }

    convertToWords(num) {
        const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

        if (num === 0) return "Zero";

        const convertHundreds = (n) => {
            let str = "";
            if (n > 99) {
                str += ones[Math.floor(n / 100)] + " Hundred ";
                n %= 100;
            }
            if (n > 19) {
                str += tens[Math.floor(n / 10)] + " ";
                n %= 10;
            } else if (n >= 10) {
                str += teens[n - 10] + " ";
                return str;
            }
            if (n > 0) {
                str += ones[n] + " ";
            }
            return str;
        };

        let word = "";
        const crore = Math.floor(num / 10000000);
        if (crore > 0) {
            word += convertHundreds(crore) + "Crore ";
            num %= 10000000;
        }

        const lakh = Math.floor(num / 100000);
        if (lakh > 0) {
            word += convertHundreds(lakh) + "Lakh ";
            num %= 100000;
        }

        const thousand = Math.floor(num / 1000);
        if (thousand > 0) {
            word += convertHundreds(thousand) + "Thousand ";
            num %= 1000;
        }

        if (num > 0) {
            word += convertHundreds(num);
        }

        return word.trim();
    }

    getAmountInWords(amount) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return "";

        const rupees = Math.floor(numAmount);
        const paise = Math.round((numAmount - rupees) * 100);

        let words = this.convertToWords(rupees) + " Rupees";

        if (paise > 0) {
            words += " and " + this.convertToWords(paise) + " Paise";
        }

        words += " Only";
        return words;
    }

    calculateTotals(invoice) {
        const items = invoice.invoiceItems || [];
        const totalAssesValue = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        const gstRate = invoice.gstRate || 18;
        const taxAmount = (totalAssesValue * gstRate) / 100;

        const hasBackendValues = 
            invoice.sgstAmount !== undefined &&
            invoice.cgstAmount !== undefined &&
            invoice.igstAmount !== undefined;

        let sgstAmount, cgstAmount, igstAmount;

        if (hasBackendValues) {
            sgstAmount = parseFloat(invoice.sgstAmount || 0);
            cgstAmount = parseFloat(invoice.cgstAmount || 0);
            igstAmount = parseFloat(invoice.igstAmount || 0);
        } else {
            sgstAmount = taxAmount / 2;
            cgstAmount = taxAmount / 2;
            igstAmount = taxAmount;
        }

        const billValue = totalAssesValue + taxAmount;

        return {
            totalAssesValue: Number(invoice.totalAssesValue ?? totalAssesValue).toFixed(2),
            sgstRate: Number(invoice.sgstRate ?? (gstRate / 2)).toFixed(2),
            cgstRate: Number(invoice.cgstRate ?? (gstRate / 2)).toFixed(2),
            igstRate: Number(invoice.igstRate ?? gstRate).toFixed(2),
            sgstAmount: Number(sgstAmount).toFixed(2),
            cgstAmount: Number(cgstAmount).toFixed(2),
            igstAmount: Number(igstAmount).toFixed(2),
            billValue: Number(invoice.billValue ?? billValue).toFixed(2),
            gstRate: gstRate,
            hasIgst: parseFloat(igstAmount) > 0
        };
    }

    formatBillNo(invoice, company) {
        const compId = String(company.id || "").padStart(4, "0").slice(-4);
        const gstFlag = String(invoice.gst).slice(0, 1);
        const invNum = String(invoice.billNumber || "").padStart(6, "0").slice(-6);
        const year = String(invoice.billYear || "").padStart(4, "0").slice(-4);
        return compId + gstFlag + invNum + year;
    }

    formatDateDDMMYYYY(dateStr) {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d)) {
            const base = String(dateStr).slice(0, 10);
            const parts = base.split("-");
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return base;
        }
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    }

    async generateBillPDF(invoice, copyType = "Original") {
        try {
            // Resolve template and CSS based on selected company invoice template
            const invoicePlain = invoice?.get ? invoice.get({ plain: true }) : (invoice || {});
            const company = invoicePlain.CompanyProfile || {};
            const tplKeyRaw = (company.invoiceTemplate || 'view1').toString().toLowerCase();
            console.log(company.invoiceTemplate);
            const tplKey = ['view1','view2','view3','view4'].includes(tplKeyRaw) ? tplKeyRaw : 'view1';

            const templateFile = tplKey === 'view1' ? 'billView1.hsb'
                : tplKey === 'view2' ? 'billView2.hsb'
                : tplKey === 'view3' ? 'billView3.hsb'
                : tplKey === 'view4' ? 'billView4.hsb'
                : 'billView1.hsb';
            const cssFile = tplKey === 'view1' ? 'billView1.css'
                : tplKey === 'view2' ? 'billView2.css'
                : tplKey === 'view3' ? 'billView3.css'
                : tplKey === 'view4' ? 'billView4.css'
                : 'billView1.css';

            let templatePath = path.join(__dirname, '../templates/bill', templateFile);
            let cssPath = path.join(__dirname, '../templates/bill', cssFile);

            // Fallback to base template if specific files are missing
            try {
                await fs.access(templatePath);
            } catch {
                templatePath = path.join(__dirname, '../templates/bill', 'billView.hsb');
            }
            try {
                await fs.access(cssPath);
            } catch {
                cssPath = path.join(__dirname, '../templates/bill', 'billView.css');
            }

            // Read template and CSS
            const [templateContent, cssContent] = await Promise.all([
                fs.readFile(templatePath, 'utf-8'),
                fs.readFile(cssPath, 'utf-8')
            ]);

            // Compile template
            const template = handlebars.compile(templateContent);

            // Prepare data
            const customer = invoicePlain.Customer || {};
            // company already resolved above
            const totals = this.calculateTotals(invoicePlain);

            // Prepare items with serial numbers
            const items = (invoicePlain.invoiceItems || []).map((item, index) => ({
                srNo: index + 1,
                productName: item.product?.productName || item.product?.name || "",
                hsnCode: item.hsnCode,
                quantity: item.quantity,
                uom: String(item.uom ?? '').toUpperCase(),
                rate: Number(item.rate ?? 0).toFixed(2),
                amount: Number(item.amount ?? (Number(item.rate ?? 0) * Number(item.quantity ?? 1))).toFixed(2)
            }));

            // Add empty rows to reach a compact total row count to fit A4 one-page
            const targetRows = 17;
            const emptyRowsCount = Math.max(0, targetRows - items.length);
            const emptyRows = Array(emptyRowsCount).fill({});

            const data = {
                css: cssContent,
                copyType,
                invoice: invoicePlain,
                customer,
                company,
                billNo: this.formatBillNo(invoicePlain, company),
                billDate: this.formatDateDDMMYYYY(invoicePlain.billDate),
                items,
                emptyRows,
                totals,
                isGst: Number(invoicePlain.gst) === 1,
                amountInWords: this.getAmountInWords(totals.billValue)
            };

            // Generate HTML
            const html = template(data);

            // Launch browser and generate PDF
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'domcontentloaded' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });

            await browser.close();

            return pdfBuffer;
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }
}

module.exports = new PDFService();