// Reports Management
class ReportsManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateCourseDropdown();
    }

    bindEvents() {
        // Generate Report Button
        document.getElementById('generateReport').addEventListener('click', () => {
            this.generateReport();
        });

        // Report Type Change
        document.getElementById('reportType').addEventListener('change', () => {
            this.updateDateFields();
        });

        // Course Change for Month Filter
        document.getElementById('reportCourse').addEventListener('change', () => {
            this.updateMonthFilter();
        });

        // Discount Reports
        document.getElementById('generateDiscountReport').addEventListener('click', () => {
            this.generateDiscountReport();
        });
    }

    updateDateFields() {
        const reportType = document.getElementById('reportType').value;
        const dateField = document.getElementById('reportDate');
        
        switch (reportType) {
            case 'date':
                dateField.type = 'date';
                dateField.style.display = 'block';
                break;
            case 'week':
                dateField.type = 'week';
                dateField.style.display = 'block';
                break;
            case 'month':
                dateField.type = 'month';
                dateField.style.display = 'block';
                break;
            case 'course':
                dateField.style.display = 'none';
                break;
        }
    }

    updateCourseDropdown() {
        const courseSelect = document.getElementById('reportCourse');
        const courses = window.storageManager.getCourses();
        
        courseSelect.innerHTML = '<option value="">All Courses</option>' +
            courses.map(course => {
                const batch = window.storageManager.getBatchById(course.batchId);
                return `<option value="${course.id}">${course.name} (${batch?.name || 'Unknown Batch'})</option>`;
            }).join('');
    }

    updateMonthFilter() {
        const reportType = document.getElementById('reportType').value;
        const selectedCourse = document.getElementById('reportCourse').value;
        
        // Only show month filter when report type is 'month' and a course is selected
        let monthFilterHtml = '';
        if (reportType === 'month' && selectedCourse) {
            const months = window.storageManager.getMonthsByCourse(selectedCourse)
                .sort((a, b) => (a.monthNumber || 0) - (b.monthNumber || 0));
            
            if (months.length > 0) {
                monthFilterHtml = `
                    <div class="form-group">
                        <label for="reportMonth">Select Month</label>
                        <select id="reportMonth">
                            <option value="">All Months</option>
                            ${months.map(month => 
                                `<option value="${month.id}">${month.name} (${Utils.formatCurrency(month.payment)})</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            }
        }
        
        // Update the filter group to include month filter
        const filterGroup = document.querySelector('.filter-group');
        const existingMonthFilter = document.getElementById('reportMonth');
        if (existingMonthFilter) {
            existingMonthFilter.closest('.form-group').remove();
        }
        
        if (monthFilterHtml) {
            const generateButton = document.getElementById('generateReport');
            generateButton.insertAdjacentHTML('beforebegin', monthFilterHtml);
        }
    }

    generateReport() {
        const reportType = document.getElementById('reportType').value;
        const reportDate = document.getElementById('reportDate').value;
        const reportCourse = document.getElementById('reportCourse').value;
        const reportMonth = document.getElementById('reportMonth')?.value;

        let filteredPayments = window.storageManager.getPayments();

        // Apply filters based on report type
        switch (reportType) {
            case 'date':
                if (reportDate) {
                    filteredPayments = this.filterByDate(filteredPayments, new Date(reportDate));
                }
                break;
            case 'week':
                if (reportDate) {
                    filteredPayments = this.filterByWeek(filteredPayments, new Date(reportDate));
                }
                break;
            case 'month':
                if (reportDate) {
                    filteredPayments = this.filterByMonth(filteredPayments, new Date(reportDate));
                }
                // Additional filter by specific month if selected
                if (reportMonth) {
                    filteredPayments = this.filterBySpecificMonth(filteredPayments, reportMonth);
                }
                break;
            case 'course':
                if (reportCourse) {
                    filteredPayments = this.filterByCourse(filteredPayments, reportCourse);
                }
                break;
        }

        this.displayReport(filteredPayments, reportType, reportDate, reportCourse, reportMonth);
    }

    filterByDate(payments, targetDate) {
        return payments.filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return paymentDate.toDateString() === targetDate.toDateString();
        });
    }

    filterByWeek(payments, targetDate) {
        const weekRange = Utils.getWeekRange(targetDate);
        return payments.filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return Utils.isDateInRange(paymentDate, weekRange.start, weekRange.end);
        });
    }

    filterByMonth(payments, targetDate) {
        const monthRange = Utils.getMonthRange(targetDate);
        return payments.filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return Utils.isDateInRange(paymentDate, monthRange.start, monthRange.end);
        });
    }

    filterByCourse(payments, courseId) {
        return payments.filter(payment => {
            // Check if payment includes the specific course
            if (payment.courses.includes(courseId)) {
                // For course-specific filtering, only include payments that have months from this course
                if (payment.monthPayments) {
                    // Check if any month payment is for this course
                    return payment.monthPayments.some(mp => {
                        const month = window.storageManager.getMonthById(mp.monthId);
                        return month && month.courseId === courseId;
                    });
                } else {
                    // Legacy payment structure - check if any month belongs to this course
                    return payment.months.some(monthId => {
                        const month = window.storageManager.getMonthById(monthId);
                        return month && month.courseId === courseId;
                    });
                }
            }
            return false;
        });
    }

    filterBySpecificMonth(payments, monthId) {
        return payments.filter(payment => 
            payment.months.includes(monthId) || 
            (payment.monthPayments && payment.monthPayments.some(mp => mp.monthId === monthId))
        );
    }

    displayReport(payments, reportType, reportDate, reportCourse, reportMonth) {
        const reportResults = document.getElementById('reportResults');

        if (payments.length === 0) {
            reportResults.innerHTML = `
                <div class="text-center">
                    <h3>No payments found for the selected criteria</h3>
                    <p>Try adjusting your filters and generate the report again.</p>
                </div>
            `;
            return;
        }

        // Calculate summary
        const totalPayments = payments.length;
        let totalAmount = 0;
        let totalDue = 0;

        // For month-specific reports, we need to calculate dues for ALL enrolled students, not just those who paid
        if (reportType === 'month' && reportMonth) {
            const month = window.storageManager.getMonthById(reportMonth);
            const monthlyFee = month ? month.payment : 0;
            const course = month ? window.storageManager.getCourseById(month.courseId) : null;
            
            if (course) {
                // Get all students enrolled in this course who should pay for this month
                const allStudents = window.storageManager.getStudents();
                const eligibleStudents = allStudents.filter(student => {
                    if (!student.enrolledCourses) return false;
                    
                    const enrollment = student.enrolledCourses.find(e => e.courseId === course.id);
                    if (!enrollment || !enrollment.startingMonthId) return false;
                    
                    const startingMonth = window.storageManager.getMonthById(enrollment.startingMonthId);
                    if (!startingMonth) return false;
                    
                    // Check if this month is applicable (month number >= starting month number)
                    return (month.monthNumber || 0) >= (startingMonth.monthNumber || 0);
                });
                
                // Calculate total due for all eligible students
                let totalExpectedAmount = eligibleStudents.length * monthlyFee;
                let totalPaidAmount = 0;
                
                // Calculate how much has been paid for this specific month
                eligibleStudents.forEach(student => {
                    const monthPaymentDetails = window.storageManager.getMonthPaymentDetails(student.id);
                    const monthPayment = monthPaymentDetails[reportMonth];
                    if (monthPayment) {
                        totalPaidAmount += monthPayment.totalPaid;
                    }
                });
                
                totalAmount = totalPaidAmount;
                totalDue = totalExpectedAmount - totalPaidAmount;
            }
        } else {
            // For other report types, calculate normally
            payments.forEach(payment => {
                let displayAmount = 0;
                let currentDue = 0;

                if (reportType === 'course' && reportCourse) {
                    if (payment.monthPayments) {
                        const courseMonths = window.storageManager.getMonthsByCourse(reportCourse);
                        const courseMonthIds = courseMonths.map(m => m.id);
                        let coursePayments = payment.monthPayments.filter(mp => courseMonthIds.includes(mp.monthId));
                        displayAmount = coursePayments.reduce((sum, mp) => sum + mp.paidAmount, 0);
                        currentDue = payment.totalAmount - displayAmount;
                    } else {
                        displayAmount = 0;
                        currentDue = payment.totalAmount;
                    }
                } else {
                    displayAmount = payment.paidAmount;
                    currentDue = payment.dueAmount;
                }

                totalAmount += displayAmount;
                totalDue += currentDue;
            });
        }

        const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0;

        // Get report title
        const reportTitle = this.getReportTitle(reportType, reportDate, reportCourse);

        const reportHtml = `
            <div class="report-header">
                <h3>${reportTitle}</h3>
                <div class="report-actions">
                    <button class="btn btn-outline" onclick="reportsManager.exportReport(${JSON.stringify(payments).replace(/"/g, '&quot;')})">
                        Export CSV
                    </button>
                    <button class="btn btn-outline" onclick="reportsManager.printReport()">
                        Print Report
                    </button>
                </div>
            </div>

            <div class="report-summary">
                <div class="summary-item">
                    <div class="summary-label">Total Payments</div>
                    <div class="summary-value">${totalPayments}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Amount</div>
                    <div class="summary-value">${Utils.formatCurrency(totalAmount)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Due</div>
                    <div class="summary-value">${Utils.formatCurrency(totalDue)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Average Payment</div>
                    <div class="summary-value">${Utils.formatCurrency(averagePayment)}</div>
                </div>
            </div>

            <div class="payment-list">
                ${payments.map(payment => this.renderPaymentItem(payment)).join('')}
            </div>
        `;

        reportResults.innerHTML = reportHtml;
    }

    getReportTitle(reportType, reportDate, reportCourse) {
        switch (reportType) {
            case 'date':
                return `Payments Report - ${reportDate ? Utils.formatDate(reportDate) : 'All Dates'}`;
            case 'week':
                if (reportDate) {
                    const weekRange = Utils.getWeekRange(new Date(reportDate));
                    return `Weekly Report - ${Utils.formatDate(weekRange.start)} to ${Utils.formatDate(weekRange.end)}`;
                }
                return 'Weekly Report - All Weeks';
            case 'month':
                if (reportDate) {
                    const monthRange = Utils.getMonthRange(new Date(reportDate));
                    return `Monthly Report - ${monthRange.start.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
                }
                return 'Monthly Report - All Months';
            case 'course':
                if (reportCourse) {
                    const course = window.storageManager.getCourseById(reportCourse);
                    const batch = course ? window.storageManager.getBatchById(course.batchId) : null;
                    return `Course Report - ${course?.name || 'Unknown'} (${batch?.name || 'Unknown Batch'})`;
                }
                return 'Course Report - All Courses';
            default:
                return 'Payments Report';
        }
    }

    renderPaymentItem(payment) {
        // Get the current report filters to determine what to show
        const reportType = document.getElementById('reportType').value;
        const reportCourse = document.getElementById('reportCourse').value;
        const reportMonth = document.getElementById('reportMonth')?.value;
        
        let displayAmount = payment.paidAmount;
        let courseNames = '';
        let monthNames = '';
        
        if (reportType === 'month' && reportMonth) {
            // For specific month reports, show only the amount paid for that month
            if (payment.monthPayments) {
                const monthPayment = payment.monthPayments.find(mp => mp.monthId === reportMonth);
                if (monthPayment) {
                    displayAmount = monthPayment.paidAmount;
                    const month = window.storageManager.getMonthById(reportMonth);
                    const course = month ? window.storageManager.getCourseById(month.courseId) : null;
                    monthNames = month?.name || 'Unknown';
                    courseNames = course?.name || 'Unknown';
                } else {
                    // Legacy payment handling
                    const monthsInPayment = payment.months.filter(mId => mId === reportMonth);
                    if (monthsInPayment.length > 0) {
                        displayAmount = payment.paidAmount / payment.months.length;
                        const month = window.storageManager.getMonthById(reportMonth);
                        const course = month ? window.storageManager.getCourseById(month.courseId) : null;
                        monthNames = month?.name || 'Unknown';
                        courseNames = course?.name || 'Unknown';
                    }
                }
            } else {
                // Legacy payment handling
                const monthsInPayment = payment.months.filter(mId => mId === reportMonth);
                if (monthsInPayment.length > 0) {
                    displayAmount = payment.paidAmount / payment.months.length;
                    const month = window.storageManager.getMonthById(reportMonth);
                    const course = month ? window.storageManager.getCourseById(month.courseId) : null;
                    monthNames = month?.name || 'Unknown';
                    courseNames = course?.name || 'Unknown';
                }
            }
        } else if (reportType === 'course' && reportCourse) {
            // For course reports, show only amounts for that course
            if (payment.monthPayments) {
                const courseMonths = window.storageManager.getMonthsByCourse(reportCourse);
                const courseMonthIds = courseMonths.map(m => m.id);
                const coursePayments = payment.monthPayments.filter(mp => courseMonthIds.includes(mp.monthId));
                displayAmount = coursePayments.reduce((sum, mp) => sum + mp.paidAmount, 0);
                
                const course = window.storageManager.getCourseById(reportCourse);
                courseNames = course?.name || 'Unknown';
                
                monthNames = coursePayments.map(mp => {
                    const month = window.storageManager.getMonthById(mp.monthId);
                    return month?.name || 'Unknown';
                }).join(', ');
            } else {
                // Legacy handling
                const course = window.storageManager.getCourseById(reportCourse);
                courseNames = course?.name || 'Unknown';
                
                // Only show months that belong to the selected course
                monthNames = payment.months.filter(monthId => {
                    const month = window.storageManager.getMonthById(monthId);
                    return month && month.courseId === reportCourse;
                }).map(monthId => {
                    const month = window.storageManager.getMonthById(monthId);
                    return month?.name || 'Unknown';
                }).join(', ');
                
                // Calculate proportional amount for this course
                const totalCourseMonths = payment.months.filter(monthId => {
                    const month = window.storageManager.getMonthById(monthId);
                    return month && month.courseId === reportCourse;
                }).length;
                
                if (totalCourseMonths > 0) {
                    displayAmount = (payment.paidAmount / payment.months.length) * totalCourseMonths;
                }
            }
        } else {
            // Default: show all courses and months
            courseNames = payment.courses.map(courseId => {
                const course = window.storageManager.getCourseById(courseId);
                return course?.name || 'Unknown';
            }).join(', ');
            
            if (payment.monthPayments) {
                monthNames = payment.monthPayments.map(mp => {
                    const month = window.storageManager.getMonthById(mp.monthId);
                    return month?.name || 'Unknown';
                }).join(', ');
            } else {
                monthNames = payment.months.map(monthId => {
                    const month = window.storageManager.getMonthById(monthId);
                    return month?.name || 'Unknown';
                }).join(', ');
            }
        }

        // Check if this payment has discount
        const hasDiscount = payment.discountAmount && payment.discountAmount > 0;
        const discountTag = hasDiscount ? '<span class="discount-tag">Discounted</span>' : '';
        return `
            <div class="payment-item">
                <div class="detail-item">
                    <div class="detail-label">Invoice</div>
                    <div class="detail-value">${payment.invoiceNumber}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Student</div>
                    <div class="detail-value">${payment.studentName} (${payment.studentStudentId})</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Courses</div>
                    <div class="detail-value">${courseNames}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Months</div>
                    <div class="detail-value">${monthNames}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Paid Amount</div>
                    <div class="detail-value">${Utils.formatCurrency(displayAmount)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Due Amount</div>
                    <div class="detail-value">${reportType === 'month' && reportMonth ? 'N/A' : Utils.formatCurrency(Math.max(0, payment.totalAmount - payment.paidAmount - (payment.discountAmount || 0)))}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Received By</div>
                    <div class="detail-value">${payment.receivedBy}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">${Utils.formatDateTime(payment.createdAt)}</div>
                </div>
            </div>
        `;
    }

    exportReport(payments) {
        const exportData = payments.map(payment => {
            const courseNames = payment.courses.map(courseId => {
                const course = window.storageManager.getCourseById(courseId);
                return course?.name || 'Unknown';
            }).join(', ');

            const monthNames = payment.months.map(monthId => {
                const month = window.storageManager.getMonthById(monthId);
                return month?.name || 'Unknown';
            }).join(', ');

            return {
                'Invoice Number': payment.invoiceNumber,
                'Student Name': payment.studentName,
                'Student ID': payment.studentStudentId,
                'Courses': courseNames,
                'Months': monthNames,
                'Total Amount': payment.totalAmount,
                'Paid Amount': payment.paidAmount,
                'Due Amount': payment.dueAmount,
                'Reference': payment.reference || '',
                'Received By': payment.receivedBy,
                'Date': Utils.formatDateTime(payment.createdAt)
            };
        });

        const filename = `payments_report_${new Date().toISOString().split('T')[0]}.csv`;
        Utils.exportToCSV(exportData, filename);
    }

    printReport() {
        const reportResults = document.getElementById('reportResults');
        Utils.printElement(reportResults);
    }

    refresh() {
        this.updateCourseDropdown();
        this.updateDiscountCourseDropdown();
        // Clear previous results
        document.getElementById('reportResults').innerHTML = '';
        document.getElementById('discountReportResults').innerHTML = '';
        
        // Reset form
        document.getElementById('reportDate').value = '';
        document.getElementById('reportCourse').value = '';
        document.getElementById('reportType').value = 'date';
        this.updateDateFields();
    }

    updateDiscountCourseDropdown() {
        const courseSelect = document.getElementById('discountReportCourse');
        if (!courseSelect) return;
        
        const courses = window.storageManager.getCourses();
        
        courseSelect.innerHTML = '<option value="">All Courses</option>' +
            courses.map(course => {
                const batch = window.storageManager.getBatchById(course.batchId);
                return `<option value="${course.id}">${course.name} (${batch?.name || 'Unknown Batch'})</option>`;
            }).join('');
    }

    generateDiscountReport() {
        const reportType = document.getElementById('discountReportType').value;
        const reportDate = document.getElementById('discountReportDate').value;
        const reportCourse = document.getElementById('discountReportCourse').value;

        let filteredPayments = window.storageManager.getDiscountedPayments();

        // Apply filters based on report type
        switch (reportType) {
            case 'date':
                if (reportDate) {
                    filteredPayments = this.filterByDate(filteredPayments, new Date(reportDate));
                }
                break;
            case 'course':
                if (reportCourse) {
                    filteredPayments = this.filterByCourse(filteredPayments, reportCourse);
                }
                break;
            case 'student':
                // Group by student for student report
                break;
        }

        this.displayDiscountReport(filteredPayments, reportType, reportDate, reportCourse);
    }

    displayDiscountReport(payments, reportType, reportDate, reportCourse) {
        const reportResults = document.getElementById('discountReportResults');

        if (payments.length === 0) {
            reportResults.innerHTML = `
                <div class="text-center">
                    <h3>No discounted payments found for the selected criteria</h3>
                    <p>Try adjusting your filters and generate the report again.</p>
                </div>
            `;
            return;
        }

        // Calculate summary
        const totalPayments = payments.length;
        const totalDiscountAmount = payments.reduce((sum, payment) => sum + (payment.discountAmount || 0), 0);
        const totalOriginalAmount = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.paidAmount, 0);
        const averageDiscount = totalPayments > 0 ? totalDiscountAmount / totalPayments : 0;

        const reportTitle = this.getDiscountReportTitle(reportType, reportDate, reportCourse);

        const reportHtml = `
            <div class="report-header">
                <h3>${reportTitle}</h3>
                <div class="report-actions">
                    <button class="btn btn-outline" onclick="reportsManager.exportDiscountReport(${JSON.stringify(payments).replace(/"/g, '&quot;')})">
                        Export CSV
                    </button>
                    <button class="btn btn-outline" onclick="reportsManager.printDiscountReport()">
                        Print Report
                    </button>
                </div>
            </div>

            <div class="report-summary">
                <div class="summary-item">
                    <div class="summary-label">Total Discounted Payments</div>
                    <div class="summary-value">${totalPayments}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Discount Given</div>
                    <div class="summary-value">${Utils.formatCurrency(totalDiscountAmount)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Original Amount</div>
                    <div class="summary-value">${Utils.formatCurrency(totalOriginalAmount)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Average Discount</div>
                    <div class="summary-value">${Utils.formatCurrency(averageDiscount)}</div>
                </div>
            </div>

            <div class="payment-list">
                ${payments.map(payment => this.renderDiscountPaymentItem(payment)).join('')}
            </div>
        `;

        reportResults.innerHTML = reportHtml;
    }

    getDiscountReportTitle(reportType, reportDate, reportCourse) {
        switch (reportType) {
            case 'date':
                return `Discount Report - ${reportDate ? Utils.formatDate(reportDate) : 'All Dates'}`;
            case 'course':
                if (reportCourse) {
                    const course = window.storageManager.getCourseById(reportCourse);
                    const batch = course ? window.storageManager.getBatchById(course.batchId) : null;
                    return `Discount Report - ${course?.name || 'Unknown'} (${batch?.name || 'Unknown Batch'})`;
                }
                return 'Discount Report - All Courses';
            case 'student':
                return 'Discount Report - By Student';
            default:
                return 'Discount Report - All Discounts';
        }
    }

    renderDiscountPaymentItem(payment) {
        const courseNames = payment.courses.map(courseId => {
            const course = window.storageManager.getCourseById(courseId);
            return course?.name || 'Unknown';
        }).join(', ');
        
        const monthNames = payment.months.map(monthId => {
            const month = window.storageManager.getMonthById(monthId);
            return month?.name || 'Unknown';
        }).join(', ');

        const discountPercentage = payment.totalAmount > 0 ? 
            ((payment.discountAmount / payment.totalAmount) * 100).toFixed(1) : 0;

        // Check if this payment has discount
        const hasDiscount = payment.discountAmount && payment.discountAmount > 0;
        const discountTag = hasDiscount ? '<span class="discount-tag">Discounted</span>' : '';

        return `
            <div class="payment-item">
                <div class="detail-item">
                    <div class="detail-label">Invoice</div>
                    <div class="detail-value">${payment.invoiceNumber} ${discountTag}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Student</div>
                    <div class="detail-value">${payment.studentName} (${payment.studentStudentId})</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Courses</div>
                    <div class="detail-value">${courseNames}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Months</div>
                    <div class="detail-value">${monthNames}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Original Amount</div>
                    <div class="detail-value">${Utils.formatCurrency(payment.totalAmount)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Discount</div>
                    <div class="detail-value">-${Utils.formatCurrency(payment.discountAmount)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Discounted Amount</div>
                    <div class="detail-value">${Utils.formatCurrency(payment.discountedAmount)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Paid Amount</div>
                    <div class="detail-value">${Utils.formatCurrency(payment.paidAmount)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Reference</div>
                    <div class="detail-value">${payment.reference || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Received By</div>
                    <div class="detail-value">${payment.receivedBy}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">${Utils.formatDateTime(payment.createdAt)}</div>
                </div>
            </div>
        `;
    }

    exportDiscountReport(payments) {
        const exportData = payments.map(payment => {
            const courseNames = payment.courses.map(courseId => {
                const course = window.storageManager.getCourseById(courseId);
                return course?.name || 'Unknown';
            }).join(', ');

            const monthNames = payment.months.map(monthId => {
                const month = window.storageManager.getMonthById(monthId);
                return month?.name || 'Unknown';
            }).join(', ');

            const discountPercentage = payment.totalAmount > 0 ? 
                ((payment.discountAmount / payment.totalAmount) * 100).toFixed(1) : 0;

            return {
                'Invoice Number': payment.invoiceNumber,
                'Student Name': payment.studentName,
                'Student ID': payment.studentStudentId,
                'Courses': courseNames,
                'Months': monthNames,
                'Original Amount': payment.totalAmount,
                'Discount Amount': payment.discountAmount,
                'Discount Percentage': discountPercentage + '%',
                'Discounted Amount': payment.discountedAmount,
                'Paid Amount': payment.paidAmount,
                'Due Amount': payment.dueAmount,
                'Reference': payment.reference || '',
                'Received By': payment.receivedBy,
                'Date': Utils.formatDateTime(payment.createdAt)
            };
        });

        const filename = `discount_report_${new Date().toISOString().split('T')[0]}.csv`;
        Utils.exportToCSV(exportData, filename);
    }

    printDiscountReport() {
        const reportResults = document.getElementById('discountReportResults');
        Utils.printElement(reportResults);
    }
}

// Global reports manager instance
window.reportsManager = new ReportsManager();