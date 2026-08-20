# Company Intelligence Dashboard

A full-stack Flask web application for researching companies from a single dashboard.

Users can search for a company, view structured company information and recent news, and revisit previous searches through a personalized search history.

## Live Demo

🔗 https://company-intelligence-dashboard.onrender.com/

## GitHub Repository

🔗 https://github.com/nandan-xd/Company-Intelligence-Dashboard

---

## Features

### 🔍 Company Research

* Search companies by name
* Automatic company name-to-ticker resolution
* Retrieve company information through external APIs
* View company profile and business information

### 📰 Company News

* Fetch recent company-related news
* Display headlines, sources, authors and publication dates
* Read the full article through the original source

### 🔐 Authentication

* User registration and login
* Password hashing using Werkzeug Security
* Session management
* Logout functionality
* Guest Mode for researching companies without an account

### 📚 Search History

* Store searched companies per user
* View previous searches
* Reopen previously searched companies

### ⚠️ Error Handling

* Custom error pages
* Invalid company handling
* API failure handling

---

## Tech Stack

**Backend:** Python, Flask
**Database:** PostgreSQL, SQLAlchemy
**Authentication:** Werkzeug Security, Flask Sessions
**APIs:** Finnhub, NewsAPI
**Deployment:** Render, Neon
**Tools:** Git, GitHub, python-dotenv

---

## Key Concepts

* REST API Integration
* JSON Parsing
* SQLAlchemy ORM
* PostgreSQL Database
* User Authentication
* Password Hashing
* Session Management
* Environment Variables
* Error Handling
* Cloud Deployment

---

## Future Improvements

* ⭐ Saved / Favorite Companies
* 🤖 AI-generated company summaries
* 📊 Company comparison
* 📈 Trend analysis
* 📄 Research report generation

---

## Project Status

🚀 **Active Development**

The application is fully functional and deployed, with new research and analysis features being added incrementally.
