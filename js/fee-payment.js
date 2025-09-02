class FeePaymentManager {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.bindEvents();
        this.loadDropdownOptions();
        this.refresh();
    }

    bindEvents() {
        const searchForm = document.getElementById('findStudentForm');
        const paymentForm = document.getElementById('feePaymentForm');
        
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.findStudent();
            });
        }

        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processPayment();
            });
        }

        // Bind paid amount change
        const paidAmountInput = document.getElementById('paidAmount');
        if (paidAmountInput) {
            paidAmountInput.addEventListener('input', () => {
                this.calculateDueAmount();
            });
        }

        // Initialize dropdown options when page loads
        this.loadDropdownOptions();
    }

    loadDropdownOptions() {
        // Load reference and received by options
        if (window.referenceManagementManager) {
            window.referenceManagementManager.updateReferenceDropdowns();
            window.referenceManagementManager.updateReceivedByDropdowns();
        }
    }

    toggleCustomReference() {
        const referenceSelect = document.getElementById('referenceSelect');
        const referenceCustom = document.getElementById('referenceCustom');
        
        if (referenceSelect.value === 'custom') {
            referenceCustom.style.display = 'block';
            referenceCustom.required = false; // Optional field
        } else {
            referenceCustom.style.display = 'none';
            referenceCustom.required = false;
            referenceCustom.value = '';
        }
    }

    toggleCustomReceivedBy() {
        const receivedBySelect = document.getElementById('receivedBySelect');
        const receivedByCustom = document.getElementById('receivedByCustom');
        
        if (receivedBySelect.value === 'custom') {
            receivedByCustom.style.display = 'block';
            receivedByCustom.required = true;
        } else {
            receivedByCustom.style.display = 'none';
            receivedByCustom.required = false;
            receivedByCustom.value = '';
        }
    }

    findStudent() {
        const searchValue = document.getElementById('searchStudentId').value.trim();
        if (!searchValue) {
            Utils.showToast('Please enter a student ID or name', 'error');
            return;
        }

        // Search by student ID first, then by name
        let student = window.storageManager.getStudentByStudentId(searchValue);
        
        if (!student) {
            // Search by name
            const students = window.storageManager.getStudents();
            student = students.find(s => 
                s.name.toLowerCase().includes(searchValue.toLowerCase())
            );
        }

        if (!student) {
            Utils.showToast('Student not found', 'error');
            this.hideStudentInfo();
            return;
        }

        this.displayStudentInfo(student);
        this.loadPaymentOptions(student);
    }

    displayStudentInfo(student) {
        const studentInfoDisplay = document.getElementById('studentInfoDisplay');
        const studentPaymentInfo = document.getElementById('studentPaymentInfo');
        
        if (!studentInfoDisplay || !studentPaymentInfo) return;

        const institution = window.storageManager.getInstitutionById(student.institutionId);
        const batch = window.storageManager.getBatchById(student.batchId);

        studentInfoDisplay.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">Name</div>
                <div class="detail-value">${student.name}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Student ID</div>
                <div class="detail-value">${student.studentId}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Institution</div>
                <div class="detail-value">${institution?.name || 'Unknown'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Batch</div>
                <div class="detail-value">${batch?.name || 'Unknown'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Phone</div>
                <div class="detail-value">${student.phone}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Guardian</div>
                <div class="detail-value">${student.guardianName} (${student.guardianPhone})</div>
            </div>
        `;

        studentPaymentInfo.style.display = 'block';
        
        // Store current student for payment processing
        this.currentStudent = student;
    }

    hideStudentInfo() {
        const studentPaymentInfo = document.getElementById('studentPaymentInfo');
        
        if (studentPaymentInfo) {
            studentPaymentInfo.style.display = 'none';
        }
        
        this.currentStudent = null;
    }

    findStudentById(studentId) {
        const student = window.storageManager.getStudentById(studentId);
        if (student) {
            // Navigate to pay fee page
            window.navigationManager.navigateTo('pay-fee');
            
            // Set the search input and trigger search
            document.getElementById('searchStudentId').value = student.studentId;
            this.findStudent();
        }
    }

    loadPaymentOptions(student) {
        const courseSelection = document.querySelector('#studentPaymentInfo #courseSelection');
        const monthSelection = document.querySelector('#studentPaymentInfo #monthSelection');
        
        if (!courseSelection || !monthSelection) return;

        // Get detailed month payment information
        const monthPaymentDetails = window.storageManager.getMonthPaymentDetails(student.id);
        
        // Store month payment details for later use
        this.monthPaymentDetails = monthPaymentDetails;
        
        // Get enrolled courses for this student
        const enrolledCourses = student.enrolledCourses || [];
        
        if (enrolledCourses.length === 0) {
            courseSelection.innerHTML = '<p>No courses enrolled for this student</p>';
            monthSelection.innerHTML = '<p>No courses available</p>';
            return;
        }
        
        // Display courses
        courseSelection.innerHTML = enrolledCourses.map(enrollment => {
            const course = window.storageManager.getCourseById(enrollment.courseId);
            if (!course) return '';
            return `
                <div class="checkbox-item">
                    <input type="checkbox" id="course_${course.id}" value="${course.id}" onchange="feePaymentManager.updateMonthSelection()">
                    <label for="course_${course.id}">${course.name}</label>
                </div>
            `;
        }).filter(html => html).join('');

        // Clear month selection initially
        monthSelection.innerHTML = '<p>Please select courses first</p>';
        
        // Reset amounts
        document.getElementById('totalAmount').value = '0';
        document.getElementById('paidAmount').value = '';
        document.getElementById('dueAmount').value = '0';
    }

    updateMonthSelection() {
        const studentPaymentInfo = document.getElementById('studentPaymentInfo');
        if (!studentPaymentInfo) return;
        
        const courseSelection = studentPaymentInfo.querySelector('#courseSelection');
        const monthSelection = studentPaymentInfo.querySelector('#monthSelection');
        
        if (!courseSelection || !monthSelection) return;

        const selectedCourses = Array.from(courseSelection.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        if (selectedCourses.length === 0) {
            monthSelection.innerHTML = '<p>Please select courses first</p>';
            this.calculateTotalAmount();
            return;
        }

        // Get months for selected courses, only from the enrolled starting month onwards
        let allMonths = [];
        selectedCourses.forEach(courseId => {
            // Find the enrollment info for this course
            const enrollment = this.currentStudent.enrolledCourses.find(e => e.courseId === courseId);
            if (!enrollment || !enrollment.startingMonthId) return;
            
            const allCourseMonths = window.storageManager.getMonthsByCourse(courseId)
                .sort((a, b) => (a.monthNumber || 0) - (b.monthNumber || 0));
            const course = window.storageManager.getCourseById(courseId);
            
            // Get starting month and filter months from that point onwards
            const startingMonth = window.storageManager.getMonthById(enrollment.startingMonthId);
            if (startingMonth) {
                const endingMonth = enrollment.endingMonthId ? window.storageManager.getMonthById(enrollment.endingMonthId) : null;
                
                let availableMonths = allCourseMonths.filter(month => 
                    (month.monthNumber || 0) >= (startingMonth.monthNumber || 0)
                );
                
                // If ending month is specified, filter out months after it
                if (endingMonth) {
                    availableMonths = availableMonths.filter(month => 
                        (month.monthNumber || 0) <= (endingMonth.monthNumber || 0)
                    );
                }
                
                availableMonths.forEach(month => {
                    allMonths.push({
                        ...month,
                        courseName: course?.name || 'Unknown'
                    });
                });
            }
        });
        
        // Display months with checkboxes
        monthSelection.innerHTML = allMonths.map(month => {
            const monthPayment = this.monthPaymentDetails[month.id];
            const totalPaid = monthPayment ? monthPayment.totalPaid : 0;
            const totalDiscount = monthPayment ? monthPayment.totalDiscount : 0;
            const totalCovered = totalPaid + totalDiscount;
            const remainingDue = Math.max(0, month.payment - totalCovered);
            const isFullyPaid = remainingDue <= 0;
            
            return `
                <div class="checkbox-item ${isFullyPaid ? 'paid-month' : (totalPaid > 0 ? 'partial-month' : '')}">
                    <input type="checkbox" 
                           id="month_${month.id}" 
                           value="${month.id}" 
                           data-amount="${remainingDue}" 
                           data-total-fee="${month.payment}"
                           data-paid-amount="${totalCovered}"
                           ${isFullyPaid ? 'checked disabled' : ''} 
                           onchange="feePaymentManager.calculateTotalAmount()">
                    <label for="month_${month.id}">
                        <span>${month.name} (${month.courseName}) ${isFullyPaid ? '✓ Fully Paid' : (totalPaid > 0 ? '⚠ Partial' : '')}</span>
                        <span class="course-fee">
                            ${isFullyPaid ? 
                                Utils.formatCurrency(month.payment) : 
                                (totalCovered > 0 ? 
                                    `${Utils.formatCurrency(remainingDue)} due (${Utils.formatCurrency(totalPaid)} paid${totalDiscount > 0 ? `, ${Utils.formatCurrency(totalDiscount)} discount` : ''})` : 
                                    Utils.formatCurrency(month.payment)
                                )
                            }
                        </span>
                    </label>
                </div>
            `;
        }).join('');
        
        this.calculateTotalAmount();
    }

    updateDiscountSelection() {
        const studentPaymentInfo = document.getElementById('studentPaymentInfo');
        if (!studentPaymentInfo) return;
        
        const monthSelection = studentPaymentInfo.querySelector('#monthSelection');
        const discountSelection = studentPaymentInfo.querySelector('#discountSelection');
        
        if (!monthSelection || !discountSelection) return;

        const selectedMonths = Array.from(monthSelection.querySelectorAll('input[type="checkbox"]:checked:not([disabled])'));
        
        if (selectedMonths.length === 0) {
            discountSelection.innerHTML = '<p>Please select courses and months first</p>';
            // Reset discount calculations when no months selected
            document.getElementById('discountedAmount').value = document.getElementById('totalAmount').value || 0;
            this.calculateDueAmount();
            return;
        }

        // Build discount selection HTML - start with all unchecked
        const discountHtml = selectedMonths.map(checkbox => {
            const monthId = checkbox.value;
            const monthFee = parseFloat(checkbox.dataset.amount || 0);
            const month = window.storageManager.getMonthById(monthId);
            const course = month ? window.storageManager.getCourseById(month.courseId) : null;
            const monthName = month ? month.name : 'Unknown Month';
            const courseName = course ? course.name : 'Unknown Course';
            
            return `
                <div class="checkbox-item discount-option">
                    <input type="checkbox" 
                           id="discount_${monthId}" 
                           value="${monthId}" 
                           data-amount="${monthFee}"
                           data-month-name="${monthName}"
                           data-course-name="${courseName}"
                           onchange="feePaymentManager.calculateDiscount()">
                    <label for="discount_${monthId}">
                        <span class="month-course-info">${monthName} (${courseName})</span>
                        <span class="course-fee">${Utils.formatCurrency(monthFee)}</span>
                    </label>
                </div>
            `;
        }).filter(html => html).join('');
        
        discountSelection.innerHTML = discountHtml;
        
        // Reset discount calculations when discount selection changes
        this.calculateDiscount();
    }

    calculateTotalAmount() {
        const studentPaymentInfo = document.getElementById('studentPaymentInfo');
        if (!studentPaymentInfo) return;
        
        const monthSelection = studentPaymentInfo.querySelector('#monthSelection');
        const totalAmountInput = document.getElementById('totalAmount');
        const discountedAmountInput = document.getElementById('discountedAmount');
        
        if (!monthSelection || !totalAmountInput) return;

        // Only count remaining due amounts for checked months
        const selectedMonths = Array.from(monthSelection.querySelectorAll('input[type="checkbox"]:checked:not([disabled])'));
        let totalAmount = 0;

        selectedMonths.forEach(checkbox => {
            totalAmount += parseFloat(checkbox.dataset.amount || 0);
        });

        totalAmountInput.value = totalAmount;
        
        // Update discount selection after calculating total
        this.updateDiscountSelection();
        
        // Calculate discount if inputs exist
        this.calculateDiscount();
    }

    calculateDiscount() {
        const totalAmount = parseFloat(document.getElementById('totalAmount').value || 0);
        const discountAmountInput = document.getElementById('discountAmount');
        const discountTypeSelect = document.getElementById('discountType');
        const discountedAmountInput = document.getElementById('discountedAmount');
        const studentPaymentInfo = document.getElementById('studentPaymentInfo');
        
        // Declare discountApplicableMonths at function scope
        let discountApplicableMonths = [];
        
        if (!discountAmountInput || !discountTypeSelect || !discountedAmountInput || !studentPaymentInfo) {
            return;
        }
        
        const discountSelection = studentPaymentInfo.querySelector('#discountSelection');
        
        let actualDiscountAmount = 0;
        const discountInputValue = parseFloat(discountAmountInput.value || 0);
        const discountType = discountTypeSelect.value || 'fixed';
        
        if (discountInputValue > 0 && discountSelection) {
            discountApplicableMonths = Array.from(discountSelection.querySelectorAll('input[type="checkbox"]:checked'));
            
            if (discountApplicableMonths.length > 0) {
                let discountableAmount = 0;
                
                // Calculate total amount eligible for discount
                discountApplicableMonths.forEach(discountCheckbox => {
                    const monthAmount = parseFloat(discountCheckbox.dataset.amount || 0);
                    discountableAmount += monthAmount;
                });
                
                if (discountType === 'percentage') {
                    // Validate percentage (max 100%)
                    let percentage = Math.min(discountInputValue, 100);
                    if (discountInputValue > 100) {
                        discountAmountInput.value = 100;
                        Utils.showToast('Percentage discount cannot exceed 100%', 'warning');
                    }
                    
                    actualDiscountAmount = (discountableAmount * percentage) / 100;
                } else {
                    // Fixed amount discount - cannot exceed discountable amount
                    actualDiscountAmount = Math.min(discountInputValue, discountableAmount);
                    
                    if (discountInputValue > discountableAmount) {
                        Utils.showToast(`Discount limited to ${Utils.formatCurrency(discountableAmount)} (maximum applicable amount)`, 'warning');
                    }
                }
            }
        }
        
        // Calculate final discounted amount
        const discountedTotal = parseFloat((totalAmount - actualDiscountAmount).toFixed(2));
        discountedAmountInput.value = discountedTotal;
        
        // Store the actual discount amount for later use
        this.currentActualDiscount = actualDiscountAmount;
        
        // Debug logging for discount calculation
        console.log('Discount Calculation:', {
            discountInputValue,
            discountType,
            discountableAmount: discountApplicableMonths.length > 0 ? 
                discountApplicableMonths.reduce((sum, cb) => sum + parseFloat(cb.dataset.amount || 0), 0) : 0,
            actualDiscountAmount,
            applicableMonths: discountApplicableMonths.length
        });
        
        // Update visual feedback for discount selection
        this.updateDiscountVisualFeedback(discountSelection, actualDiscountAmount > 0);
        
        // Update due amount calculation
        // Force update due amount calculation
        setTimeout(() => {
            this.calculateDueAmount();
        }, 0);
    }

    updateDiscountVisualFeedback(discountSelection, hasDiscount) {
        if (!discountSelection) return;
        
        const discountOptions = discountSelection.querySelectorAll('.discount-option');
        discountOptions.forEach(option => {
            const checkbox = option.querySelector('input[type="checkbox"]');
            
            if (hasDiscount) {
                if (checkbox.checked) {
                    option.classList.add('discount-applied');
                    option.classList.remove('discount-not-applied');
                } else {
                    option.classList.add('discount-not-applied');
                    option.classList.remove('discount-applied');
                }
            } else {
                option.classList.remove('discount-applied', 'discount-not-applied');
            }
        });
    }

    calculateDueAmount() {
        const discountedAmount = parseFloat(document.getElementById('discountedAmount').value || 0);
        const paidAmount = parseFloat(document.getElementById('paidAmount').value || 0);
        const dueAmountInput = document.getElementById('dueAmount');
        
        if (dueAmountInput) {
            const dueAmount = Math.max(0, discountedAmount - paidAmount);
            dueAmountInput.value = dueAmount.toFixed(2);
        }
    }

    async processPayment() {
        if (!this.currentStudent) {
            Utils.showToast('Please find a student first', 'error');
            return;
        }

        const studentPaymentInfo = document.getElementById('studentPaymentInfo');
        if (!studentPaymentInfo) return;
        
        const courseSelection = studentPaymentInfo.querySelector('#courseSelection');
        const monthSelection = studentPaymentInfo.querySelector('#monthSelection');
        const totalAmount = parseFloat(document.getElementById('totalAmount').value || 0);
        const discountedAmount = parseFloat(document.getElementById('discountedAmount').value || 0);
        const discountAmount = this.currentActualDiscount || 0;
        const discountType = document.getElementById('discountType').value;
        const paidAmount = parseFloat(document.getElementById('paidAmount').value || 0);
        
        // Get reference value
        const referenceSelect = document.getElementById('referenceSelect');
        const referenceCustom = document.getElementById('referenceCustom');
        const reference = referenceSelect.value === 'custom' ? 
            referenceCustom.value.trim() : 
            referenceSelect.value;
        
        // Get received by value
        const receivedBySelect = document.getElementById('receivedBySelect');
        const receivedByCustom = document.getElementById('receivedByCustom');
        const receivedBy = receivedBySelect.value === 'custom' ? 
            receivedByCustom.value.trim() : 
            receivedBySelect.value;

        // Get discount applicable months
        const discountSelection = studentPaymentInfo.querySelector('#discountSelection');
        const discountApplicableMonths = discountSelection ? 
            Array.from(discountSelection.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value) : [];

        const selectedCourses = Array.from(courseSelection.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        const selectedMonths = Array.from(monthSelection.querySelectorAll('input[type="checkbox"]:checked:not([disabled])'))
            .map(checkbox => ({
                monthId: checkbox.value,
                monthFee: parseFloat(checkbox.dataset.totalFee || 0),
                remainingDue: parseFloat(checkbox.dataset.amount || 0), // This is the remaining due amount
                alreadyPaid: parseFloat(checkbox.dataset.paidAmount || 0)
            }));

        if (selectedCourses.length === 0 || selectedMonths.length === 0) {
            Utils.showToast('Please select courses and months', 'error');
            return;
        }

        if (discountedAmount <= 0) {
            Utils.showToast('Total amount must be greater than 0', 'error');
            return;
        }

        if (paidAmount <= 0) {
            Utils.showToast('Paid amount must be greater than 0', 'error');
            return;
        }

        // Check if discount is applied and reference is required
        if (discountAmount > 0 && !reference) {
            Utils.showToast('Reference is required when discount is applied', 'error');
            return;
        }

        // Check if discount payment must be full
        if (discountAmount > 0 && paidAmount < discountedAmount) {
            Utils.showToast('Discounted payments cannot be partial. Please pay the full discounted amount.', 'error');
            return;
        }

        if (!receivedBy) {
            Utils.showToast('Please enter who received the payment', 'error');
            return;
        }

        const dueAmount = Math.max(0, discountedAmount - paidAmount);

        // Calculate how much to allocate to each month
        const monthPayments = this.calculateMonthPayments(selectedMonths, paidAmount, discountAmount, discountApplicableMonths);
        
        const payment = {
            studentId: this.currentStudent.id,
            studentName: this.currentStudent.name,
            studentStudentId: this.currentStudent.studentId,
            courses: selectedCourses,
            months: selectedMonths.map(m => m.monthId), // Keep backward compatibility
            monthPayments: monthPayments, // Detailed month payment info with actual allocations
            totalAmount,
            discountAmount,
            discountType,
            discountApplicableMonths,
            discountedAmount,
            paidAmount,
            dueAmount,
            reference,
            receivedBy
        };

        const savedPayment = await window.storageManager.addPayment(payment);
        
        if (savedPayment) {
            Utils.showToast('Payment processed successfully!', 'success');
            
            // Generate and show invoice
            window.invoiceManager.generateInvoice(savedPayment);
            
            // Reset form
            this.resetPaymentForm();
        }
    }

    calculateMonthPayments(selectedMonths, totalPaidAmount, discountAmount = 0, discountApplicableMonths = []) {
        const monthPayments = [];
        let remainingAmount = totalPaidAmount;
        
        // First, calculate discount distribution
        const discountDistribution = {};
        if (discountAmount > 0 && discountApplicableMonths.length > 0) {
            const discountType = document.getElementById('discountType').value;
            
            if (discountType === 'percentage') {
                const discountPercentage = parseFloat(document.getElementById('discountAmount').value || 0);
                discountApplicableMonths.forEach(monthId => {
                    const month = selectedMonths.find(m => m.monthId === monthId);
                    if (month) {
                        discountDistribution[monthId] = (month.remainingDue * discountPercentage) / 100;
                    }
                });
            } else {
                // Fixed amount - distribute equally among applicable months
                const applicableMonths = selectedMonths.filter(m => discountApplicableMonths.includes(m.monthId));
                
                if (applicableMonths.length > 0) {
                    const discountPerMonth = discountAmount / applicableMonths.length;
                    applicableMonths.forEach(month => {
                        // Ensure discount doesn't exceed the month's remaining due
                        discountDistribution[month.monthId] = Math.min(discountPerMonth, month.remainingDue);
                    });
                }
            }
        }
        
        // Distribute the paid amount across selected months
        for (const month of selectedMonths) {
            if (remainingAmount <= 0) break;
            
            // Get discount for this month
            const monthDiscount = discountDistribution[month.monthId] || 0;
            
            const discountedMonthDue = Math.max(0, month.remainingDue - monthDiscount);
            const amountForThisMonth = Math.min(remainingAmount, discountedMonthDue);
            
            monthPayments.push({
                monthId: month.monthId,
                monthFee: month.monthFee,
                paidAmount: amountForThisMonth,
                previouslyPaid: month.alreadyPaid,
                discountAmount: monthDiscount
            });
            
            remainingAmount -= amountForThisMonth;
        }
        
        return monthPayments;
    }
    
    resetPaymentForm() {
        document.getElementById('findStudentForm').reset();
        document.getElementById('feePaymentForm').reset();
        
        // Reset custom input fields
        document.getElementById('referenceCustom').style.display = 'none';
        document.getElementById('receivedByCustom').style.display = 'none';
        document.getElementById('referenceCustom').required = false;
        document.getElementById('receivedByCustom').required = false;
        
        this.hideStudentInfo();
    }

    refresh() {
        // Reset form and hide student info
        this.resetPaymentForm();
        this.loadDropdownOptions();
    }

    generateInvoice(payment) {
        const student = window.storageManager.getStudentById(payment.studentId);
        
        const invoiceData = {
            invoiceId: payment.id,
            student,
            payment,
            date: new Date().toLocaleDateString(),
            companyName: 'Break The Fear'
        };

        // Generate and download invoice
        this.downloadInvoice(invoiceData);
    }

    downloadInvoice(data) {
        const invoiceContent = `
            INVOICE - ${data.companyName}
            ================================
            
            Invoice ID: ${data.invoiceId}
            Date: ${data.date}
            
            Student Details:
            Name: ${data.student.name}
            ID: ${data.student.id}
            Institution: ${data.student.institution}
            Batch: ${data.student.batch}
            
            Payment Details:
            Course: ${data.payment.course}
            Months: ${data.payment.months.join(', ')}
            Total Amount: $${data.payment.amount}
            Paid: $${data.payment.paid}
            Due: $${data.payment.due}
            Reference: ${data.payment.reference}
            Received By: ${data.payment.receivedBy}
            
            Thank you for your payment!
        `;

        const blob = new Blob([invoiceContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${data.invoiceId}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    loadStudentData() {
        // Initialize any required data loading
    }

    showMessage(message, type) {
        // Create or update message display
        let messageDiv = document.getElementById('message-display');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'message-display';
            messageDiv.className = 'message';
            document.querySelector('.container').prepend(messageDiv);
        }

        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';

        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// Global fee payment manager instance
window.feePaymentManager = new FeePaymentManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.feePaymentManager = new FeePaymentManager();
});