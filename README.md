Document Management System

A comprehensive, client-side document submission portal and admin dashboard built with modern HTML, Tailwind CSS, and vanilla JavaScript. This project provides a seamless workflow for users to submit applications and for administrators to manage, review, and export submission data in a responsive, single-page application.

Live Demo Links 🚀
Admin Dashboard: [Link to Deployed Admin Dashboard will be updated]

Submission Portal: [Link to Deployed Submission Portal will be updated]

Features ✨
Admin Dashboard
📊 Statistical Overview: At-a-glance view of key metrics like Total Submissions, Approved Submissions, Online/Offline Payments, and Total Documents.

🔍 Advanced Filtering & Search:

Instantly search for applicants by name or email.

Filter submissions by status: All, Pending Review, Action Required, In Progress, Approved, or Rejected.

📄 Detailed Application View: A comprehensive modal provides a complete overview of each applicant, including:

Personal information (Name, Email, Phone, Gender).

A full list of all submitted documents with individual download links.

✅ Interactive Status Management: Directly update an application's status from a dropdown within the modal view. The change is instantly reflected in the dashboard.

📝 Notes & Activity Log: Administrators can add, view, and delete time-stamped notes for each applicant, creating a clear activity log.

💀 Skeleton Loading: An improved user experience with skeleton loaders that appear while initial data is being fetched.

📥 ZIP Export:

Export all documents and a summary for a single user into a .zip archive directly from the details view.

Generate a .zip archive containing data for all currently filtered users.

- Pagination: Efficiently navigate through large datasets with clean pagination controls.

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

ZIP Generation: Custom Vanilla JS implementation (no external libraries)

File Structure 📂
The project is organized into two main parts: the admin dashboard and the user portal. The files for the admin dashboard are structured as follows:

/
├── 📄 index.html      # The main dashboard page
├── 📄 style.css       # All styles for the dashboard
└── 📄 script.js      # All logic for the dashboard
Setup and Installation ⚙️
This project uses pure, client-side JavaScript with no external dependencies, so no special build tools or servers are required.

Clone the repository:

Bash

git clone https://github.com/your-username/document-management-system.git
Navigate to the project directory:

Bash

cd document-management-system
Run the application:

Simply open the index.html file in your web browser.

Alternatively, for development, you can use an extension like Live Server in Visual Studio Code.

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

