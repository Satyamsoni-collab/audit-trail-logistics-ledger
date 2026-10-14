# 📦 Logistics Audit Trail Ledger (Enterprise React App)

An interactive, responsive, and feature-rich **Logistics Audit Trail Ledger** built using React. This enterprise-level dashboard provides full audit log management, analytics visualizations, multi-column filtering, state persistence, CSV export, and bulk row operations.

---

## ✨ Features Breakdown

### 📊 Analytics & Progress Insights
- **KPI Summary Cards**: Real-time counter for Total Logs, Success, Pending, and Failed entries.
- **Percentage Progress Indicator Bars**: Visual representation of log distribution.

### 📦 CRUD Operations & Modals
- **Create**: Add new audit log entries with action, user/actor name, and status.
- **Read**: Dynamic table rendering with customizable pagination (3, 5, or 10 items per page).
- **Update**: Edit modal to modify existing action details, actor, or status seamlessly.
- **Delete**: Individual and bulk row deletion capabilities with confirmation feedback.

### 🔍 Search, Filters & Sorting
- **Multi-Column Filtering**: Search simultaneously by Action name, User/Actor dropdown, and Date picker.
- **Quick Status Filter Pills**: Single-click filtering for Success, Pending, or Failed states.
- **Sorting Options**: Reorder logs by timestamp (Latest First / Oldest First).

### 🛠️ Advanced Enterprise Utilities
- **Floating Toast Notifications**: Instant UX visual banners for Add, Edit, Delete, Copy, and Export actions.
- **Bulk Selection Bar**: Select-all current page items or custom row selections for multi-item actions.
- **Export to CSV**: One-click download of filtered audit log data in standard CSV format.
- **Clipboard Utility**: Copy full log metadata formatted as JSON in one click.
- **Direct Page Navigation**: "Go to page" jump input for fast navigation across large datasets.
- **Keyboard Shortcuts**: Native `Esc` key listener to dismiss open modal dialogs.
- **Persistent Theme Toggle**: Switch seamlessly between ☀️ Light and 🌙 Dark themes stored in browser storage.
- **State Persistence**: Uses browser `localStorage` to keep changes intact across browser reloads.

---

## 🛠️ Tech Stack & Requirements

- **Frontend Library**: React (Hooks: `useState`, `useEffect`)
- **Styling**: Inline CSS with dynamic theme object context
- **Storage**: Browser LocalStorage API
- **Version Control**: Git & GitHub

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Satyamsoni-collab/audit-trail-logistics-ledger.git](https://github.com/Satyamsoni-collab/audit-trail-logistics-ledger.git)