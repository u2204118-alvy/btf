// Data Storage Manager
class StorageManager {
    constructor() {
        this.init();
    }

    init() {
        this.ensureDataStructure();
    }

    ensureDataStructure() {
        // Initialize empty arrays if they don't exist
        const collections = ['batches', 'courses', 'months', 'institutions', 'students', 'payments', 'activities'];
        
        collections.forEach(collection => {
            const key = `btf_${collection}`;
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
            }
        });
    }

    generateId(prefix = 'item') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateStudentId() {
        const year = new Date().getFullYear().toString().substr(-2);
        const existing = this.getStudents().length;
        return `BTF${year}${(existing + 1).toString().padStart(4, '0')}`;
    }

    generateInvoiceNumber() {
        const year = new Date().getFullYear();
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const existing = this.getPayments().length;
        return `INV${year}${month}${(existing + 1).toString().padStart(4, '0')}`;
    }

    // Activity logging
    addActivity(type, description, data = {}) {
        const activities = this.getActivities();
        const activity = {
            id: this.generateId('activity'),
            type,
            description,
            data,
            timestamp: new Date().toISOString(),
            user: window.authManager.getCurrentUser()?.username || 'System'
        };

        activities.unshift(activity); // Add to beginning
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.splice(100);
        }

        localStorage.setItem('btf_activities', JSON.stringify(activities));
        return activity;
    }

    // Batch operations
    addBatch(batchData) {
        const batches = this.getBatches();
        const batch = {
            id: this.generateId('batch'),
            ...batchData,
            createdAt: new Date().toISOString()
        };

        batches.push(batch);
        localStorage.setItem('btf_batches', JSON.stringify(batches));
        this.addActivity('batch_created', `Batch "${batch.name}" created`, { batchId: batch.id });
        return batch;
    }

    updateBatch(id, updates) {
        const batches = this.getBatches();
        const index = batches.findIndex(batch => batch.id === id);
        
        if (index !== -1) {
            batches[index] = { ...batches[index], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem('btf_batches', JSON.stringify(batches));
            this.addActivity('batch_updated', `Batch "${batches[index].name}" updated`, { batchId: id });
            return batches[index];
        }
        return null;
    }

    deleteBatch(id) {
        const batches = this.getBatches();
        const batch = batches.find(b => b.id === id);
        
        if (batch) {
            // Check if batch has courses
            const hasCourses = this.getCourses().some(course => course.batchId === id);
            if (hasCourses) {
                return { success: false, message: 'Cannot delete batch with existing courses' };
            }

            const filteredBatches = batches.filter(b => b.id !== id);
            localStorage.setItem('btf_batches', JSON.stringify(filteredBatches));
            this.addActivity('batch_deleted', `Batch "${batch.name}" deleted`, { batchId: id });
            return { success: true };
        }
        return { success: false, message: 'Batch not found' };
    }

    // Course operations
    addCourse(courseData) {
        const courses = this.getCourses();
        const course = {
            id: this.generateId('course'),
            ...courseData,
            createdAt: new Date().toISOString()
        };

        courses.push(course);
        localStorage.setItem('btf_courses', JSON.stringify(courses));
        this.addActivity('course_created', `Course "${course.name}" created`, { courseId: course.id });
        return course;
    }

    updateCourse(id, updates) {
        const courses = this.getCourses();
        const index = courses.findIndex(course => course.id === id);
        
        if (index !== -1) {
            courses[index] = { ...courses[index], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem('btf_courses', JSON.stringify(courses));
            this.addActivity('course_updated', `Course "${courses[index].name}" updated`, { courseId: id });
            return courses[index];
        }
        return null;
    }

    deleteCourse(id) {
        const courses = this.getCourses();
        const course = courses.find(c => c.id === id);
        
        if (course) {
            // Check if course has months
            const hasMonths = this.getMonths().some(month => month.courseId === id);
            if (hasMonths) {
                return { success: false, message: 'Cannot delete course with existing months' };
            }

            const filteredCourses = courses.filter(c => c.id !== id);
            localStorage.setItem('btf_courses', JSON.stringify(filteredCourses));
            this.addActivity('course_deleted', `Course "${course.name}" deleted`, { courseId: id });
            return { success: true };
        }
        return { success: false, message: 'Course not found' };
    }

    // Month operations
    addMonth(monthData) {
        const months = this.getMonths();
        const month = {
            id: this.generateId('month'),
            ...monthData,
            monthNumber: monthData.monthNumber || 1,
            createdAt: new Date().toISOString()
        };

        months.push(month);
        localStorage.setItem('btf_months', JSON.stringify(months));
        this.addActivity('month_created', `Month "${month.name}" created`, { monthId: month.id });
        return month;
    }

    updateMonth(id, updates) {
        const months = this.getMonths();
        const index = months.findIndex(month => month.id === id);
        
        if (index !== -1) {
            months[index] = { ...months[index], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem('btf_months', JSON.stringify(months));
            this.addActivity('month_updated', `Month "${months[index].name}" updated`, { monthId: id });
            return months[index];
        }
        return null;
    }

    deleteMonth(id) {
        const months = this.getMonths();
        const month = months.find(m => m.id === id);
        
        if (month) {
            const filteredMonths = months.filter(m => m.id !== id);
            localStorage.setItem('btf_months', JSON.stringify(filteredMonths));
            this.addActivity('month_deleted', `Month "${month.name}" deleted`, { monthId: id });
            return { success: true };
        }
        return { success: false, message: 'Month not found' };
    }

    // Institution operations
    addInstitution(institutionData) {
        const institutions = this.getInstitutions();
        const institution = {
            id: this.generateId('institution'),
            ...institutionData,
            createdAt: new Date().toISOString()
        };

        institutions.push(institution);
        localStorage.setItem('btf_institutions', JSON.stringify(institutions));
        this.addActivity('institution_created', `Institution "${institution.name}" created`, { institutionId: institution.id });
        return institution;
    }

    updateInstitution(id, updates) {
        const institutions = this.getInstitutions();
        const index = institutions.findIndex(institution => institution.id === id);
        
        if (index !== -1) {
            institutions[index] = { ...institutions[index], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem('btf_institutions', JSON.stringify(institutions));
            this.addActivity('institution_updated', `Institution "${institutions[index].name}" updated`, { institutionId: id });
            return institutions[index];
        }
        return null;
    }

    deleteInstitution(id) {
        const institutions = this.getInstitutions();
        const institution = institutions.find(i => i.id === id);
        
        if (institution) {
            // Check if institution has students
            const hasStudents = this.getStudents().some(student => student.institutionId === id);
            if (hasStudents) {
                return { success: false, message: 'Cannot delete institution with existing students' };
            }

            const filteredInstitutions = institutions.filter(i => i.id !== id);
            localStorage.setItem('btf_institutions', JSON.stringify(filteredInstitutions));
            this.addActivity('institution_deleted', `Institution "${institution.name}" deleted`, { institutionId: id });
            return { success: true };
        }
        return { success: false, message: 'Institution not found' };
    }

    // Student operations
    addStudent(studentData) {
        const students = this.getStudents();
        const student = {
            id: this.generateId('student'),
            ...studentData,
            studentId: this.generateStudentId(),
            enrolledCourses: studentData.enrolledCourses || [],
            createdAt: new Date().toISOString()
        };

        students.push(student);
        localStorage.setItem('btf_students', JSON.stringify(students));
        this.addActivity('student_added', `Student "${student.name}" added with ID ${student.studentId}`, { studentId: student.id });
        return student;
    }

    updateStudent(id, updates) {
        const students = this.getStudents();
        const index = students.findIndex(student => student.id === id);
        
        if (index !== -1) {
            students[index] = { ...students[index], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem('btf_students', JSON.stringify(students));
            this.addActivity('student_updated', `Student "${students[index].name}" updated`, { studentId: id });
            return students[index];
        }
        return null;
    }

    deleteStudent(id) {
        const students = this.getStudents();
        const student = students.find(s => s.id === id);
        
        if (student) {
            const filteredStudents = students.filter(s => s.id !== id);
            localStorage.setItem('btf_students', JSON.stringify(filteredStudents));
            this.addActivity('student_deleted', `Student "${student.name}" deleted`, { studentId: id });
            return { success: true };
        }
        return { success: false, message: 'Student not found' };
    }

    // Payment operations
    addPayment(paymentData) {
        const payments = this.getPayments();
        const payment = {
            id: this.generateId('payment'),
            ...paymentData,
            invoiceNumber: this.generateInvoiceNumber(),
            monthPayments: paymentData.monthPayments || [],
            createdAt: new Date().toISOString()
        };

        payments.push(payment);
        localStorage.setItem('btf_payments', JSON.stringify(payments));
        this.addActivity('payment_received', `Payment of ৳${payment.paidAmount} received from ${payment.studentName}`, { paymentId: payment.id });
        return payment;
    }

    // Getter methods
    getBatches() {
        try {
            return JSON.parse(localStorage.getItem('btf_batches') || '[]');
        } catch (e) {
            return [];
        }
    }

    getCourses() {
        try {
            return JSON.parse(localStorage.getItem('btf_courses') || '[]');
        } catch (e) {
            return [];
        }
    }

    getMonths() {
        try {
            return JSON.parse(localStorage.getItem('btf_months') || '[]');
        } catch (e) {
            return [];
        }
    }

    getInstitutions() {
        try {
            return JSON.parse(localStorage.getItem('btf_institutions') || '[]');
        } catch (e) {
            return [];
        }
    }

    getStudents() {
        try {
            return JSON.parse(localStorage.getItem('btf_students') || '[]');
        } catch (e) {
            return [];
        }
    }

    getPayments() {
        try {
            return JSON.parse(localStorage.getItem('btf_payments') || '[]');
        } catch (e) {
            return [];
        }
    }

    getActivities() {
        try {
            return JSON.parse(localStorage.getItem('btf_activities') || '[]');
        } catch (e) {
            return [];
        }
    }

    // Utility methods
    getBatchById(id) {
        return this.getBatches().find(batch => batch.id === id);
    }

    getCourseById(id) {
        return this.getCourses().find(course => course.id === id);
    }

    getMonthById(id) {
        return this.getMonths().find(month => month.id === id);
    }

    getInstitutionById(id) {
        return this.getInstitutions().find(institution => institution.id === id);
    }

    getStudentById(id) {
        return this.getStudents().find(student => student.id === id);
    }

    getStudentByStudentId(studentId) {
        return this.getStudents().find(student => student.studentId === studentId);
    }

    getCoursesByBatch(batchId) {
        return this.getCourses().filter(course => course.batchId === batchId);
    }

    getMonthsByCourse(courseId) {
        return this.getMonths().filter(month => month.courseId === courseId);
    }

    getStudentsByBatch(batchId) {
        return this.getStudents().filter(student => student.batchId === batchId);
    }

    getPaymentsByStudent(studentId) {
        return this.getPayments().filter(payment => payment.studentId === studentId);
    }

    // Get month payment details for a student
    getMonthPaymentDetails(studentId) {
        const payments = this.getPaymentsByStudent(studentId);
        const monthPayments = {};
        
        payments.forEach(payment => {
            if (payment.monthPayments) {
                payment.monthPayments.forEach(monthPayment => {
                    const monthId = monthPayment.monthId;
                    if (!monthPayments[monthId]) {
                        monthPayments[monthId] = {
                            totalPaid: 0,
                            totalDiscount: 0,
                            monthFee: monthPayment.monthFee || 0,
                            payments: []
                        };
                    }
                    monthPayments[monthId].totalPaid += monthPayment.paidAmount;
                    monthPayments[monthId].totalDiscount += (monthPayment.discountAmount || 0);
                    monthPayments[monthId].payments.push({
                        paymentId: payment.id,
                        paidAmount: monthPayment.paidAmount,
                        discountAmount: monthPayment.discountAmount || 0,
                        date: payment.createdAt
                    });
                });
            } else if (payment.months) {
                // Handle legacy payments
                payment.months.forEach(monthId => {
                    const month = this.getMonthById(monthId);
                    if (month) {
                        if (!monthPayments[monthId]) {
                            monthPayments[monthId] = {
                                totalPaid: 0,
                                totalDiscount: 0,
                                monthFee: month.payment,
                                payments: []
                            };
                        }
                        const amountPaid = payment.paidAmount / payment.months.length;
                        let discountAmount = 0;
                        if (payment.discountAmount > 0 && payment.discountApplicableMonths) {
                            if (payment.discountApplicableMonths.includes(monthId)) {
                                const applicableMonthsCount = payment.discountApplicableMonths.length;
                                if (applicableMonthsCount > 0) {
                                    if (payment.discountType === 'percentage') {
                                        const discountPercentage = parseFloat(payment.discountAmount || 0);
                                        discountAmount = (month.payment * discountPercentage) / 100;
                                    } else {
                                        discountAmount = payment.discountAmount / applicableMonthsCount;
                                    }
                                }
                            }
                        } else if (payment.discountAmount > 0) {
                            if (payment.discountType === 'percentage') {
                                const discountPercentage = parseFloat(payment.discountAmount || 0);
                                discountAmount = (month.payment * discountPercentage) / 100;
                            } else {
                                discountAmount = payment.discountAmount / payment.months.length;
                            }
                        }
                        
                        monthPayments[monthId].totalPaid += amountPaid;
                        monthPayments[monthId].totalDiscount += discountAmount;
                        monthPayments[monthId].payments.push({
                            paymentId: payment.id,
                            paidAmount: amountPaid,
                            discountAmount: discountAmount,
                            date: payment.createdAt
                        });
                    }
                });
            }
        });
        
        return monthPayments;
    }

    // Get payments with discounts
    getDiscountedPayments() {
        return this.getPayments().filter(payment => 
            payment.discountAmount && payment.discountAmount > 0
        );
    }
}

// Global storage manager instance
window.storageManager = new StorageManager();