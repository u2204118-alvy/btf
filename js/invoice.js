// Invoice Management
class InvoiceManager {
    constructor() {
        this.init();
    }

    init() {
        // Invoice functionality is ready
    }

    generateInvoice(payment) {
        const student = window.storageManager.getStudentById(payment.studentId);
        const institution = student ? window.storageManager.getInstitutionById(student.institutionId) : null;
        const batch = student ? window.storageManager.getBatchById(student.batchId) : null;

        // Get course and month details
        const courseDetails = payment.courses.map(courseId => {
            const course = window.storageManager.getCourseById(courseId);
            return course || { name: 'Unknown Course' };
        });

        const monthDetails = payment.months.map(monthId => {
            const month = window.storageManager.getMonthById(monthId);
            const course = month ? window.storageManager.getCourseById(month.courseId) : null;
            return {
                name: month?.name || 'Unknown Month',
                payment: month?.payment || 0,
                courseName: course?.name || 'Unknown Course'
            };
        });

        const invoiceHtml = this.createInvoiceHTML(payment, student, institution, batch, courseDetails, monthDetails);
        
        window.navigationManager.showModal('invoiceModal', 'Invoice', invoiceHtml);
    }

    createInvoiceHTML(payment, student, institution, batch, courseDetails, monthDetails) {
        return `
            <div class="invoice-container">
                <!-- Header Section -->
                <div class="thermal-header">
                    <div class="company-logo">
                        <h1>BREAK THE FEAR</h1>
                        <p>Professional Coaching Center</p>
                    </div>
                    <div class="company-details">
                        <p>Address: Comilla, Bangladesh</p>
                        <p>Phone: +880 1521-706839</p>
                        <p>Email: breakthefear.edu@gmail.com</p>
                    </div>
                </div>

                <!-- Invoice Info -->
                <div class="thermal-invoice-info">
                    <div class="invoice-title">PAYMENT RECEIPT</div>
                    <div class="invoice-details-row">
                        <span>Invoice #: ${payment.invoiceNumber}</span>
                    </div>
                    <div class="invoice-details-row">
                        <span>Date: ${Utils.formatDate(payment.createdAt)}</span>
                        <span>Time: ${Utils.formatTime(payment.createdAt)}</span>
                    </div>
                </div>

                <!-- Customer Info -->
                <div class="thermal-customer">
                    <div class="section-title">STUDENT INFORMATION</div>
                    <div class="customer-row">
                        <span class="label">Name:</span>
                        <span class="value">${student?.name || 'Unknown'}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">ID:</span>
                        <span class="value">${student?.studentId || 'Unknown'}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Phone:</span>
                        <span class="value">${student?.phone || 'N/A'}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Institution:</span>
                        <span class="value">${institution?.name || 'Unknown'}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Batch:</span>
                        <span class="value">${batch?.name || 'Unknown'}</span>
                    </div>
                </div>

                <!-- Items Section -->
                <div class="thermal-items">
                    <div class="section-title">PAYMENT DETAILS</div>
                    <div class="items-header">
                        <span class="item-desc">Description</span>
                        <span class="item-amount">Amount</span>
                    </div>
                    <div class="items-divider"></div>
                    ${monthDetails.map(month => `
                        <div class="item-row">
                            <span class="item-desc">
                                ${month.name}<br>
                                <small>(${month.courseName})</small>
                            </span>
                            <span class="item-amount">${Utils.formatCurrency(month.payment)}</span>
                        </div>
                    `).join('')}
                </div>

                <!-- Totals Section -->
                <div class="thermal-totals">
                    <div class="items-divider"></div>
                    <div class="total-row">
                        <span class="total-label">Subtotal:</span>
                        <span class="total-amount">${Utils.formatCurrency(payment.totalAmount)}</span>
                    </div>
                    ${payment.discountAmount > 0 ? `
                    <div class="total-row discount-row">
                        <span class="total-label">Discount ${payment.discountType === 'percentage' ? '(' + payment.discountAmount + '%)' : '(Fixed)'}:</span>
                        <span class="total-amount">-${Utils.formatCurrency(payment.discountAmount)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">After Discount:</span>
                        <span class="total-amount">${Utils.formatCurrency(payment.discountedAmount)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row paid-row">
                        <span class="total-label">PAID:</span>
                        <span class="total-amount">${Utils.formatCurrency(payment.paidAmount)}</span>
                    </div>
                    ${payment.dueAmount > 0 ? `
                    <div class="total-row due-row">
                        <span class="total-label">DUE:</span>
                        <span class="total-amount">${Utils.formatCurrency(payment.dueAmount)}</span>
                    </div>
                    ` : ''}
                    <div class="items-divider"></div>
                </div>

                <!-- Payment Info -->
                <div class="thermal-payment-info">
                    <div class="payment-row">
                        <span class="label">Received By:</span>
                        <span class="value">${payment.receivedBy}</span>
                    </div>
                    ${payment.reference ? `
                    <div class="payment-row">
                        <span class="label">Reference:</span>
                        <span class="value">${payment.reference}</span>
                    </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="thermal-footer">
                    <div class="thank-you">THANK YOU FOR YOUR PAYMENT!</div>
                    <div class="footer-note">
                        This is a computer generated receipt.<br>
                        No signature required.
                    </div>
                    <div class="footer-contact">
                        For queries: breakthefear.edu@gmail.com
                    </div>
                </div>

                <!-- Print Actions -->
                <div class="print-actions">
                    <button class="btn btn-primary" onclick="invoiceManager.printInvoice()">Print Receipt</button>
                    <button class="btn btn-outline" onclick="navigationManager.closeModal(document.getElementById('invoiceModal'))">Close</button>
                </div>
            </div>
        `;
    }

    printInvoice() {
        const invoiceContent = document.querySelector('.invoice-container');
        if (invoiceContent) {
            this.printInvoiceWithStyles(invoiceContent);
        }
    }

    printInvoiceWithStyles(element) {
        const printWindow = window.open('', '_blank');
        
        // Get all stylesheets from the current page
        const stylesheets = Array.from(document.styleSheets);
        let allStyles = '';
        
        // Extract CSS rules from all stylesheets
        stylesheets.forEach(stylesheet => {
            try {
                if (stylesheet.cssRules) {
                    Array.from(stylesheet.cssRules).forEach(rule => {
                        allStyles += rule.cssText + '\n';
                    });
                }
            } catch (e) {
                // Handle cross-origin stylesheets
                console.warn('Could not access stylesheet:', e);
            }
        });
        
        // Also get inline styles from style tags
        const styleTags = document.querySelectorAll('style');
        styleTags.forEach(styleTag => {
            allStyles += styleTag.textContent + '\n';
        });
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - Break The Fear</title>
                <meta charset="UTF-8">
                <style>
                    ${allStyles}
                    
                    /* Additional print-specific styles */
                    body {
                        margin: 0;
                        padding: 20px;
                        background: white !important;
                        font-family: 'Courier New', monospace !important;
                    }
                    
                    .invoice-container {
                        background: white !important;
                        color: #000 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 12px !important;
                        line-height: 1.3 !important;
                        max-width: 300px !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                    }
                    
                    .thermal-header {
                        text-align: center !important;
                        padding: 10px 15px !important;
                        border-bottom: 1px dashed #000 !important;
                        margin-bottom: 10px !important;
                    }
                    
                    .thermal-header .company-logo h1 {
                        font-size: 16px !important;
                        font-weight: bold !important;
                        margin: 0 0 5px 0 !important;
                        letter-spacing: 1px !important;
                        color: #000 !important;
                    }
                    
                    .thermal-header .company-logo p {
                        font-size: 10px !important;
                        margin: 0 0 8px 0 !important;
                        font-weight: normal !important;
                        color: #000 !important;
                    }
                    
                    .thermal-header .company-details p {
                        font-size: 9px !important;
                        margin: 1px 0 !important;
                        color: #333 !important;
                    }
                    
                    .thermal-invoice-info {
                        padding: 8px 15px !important;
                        border-bottom: 1px dashed #000 !important;
                        margin-bottom: 10px !important;
                    }
                    
                    .invoice-title {
                        text-align: right !important;
                        font-size: 14px !important;
                        font-weight: bold !important;
                        margin-bottom: 8px !important;
                        letter-spacing: 1px !important;
                        color: #000 !important;
                    }
                    
                    .invoice-details-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 10px !important;
                        margin-bottom: 2px !important;
                        color: #000 !important;
                    }
                    
                    .thermal-customer {
                        padding: 8px 15px !important;
                        border-bottom: 1px dashed #000 !important;
                        margin-bottom: 10px !important;
                    }
                    
                    .section-title {
                        font-size: 11px !important;
                        font-weight: bold !important;
                        margin-bottom: 6px !important;
                        text-align: center !important;
                        letter-spacing: 0.5px !important;
                        color: #000 !important;
                    }
                    
                    .customer-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 10px !important;
                        margin-bottom: 2px !important;
                        color: #000 !important;
                    }
                    
                    .customer-row .label {
                        font-weight: bold !important;
                        min-width: 80px !important;
                        color: #000 !important;
                    }
                    
                    .customer-row .value {
                        text-align: right !important;
                        flex: 1 !important;
                        color: #000 !important;
                    }
                    
                    .thermal-items {
                        padding: 8px 15px !important;
                        margin-bottom: 10px !important;
                    }
                    
                    .items-header {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 10px !important;
                        font-weight: bold !important;
                        margin-bottom: 5px !important;
                        color: #000 !important;
                    }
                    
                    .items-header .item-desc {
                        flex: 1 !important;
                    }
                    
                    .items-header .item-amount {
                        text-align: right !important;
                        min-width: 60px !important;
                    }
                    
                    .items-divider {
                        border-top: 1px dashed #000 !important;
                        margin: 5px 0 !important;
                    }
                    
                    .item-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 10px !important;
                        margin-bottom: 4px !important;
                        align-items: flex-start !important;
                        color: #000 !important;
                    }
                    
                    .item-row .item-desc {
                        flex: 1 !important;
                        padding-right: 10px !important;
                    }
                    
                    .item-row .item-desc small {
                        font-size: 8px !important;
                        color: #666 !important;
                    }
                    
                    .item-row .item-amount {
                        text-align: right !important;
                        min-width: 60px !important;
                        font-weight: bold !important;
                        color: #000 !important;
                    }
                    
                    .thermal-totals {
                        padding: 0 15px !important;
                        margin-bottom: 10px !important;
                    }
                    
                    .total-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 10px !important;
                        margin-bottom: 2px !important;
                        color: #000 !important;
                    }
                    
