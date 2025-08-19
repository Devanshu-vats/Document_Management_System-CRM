Document Management System

A comprehensive, client-side document submission portal and admin dashboard built with modern HTML, Tailwind CSS, and JavaScript. This project provides a seamless workflow for users to submit applications and for administrators to manage, review, and export submission data.

Live Demo Links 🚀
Admin Dashboard: [Link to Deployed Admin Dashboard will be updated]

Submission Portal: [Link to Deployed Submission Portal will be updated]

Features ✨
Admin Dashboard
📊 Statistical Overview: At-a-glance view of key metrics like total submissions, completed applications, and payment types.

🔍 Advanced Filtering & Search: Dynamically search by applicant details and filter submissions by multiple criteria (e.g., Completed, Pending, Payment Mode).

📄 Pagination: Efficiently navigate through large datasets with clean pagination controls.

✅ Manual Verification Workflow: Review applicant details and manually verify payments with a simple toggle, updating the status from "Pending" to "Completed."

💀 Skeleton Loading: An improved user experience with skeleton loaders that appear while data is being fetched.

📥 ZIP Export:

Export all currently filtered user data into a structured ZIP file.

Download a ZIP archive for a single user directly from the details view.

User Submission Portal
📝 Multi-Step Form: An intuitive form for submitting personal information and documents.

📂 Flexible Document Uploads: Users can upload documents as five separate files or as a single combined PDF.

💳 Payment Processing: Supports both online and offline payment modes, with a required screenshot upload for online transactions.

🔒 Robust Client-Side Validation: Ensures data integrity by validating all fields upon submission, providing clear error messages for a smooth user experience.

🎉 Success & Refresh: Displays a success message upon valid submission and automatically refreshes the form for a new entry.

Tech Stack 🛠️
Frontend: HTML5, CSS3, JavaScript (ES6+)

Styling: Tailwind CSS

Icons: Font Awesome

ZIP Generation: JSZip

File Structure 📂
The project is organized into two main parts: the admin dashboard and the user portal.

/Document_Management_System/
├── 📂 admin/
│   ├── 📄 index.html         # The main dashboard page
│   ├── 📄 style.css          # All styles for the dashboard
│   └── 📄 script.js         # All logic for the dashboard
│
├── 📂 portal/
    ├── 📄 index.html         # The main submission portal page
    ├── 📄 style.css          # All styles for the portal
    └── 📄 script.js         # All logic for the portal


Setup and Installation ⚙️

To run this project locally, you need a local server to handle the file requests for the JSZip library. The easiest way is to use the Live Server extension in Visual Studio Code.

Clone the repository:

git clone https://github.com/your-username/document-management-system.git

Navigate to the project directory:

cd document-management-system

Install Live Server (if you haven't already):

Open Visual Studio Code.

Go to the Extensions view (Ctrl+Shift+X).

Search for "Live Server" and install it.

Run the Admin Dashboard:

Right-click on the admin/index.html file.

Select "Open with Live Server."

Run the Submission Portal:

Right-click on the portal/index.html file.

Select "Open with Live Server."

Screenshots 📸
[Screenshot of the Admin Dashboard] 
<img width="1040" height="860" alt="image" src="https://github.com/user-attachments/assets/a2880a56-901f-4074-8b67-93aad9c2b7bd" />

[Screenshot of the Submission Portal]
<img width="798" height="923" alt="image" src="https://github.com/user-attachments/assets/806103fd-4328-4255-8561-b7e70e72aa8a" />


Author ✍️
Devanshu Kumar

GitHub: [Your GitHub Profile Link]

LinkedIn: [www.linkedin.com/in/devanshu-kumar-7a146b246]

License 📄
This project is licensed under the MIT License. See the LICENSE file for details.
