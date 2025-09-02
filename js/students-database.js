// Students Database Management
class StudentsDatabaseManager {
    constructor() {
        this.isInitialized = false;
        this.currentFilters = {};
        this.filteredStudents = [];
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.bindEvents();
        this.refresh();
    }

    bindEvents() {
        // Search input with debounce
        const searchInput = document.getElementById('dbSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.applyFilters();
            }, 300));
        }

        // Filter dropdowns
        const filterElements = [
            'dbBatchFilter', 'dbCourseFilter', 'dbMonthFilter', 
            'dbPaymentStatusFilter', 'dbInstitutionFilter', 'dbGenderFilter'
        ];

        filterElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('change', () => {
                    this.applyFilters();
                });
            }
        });

        // Action buttons
        const applyBtn = document.getElementById('dbApplyFilters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        const clearBtn = document.getElementById('dbClearFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        const exportBtn = document.getElementById('dbExportData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    refresh() {
        this.updateFilterDropdowns();
        this.applyFilters();
    }

    updateFilterDropdowns() {
        // Update Batch filter
        const batchFilter = document.getElementById('dbBatchFilter');
        if (batchFilter) {
            const batches = window.storageManager.getBatches();
            batchFilter.innerHTML = '<option value="">All Batches</option>' +
                batches.map(batch => `<option value="${batch.id}">${batch.name}</option>`).join('');
        }

        // Update Course filter
        const courseFilter = document.getElementById('dbCourseFilter');
        if (courseFilter) {
            const courses = window.storageManager.getCourses();
            courseFilter.innerHTML = '<option value="">All Courses</option>' +
                courses.map(course => {
                    const batch = window.storageManager.getBatchById(course.batchId);
                    return `<option value="${course.id}">${course.name} (${batch?.name || 'Unknown Batch'})</option>`;
                }).join('');
        }

        // Update Month filter
        const monthFilter = document.getElementById('dbMonthFilter');
        if (monthFilter) {
            const months = window.storageManager.getMonths();
            monthFilter.innerHTML = '<option value="">All Months</option>' +
                months.map(month => {
                    const course = window.storageManager.getCourseById(month.courseId);
                    return `<option value="${month.id}">${month.name} (${course?.name || 'Unknown Course'})</option>`;
                }).join('');
        }

        // Update Institution filter
        const institutionFilter = document.getElementById('dbInstitutionFilter');
        if (institutionFilter) {
            const institutions = window.storageManager.getInstitutions();
            institutionFilter.innerHTML = '<option value="">All Institutions</option>' +
                institutions.map(inst => `<option value="${inst.id}">${inst.name}</option>`).join('');
        }
    }

    applyFilters() {
        const searchTerm = document.getElementById('dbSearchInput')?.value.toLowerCase() || '';
        const batchFilter = document.getElementById('dbBatchFilter')?.value || '';
        const courseFilter = document.getElementById('dbCourseFilter')?.value || '';
        const monthFilter = document.getElementById('dbMonthFilter')?.value || '';
        const paymentStatusFilter = document.getElementById('dbPaymentStatusFilter')?.value || '';
        const institutionFilter = document.getElementById('dbInstitutionFilter')?.value || '';
        const genderFilter = document.getElementById('dbGenderFilter')?.value || '';

        let students = window.storageManager.getStudents();

        // Apply search filter
        if (searchTerm) {
            students = students.filter(student => 
                student.name.toLowerCase().includes(searchTerm) ||
                student.studentId.toLowerCase().includes(searchTerm) ||
                student.phone.includes(searchTerm) ||
                student.guardianName.toLowerCase().includes(searchTerm) ||
                student.guardianPhone.includes(searchTerm)
            );
        }

        // Apply batch filter
        if (batchFilter) {
            students = students.filter(student => student.batchId === batchFilter);
        }

        // Apply institution filter
        if (institutionFilter) {
            students = students.filter(student => student.institutionId === institutionFilter);
        }

        // Apply gender filter
        if (genderFilter) {
            students = students.filter(student => student.gender === genderFilter);
        }

        // Apply course filter
        if (courseFilter) {
            students = students.filter(student => {
                if (!student.enrolledCourses) return false;
                return student.enrolledCourses.some(enrollment => enrollment.courseId === courseFilter);
            });
        }

        // Apply month filter
        if (monthFilter) {
            students = students.filter(student => {
                if (!student.enrolledCourses) return false;
                
                return student.enrolledCourses.some(enrollment => {
                    const allCourseMonths = window.storageManager.getMonthsByCourse(enrollment.courseId);
                    
                    if (enrollment.startingMonthId) {
                        const startingMonth = window.storageManager.getMonthById(enrollment.startingMonthId);
                        const endingMonth = enrollment.endingMonthId ? window.storageManager.getMonthById(enrollment.endingMonthId) : null;
                        
                        if (startingMonth) {
                            let applicableMonths = allCourseMonths.filter(month => 
                                (month.monthNumber || 0) >= (startingMonth.monthNumber || 0)
                            );
                            
                            if (endingMonth) {
                                applicableMonths = applicableMonths.filter(month => 
                                    (month.monthNumber || 0) <= (endingMonth.monthNumber || 0)
                                );
                            }
                            
                            return applicableMonths.some(month => month.id === monthFilter);
                        }
                    }
                    
                    return false;
                });
            });
        }

        // Apply payment status filter
        if (paymentStatusFilter) {
            students = students.filter(student => {
                const monthPaymentDetails = window.storageManager.getMonthPaymentDetails(student.id);
                let totalDue = 0;
                let totalPaid = 0;

                if (student.enrolledCourses && student.enrolledCourses.length > 0) {
                    student.enrolledCourses.forEach(enrollment => {
                        const allCourseMonths = window.storageManager.getMonthsByCourse(enrollment.courseId)
                            .sort((a, b) => (a.monthNumber || 0) - (b.monthNumber || 0));
                        
                        if (enrollment.startingMonthId) {
                            const startingMonth = window.storageManager.getMonthById(enrollment.startingMonthId);
                            const endingMonth = enrollment.endingMonthId ? window.storageManager.getMonthById(enrollment.endingMonthId) : null;
                            
                            if (startingMonth) {
                                let applicableMonths = allCourseMonths.filter(month => 
                                    (month.monthNumber || 0) >= (startingMonth.monthNumber || 0)
                                );
                                
                                if (endingMonth) {
                                    applicableMonths = applicableMonths.filter(month => 
                                        (month.monthNumber || 0) <= (endingMonth.monthNumber || 0)
                                    );
                                }
                                
                                applicableMonths.forEach(month => {
                                    totalDue += month.payment;
                                    const monthPayment = monthPaymentDetails[month.id];
                                    if (monthPayment) {
                                        totalPaid += monthPayment.totalPaid + monthPayment.totalDiscount;
                                    }
                                });
                            }
                        }
                    });
                }

                const totalCovered = totalPaid; // totalPaid now includes discounts
                const unpaidDue = Math.max(0, totalDue - totalCovered);
                    const totalDueAmount = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);
                    const totalCoveredAmount = totalPaidAmount + totalDiscountAmount;

                switch (paymentStatusFilter) {
                    case 'paid':
                        return totalDue > 0 && unpaidDue <= 0;
                    case 'partial':
                        return totalCovered > 0 && unpaidDue > 0;
                    case 'unpaid':
                        return totalCovered === 0 && totalDue > 0;
                    default:
                        return true;
                }
            });
        }

        this.filteredStudents = students;
        this.renderStudents(students);
        this.updateSummary(students);
    }

    renderStudents(students) {
        const studentsList = document.getElementById('dbStudentsList');
        if (!studentsList) return;

        if (students.length === 0) {
            studentsList.innerHTML = `
                <div class="no-results">
                    <h3>No students found</h3>
                    <p>Try adjusting your filters to see more results.</p>
                </div>
            `;
            return;
        }

        studentsList.innerHTML = students.map(student => {
            const institution = window.storageManager.getInstitutionById(student.institutionId);
            const batch = window.storageManager.getBatchById(student.batchId);
            const monthPaymentDetails = window.storageManager.getMonthPaymentDetails(student.id);
            
            // Calculate payment status and amounts
            let totalDue = 0;
            let totalPaid = 0;
            let enrolledCourseNames = [];

            if (student.enrolledCourses && student.enrolledCourses.length > 0) {
                student.enrolledCourses.forEach(enrollment => {
                    const course = window.storageManager.getCourseById(enrollment.courseId);
                    if (course) {
                        enrolledCourseNames.push(course.name);
                    }

                    const allCourseMonths = window.storageManager.getMonthsByCourse(enrollment.courseId)
                        .sort((a, b) => (a.monthNumber || 0) - (b.monthNumber || 0));
                    
                    if (enrollment.startingMonthId) {
                        const startingMonth = window.storageManager.getMonthById(enrollment.startingMonthId);
                        const endingMonth = enrollment.endingMonthId ? window.storageManager.getMonthById(enrollment.endingMonthId) : null;
                        
                        if (startingMonth) {
                            let applicableMonths = allCourseMonths.filter(month => 
                                (month.monthNumber || 0) >= (startingMonth.monthNumber || 0)
                            );
                            
                            if (endingMonth) {
                                applicableMonths = applicableMonths.filter(month => 
                                    (month.monthNumber || 0) <= (endingMonth.monthNumber || 0)
                                );
                            }
                            
                            applicableMonths.forEach(month => {
                                totalDue += month.payment;
                                const monthPayment = monthPaymentDetails[month.id];
                                if (monthPayment) {
                                    totalPaid += monthPayment.totalPaid;
                                    totalPaid += monthPayment.totalDiscount; // Add discount as "paid"
                                }
                            });
                        }
                    }
                });
            }

            const unpaidDue = totalDue - totalPaid;
            
            // Determine payment status based on remaining due
            let paymentStatus, statusText;
            if (totalDue === 0) {
                paymentStatus = 'unpaid';
                statusText = 'No Fees';
            } else if (unpaidDue <= 0) {
                paymentStatus = 'paid';
                statusText = 'Fully Paid';
            } else if (totalPaid > 0) {
                paymentStatus = 'partial';
                statusText = 'Partially Paid';
            } else {
                paymentStatus = 'unpaid';
                statusText = 'Unpaid';
            }

            return `
                <div class="database-student-card">
                    <div class="student-header">
                        <div class="student-basic-info">
                            <h4>${student.name}</h4>
                            <div class="student-id">ID: ${student.studentId}</div>
                        </div>
                        <div class="student-status">
                            <span class="payment-status ${paymentStatus}">${statusText}</span>
                        </div>
                    </div>
                    
                    <div class="student-details-grid">
                        <div class="detail-section">
                            <h5>Personal Information</h5>
                            <div class="detail-item">
                                <span class="detail-label">Gender:</span>
                                <span class="detail-value">${student.gender}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${student.phone}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Institution:</span>
                                <span class="detail-value">${institution?.name || 'Unknown'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h5>Academic Information</h5>
                            <div class="detail-item">
                                <span class="detail-label">Batch:</span>
                                <span class="detail-value">${batch?.name || 'Unknown'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Courses:</span>
                                <span class="detail-value">${enrolledCourseNames.join(', ') || 'None'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Joined:</span>
                                <span class="detail-value">${Utils.formatDate(student.createdAt)}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h5>Guardian Information</h5>
                            <div class="detail-item">
                                <span class="detail-label">Guardian:</span>
                                <span class="detail-value">${student.guardianName}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Guardian Phone:</span>
                                <span class="detail-value">${student.guardianPhone}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h5>Payment Information</h5>
                            <div class="detail-item">
                                <span class="detail-label">Total Due:</span>
                                <span class="detail-value">${Utils.formatCurrency(totalDue)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Total Paid:</span>
                                <span class="detail-value">${Utils.formatCurrency(totalPaid)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Remaining:</span>
                                <span class="detail-value ${unpaidDue > 0 ? 'text-danger' : 'text-success'}">${Utils.formatCurrency(unpaidDue)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="student-actions">
                        <button class="btn btn-small btn-outline" onclick="studentManager.editStudent('${student.id}')">
                            Edit Student
                        </button>
                        <button class="btn btn-small btn-primary" onclick="feePaymentManager.findStudentById('${student.id}')">
                            Pay Fee
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="studentsDatabaseManager.viewPaymentHistory('${student.id}')">
                            Payment History
                        </button>
                        <button class="btn btn-small btn-danger" onclick="studentsDatabaseManager.deleteStudent('${student.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateSummary(students) {
        const totalStudentsElement = document.getElementById('dbTotalStudents');
        const filteredCountElement = document.getElementById('dbFilteredCount');
        const totalRevenueElement = document.getElementById('dbTotalRevenue');
        const pendingDuesElement = document.getElementById('dbPendingDues');

        if (totalStudentsElement) {
            totalStudentsElement.textContent = window.storageManager.getStudents().length;
        }

        if (filteredCountElement) {
            filteredCountElement.textContent = students.length;
        }

        let totalRevenue = 0;
        let totalPendingDues = 0;

        students.forEach(student => {
            const monthPaymentDetails = window.storageManager.getMonthPaymentDetails(student.id);
            let studentTotalDue = 0;
            let studentTotalPaid = 0;

            if (student.enrolledCourses && student.enrolledCourses.length > 0) {
                student.enrolledCourses.forEach(enrollment => {
                    const allCourseMonths = window.storageManager.getMonthsByCourse(enrollment.courseId);
                    
                    if (enrollment.startingMonthId) {
                        const startingMonth = window.storageManager.getMonthById(enrollment.startingMonthId);
                        const endingMonth = enrollment.endingMonthId ? window.storageManager.getMonthById(enrollment.endingMonthId) : null;
                        
                        if (startingMonth) {
                            let applicableMonths = allCourseMonths.filter(month => 
                                (month.monthNumber || 0) >= (startingMonth.monthNumber || 0)
                            );
                            
                            if (endingMonth) {
                                applicableMonths = applicableMonths.filter(month => 
                                    (month.monthNumber || 0) <= (endingMonth.monthNumber || 0)
                                );
                            }
                            
                            applicableMonths.forEach(month => {
                                studentTotalDue += month.payment;
                                const monthPayment = monthPaymentDetails[month.id];
                                if (monthPayment) {
                                    studentTotalPaid += monthPayment.totalPaid + monthPayment.totalDiscount;
                                }
                            });
                        }
                    }
                });
            }

            totalRevenue += studentTotalPaid;
            totalPendingDues += Math.max(0, studentTotalDue - studentTotalPaid);
        });

        if (totalRevenueElement) {
            totalRevenueElement.textContent = Utils.formatCurrency(totalRevenue);
        }

        if (pendingDuesElement) {
            pendingDuesElement.textContent = Utils.formatCurrency(totalPendingDues);
        }
    }

    clearFilters() {
        document.getElementById('dbSearchInput').value = '';
        document.getElementById('dbBatchFilter').value = '';
        document.getElementById('dbCourseFilter').value = '';
        document.getElementById('dbMonthFilter').value = '';
        document.getElementById('dbPaymentStatusFilter').value = '';
        document.getElementById('dbInstitutionFilter').value = '';
        document.getElementById('dbGenderFilter').value = '';
        
        this.applyFilters();
        Utils.showToast('Filters cleared', 'success');
    }

    exportData() {
        if (this.filteredStudents.length === 0) {
            Utils.showToast('No data to export', 'warning');
            return;
        }

        const exportData = this.filteredStudents.map(student => {
            const institution = window.storageManager.getInstitutionById(student.institutionId);
            const batch = window.storageManager.getBatchById(student.batchId);
            const monthPaymentDetails = window.storageManager.getMonthPaymentDetails(student.id);
            
            let totalDue = 0;
            let totalPaid = 0;
            let enrolledCourseNames = [];

            if (student.enrolledCourses && student.enrolledCourses.length > 0) {
                student.enrolledCourses.forEach(enrollment => {
                    const course = window.storageManager.getCourseById(enrollment.courseId);
                    if (course) {
                        enrolledCourseNames.push(course.name);
                    }

                    const allCourseMonths = window.storageManager.getMonthsByCourse(enrollment.courseId);
                    
                    if (enrollment.startingMonthId) {
                        const startingMonth = window.storageManager.getMonthById(enrollment.startingMonthId);
                        const endingMonth = enrollment.endingMonthId ? window.storageManager.getMonthById(enrollment.endingMonthId) : null;
                        
                        if (startingMonth) {
                            let applicableMonths = allCourseMonths.filter(month => 
                                (month.monthNumber || 0) >= (startingMonth.monthNumber || 0)
                            );
                            
                            if (endingMonth) {
                                applicableMonths = applicableMonths.filter(month => 
                                    (month.monthNumber || 0) <= (endingMonth.monthNumber || 0)
                                );
                            }
                            
                            applicableMonths.forEach(month => {
                                totalDue += month.payment;
                                const monthPayment = monthPaymentDetails[month.id];
                                if (monthPayment) {
                                    totalPaid += monthPayment.totalPaid;
                                }
                            });
                        }
                    }
                });
            }

            const unpaidDue = totalDue - totalPaid;
            const paymentStatus = unpaidDue <= 0 && totalDue > 0 ? 'Fully Paid' : 
                                 totalPaid > 0 && unpaidDue > 0 ? 'Partially Paid' : 'Unpaid';

            return {
                'Student ID': student.studentId,
                'Name': student.name,
                'Gender': student.gender,
                'Phone': student.phone,
                'Guardian Name': student.guardianName,
                'Guardian Phone': student.guardianPhone,
                'Institution': institution?.name || 'Unknown',
                'Batch': batch?.name || 'Unknown',
                'Enrolled Courses': enrolledCourseNames.join(', '),
                'Total Due': totalDue,
                'Total Paid': totalPaid,
                'Remaining Due': unpaidDue,
                'Payment Status': paymentStatus,
                'Joined Date': Utils.formatDate(student.createdAt)
            };
        });

        const filename = `students_database_${new Date().toISOString().split('T')[0]}.csv`;
        Utils.exportToCSV(exportData, filename);
        Utils.showToast('Data exported successfully', 'success');
    }

    viewPaymentHistory(studentId) {
        const student = window.storageManager.getStudentById(studentId);
        if (!student) return;

        const payments = window.storageManager.getPaymentsByStudent(studentId);
        
        const historyHtml = `
            <div class="payment-history">
                <h4>Payment History for ${student.name} (${student.studentId})</h4>
                ${payments.length === 0 ? 
                    '<p>No payment history found.</p>' :
                    payments.map(payment => `
                        <div class="payment-history-item">
                            <div class="payment-header">
                                <strong>Invoice: ${payment.invoiceNumber}</strong>
                                <span class="payment-date">${Utils.formatDateTime(payment.createdAt)}</span>
                            </div>
                            <div class="payment-details">
                                <p><strong>Amount Paid:</strong> ${Utils.formatCurrency(payment.paidAmount)}</p>
                                <p><strong>Due Amount:</strong> ${Utils.formatCurrency(payment.dueAmount)}</p>
                                ${payment.discountAmount > 0 ? `<p><strong>Discount:</strong> ${Utils.formatCurrency(payment.discountAmount)}</p>` : ''}
                                <p><strong>Received By:</strong> ${payment.receivedBy}</p>
                                ${payment.reference ? `<p><strong>Reference:</strong> ${payment.reference}</p>` : ''}
                            </div>
                        </div>
                    `).join('')
                }
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="navigationManager.closeModal(document.getElementById('editModal'))">Close</button>
                </div>
            </div>
        `;

        window.navigationManager.showModal('editModal', 'Payment History', historyHtml);
    }

    deleteStudent(studentId) {
        const student = window.storageManager.getStudentById(studentId);
        if (!student) {
            Utils.showToast('Student not found', 'error');
            return;
        }

        Utils.confirm(`Are you sure you want to delete "${student.name}" (${student.studentId})? This action cannot be undone and will also remove all payment records for this student.`, () => {
            const result = window.storageManager.deleteStudent(studentId);
            if (result.success) {
                Utils.showToast('Student deleted successfully', 'success');
                this.applyFilters(); // Refresh the list
            } else {
                Utils.showToast(result.message, 'error');
            }
        });
    }
}

// Global students database manager instance
window.studentsDatabaseManager = new StudentsDatabaseManager();