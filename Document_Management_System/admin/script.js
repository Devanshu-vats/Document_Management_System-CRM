/* DocumentPortalAdmin - Complete updated single-file codebase
   Fix: Export (toolbar) will export ONLY the applicant whose email matches the entered email.
        - If zipEmailInput has a non-empty email, the ZIP will include only that user (exact match).
        - If email field is empty, it exports ALL filtered users (previous behavior).
   Per-person ZIP (modal): exports only that selected person's files (unchanged).
   Other improvements: DOM guards, pagination edge-case, safe counter parsing.
*/

/* -------------------- Minimal ZIP helper (no external deps) -------------------- */
class MiniZip {
  constructor() {
    this.files = []; // { name, dataUint8, crc32, dosTime, dosDate, localHeaderOffset }
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
    // DOS time: bits 0-4 sec/2, 5-10 min, 11-15 hour
    // DOS date: bits 0-4 day, 5-8 month, 9-15 years from 1980
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
    // Signatures
    const sigLocal = 0x04034b50;
    const sigCentral = 0x02014b50;
    const sigEOCD = 0x06054b50;

    const version = 20;        // 2.0
    const gpFlag = 0;          // general purpose bit flag
    const method = 0;          // store (no compression)
    const versionMadeBy = 20;  // 2.0
    const externalAttrs = 0;   // default

    const chunks = [];
    let offset = 0;

    // Local File Headers + data
    for (const f of this.files) {
      const nameBytes = MiniZip.textToUint8(f.name);
      f.localHeaderOffset = offset;

      const localHeader = new DataView(new ArrayBuffer(30));
      let p = 0;
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
      localHeader.setUint16(p, 0, true); p += 2; // extra len

      chunks.push(new Uint8Array(localHeader.buffer));
      chunks.push(nameBytes);
      chunks.push(f.dataUint8);

      offset += 30 + nameBytes.length + f.dataUint8.length;
    }

    const centralStart = offset;

    // Central Directory
    for (const f of this.files) {
      const nameBytes = MiniZip.textToUint8(f.name);

      const centralHeader = new DataView(new ArrayBuffer(46));
      let p = 0;
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
      centralHeader.setUint16(p, 0, true); p += 2; // extra len
      centralHeader.setUint16(p, 0, true); p += 2; // comment len
      centralHeader.setUint16(p, 0, true); p += 2; // disk start
      centralHeader.setUint16(p, 0, true); p += 2; // internal attrs
      centralHeader.setUint32(p, externalAttrs, true); p += 4;
      centralHeader.setUint32(p, f.localHeaderOffset, true); p += 4;

      chunks.push(new Uint8Array(centralHeader.buffer));
      chunks.push(nameBytes);

      offset += 46 + nameBytes.length;
    }

    const centralSize = offset - centralStart;

    // End of Central Directory
    const eocd = new DataView(new ArrayBuffer(22));
    let p = 0;
    eocd.setUint32(p, sigEOCD, true); p += 4;
    eocd.setUint16(p, 0, true); p += 2; // disk number
    eocd.setUint16(p, 0, true); p += 2; // start disk
    eocd.setUint16(p, this.files.length, true); p += 2; // entries on this disk
    eocd.setUint16(p, this.files.length, true); p += 2; // total entries
    eocd.setUint32(p, centralSize, true); p += 4;       // central dir size
    eocd.setUint32(p, centralStart, true); p += 4;      // central dir offset
    eocd.setUint16(p, 0, true); p += 2;                 // zip comment length

    chunks.push(new Uint8Array(eocd.buffer));

    // Concatenate chunks
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    return new Blob([out], { type: 'application/zip' });
  }
}

