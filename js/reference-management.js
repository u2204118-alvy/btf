// Reference Management
class ReferenceManagementManager {
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
        // Add Reference Form
        const addReferenceForm = document.getElementById('addReferenceForm');
        if (addReferenceForm) {
            addReferenceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addReference();
            });
        }

        // Add Received By Form
        const addReceivedByForm = document.getElementById('addReceivedByForm');
        if (addReceivedByForm) {
            addReceivedByForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addReceivedBy();
            });
        }
    }

    addReference() {
        const referenceText = document.getElementById('newReference').value.trim();
        
        if (!referenceText) {
            Utils.showToast('Please enter a reference option', 'error');
            return;
        }

        const references = this.getReferences();
        
        // Check if reference already exists
        if (references.includes(referenceText)) {
            Utils.showToast('Reference option already exists', 'error');
            return;
        }

        references.push(referenceText);
        this.saveReferences(references);
        
        Utils.showToast('Reference option added successfully', 'success');
        document.getElementById('addReferenceForm').reset();
        this.refresh();
        this.updateReferenceDropdowns();
    }

    addReceivedBy() {
        const receivedByText = document.getElementById('newReceivedBy').value.trim();
        
        if (!receivedByText) {
            Utils.showToast('Please enter a receiver name', 'error');
            return;
        }

        const receivedByOptions = this.getReceivedByOptions();
        
        // Check if option already exists
        if (receivedByOptions.includes(receivedByText)) {
            Utils.showToast('Receiver option already exists', 'error');
            return;
        }

        receivedByOptions.push(receivedByText);
        this.saveReceivedByOptions(receivedByOptions);
        
        Utils.showToast('Receiver option added successfully', 'success');
        document.getElementById('addReceivedByForm').reset();
        this.refresh();
        this.updateReceivedByDropdowns();
    }

    getReferences() {
        try {
            return JSON.parse(localStorage.getItem('btf_reference_options') || '["Cash Payment", "Bank Transfer", "Mobile Banking", "Check Payment"]');
        } catch (e) {
            return ["Cash Payment", "Bank Transfer", "Mobile Banking", "Check Payment"];
        }
    }

    getReceivedByOptions() {
        try {
            return JSON.parse(localStorage.getItem('btf_received_by_options') || '["Reception Desk", "Admin Office", "Accounts Department"]');
        } catch (e) {
            return ["Reception Desk", "Admin Office", "Accounts Department"];
        }
    }

    saveReferences(references) {
        localStorage.setItem('btf_reference_options', JSON.stringify(references));
    }

    saveReceivedByOptions(options) {
        localStorage.setItem('btf_received_by_options', JSON.stringify(options));
    }

    refresh() {
        this.loadReferenceOptions();
        this.loadReceivedByOptions();
        this.updateReferenceDropdowns();
        this.updateReceivedByDropdowns();
    }

    loadReferenceOptions() {
        const referenceList = document.getElementById('referenceOptionsList');
        if (!referenceList) return;

        const references = this.getReferences();
        
        if (references.length === 0) {
            referenceList.innerHTML = '<p class="text-center">No reference options created yet</p>';
            return;
        }

        referenceList.innerHTML = references.map((reference, index) => `
            <div class="entity-item">
                <div class="entity-info">
                    <div class="entity-name">${reference}</div>
                </div>
                <div class="entity-actions">
                    <button class="btn btn-small btn-outline" onclick="referenceManagementManager.editReference(${index})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="referenceManagementManager.deleteReference(${index})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    loadReceivedByOptions() {
        const receivedByList = document.getElementById('receivedByOptionsList');
        if (!receivedByList) return;

        const options = this.getReceivedByOptions();
        
        if (options.length === 0) {
            receivedByList.innerHTML = '<p class="text-center">No receiver options created yet</p>';
            return;
        }

        receivedByList.innerHTML = options.map((option, index) => `
            <div class="entity-item">
                <div class="entity-info">
                    <div class="entity-name">${option}</div>
                </div>
                <div class="entity-actions">
                    <button class="btn btn-small btn-outline" onclick="referenceManagementManager.editReceivedBy(${index})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="referenceManagementManager.deleteReceivedBy(${index})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    updateReferenceDropdowns() {
        const referenceSelect = document.getElementById('referenceSelect');
        if (!referenceSelect) return;

        const references = this.getReferences();
        
        referenceSelect.innerHTML = '<option value="">Select Reference</option>' +
            references.map(ref => `<option value="${ref}">${ref}</option>`).join('') +
            '<option value="custom">Custom</option>';
    }

    updateReceivedByDropdowns() {
        const receivedBySelect = document.getElementById('receivedBySelect');
        if (!receivedBySelect) return;

        const options = this.getReceivedByOptions();
        
        receivedBySelect.innerHTML = '<option value="">Select Receiver</option>' +
            options.map(option => `<option value="${option}">${option}</option>`).join('') +
            '<option value="custom">Custom</option>';
    }

    editReference(index) {
        const references = this.getReferences();
        const currentReference = references[index];
        
        const newReference = prompt('Edit reference option:', currentReference);
        if (newReference && newReference !== currentReference) {
            const sanitizedReference = Utils.sanitizeInput(newReference);
            
            // Check if new reference already exists
            if (references.includes(sanitizedReference)) {
                Utils.showToast('Reference option already exists', 'error');
                return;
            }

            references[index] = sanitizedReference;
            this.saveReferences(references);
            Utils.showToast('Reference option updated successfully', 'success');
            this.refresh();
        }
    }

    editReceivedBy(index) {
        const options = this.getReceivedByOptions();
        const currentOption = options[index];
        
        const newOption = prompt('Edit receiver option:', currentOption);
        if (newOption && newOption !== currentOption) {
            const sanitizedOption = Utils.sanitizeInput(newOption);
            
            // Check if new option already exists
            if (options.includes(sanitizedOption)) {
                Utils.showToast('Receiver option already exists', 'error');
                return;
            }

            options[index] = sanitizedOption;
            this.saveReceivedByOptions(options);
            Utils.showToast('Receiver option updated successfully', 'success');
            this.refresh();
        }
    }

    deleteReference(index) {
        const references = this.getReferences();
        const referenceToDelete = references[index];
        
        Utils.confirm(`Are you sure you want to delete "${referenceToDelete}"?`, () => {
            references.splice(index, 1);
            this.saveReferences(references);
            Utils.showToast('Reference option deleted successfully', 'success');
            this.refresh();
        });
    }

    deleteReceivedBy(index) {
        const options = this.getReceivedByOptions();
        const optionToDelete = options[index];
        
        Utils.confirm(`Are you sure you want to delete "${optionToDelete}"?`, () => {
            options.splice(index, 1);
            this.saveReceivedByOptions(options);
            Utils.showToast('Receiver option deleted successfully', 'success');
            this.refresh();
        });
    }
}

// Global reference management manager instance
window.referenceManagementManager = new ReferenceManagementManager();