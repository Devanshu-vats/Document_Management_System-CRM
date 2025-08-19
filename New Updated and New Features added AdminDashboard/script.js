/* -------------------- Minimal ZIP helper (no external deps) -------------------- */
class MiniZip {
  constructor() {
    this.files = [];
  }
  static textToUint8(text) {
    return new TextEncoder().encode(text);
  }
  static crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();
  static crc32(uint8) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < uint8.length; i++) {
      crc = (crc >>> 8) ^ MiniZip.crc32Table[(crc ^ uint8[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }
  static msDosDateTime(date = new Date()) {
    const sec2 = Math.floor(date.getSeconds() / 2);
    const min = date.getMinutes();
    const hr = date.getHours();
    const time = (hr << 11) | (min << 5) | sec2;
    const day = date.getDate();
    const mon = date.getMonth() + 1;
    const yr = date.getFullYear() - 1980;
    const dosDate = (yr << 9) | (mon << 5) | day;
    return { dosTime: time, dosDate };
  }
  addTextFile(path, text) {
    const data = MiniZip.textToUint8(text);
    const crc32 = MiniZip.crc32(data);
    const { dosTime, dosDate } = MiniZip.msDosDateTime();
    this.files.push({
      name: path.replace(/\\/g, '/'),
      dataUint8: data,
      crc32,
      dosTime,
      dosDate,
      localHeaderOffset: 0
    });
  }
  build() {
    const sigLocal = 0x04034b50, sigCentral = 0x02014b50, sigEOCD = 0x06054b50;
    const version = 20, gpFlag = 0, method = 0, versionMadeBy = 20, externalAttrs = 0;
    const chunks = []; let offset = 0;
    for (const f of this.files) {
      const nameBytes = MiniZip.textToUint8(f.name);
      f.localHeaderOffset = offset;
      const localHeader = new DataView(new ArrayBuffer(30)); let p = 0;
      localHeader.setUint32(p, sigLocal, true); p += 4;
      localHeader.setUint16(p, version, true); p += 2;
      localHeader.setUint16(p, gpFlag, true); p += 2;
      localHeader.setUint16(p, method, true); p += 2;
      localHeader.setUint16(p, f.dosTime, true); p += 2;
      localHeader.setUint16(p, f.dosDate, true); p += 2;
      localHeader.setUint32(p, f.crc32, true); p += 4;
      localHeader.setUint32(p, f.dataUint8.length, true); p += 4;
      localHeader.setUint32(p, f.dataUint8.length, true); p += 4;
      localHeader.setUint16(p, nameBytes.length, true); p += 2;
      localHeader.setUint16(p, 0, true); p += 2;
      chunks.push(new Uint8Array(localHeader.buffer));
      chunks.push(nameBytes);
      chunks.push(f.dataUint8);
      offset += 30 + nameBytes.length + f.dataUint8.length;
    }
    const centralStart = offset;
    for (const f of this.files) {
      const nameBytes = MiniZip.textToUint8(f.name);
      const centralHeader = new DataView(new ArrayBuffer(46)); let p = 0;
      centralHeader.setUint32(p, sigCentral, true); p += 4;
      centralHeader.setUint16(p, versionMadeBy, true); p += 2;
      centralHeader.setUint16(p, version, true); p += 2;
      centralHeader.setUint16(p, gpFlag, true); p += 2;
      centralHeader.setUint16(p, method, true); p += 2;
      centralHeader.setUint16(p, f.dosTime, true); p += 2;
      centralHeader.setUint16(p, f.dosDate, true); p += 2;
      centralHeader.setUint32(p, f.crc32, true); p += 4;
      centralHeader.setUint32(p, f.dataUint8.length, true); p += 4;
      centralHeader.setUint32(p, f.dataUint8.length, true); p += 4;
      centralHeader.setUint16(p, nameBytes.length, true); p += 2;
      centralHeader.setUint16(p, 0, true); p += 2;
      centralHeader.setUint16(p, 0, true); p += 2;
      centralHeader.setUint16(p, 0, true); p += 2;
      centralHeader.setUint16(p, 0, true); p += 2;
      centralHeader.setUint32(p, externalAttrs, true); p += 4;
      centralHeader.setUint32(p, f.localHeaderOffset, true); p += 4;
      chunks.push(new Uint8Array(centralHeader.buffer));
      chunks.push(nameBytes);
      offset += 46 + nameBytes.length;
    }
    const centralSize = offset - centralStart;
    const eocd = new DataView(new ArrayBuffer(22)); let p = 0;
    eocd.setUint32(p, sigEOCD, true); p += 4;
    eocd.setUint16(p, 0, true); p += 2;
    eocd.setUint16(p, 0, true); p += 2;
    eocd.setUint16(p, this.files.length, true); p += 2;
    eocd.setUint16(p, this.files.length, true); p += 2;
    eocd.setUint32(p, centralSize, true); p += 4;
    eocd.setUint32(p, centralStart, true); p += 4;
    eocd.setUint16(p, 0, true); p += 2;
    chunks.push(new Uint8Array(eocd.buffer));
    let total = 0; for (const c of chunks) total += c.length;
    const out = new Uint8Array(total); let pos = 0;
    for (const c of chunks) { out.set(c, pos); pos += c.length; }
    return new Blob([out], { type: 'application/zip' });
  }
}

class DocumentPortalAdmin {
  constructor() {
    this.customers = [];
    this.filteredCustomers = [];
    this.activeFilter = 'all';
    this.searchTerm = '';
    this.isLoading = false;
    this.currentPage = 1;
    this.rowsPerPage = 10;
    this.stats = { total: 0, online: 0, offline: 0, completed: 0, documents: 0 };
    
    this.appStatuses = {
        'pending-review': { text: 'Pending Review', icon: 'fas fa-hourglass-start', colorClass: 'status-pending-review' },
        'in-progress': { text: 'In Progress', icon: 'fas fa-spinner', colorClass: 'status-in-progress' },
        'action-required': { text: 'Action Required', icon: 'fas fa-exclamation-triangle', colorClass: 'status-action-required' },
        'approved': { text: 'Approved', icon: 'fas fa-check-circle', colorClass: 'status-approved' },
        'rejected': { text: 'Rejected', icon: 'fas fa-times-circle', colorClass: 'status-rejected' }
    };

    this.documentTypes = {
      'paymentScreenshot': { name: 'Payment Screenshot', icon: 'fas fa-receipt', class: 'payment-icon' },
      aadhaar: { name: 'Aadhaar Card', icon: 'fas fa-id-card', class: 'aadhaar-icon' },
      photo: { name: 'Passport Photo', icon: 'fas fa-user-circle', class: 'photo-icon' },
      signature: { name: 'Signature', icon: 'fas fa-signature', class: 'signature-icon' },
      marksheet: { name: 'Class 10th Marksheet', icon: 'fas fa-graduation-cap', class: 'marksheet-icon' },
      'blood-group': { name: 'Blood Group Certificate', icon: 'fas fa-tint', class: 'blood-group-icon' }
    };
    
    this.initializeElements();
    this.bindEvents();
    this.loadCustomers();
  }

  initializeElements() {
    this.elements = {
      searchInput: document.getElementById('searchInput'), zipEmailInput: document.getElementById('zipEmailInput'),
      zipDownloadBtn: document.getElementById('zipDownloadBtn'), customersTableBody: document.getElementById('customersTableBody'),
      noCustomersMsg: document.getElementById('noCustomersMsg'), customerDetailModal: document.getElementById('customerDetailModal'), 
      closeModalBtn: document.getElementById('closeModalBtn'), modalContent: document.getElementById('modalContent'), 
      filterChips: document.querySelectorAll('.filter-chip'),
      skeletonLoader: document.getElementById('skeletonLoader'),
      paginationControls: document.getElementById('pagination-controls'),
      statElements: {
        total: document.getElementById('totalSubmissions'), online: document.getElementById('onlinePayments'),
        offline: document.getElementById('offlinePayments'), completed: document.getElementById('completedSubmissions'),
        documents: document.getElementById('totalDocuments')
      }
    };
  }

  bindEvents() {
    if(this.elements.searchInput) this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    if(this.elements.zipDownloadBtn) this.elements.zipDownloadBtn.addEventListener('click', () => this.handleZipDownload());
    if(this.elements.closeModalBtn) this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
    if(this.elements.customerDetailModal) this.elements.customerDetailModal.addEventListener('click', (e) => { if (e.target === this.elements.customerDetailModal) this.closeModal(); });
    if(this.elements.customersTableBody) this.elements.customersTableBody.addEventListener('click', (e) => this.handleTableClick(e));
    if(this.elements.modalContent) this.elements.modalContent.addEventListener('click', (e) => this.handleModalClick(e));
    this.elements.filterChips.forEach(chip => { chip.addEventListener('click', () => this.handleFilter(chip.dataset.filter)); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });
  }

  generateRealisticData() {
    const firstNames = ['Aarav', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Aanya', 'Diya', 'Kavya', 'Priya', 'Riya', 'Ishaan', 'Advik', 'Shaurya', 'Ananya', 'Saanvi'];
    const lastNames = ['Sharma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Agarwal', 'Jain', 'Verma', 'Yadav', 'Mishra'];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Lucknow', 'Ahmedabad'];
    const testData = [];
    for (let i = 0; i < 50; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const paymentMethod = Math.random() > 0.6 ? 'online' : 'offline';
      const submissionDate = new Date(); submissionDate.setDate(submissionDate.getDate() - Math.floor(Math.random() * 30));
      const docTypes = Object.keys(this.documentTypes);
      const statuses = Object.keys(this.appStatuses);
      const documents = docTypes.map(docType => ({
          type: docType, name: this.documentTypes[docType].name,
          filename: `${firstName}_${lastName}_${docType.replace(/([A-Z])/g, '_$1')}.pdf`,
          size: Math.floor(Math.random() * 2000) + 500
      }));
      testData.push({
        id: i + 1, firstName, lastName, fullName: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `+91 ${Math.floor(Math.random() * 9) + 6}${Math.floor(Math.random() * 900000000) + 100000000}`,
        city: cities[Math.floor(Math.random() * cities.length)],
        gender: Math.random() > 0.5 ? 'male' : 'female', paymentMethod,
        submissionDate: submissionDate.toISOString(), documents,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        notes: []
      });
    }
    return testData;
  }

  applyCurrentFilters() {
    let filtered = [...this.customers];
    const searchLower = this.searchTerm.toLowerCase();
    if (this.searchTerm) {
      filtered = filtered.filter(c => c.fullName.toLowerCase().includes(searchLower) || c.email.toLowerCase().includes(searchLower) );
    }
    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(customer => {
        if (this.activeFilter === 'approved') return customer.status === 'approved';
        if (this.activeFilter === 'pending-review') return customer.status === 'pending-review';
        if (this.activeFilter === 'in-progress') return customer.status === 'in-progress';
        if (this.activeFilter === 'rejected') return customer.status === 'rejected';
        if (this.activeFilter === 'action-required') return customer.status === 'action-required';
        return true;
      });
    }
    this.filteredCustomers = filtered;
    this.currentPage = 1;
    this.renderTable();
    this.updateStats();
    this.renderPagination();
  }
  
  renderTable() {
    const tbody = this.elements.customersTableBody;
    if(!tbody) return;
    tbody.innerHTML = '';
    if (this.filteredCustomers.length === 0) { if(this.elements.noCustomersMsg) this.elements.noCustomersMsg.classList.remove('hidden'); return; }
    if(this.elements.noCustomersMsg) this.elements.noCustomersMsg.classList.add('hidden');
    const start = (this.currentPage - 1) * this.rowsPerPage;
    const end = start + this.rowsPerPage;
    const paginatedCustomers = this.filteredCustomers.slice(start, end);
    tbody.innerHTML = paginatedCustomers.map(customer => {
      const submissionDate = new Date(customer.submissionDate);
      const formattedDate = submissionDate.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
      const statusInfo = this.appStatuses[customer.status] || { text: 'Unknown', icon: 'fas fa-question-circle', colorClass: 'status-rejected' };
      // UI FIX: The main table now shows the correct information in the correct columns.
      return `
        <tr class="table-row" data-customer-id="${customer.id}">
            <td><div class="flex items-center"><div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-blue-600 mr-4"><i class="fas fa-user text-lg"></i></div><div><div class="font-semibold text-slate-800">${customer.fullName}</div><div class="text-sm text-slate-500 flex items-center mt-1"><i class="fas fa-envelope mr-2"></i>${customer.email}</div></div></div></td>
            <td><div class="app-status-badge ${statusInfo.colorClass}"><i class="${statusInfo.icon} mr-2"></i>${statusInfo.text}</div></td>
            <td><div class="flex items-center"><span class="document-count-badge">${customer.documents.length} files</span></div></td>
            <td><div class="flex items-center"><span class="status-badge ${customer.paymentMethod === 'online' ? 'status-online' : 'status-offline'}"><i class="fas fa-${customer.paymentMethod === 'online' ? 'credit-card' : 'money-bill'} mr-1"></i>${customer.paymentMethod}</span></div></td>
            <td><div class="space-y-1"><div class="text-sm font-medium text-slate-700">${formattedDate}</div></div></td>
            <td><div class="action-buttons"><button class="view-details-btn" data-action="view" data-customer-id="${customer.id}"><i class="fas fa-eye mr-1"></i>View</button><button class="delete-btn" data-action="delete" data-customer-id="${customer.id}"><i class="fas fa-trash mr-1"></i>Delete</button></div></td>
        </tr>`;
    }).join('');
  }
  
  updateStats() { this.stats = { total: this.customers.length, online: this.customers.filter(c => c.paymentMethod === 'online').length, offline: this.customers.filter(c => c.paymentMethod === 'offline').length, completed: this.customers.filter(c => c.status === 'approved').length, documents: this.customers.reduce((sum, c) => sum + c.documents.length, 0) }; Object.keys(this.stats).forEach(key => { if(this.elements.statElements[key]) { this.animateCounter(this.elements.statElements[key], this.stats[key]); } }); }
  
  animateCounter(element, targetValue) { const currentValue = parseInt(element.textContent) || 0; if(currentValue === targetValue) return; const duration = 1000, steps = 30, stepTime = duration / steps, increment = (targetValue - currentValue) / steps; let currentStep = 0; const step = () => { if (currentStep < steps) { currentStep++; element.textContent = Math.round(currentValue + (increment * currentStep)); setTimeout(step, stepTime); } else { element.textContent = targetValue; } }; step(); }
  
  handleSearch(searchTerm) { this.searchTerm = searchTerm; this.applyCurrentFilters(); }
  
  handleFilter(filter) {
    this.elements.filterChips.forEach(chip => chip.classList.remove('active'));
    const activeChip = [...this.elements.filterChips].find(chip => chip.dataset.filter === filter);
    if(activeChip) activeChip.classList.add('active');
    
    this.activeFilter = filter;
    this.applyCurrentFilters();
  }
  
  handleTableClick(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const customerId = parseInt(e.target.closest('[data-customer-id]')?.dataset.customerId);
    if (!action || !customerId) return;
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) return;
    switch (action) {
      case 'view': this.viewCustomerDetails(customer); break;
      case 'delete': this.deleteCustomer(customer); break;
    }
  }

  handleModalClick(e) {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const customerId = button.dataset.customerId;
      if (action === 'download-all' && customerId) { this.downloadAllDocuments(parseInt(customerId)); }
      if (action === 'download-single') { this.downloadDocument(button.dataset.filename); }
      if (action === 'add-note' && customerId) { this.addNote(parseInt(customerId)); }
      if (action === 'delete-note' && customerId) { this.deleteNote(parseInt(customerId), parseInt(button.dataset.noteIndex)); }
  }
  
  updateStatus(customerId, newStatus) {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) return;
    customer.status = newStatus;
    this.applyCurrentFilters();
    this.showNotification(`${customer.fullName}'s status updated to "${this.appStatuses[newStatus].text}".`, 'success');
    this.viewCustomerDetails(customer);
  }

  addNote(customerId) {
      const customer = this.customers.find(c => c.id === customerId);
      const textarea = document.getElementById(`note-textarea-${customerId}`);
      if (!customer || !textarea || textarea.value.trim() === '') return;
      const newNote = { text: textarea.value.trim(), date: new Date().toISOString() };
      customer.notes.unshift(newNote);
      textarea.value = '';
      this.renderNotes(customerId);
      this.showNotification('Note added successfully!', 'success');
  }

  deleteNote(customerId, noteIndex) {
      const customer = this.customers.find(c => c.id === customerId);
      if (!customer || customer.notes[noteIndex] === undefined) return;
      if (confirm('Are you sure you want to delete this note?')) {
        customer.notes.splice(noteIndex, 1);
        this.renderNotes(customerId);
        this.showNotification('Note deleted.', 'info');
      }
  }

  renderNotes(customerId) {
      const customer = this.customers.find(c => c.id === customerId);
      const container = document.getElementById(`notes-list-${customerId}`);
      if (!customer || !container) return;
      if (customer.notes.length === 0) {
          container.innerHTML = `<p class="text-slate-500 text-sm text-center py-4">No notes for this applicant yet.</p>`;
          return;
      }
      container.innerHTML = customer.notes.map((note, index) => {
          const noteDate = new Date(note.date);
          const formattedDate = noteDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          return `
              <div class="note-item">
                  <p class="note-content">${note.text}</p>
                  <div class="flex justify-between items-center mt-2">
                      <p class="note-meta">Added on ${formattedDate}</p>
                      <button data-action="delete-note" data-customer-id="${customerId}" data-note-index="${index}" class="note-delete-btn" title="Delete Note"><i class="fas fa-trash-alt"></i></button>
                  </div>
              </div>`;
      }).join('');
  }

  viewCustomerDetails(customer) {
    const submissionDate = new Date(customer.submissionDate);
    const formattedDate = submissionDate.toLocaleDateString('en-IN', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
    const statusInfo = this.appStatuses[customer.status];
    const statusOptions = Object.keys(this.appStatuses).map(key => `<div class="status-option" data-value="${key}">${this.appStatuses[key].text}</div>`).join('');

    // UI FIX: Modal now shows Gender and has City removed.
    this.elements.modalContent.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-1 space-y-6">
            <div><h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center"><i class="fas fa-user mr-2 text-blue-500"></i>Personal Information</h3><div class="space-y-4 text-sm">
                <div class="flex justify-between"><span class="text-slate-600">Full Name:</span><span class="font-medium text-slate-800 text-right">${customer.fullName}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Email:</span><span class="font-medium text-slate-800 text-right">${customer.email}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Phone:</span><span class="font-medium text-slate-800 text-right">${customer.phone}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Gender:</span><span class="font-medium text-slate-800 capitalize text-right">${customer.gender}</span></div>
            </div></div>
            <div><h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center"><i class="fas fa-info-circle mr-2 text-blue-500"></i>Submission Details</h3><div class="space-y-4 text-sm">
                <div class="flex justify-between items-center"><span class="text-slate-600">Submitted:</span><span class="font-medium text-slate-800 text-right">${formattedDate}</span></div>
                <div class="flex justify-between items-center"><span class="text-slate-600">Payment:</span><span class="status-badge ${customer.paymentMethod === 'online' ? 'status-online' : 'status-offline'}"><i class="fas fa-${customer.paymentMethod === 'online' ? 'credit-card' : 'money-bill'} mr-1"></i>${customer.paymentMethod}</span></div>
                <div class="flex justify-between items-center"><span class="text-slate-600">App ID:</span><span class="font-medium text-slate-800 font-mono text-right">APP${String(customer.id).padStart(4, '0')}</span></div>
            </div></div>
            <div>
                <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center"><i class="fas fa-tasks mr-2 text-blue-500"></i>Application Status</h3>
                <div class="custom-status-dropdown" id="status-dropdown-${customer.id}" data-customer-id="${customer.id}">
                    <div class="status-select-trigger flex justify-between items-center">
                        <span class="app-status-badge ${statusInfo.colorClass}"><i class="${statusInfo.icon} mr-2"></i>${statusInfo.text}</span>
                        <i class="fas fa-chevron-down text-gray-400 transition-transform"></i>
                    </div>
                    <div class="status-options">${statusOptions}</div>
                </div>
            </div>
        </div>
        <div class="lg:col-span-1">
            <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center"><i class="fas fa-file-alt mr-2 text-blue-500"></i>Documents (${customer.documents.length})</h3>
            <div class="space-y-3">${customer.documents.map(doc => `<div class="document-item"><div class="document-item-info"><div class="document-type-icon ${this.documentTypes[doc.type].class}"><i class="${this.documentTypes[doc.type].icon}"></i></div><div><div class="font-medium text-slate-800">${doc.name}</div><div class="text-sm text-slate-500">${doc.filename}</div></div></div><button class="document-download-btn" data-action="download-single" data-filename="${doc.filename}"><i class="fas fa-download"></i></button></div>`).join('')}</div>
            <div class="mt-6 pt-6 border-t border-slate-200"><button class="btn-primary w-full" data-action="download-all" data-customer-id="${customer.id}"><i class="fas fa-archive mr-2"></i>Download All as ZIP</button></div>
        </div>
        <div class="lg:col-span-1">
            <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center"><i class="fas fa-comments mr-2 text-blue-500"></i>Notes & Activity Log</h3>
            <div class="space-y-4">
                <div>
                    <textarea id="note-textarea-${customer.id}" class="note-textarea" rows="3" placeholder="Add a new note..."></textarea>
                    <button class="btn-primary w-full mt-2 py-2" data-action="add-note" data-customer-id="${customer.id}">Add Note</button>
                </div>
                <div class="notes-section" id="notes-list-${customer.id}"></div>
            </div>
        </div>
      </div>`;
    this.elements.customerDetailModal.classList.remove('hidden');
    this.elements.customerDetailModal.classList.add('flex');
    this.renderNotes(customer.id);
    this.initializeStatusDropdown(customer.id);
  }
  
  initializeStatusDropdown(customerId) {
      const dropdown = document.getElementById(`status-dropdown-${customerId}`);
      if (!dropdown) return;
      const trigger = dropdown.querySelector('.status-select-trigger');
      const optionsContainer = dropdown.querySelector('.status-options');
      const icon = trigger.querySelector('.fa-chevron-down');

      const closeDropdown = () => {
          optionsContainer.classList.remove('open');
          trigger.classList.remove('open');
          icon.classList.remove('rotate-180');
          document.removeEventListener('click', closeDropdown);
      };

      trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = optionsContainer.classList.contains('open');
          if (!isOpen) {
              optionsContainer.classList.add('open');
              trigger.classList.add('open');
              icon.classList.add('rotate-180');
              setTimeout(() => document.addEventListener('click', closeDropdown), 0);
          } else {
              closeDropdown();
          }
      });

      optionsContainer.querySelectorAll('.status-option').forEach(option => {
          option.addEventListener('click', () => {
              this.updateStatus(customerId, option.dataset.value);
          });
      });
  }

  formatFileSize(bytes) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'; return Math.round(bytes / 1048576) + ' MB'; }
  
  deleteCustomer(customer) { if (!confirm(`Are you sure you want to delete the application for ${customer.fullName}?`)) return; this.customers = this.customers.filter(c => c.id !== customer.id); this.applyCurrentFilters(); this.showNotification(`Application for ${customer.fullName} has been deleted.`, 'success'); }
  
  closeModal() { if(this.elements.customerDetailModal) {this.elements.customerDetailModal.classList.add('hidden'); this.elements.customerDetailModal.classList.remove('flex');} }

  renderPagination() {
    if(!this.elements.paginationControls) return;
    const controls = this.elements.paginationControls;
    const pageCount = Math.ceil(this.filteredCustomers.length / this.rowsPerPage);
    controls.innerHTML = '';
    if (pageCount <= 1) return;
    const startItem = (this.currentPage - 1) * this.rowsPerPage + 1;
    const endItem = Math.min(startItem + this.rowsPerPage - 1, this.filteredCustomers.length);
    controls.innerHTML = `<span class="text-sm font-medium">Showing ${startItem}-${endItem} of ${this.filteredCustomers.length} results</span><div class="flex gap-2"><button class="page-btn" id="prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button><button class="page-btn" id="next-page" ${this.currentPage === pageCount ? 'disabled' : ''}>Next</button></div>`;
    document.getElementById('prev-page').addEventListener('click', () => { if (this.currentPage > 1) { this.currentPage--; this.renderTable(); this.renderPagination(); } });
    document.getElementById('next-page').addEventListener('click', () => { if (this.currentPage < pageCount) { this.currentPage++; this.renderTable(); this.renderPagination(); } });
  }

  setLoading(loading) {
    this.isLoading = loading;
    if(!this.elements.customersTableBody) return;
    if (loading) {
      this.elements.customersTableBody.classList.add('hidden');
      this.elements.skeletonLoader.classList.remove('hidden');
      this.elements.noCustomersMsg.classList.add('hidden');
    } else {
      this.elements.customersTableBody.classList.remove('hidden');
      this.elements.skeletonLoader.classList.add('hidden');
    }
  }
  
  async loadCustomers() {
    this.setLoading(true);
    await this.delay(1500);
    this.customers = this.generateRealisticData();
    this.applyCurrentFilters();
    this.setLoading(false);
    this.showNotification('Customer data loaded successfully!', 'success');
  }

  // ============== ZIP DOWNLOAD FUNCTIONS (UNCHANGED) ==============
  _triggerBlobDownload(blob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  handleZipDownload() {
    const emailInput = this.elements.zipEmailInput;
    if (!emailInput) {
      this.showNotification('ZIP export unavailable: email input missing.', 'error');
      return;
    }
    const email = (emailInput.value || '').trim().toLowerCase();

    if (email) {
      if (!this.isValidEmail(email)) {
          this.showNotification('Please enter a valid email address.', 'error');
          return;
      }
      const user = this.customers.find(c => (c.email || '').toLowerCase() === email);
      if (!user) {
        this.showNotification('No applicant found with the entered email.', 'error');
        return;
      }
      const zip = new MiniZip();
      const summary = `User: ${user.fullName}\nEmail: ${user.email}\nPhone: ${user.phone}\nGender: ${user.gender}\nApplication ID: APP${String(user.id).padStart(4, '0')}\nStatus: ${user.status}`;
      zip.addTextFile('_summary.txt', summary);
      user.documents.forEach(doc => {
        const content = `This is a placeholder for the document: ${doc.name}.\nFile: ${doc.filename}\nUser: ${user.fullName}`;
        zip.addTextFile(`${doc.filename}`, content);
      });
      const blob = zip.build();
      this._triggerBlobDownload(blob, `${user.fullName.replace(/\s+/g, '_')}_documents.zip`);
      this.showNotification(`ZIP for ${user.fullName} downloaded.`, 'success');
      return;
    }

    if (!this.filteredCustomers || this.filteredCustomers.length === 0) {
      this.showNotification('No data available to export.', 'error');
      return;
    }
    const zip = new MiniZip();
    const summaryData = JSON.stringify(this.filteredCustomers.map(u => ({ id: u.id, fullName: u.fullName, email: u.email, status: u.status })), null, 2);
    zip.addTextFile('summary_of_all_users.json', summaryData);
    this.filteredCustomers.forEach(user => {
      const safeName = user.fullName.replace(/\s+/g, '_');
      user.documents.forEach(doc => {
        const content = `This is a placeholder for the document: ${doc.name}.\nFile: ${doc.filename}\nUser: ${user.fullName}`;
        zip.addTextFile(`user_documents/${safeName}/${doc.filename}`, content);
      });
    });
    const blob = zip.build();
    this._triggerBlobDownload(blob, `export_${Date.now()}.zip`);
    this.showNotification('Export ZIP file generated successfully!', 'success');
  }

  downloadAllDocuments(customerId) {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) {
      this.showNotification('Could not find this customer.', 'error');
      return;
    }
    const zip = new MiniZip();
    const summary = `User: ${customer.fullName}\nEmail: ${customer.email}\nPhone: ${customer.phone}\nGender: ${customer.gender}\nApplication ID: APP${String(customer.id).padStart(4, '0')}\nStatus: ${customer.status}`;
    zip.addTextFile('_summary.txt', summary);
    customer.documents.forEach(doc => {
      const content = `This is a placeholder for the document: ${doc.name}.\nFile: ${doc.filename}\nUser: ${customer.fullName}`;
      zip.addTextFile(`${doc.filename}`, content);
    });
    const blob = zip.build();
    this._triggerBlobDownload(blob, `${customer.fullName.replace(/\s+/g, '_')}_documents.zip`);
    this.showNotification(`ZIP for ${customer.fullName} downloaded.`, 'success');
  }
  // ============== END OF ZIP DOWNLOAD FUNCTIONS ==============
  
  isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  
  showNotification(message, type = 'info') { 
      const container = document.getElementById('notificationContainer');
      if (!container) {
          alert(`[${type.toUpperCase()}] ${message}`);
          return;
      }
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `<div class="flex items-center"><i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-3"></i><span>${message}</span></div>`;
      container.appendChild(notification);
      setTimeout(() => notification.classList.add('show'), 100);
      setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => notification.remove(), 400);
      }, 4000);
  }
  
  downloadDocument(filename) { this.showNotification(`Preparing ${filename}...`, 'info'); setTimeout(() => { const blob = new Blob([`Simulated download for ${filename}`], { type: 'text/plain' }); this._triggerBlobDownload(blob, filename); this.showNotification(`${filename} downloaded!`, 'success'); }, 1000); }
}

let admin;
function handleLogout() { if (confirm('Are you sure you want to logout?')) { admin.showNotification('👋 Logged out successfully.', 'success'); } }
document.addEventListener('DOMContentLoaded', () => { admin = new DocumentPortalAdmin(); });
