// Dashboard Management
class DashboardManager {
    constructor() {
        this.init();
    }

    init() {
        this.refresh();
    }

    refresh() {
        this.updateStats();
        this.loadRecentActivities();
    }

    updateStats() {
        const students = window.storageManager.getStudents();
        const batches = window.storageManager.getBatches();
        const payments = window.storageManager.getPayments();

        // Total students
        document.getElementById('totalStudents').textContent = students.length;

        // Total batches
        document.getElementById('totalBatches').textContent = batches.length;

        // This month's revenue
        const thisMonth = this.getThisMonthPayments(payments);
        const monthlyRevenue = thisMonth.reduce((sum, payment) => sum + payment.paidAmount, 0);
        document.getElementById('monthlyRevenue').textContent = Utils.formatCurrency(monthlyRevenue);

        // Pending fees
        const pendingFees = this.calculatePendingFees(students, payments);
        document.getElementById('pendingFees').textContent = Utils.formatCurrency(pendingFees);
    }

    getThisMonthPayments(payments) {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        return payments.filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return paymentDate >= thisMonth && paymentDate < nextMonth;
        });
    }

    calculatePendingFees(students, payments) {
        let totalPending = 0;

        students.forEach(student => {
            const studentPayments = payments.filter(p => p.studentId === student.id);
            
            // Get detailed month payment information
            const monthPaymentDetails = window.storageManager.getMonthPaymentDetails(student.id);

            // Calculate total due for student based on enrolled courses and starting months
            let unpaidDue = 0;

            if (student.enrolledCourses && student.enrolledCourses.length > 0) {
                student.enrolledCourses.forEach(enrollment => {
                    const allCourseMonths = window.storageManager.getMonthsByCourse(enrollment.courseId)
                        .sort((a, b) => (a.monthNumber || 0) - (b.monthNumber || 0));
                    
                    if (enrollment.startingMonthId) {
                        const startingMonth = window.storageManager.getMonthById(enrollment.startingMonthId);
                        const endingMonth = enrollment.endingMonthId ? window.storageManager.getMonthById(enrollment.endingMonthId) : null;
                        
                        if (startingMonth) {
                            // Only include months from starting month onwards
                            let applicableMonths = allCourseMonths.filter(month => 
                                (month.monthNumber || 0) >= (startingMonth.monthNumber || 0)
                            );
                            
                            // If ending month is specified, filter out months after it
                            if (endingMonth) {
                                applicableMonths = applicableMonths.filter(month => 
                                    (month.monthNumber || 0) <= (endingMonth.monthNumber || 0)
                                );
                            }
                            
                            applicableMonths.forEach(month => {
                                // Calculate remaining due after payments and discounts
                                const monthPayment = monthPaymentDetails[month.id];
                                if (!monthPayment) {
                                    // No payment made for this month
                                    unpaidDue += month.payment;
                                } else {
                                    // Calculate remaining due after payments and discounts
                                    const totalCovered = monthPayment.totalPaid + monthPayment.totalDiscount;
                                    const remainingDue = Math.max(0, month.payment - totalCovered);
                                    unpaidDue += remainingDue;
                                }
                            });
                        }
                    }
                });
            }

            totalPending += unpaidDue;
        });

        return totalPending;
    }

    loadRecentActivities() {
        const activitiesContainer = document.getElementById('recentActivities');
        const activities = window.storageManager.getActivities().slice(0, 10); // Latest 10 activities

        if (activities.length === 0) {
            activitiesContainer.innerHTML = '<p class="text-center">No recent activities</p>';
            return;
        }

        activitiesContainer.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${Utils.getRelativeTime(activity.timestamp)} by ${activity.user}</div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(activityType) {
        const iconMap = {
            'batch_created': '📚',
            'batch_updated': '✏️',
            'batch_deleted': '🗑️',
            'course_created': '📖',
            'course_updated': '✏️',
            'course_deleted': '🗑️',
            'month_created': '📅',
            'month_updated': '✏️',
            'month_deleted': '🗑️',
            'institution_created': '🏫',
            'institution_updated': '✏️',
            'institution_deleted': '🗑️',
            'student_added': '👤',
            'student_updated': '✏️',
            'student_deleted': '🗑️',
            'payment_received': '💰'
        };

        return iconMap[activityType] || '📄';
    }
}

// Global dashboard manager instance
window.dashboardManager = new DashboardManager();