/* -------------------- Application code -------------------- */
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
    this.documentTypes = {
      paymentScreenshot: { name: 'Payment Screenshot', icon: 'fas fa-receipt', class: 'payment-icon' },
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
      searchInput: document.getElementById('searchInput'),
      zipEmailInput: document.getElementById('zipEmailInput'),
      zipDownloadBtn: document.getElementById('zipDownloadBtn'),
      customersTableBody: document.getElementById('customersTableBody'),
      noCustomersMsg: document.getElementById('noCustomersMsg'),
      customerDetailModal: document.getElementById('customerDetailModal'),
      closeModalBtn: document.getElementById('closeModalBtn'),
      modalContent: document.getElementById('modalContent'),
      filterChips: document.querySelectorAll('.filter-chip'),
      skeletonLoader: document.getElementById('skeletonLoader'),
      paginationControls: document.getElementById('pagination-controls'),
      statElements: {
        total: document.getElementById('totalSubmissions'),
        online: document.getElementById('onlinePayments'),
        offline: document.getElementById('offlinePayments'),
        completed: document.getElementById('completedSubmissions'),
        documents: document.getElementById('totalDocuments')
      }
    };
  }

  bindEvents() {
    if (this.elements.searchInput)
      this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    if (this.elements.zipDownloadBtn)
      this.elements.zipDownloadBtn.addEventListener('click', () => this.handleZipDownload());
    if (this.elements.closeModalBtn)
      this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
    if (this.elements.customerDetailModal)
      this.elements.customerDetailModal.addEventListener('click', (e) => {
        if (e.target === this.elements.customerDetailModal) this.closeModal();
      });
    if (this.elements.customersTableBody)
      this.elements.customersTableBody.addEventListener('click', (e) => this.handleTableClick(e));
    if (this.elements.modalContent) {
      this.elements.modalContent.addEventListener('change', (e) => this.handleModalChange(e));
      this.elements.modalContent.addEventListener('click', (e) => this.handleModalClick(e));
    }
    this.elements.filterChips.forEach((chip) => {
      chip.addEventListener('click', () => this.handleFilter(chip.dataset.filter));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
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
      const submissionDate = new Date();
      submissionDate.setDate(submissionDate.getDate() - Math.floor(Math.random() * 30));
      const docTypes = Object.keys(this.documentTypes);
      const documents = docTypes.map((docType) => ({
        type: docType,
        name: this.documentTypes[docType].name,
        // .txt reflects placeholder content; change to .pdf when using real files
        filename: `${firstName}_${lastName}_${docType.replace(/([A-Z])/g, '_$1')}.txt`,
        size: Math.floor(Math.random() * 2000) + 500
      }));
      testData.push({
        id: i + 1,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `+91 ${Math.floor(Math.random() * 9) + 6}${Math.floor(Math.random() * 900000000) + 100000000}`,
        city: cities[Math.floor(Math.random() * cities.length)],
        gender: Math.random() > 0.5 ? 'male' : 'female',
        paymentMethod,
        submissionDate: submissionDate.toISOString(),
        documents,
        status: Math.random() > 0.5 ? 'pending' : 'completed'
      });
    }
    return testData;
  }

  applyCurrentFilters() {
    let filtered = [...this.customers];
    const searchLower = this.searchTerm.toLowerCase();
    if (this.searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.fullName.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower)
      );
    }
    if (this.activeFilter !== 'all') {
      filtered = filtered.filter((customer) => {
        switch (this.activeFilter) {
          case 'online':
            return customer.paymentMethod === 'online';
          case 'offline':
            return customer.paymentMethod === 'offline';
          case 'male':
            return customer.gender === 'male';
          case 'female':
            return customer.gender === 'female';
          case 'completed':
            return customer.status === 'completed';
          case 'pending':
            return customer.status === 'pending';
          default:
            return true;
        }
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
    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.filteredCustomers.length === 0) {
      if (this.elements.noCustomersMsg) this.elements.noCustomersMsg.classList.remove('hidden');
      return;
    }
    if (this.elements.noCustomersMsg) this.elements.noCustomersMsg.classList.add('hidden');

    const start = (this.currentPage - 1) * this.rowsPerPage;
    const end = start + this.rowsPerPage;
    const paginatedCustomers = this.filteredCustomers.slice(start, end);

    tbody.innerHTML = paginatedCustomers
      .map((customer) => {
        const submissionDate = new Date(customer.submissionDate);
        const formattedDate = submissionDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const timeAgo = this.getTimeAgo(submissionDate);
        return `
          <tr class="table-row" data-customer-id="${customer.id}">
            <td>
              <div class="flex items-center">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-blue-600 mr-4">
                  <i class="fas fa-user text-lg"></i>
                </div>
                <div>
                  <div class="font-semibold text-slate-800">${customer.fullName}</div>
                  <div class="text-sm text-slate-500 flex items-center mt-1">
                    <i class="fas fa-map-marker-alt mr-1"></i>${customer.city}
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div class="space-y-1">
                <div class="text-sm text-slate-600 flex items-center">
                  <i class="fas fa-envelope mr-2 text-slate-400"></i>${customer.email}
                </div>
                <div class="text-sm text-slate-600 flex items-center">
                  <i class="fas fa-phone mr-2 text-slate-400"></i>${customer.phone}
                </div>
              </div>
            </td>
            <td>
              <div class="flex items-center">
                <span class="document-count-badge">${customer.documents.length} files</span>
                <div class="ml-3 flex -space-x-2">
                  ${customer.documents
                    .slice(0, 3)
                    .map(
                      (doc) =>
                        `<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 border-white ${this.documentTypes[doc.type].class}" title="${doc.name}">
                           <i class="${this.documentTypes[doc.type].icon}"></i>
                         </div>`
                    )
                    .join('')}
                  ${
                    customer.documents.length > 3
                      ? `<div class="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-semibold text-slate-600 border-2 border-white">+${customer.documents.length - 3}</div>`
                      : ''
                  }
                </div>
              </div>
            </td>
            <td>
              <div class="flex items-center">
                <span class="status-badge ${customer.paymentMethod === 'online' ? 'status-online' : 'status-offline'}">
                  <i class="fas fa-${customer.paymentMethod === 'online' ? 'credit-card' : 'money-bill'} mr-1"></i>${customer.paymentMethod}
                </span>
                ${
                  customer.status === 'completed'
                    ? `<div class="manual-complete-icon" title="Payment Verified"><i class="fas fa-check"></i></div>`
                    : ''
                }
              </div>
            </td>
            <td>
              <div class="space-y-1">
                <div class="text-sm font-medium text-slate-700">${formattedDate}</div>
                <div class="text-xs text-slate-500">${timeAgo}</div>
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button class="view-details-btn" data-action="view" data-customer-id="${customer.id}">
                  <i class="fas fa-eye mr-1"></i>View
                </button>
                <button class="delete-btn" data-action="delete" data-customer-id="${customer.id}">
                  <i class="fas fa-trash mr-1"></i>Delete
                </button>
              </div>
            </td>
          </tr>`;
      })
      .join('');
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  updateStats() {
    this.stats = {
      total: this.customers.length,
      online: this.customers.filter((c) => c.paymentMethod === 'online').length,
      offline: this.customers.filter((c) => c.paymentMethod === 'offline').length,
      completed: this.customers.filter((c) => c.status === 'completed').length,
      documents: this.customers.reduce((sum, c) => sum + c.documents.length, 0)
    };
    Object.keys(this.stats).forEach((key) => {
      if (this.elements.statElements[key]) {
        this.animateCounter(this.elements.statElements[key], this.stats[key]);
      }
    });
  }

  animateCounter(element, targetValue) {
    const text = (element.textContent || '').toString();
    const currentValue = parseInt(text.replace(/\D/g, ''), 10) || 0;
    if (currentValue === targetValue) return;
    const duration = 1000;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = (targetValue - currentValue) / steps;
    let currentStep = 0;
    const step = () => {
      if (currentStep < steps) {
        currentStep++;
        element.textContent = Math.round(currentValue + increment * currentStep);
        setTimeout(step, stepTime);
      } else {
        element.textContent = targetValue;
      }
    };
    step();
  }

  handleSearch(searchTerm) {
    this.searchTerm = searchTerm;
    this.applyCurrentFilters();
  }

  handleFilter(filter) {
    this.elements.filterChips.forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.filter === filter);
    });
    this.activeFilter = filter;
    this.applyCurrentFilters();
  }

  handleTableClick(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const customerId = parseInt(e.target.closest('[data-customer-id]')?.dataset.customerId);
    if (!action || !customerId) return;
    const customer = this.customers.find((c) => c.id === customerId);
    if (!customer) return;
    switch (action) {
      case 'view':
        this.viewCustomerDetails(customer);
        break;
      case 'delete':
        this.deleteCustomer(customer);
        break;
    }
  }

  handleModalClick(e) {
    const button = e.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const customerId = button.dataset.customerId;
    if (action === 'download-all' && customerId) {
      // Only the selected customer's ZIP here
      this.downloadAllDocuments(parseInt(customerId, 10));
    }
    if (action === 'download-single') {
      this.downloadDocument(button.dataset.filename);
    }
  }

  handleModalChange(e) {
    if (e.target.matches('.payment-status-toggle')) {
      const customerId = parseInt(e.target.dataset.customerId);
      const isCompleted = e.target.checked;
      this.updatePaymentStatus(customerId, isCompleted);
    }
  }

  updatePaymentStatus(customerId, isCompleted) {
    const customer = this.customers.find((c) => c.id === customerId);
    if (!customer) return;
    customer.status = isCompleted ? 'completed' : 'pending';
    const modalStatusBadge = this.elements.modalContent?.querySelector(`#modal-status-${customerId}`);
    if (modalStatusBadge) {
      modalStatusBadge.className = `status-badge ${isCompleted ? 'status-online' : 'status-offline'}`;
      modalStatusBadge.innerHTML = `<i class="fas fa-${isCompleted ? 'check-circle' : 'clock'} mr-1"></i> ${isCompleted ? 'completed' : 'pending'}`;
    }
    this.applyCurrentFilters();
    this.showNotification(
      `Payment for ${customer.fullName} has been ${isCompleted ? 'verified and marked as Complete' : 'reverted to Pending'}.`,
      'success'
    );
  }

  viewCustomerDetails(customer) {
    const submissionDate = new Date(customer.submissionDate);
    const formattedDate = submissionDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const paymentActionBlock = `<div class="mt-6 pt-6 border-t border-slate-200">
      <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center">
        <i class="fas fa-tasks mr-2 text-blue-500"></i>Payment Verification
      </h3>
      <div class="flex justify-between items-center bg-slate-100 p-4 rounded-lg">
        <span class="font-medium text-slate-700">Verify Payment & Mark as Complete</span>
        <label class="toggle-label">
          <div class="toggle-switch">
            <input type="checkbox" class="payment-status-toggle" data-customer-id="${customer.id}" ${
      customer.status === 'completed' ? 'checked' : ''
    }><span class="slider"></span>
          </div>
        </label>
      </div>
    </div>`;

    if (!this.elements.modalContent || !this.elements.customerDetailModal) return;

    this.elements.modalContent.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <i class="fas fa-user mr-2 text-blue-500"></i>Personal Information
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between"><span class="text-slate-600">Full Name:</span><span class="font-medium text-slate-800">${customer.fullName}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Email:</span><span class="font-medium text-slate-800">${customer.email}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Phone:</span><span class="font-medium text-slate-800">${customer.phone}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">City:</span><span class="font-medium text-slate-800">${customer.city}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Gender:</span><span class="font-medium text-slate-800 capitalize">${customer.gender}</span></div>
              </div>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <i class="fas fa-info-circle mr-2 text-blue-500"></i>Submission Details
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center"><span class="text-slate-600">Submission Date:</span><span class="font-medium text-slate-800">${formattedDate}</span></div>
                <div class="flex justify-between items-center"><span class="text-slate-600">Payment Method:</span><span class="status-badge ${
                  customer.paymentMethod === 'online' ? 'status-online' : 'status-offline'
                }"><i class="fas fa-${customer.paymentMethod === 'online' ? 'credit-card' : 'money-bill'} mr-1"></i>${customer.paymentMethod}</span></div>
                <div class="flex justify-between items-center"><span class="text-slate-600">Payment Status:</span><span id="modal-status-${customer.id}" class="status-badge ${
      customer.status === 'completed' ? 'status-online' : 'status-offline'
    }"><i class="fas fa-${customer.status === 'completed' ? 'check-circle' : 'clock'} mr-1"></i>${customer.status}</span></div>
                <div class="flex justify-between items-center"><span class="text-slate-600">Application ID:</span><span class="font-medium text-slate-800 font-mono">APP${String(
                  customer.id
                ).padStart(4, '0')}</span></div>
              </div>
            </div>
            ${paymentActionBlock}
          </div>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <i class="fas fa-file-alt mr-2 text-blue-500"></i>Submitted Documents (${customer.documents.length})
          </h3>
          <div class="space-y-3">
            ${customer.documents
              .map(
                (doc) => `<div class="document-item">
                  <div class="flex items-center">
                    <div class="document-type-icon ${this.documentTypes[doc.type].class}">
                      <i class="${this.documentTypes[doc.type].icon}"></i>
                    </div>
                    <div>
                      <div class="font-medium text-slate-800">${doc.name}</div>
                      <div class="text-sm text-slate-500">${doc.filename} • ${this.formatFileSize(doc.size)}</div>
                    </div>
                  </div>
                  <button class="document-download-btn" data-action="download-single" data-filename="${doc.filename}">
                    <i class="fas fa-download mr-1"></i>Download
                  </button>
                </div>`
              )
              .join('')}
          </div>
          <div class="mt-6 pt-6 border-t border-slate-200">
            <button class="btn-primary w-full" data-action="download-all" data-customer-id="${customer.id}">
              <i class="fas fa-archive mr-2"></i>Download All as ZIP
            </button>
          </div>
        </div>
      </div>`;
    this.elements.customerDetailModal.classList.remove('hidden');
    this.elements.customerDetailModal.classList.add('flex');
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1048576) + ' MB';
  }

  deleteCustomer(customer) {
    if (!confirm(`Are you sure you want to delete the application for ${customer.fullName}?`)) return;
    this.customers = this.customers.filter((c) => c.id !== customer.id);
    this.applyCurrentFilters();
    this.showNotification(`Application for ${customer.fullName} has been deleted.`, 'success');
  }

  closeModal() {
    if (!this.elements.customerDetailModal) return;
    this.elements.customerDetailModal.classList.add('hidden');
    this.elements.customerDetailModal.classList.remove('flex');
  }

  renderPagination() {
    const controls = this.elements.paginationControls;
    if (!controls) return;
    const pageCount = Math.ceil(this.filteredCustomers.length / this.rowsPerPage) || 1;
    if (this.currentPage > pageCount) this.currentPage = pageCount;

    controls.innerHTML = '';
    if (pageCount <= 1) return;

    const startItem = (this.currentPage - 1) * this.rowsPerPage + 1;
    const endItem = Math.min(startItem + this.rowsPerPage - 1, this.filteredCustomers.length);
    controls.innerHTML = `
      <span class="text-sm font-medium">Showing ${startItem}-${endItem} of ${this.filteredCustomers.length} results</span>
      <div class="flex gap-2">
        <button class="page-btn" id="prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <button class="page-btn" id="next-page" ${this.currentPage === pageCount ? 'disabled' : ''}>Next</button>
      </div>`;

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn)
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderTable();
          this.renderPagination();
        }
      });
    if (nextBtn)
      nextBtn.addEventListener('click', () => {
        if (this.currentPage < pageCount) {
          this.currentPage++;
          this.renderTable();
          this.renderPagination();
        }
      });
  }

  setLoading(loading) {
    this.isLoading = loading;
    if (!this.elements.customersTableBody || !this.elements.skeletonLoader || !this.elements.noCustomersMsg) return;
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
    await this.delay(800);
    this.customers = this.generateRealisticData();
    this.applyCurrentFilters();
    this.setLoading(false);
    this.showNotification('Customer data loaded successfully!', 'success');
  }

  _triggerBlobDownload(blob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // EXPORT (toolbar):
  // - If zipEmailInput has an email, export ONLY that email's applicant.
  // - If zipEmailInput is empty, export ALL filtered applicants (previous behavior).
  handleZipDownload() {
    const emailInput = this.elements.zipEmailInput;
    if (!emailInput) {
      this.showNotification('ZIP export unavailable: email input missing.', 'error');
      return;
    }
    const emailRaw = emailInput.value.trim();
    const email = emailRaw.toLowerCase();

    // Case A: Email provided => export single user by that email
    if (email) {
      const user = this.customers.find(
        (c) => (c.email || '').toLowerCase() === email
      );
      if (!user) {
        this.showNotification('No applicant found with the entered email.', 'error');
        return;
      }
      this.showNotification(`Generating ZIP for ${user.fullName} (${user.email})...`, 'info');

      const zip = new MiniZip();

      // Add person-specific summary
      const summary = `User: ${user.fullName}
