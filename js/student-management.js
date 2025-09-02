// Student Management
class StudentManagementManager {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.bindEvents();
        this.refresh();
    }

    bindEvents() {
        // Create Institution Form
        const institutionForm = document.getElementById('createInstitutionForm');
        if (institutionForm) {
            institutionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createInstitution();
            });
        }

        // Add Student Form
        const studentForm = document.getElementById('addStudentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addStudent();
            });
        }

        // Search and filter events
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', Utils.debounce(() => {
                this.filterStudents();
            }, 300));
        }

        const paymentFilter = document.getElementById('paymentFilter');
        if (paymentFilter) {
            paymentFilter.addEventListener('change', () => {
                this.filterStudents();
            });
        }
    }

    async createInstitution() {
        const name = document.getElementById('institutionName').value.trim();
        const address = document.getElementById('institutionAddress').value.trim();

        if (!name || !address) {
            Utils.showToast('Please fill in all fields', 'error');
            return;
        }

        // Check if institution already exists
        const existingInstitution = window.storageManager.getInstitutions().find(inst => 
            inst.name.toLowerCase() === name.toLowerCase()
        );

        if (existingInstitution) {
            Utils.showToast('Institution with this name already exists', 'error');
            return;
        }

        const institutionData = {
            name: Utils.sanitizeInput(name),
            address: Utils.sanitizeInput(address)
        };

        const institution = await window.storageManager.addInstitution(institutionData);
        if (institution) {
            Utils.showToast('Institution created successfully', 'success');
            document.getElementById('createInstitutionForm').reset();
            this.loadInstitutions();
            this.updateInstitutionDropdown();
        }
    }

    async addStudent() {
        const name = document.getElementById('studentName').value.trim();
        const institutionId = document.getElementById('studentInstitution').value;
        const gender = document.getElementById('studentGender').value;
        const phone = document.getElementById('studentPhone').value.trim();
        const guardianName = document.getElementById('guardianName').value.trim();
        const guardianPhone = document.getElementById('guardianPhone').value.trim();
        const batchId = document.getElementById('studentBatch').value;

        if (!name || !institutionId || !gender || !phone || !guardianName || !guardianPhone || !batchId) {
            Utils.showToast('Please fill in all fields', 'error');
            return;
        }

        if (!Utils.validatePhone(phone) || !Utils.validatePhone(guardianPhone)) {
            Utils.showToast('Please enter valid phone numbers', 'error');
            return;
        }

        // Get enrolled courses with starting months
        const enrolledCourses = this.getEnrolledCourses();
        
        if (enrolledCourses.length === 0) {
            Utils.showToast('Please select at least one course', 'error');
            return;
        }
        const studentData = {
            name: Utils.sanitizeInput(name),
            institutionId,
            gender,
            phone: Utils.sanitizeInput(phone),
            guardianName: Utils.sanitizeInput(guardianName),
            guardianPhone: Utils.sanitizeInput(guardianPhone),
            batchId,
            enrolledCourses
        };

        const student = await window.storageManager.addStudent(studentData);
        if (student) {
            Utils.showToast(`Student added successfully with ID: ${student.studentId}`, 'success');
            document.getElementById('addStudentForm').reset();
            this.clearCourseSelection();
        }
    }

    refresh() {
        this.loadInstitutions();
        this.updateInstitutionDropdown();
        this.updateBatchDropdown();
    }

    loadInstitutions() {
        const institutionList = document.getElementById('institutionList');
        if (!institutionList) return;

        const institutions = window.storageManager.getInstitutions();
        
        if (institutions.length === 0) {
            institutionList.innerHTML = '<p class="text-center">No institutions created yet</p>';
            return;
        }

        institutionList.innerHTML = institutions.map(institution => `
            <div class="entity-item">
                <div class="entity-info">
                    <div class="entity-name">${institution.name}</div>
                    <div class="entity-details">${institution.address}</div>
                </div>
                <div class="entity-actions">
                    <button class="btn btn-small btn-outline" onclick="studentManager.editInstitution('${institution.id}')">
                        Edit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="studentManager.deleteInstitution('${institution.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateInstitutionDropdown() {
        const institutionSelect = document.getElementById('studentInstitution');
        if (!institutionSelect) return;

        const institutions = window.storageManager.getInstitutions();
        institutionSelect.innerHTML = '<option value="">Select Institution</option>' +
            institutions.map(institution => 
                `<option value="${institution.id}">${institution.name}</option>`
            ).join('');
    }

    updateBatchDropdown() {
        const batchSelect = document.getElementById('studentBatch');
        if (!batchSelect) return;

        const batches = window.storageManager.getBatches();
        batchSelect.innerHTML = '<option value="">Select Batch</option>' +
            batches.map(batch => 
                `<option value="${batch.id}">${batch.name}</option>`
            ).join('');
        
        // Add event listener for batch change
        batchSelect.addEventListener('change', () => {
            this.updateCourseSelection();
        });
    }

    updateCourseSelection() {
        const batchId = document.getElementById('studentBatch').value;
        const courseSelectionDiv = document.getElementById('courseSelection');
        
        if (!courseSelectionDiv) return;
        
        if (!batchId) {
            courseSelectionDiv.innerHTML = '<p>Please select a batch first</p>';
            return;
        }
        
        const courses = window.storageManager.getCoursesByBatch(batchId);
        
        if (courses.length === 0) {
            courseSelectionDiv.innerHTML = '<p>No courses available for this batch</p>';
            return;
        }
        
        courseSelectionDiv.innerHTML = courses.map(course => {
            const months = window.storageManager.getMonthsByCourse(course.id);
            const monthOptions = months.map(month => 
                `<option value="${month.id}">${month.name}</option>`
            ).join('');
            
            return `
                <div class="course-enrollment-item">
                    <div class="course-checkbox">
                        <input type="checkbox" id="course_${course.id}" value="${course.id}" onchange="studentManager.toggleCourseSelection('${course.id}')">
                        <label for="course_${course.id}">${course.name}</label>
                    </div>
                    <div class="starting-month-select" id="startingMonth_${course.id}" style="display: none;">
                        <label for="startMonth_${course.id}">Starting Month:</label>
                        <select id="startMonth_${course.id}">
                            <option value="">Select Starting Month</option>
                            ${monthOptions}
                        </select>
                        <label for="endMonth_${course.id}">Ending Month (Optional):</label>
                        <select id="endMonth_${course.id}">
                            <option value="">No End Date</option>
                            ${monthOptions}
                        </select>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleCourseSelection(courseId) {
        const checkbox = document.getElementById(`course_${courseId}`);
        const startingMonthDiv = document.getElementById(`startingMonth_${courseId}`);
        
        if (checkbox.checked) {
            startingMonthDiv.style.display = 'block';
        } else {
            startingMonthDiv.style.display = 'none';
            document.getElementById(`startMonth_${courseId}`).value = '';
        }
    }

    getEnrolledCourses() {
        const enrolledCourses = [];
        const courseCheckboxes = document.querySelectorAll('#courseSelection input[type="checkbox"]:checked');
        
        courseCheckboxes.forEach(checkbox => {
            const courseId = checkbox.value;
            const startingMonthId = document.getElementById(`startMonth_${courseId}`).value;
            const endingMonthId = document.getElementById(`endMonth_${courseId}`).value;
            
            if (startingMonthId) {
                const enrollment = {
                    courseId,
                    startingMonthId
                };
                
                if (endingMonthId) {
                    enrollment.endingMonthId = endingMonthId;
                }
                
                enrolledCourses.push(enrollment);
            }
        });
        
        return enrolledCourses;
    }

    getEditEnrolledCourses() {
        const enrolledCourses = [];
        const courseCheckboxes = document.querySelectorAll('#editCourseSelection input[type="checkbox"]:checked');
        
        courseCheckboxes.forEach(checkbox => {
            const courseId = checkbox.value;
            const startingMonthId = document.getElementById(`editStartMonth_${courseId}`).value;
            const endingMonthId = document.getElementById(`editEndMonth_${courseId}`).value;
            
            if (startingMonthId) {
                const enrollment = {
                    courseId,
                    startingMonthId
                };
                
                if (endingMonthId) {
                    enrollment.endingMonthId = endingMonthId;
                }
                
                enrolledCourses.push(enrollment);
            }
        });
        
        return enrolledCourses;
    }

    toggleEditCourseSelection(courseId) {
        const checkbox = document.getElementById(`editCourse_${courseId}`);
        const startingMonthDiv = document.getElementById(`editStartingMonth_${courseId}`);
        
        if (checkbox.checked) {
            startingMonthDiv.style.display = 'block';
        } else {
            startingMonthDiv.style.display = 'none';
            document.getElementById(`editStartMonth_${courseId}`).value = '';
        }
    }

    clearCourseSelection() {
        const courseSelectionDiv = document.getElementById('courseSelection');
        if (courseSelectionDiv) {
            courseSelectionDiv.innerHTML = '<p>Please select a batch first</p>';
        }
    }

    editInstitution(id) {
        const institution = window.storageManager.getInstitutionById(id);
        if (!institution) return;

        const editForm = `
            <form id="editInstitutionForm">
                <div class="form-group">
                    <label for="editInstitutionName">Institution Name</label>
                    <input type="text" id="editInstitutionName" value="${institution.name}" required>
                </div>
                <div class="form-group">
                    <label for="editInstitutionAddress">Institution Address</label>
                    <textarea id="editInstitutionAddress" required>${institution.address}</textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Update Institution</button>
                    <button type="button" class="btn btn-outline" onclick="navigationManager.closeModal(document.getElementById('editModal'))">Cancel</button>
                </div>
            </form>
        `;

        window.navigationManager.showModal('editModal', 'Edit Institution', editForm);

        document.getElementById('editInstitutionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('editInstitutionName').value.trim();
            const address = document.getElementById('editInstitutionAddress').value.trim();

            if (!name || !address) {
                Utils.showToast('Please fill in all fields', 'error');
                return;
            }

            const result = window.storageManager.updateInstitution(id, {
                name: Utils.sanitizeInput(name),
                address: Utils.sanitizeInput(address)
            });

            if (result) {
                Utils.showToast('Institution updated successfully', 'success');
                window.navigationManager.closeModal(document.getElementById('editModal'));
                this.loadInstitutions();
                this.updateInstitutionDropdown();
            }
        });
    }

    deleteInstitution(id) {
        const institution = window.storageManager.getInstitutionById(id);
        if (!institution) return;

        Utils.confirm(`Are you sure you want to delete "${institution.name}"?`, () => {
            const result = window.storageManager.deleteInstitution(id);
            if (result.success) {
                Utils.showToast('Institution deleted successfully', 'success');
                this.loadInstitutions();
                this.updateInstitutionDropdown();
            } else {
                Utils.showToast(result.message, 'error');
            }
        });
    }

    editStudent(id) {
        const student = window.storageManager.getStudentById(id);
        if (!student) return;

        const institutions = window.storageManager.getInstitutions();
        const batches = window.storageManager.getBatches();
        const allCourses = window.storageManager.getCoursesByBatch(student.batchId);
        const enrolledCourseIds = (student.enrolledCourses || []).map(e => e.courseId);

        const editForm = `
            <form id="editStudentForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editStudentName">Student Name</label>
                        <input type="text" id="editStudentName" value="${student.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="editStudentInstitution">Institution</label>
                        <select id="editStudentInstitution" required>
                            <option value="">Select Institution</option>
                            ${institutions.map(inst => 
                                `<option value="${inst.id}" ${inst.id === student.institutionId ? 'selected' : ''}>${inst.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editStudentGender">Gender</label>
                        <select id="editStudentGender" required>
                            <option value="">Select Gender</option>
                            <option value="Male" ${student.gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${student.gender === 'Female' ? 'selected' : ''}>Female</option>
                            <option value="Custom" ${student.gender === 'Custom' ? 'selected' : ''}>Custom</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editStudentPhone">Student Phone</label>
                        <input type="tel" id="editStudentPhone" value="${student.phone}" required>
                    </div>
                    <div class="form-group">
                        <label for="editGuardianName">Guardian Name</label>
                        <input type="text" id="editGuardianName" value="${student.guardianName}" required>
                    </div>
                    <div class="form-group">
                        <label for="editGuardianPhone">Guardian Phone</label>
                        <input type="tel" id="editGuardianPhone" value="${student.guardianPhone}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editStudentBatch">Batch</label>
                        <select id="editStudentBatch" required>
                            <option value="">Select Batch</option>
                            ${batches.map(batch => 
                                `<option value="${batch.id}" ${batch.id === student.batchId ? 'selected' : ''}>${batch.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Course Enrollment</label>
                    <div id="editCourseSelection" class="course-selection">
                        ${allCourses.map(course => {
                            const isEnrolled = enrolledCourseIds.includes(course.id);
                            const enrollment = isEnrolled ? student.enrolledCourses.find(e => e.courseId === course.id) : null;
                            const months = window.storageManager.getMonthsByCourse(course.id);
                            const monthOptions = months.map(month => 
                                `<option value="${month.id}" ${enrollment && enrollment.startingMonthId === month.id ? 'selected' : ''}>${month.name}</option>`
                            ).join('');
                            const endMonthOptions = months.map(month => 
                                `<option value="${month.id}" ${enrollment && enrollment.endingMonthId === month.id ? 'selected' : ''}>${month.name}</option>`
                            ).join('');
                            
                            return `
                                <div class="course-enrollment-item">
                                    <div class="course-checkbox">
                                        <input type="checkbox" id="editCourse_${course.id}" value="${course.id}" ${isEnrolled ? 'checked' : ''} onchange="studentManager.toggleEditCourseSelection('${course.id}')">
                                        <label for="editCourse_${course.id}">${course.name}</label>
                                    </div>
                                    <div class="starting-month-select" id="editStartingMonth_${course.id}" style="display: ${isEnrolled ? 'block' : 'none'};">
                                        <label for="editStartMonth_${course.id}">Starting Month:</label>
                                        <select id="editStartMonth_${course.id}">
                                            <option value="">Select Starting Month</option>
                                            ${monthOptions}
                                        </select>
                                        <label for="editEndMonth_${course.id}">Ending Month (Optional):</label>
                                        <select id="editEndMonth_${course.id}">
                                            <option value="">No End Date</option>
                                            ${endMonthOptions}
                                        </select>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Update Student</button>
                    <button type="button" class="btn btn-outline" onclick="navigationManager.closeModal(document.getElementById('editModal'))">Cancel</button>
                </div>
            </form>
        `;

        window.navigationManager.showModal('editModal', 'Edit Student', editForm);

        document.getElementById('editStudentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('editStudentName').value.trim();
            const institutionId = document.getElementById('editStudentInstitution').value;
            const gender = document.getElementById('editStudentGender').value;
            const phone = document.getElementById('editStudentPhone').value.trim();
            const guardianName = document.getElementById('editGuardianName').value.trim();
            const guardianPhone = document.getElementById('editGuardianPhone').value.trim();
            const batchId = document.getElementById('editStudentBatch').value;
            const enrolledCourses = this.getEditEnrolledCourses();

            if (!name || !institutionId || !gender || !phone || !guardianName || !guardianPhone || !batchId) {
                Utils.showToast('Please fill in all fields', 'error');
                return;
            }

            if (!Utils.validatePhone(phone) || !Utils.validatePhone(guardianPhone)) {
                Utils.showToast('Please enter valid phone numbers', 'error');
                return;
            }

            if (enrolledCourses.length === 0) {
                Utils.showToast('Please select at least one course', 'error');
                return;
            }
            const result = window.storageManager.updateStudent(id, {
                name: Utils.sanitizeInput(name),
                institutionId,
                gender,
                phone: Utils.sanitizeInput(phone),
                guardianName: Utils.sanitizeInput(guardianName),
                guardianPhone: Utils.sanitizeInput(guardianPhone),
                batchId,
                enrolledCourses
            });

            if (result) {
                Utils.showToast('Student updated successfully', 'success');
                window.navigationManager.closeModal(document.getElementById('editModal'));
            }
        });
    }

    deleteStudent(id) {
        const student = window.storageManager.getStudentById(id);
        if (!student) return;

        Utils.confirm(`Are you sure you want to delete "${student.name}"?`, () => {
            const result = window.storageManager.deleteStudent(id);
            if (result.success) {
                Utils.showToast('Student deleted successfully', 'success');
            } else {
                Utils.showToast(result.message, 'error');
            }
        });
    }
}

// Global student management manager instance
window.studentManager = new StudentManagementManager();
