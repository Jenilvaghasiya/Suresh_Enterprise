import React, { forwardRef } from "react";
import "../styles/BillView.css";

const BillView = forwardRef(
  ({ invoice, products, customers, companies, copyType = "Original" }, ref) => {
    if (!invoice) return null;

    const customer = customers.find((c) => c.id === invoice.customerId) || {};
    const company =
      companies.find((c) => c.id === invoice.companyProfileId) || {};

    const getProductName = (item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? product.productName || product.name : "";
    };

    const convertToWords = (num) => {
      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
      ];
      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
      ];
      const teens = [
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];

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
    };

    const getAmountInWords = (amount) => {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) return "";

      const rupees = Math.floor(numAmount);
      const paise = Math.round((numAmount - rupees) * 100);

      let words = convertToWords(rupees) + " Rupees";

      if (paise > 0) {
        words += " and " + convertToWords(paise) + " Paise";
      }

      words += " Only";

      return words;
    };

    const calculateTotals = () => {
      const items = invoice.invoiceItems || [];
      const totalAssesValue = items.reduce(
        (sum, item) => sum + (parseFloat(item.amount) || 0),
        0
      );

      const gstRate = invoice.gstRate || invoice.GstMaster?.gstRate || 18;

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
        totalAssesValue: invoice.totalAssesValue || totalAssesValue.toFixed(2),
        sgstRate: invoice.sgstRate || gstRate / 2,
        cgstRate: invoice.cgstRate || gstRate / 2,
        igstRate: invoice.igstRate || gstRate,
        sgstAmount: sgstAmount.toFixed(2),
        cgstAmount: cgstAmount.toFixed(2),
        igstAmount: igstAmount.toFixed(2),
        billValue: invoice.billValue || billValue.toFixed(2),
        gstRate: gstRate,
      };
    };

    const formatBillNo = () => {
      const compId = String(company.id || "").padStart(4, "0").slice(-4);
      const gstFlag = String(invoice.gst).slice(0, 1);
      const invNum = String(invoice.billNumber || "").padStart(6, "0").slice(-6);
      const year = String(invoice.billYear || "").padStart(4, "0").slice(-4);
      return compId + gstFlag + invNum + year;
    };

    const totals = calculateTotals();
    const formatDateDDMMYYYY = (dateStr) => {
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
    };

    return (
      <div className="bill-container" ref={ref}>
        <div className="bill-header">
          <div className="header-left">
            <h3>GSTIN: {company.companyGstNumber || ""}</h3>
            <p>{company.companyAddress}</p>
          </div>
          <div className="header-center">
            <h1>{company.companyName || "Company Name"}</h1>
            <p>TAX INVOICE</p>
          </div>
          <div className="header-right">
            <h3>{copyType}</h3>
            <p>{company.companyAddress}</p>
          </div>
        </div>

        <div className="customer-details">
          <div className="customer-personal-details">
            <h4>
              <strong>M/s: </strong>
              {customer.customerName || ""}
            </h4>
            <div className="customer-address-details">
              <p>
                <strong>Address:</strong> {customer.billingAddress || ""}
              </p>
              <p>
                <strong>GSTIN:</strong> {customer.gstNumber || ""}
              </p>
              <p>
                <strong>State Code:</strong> {customer.stateCode || ""}
              </p>
            </div>
          </div>
          <div className="vertical-line"></div>
          <div className="bill-information">
            <p>
              <strong>Bill No. :</strong> {formatBillNo()}
            </p>
            <p>
              <strong>Bill Date:</strong> {formatDateDDMMYYYY(invoice.billDate)}
            </p>
            <p>
              <strong>Delivery At:</strong> {invoice.deliveryAt}
            </p>
            <p>
              <strong>Transport:</strong> {invoice.transport}
            </p>
            <p>
              <strong>L.R. No.:</strong> {invoice.lrNumber}
            </p>
          </div>
        </div>

        <div className="table-div">
          <table className="invoice-view-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Product Name</th>
                <th>HSN Code</th>
                <th>Quantity</th>
                <th>UOM</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoiceItems?.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{getProductName(item)}</td>
                  <td>{item.hsnCode}</td>
                  <td>{item.quantity}</td>
                  <td>{item.uom}</td>
                  <td>{item.rate}</td>
                  <td>{item.amount}</td>
                </tr>
              ))}

              {Array.from({
                length: Math.max(0, 28 - (invoice.invoiceItems?.length || 0)),
              }).map((_, i) => (
                <tr key={`empty-${i}`} className="empty-row">
                  <td>&nbsp;</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="customer-bank-totals-details">
          <div className="bank-details">
            <p>
              <strong>Bank Details</strong>
            </p>
            <p>
              <strong>Bank Name:</strong> {company.branchName || ""}
            </p>
            <p>
              <strong>Account No:</strong> {company.companyAccountNumber || ""}
            </p>
            <p>
              <strong>IFSC Code:</strong> {company.ifscCode || ""}
            </p>
            <p>
              <strong>Branch Name:</strong> {company.branchName || ""}
            </p>
          </div>
          <div className="totals-details">
            <div>
              <span>Total ASSE. VALUE: ₹{totals.totalAssesValue}</span>
            </div>
            {Number(invoice.gst) === 1 && (
              <>
                {parseFloat(totals.igstAmount) > 0 ? (
                  <>
                    <div>
                      <span>
                        IGST({totals.igstRate}%): ₹{totals.igstAmount}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span>
                        SGST({totals.sgstRate}%): ₹{totals.sgstAmount}
                      </span>
                    </div>
                    <div>
                      <span>
                        CGST({totals.cgstRate}%): ₹{totals.cgstAmount}
                      </span>
                    </div>
                    <div>
                      <span>IGST(0%): ₹0.00</span>
                    </div>
                  </>
                )}
              </>
            )}
            <div className="grand-total">
              <span>Bill VALUE: ₹{totals.billValue}</span>
            </div>
          </div>
        </div>
        <p className="amount-rupees-details">
          <strong>Rupees: </strong>
          {getAmountInWords(totals.billValue)}
        </p>

        <div className="bill-footer">
          <div className="terms-and-conditions-head">
            <h4>Terms & Conditions:</h4>
            <div className="terms">
              <p>
                <strong>1. </strong>Goods once sold will not be taken back.
              </p>
              <p>
                <strong>2. </strong>Our responsibility ends when the goods leave
                premises.
              </p>
              <p>
                <strong>3. </strong>Overdue interest will be 18% per annum.
              </p>
              <p>
                <strong>4. </strong>Subject to Rajkot Jurisdiction.
              </p>
            </div>
          </div>
          <div className="bill-authorize-sign">
            <p>
              <strong>For, {company.companyName || "Company"}</strong>
            </p>
            <p>
              <strong>Authorised Signature</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }
);

export default BillView;