Email: ${user.email}
Phone: ${user.phone}
City: ${user.city}
Application ID: APP${String(user.id).padStart(4, '0')}
Payment: ${user.paymentMethod}, Status: ${user.status}`;
      zip.addTextFile(`_summary.txt`, summary);

      // Add only this person's documents
      user.documents.forEach((doc) => {
        const content = `This is a placeholder for the document: ${doc.name}.
File: ${doc.filename}
User: ${user.fullName}`;
        zip.addTextFile(`${doc.filename}`, content);
      });

      const blob = zip.build();
      this._triggerBlobDownload(blob, `${user.fullName.replace(/\s/g, '_')}_documents.zip`);
      this.showNotification(`ZIP for ${user.fullName} downloaded.`, 'success');
      // Do not clear the email; keep it for repeated exports if desired.
      return;
    }

    // Case B: No email => export ALL filtered users (legacy behavior)
    if (this.filteredCustomers.length === 0) {
      this.showNotification('No data available to export.', 'error');
      return;
    }

    this.showNotification(`Generating ZIP for ${this.filteredCustomers.length} users...`, 'info');

    const zip = new MiniZip();

    // Summary of filtered users only
    const summaryData = JSON.stringify(this.filteredCustomers, null, 2);
    zip.addTextFile('summary_of_all_users.json', summaryData);

    // Add placeholder "documents" for each filtered user
    this.filteredCustomers.forEach((customer) => {
      const safeName = customer.fullName.replace(/\s/g, '_');
      customer.documents.forEach((doc) => {
        const content = `This is a placeholder for the document: ${doc.name}.