                    .total-row .total-label {
                        font-weight: bold !important;
                        color: #000 !important;
                    }
                    
                    .total-row .total-amount {
                        text-align: right !important;
                        font-weight: bold !important;
                        min-width: 60px !important;
                        color: #000 !important;
                    }
                    
                    .discount-row {
                        color: #dc267f !important;
                    }
                    
                    .paid-row {
                        font-size: 12px !important;
                        font-weight: bold !important;
                        border-top: 1px solid #000 !important;
                        border-bottom: 1px solid #000 !important;
                        padding: 3px 0 !important;
                        margin: 5px 0 !important;
                        color: #000 !important;
                    }
                    
                    .due-row {
                        color: #dc3545 !important;
                        font-weight: bold !important;
                    }
                    
                    .thermal-payment-info {
                        padding: 8px 15px !important;
                        border-bottom: 1px dashed #000 !important;
                        margin-bottom: 10px !important;
                    }
                    
                    .payment-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 10px !important;
                        margin-bottom: 2px !important;
                        color: #000 !important;
                    }
                    
                    .payment-row .label {
                        font-weight: bold !important;
                        min-width: 80px !important;
                        color: #000 !important;
                    }
                    
                    .payment-row .value {
                        text-align: right !important;
                        flex: 1 !important;
                        color: #000 !important;
                    }
                    
                    .thermal-footer {
                        padding: 10px 15px !important;
                        text-align: center !important;
                    }
                    
                    .thank-you {
                        font-size: 12px !important;
                        font-weight: bold !important;
                        margin-bottom: 8px !important;
                        letter-spacing: 1px !important;
                        color: #000 !important;
                    }
                    
                    .footer-note {
                        font-size: 9px !important;
                        margin-bottom: 8px !important;
                        line-height: 1.2 !important;
                        color: #000 !important;
                    }
                    
                    .footer-contact {
                        font-size: 8px !important;
                        color: #666 !important;
                    }
                    
                    .print-actions {
                        display: none !important;
                    }
                    
                    @page {
                        margin: 0.5in;
                        size: auto;
                    }
                </style>
            </head>
            <body>
                ${element.outerHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
}

// Global invoice manager instance
window.invoiceManager = new InvoiceManager();