File: ${doc.filename}
User: ${customer.fullName}`;
        zip.addTextFile(`user_documents/${safeName}/${doc.filename}`, content);
      });
    });

    const blob = zip.build();
    this._triggerBlobDownload(blob, `export_${new Date().getTime()}.zip`);
    this.showNotification('Export ZIP file generated successfully!', 'success');
  }

  // PER-PERSON ZIP: includes ONLY the selected person's data (modal button)
  downloadAllDocuments(customerId) {
    const customer = this.customers.find((c) => c.id === customerId);
    if (!customer) {
      this.showNotification('Could not find this customer.', 'error');
      return;
    }

    this.showNotification(`Creating ZIP for ${customer.fullName}...`, 'info');

    const zip = new MiniZip();

    // Person-specific summary
    const summary = `User: ${customer.fullName}
Email: ${customer.email}
Phone: ${customer.phone}
City: ${customer.city}
Application ID: APP${String(customer.id).padStart(4, '0')}
Payment: ${customer.paymentMethod}, Status: ${customer.status}`;
    zip.addTextFile(`_summary.txt`, summary);

    // Only this person's documents
    customer.documents.forEach((doc) => {
      const content = `This is a placeholder for the document: ${doc.name}.
File: ${doc.filename}
User: ${customer.fullName}`;
      zip.addTextFile(`${doc.filename}`, content);
    });

    const blob = zip.build();
    this._triggerBlobDownload(blob, `${customer.fullName.replace(/\s/g, '_')}_documents.zip`);
    this.showNotification(`ZIP for ${customer.fullName} downloaded.`, 'success');
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
      console[type === 'error' ? 'error' : type === 'success' ? 'log' : 'info'](message);
      return;
    }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<div class="flex items-center"><i class="fas fa-${
      type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'
    } mr-3"></i><span>${message}</span></div>`;
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 400);
    }, 4000);
  }

  downloadDocument(filename) {
    this.showNotification(`Preparing ${filename}...`, 'info');
    setTimeout(() => {
      const blob = new Blob([`Simulated download for ${filename}`], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.showNotification(`${filename} downloaded!`, 'success');
    }, 600);
  }
}

let admin;
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    if (!admin) return;
    admin.showNotification('👋 Logged out successfully.', 'success');
  }
}
document.addEventListener('DOMContentLoaded', () => {
  admin = new DocumentPortalAdmin();
});
