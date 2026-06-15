# Company Intelligence Dashboard

A full-stack Flask web application that helps users research companies from a single dashboard.

Instead of manually visiting multiple websites, users can search for a company and view structured company information, manage their account, and revisit previously searched companies through a personalized search history.

## Live Demo

🔗 https://company-intelligence-dashboard.onrender.com/

## GitHub Repository

🔗 https://github.com/nandan-xd/Company-Intelligence-Dashboard

---

## Features

### Current Features (V1.0)

#### Company Research

* Search companies by name
* Automatic company name to ticker resolution
* Retrieve company information using external APIs
* Company profile and business information display

#### Authentication System

* User Registration
* User Login
* Password Hashing using Werkzeug Security
* Session Management
* Logout Functionality

#### Search History

* Store searched companies per user
* View previous searches
* Reopen previously searched companies directly from history

#### Error Handling

* Custom error pages
* Invalid company handling
* API failure handling

#### Deployment

* Deployed on Render
* PostgreSQL database hosted on Neon
* Environment variables used for secure credential management

---

## Tech Stack

### Backend

* Python
* Flask

### Database

* PostgreSQL (Neon)
* SQLAlchemy ORM

### Authentication

* Werkzeug Security
* Flask Sessions

### APIs

* Finnhub API
* Alpha Vantage API

### Deployment

* Render

### Other Tools

* Git
* GitHub
* dotenv

---

## Key Concepts Implemented

* REST API Integration
* JSON Parsing and Processing
* Database Design
* SQLAlchemy ORM
* User Authentication
* Password Hashing
* Session Management
* Environment Variables
* Error Handling
* Cloud Database Integration
* Full-Stack Deployment

---

## Challenges Solved

During development, several real-world issues were encountered and resolved:

* API rate limits
* Database schema design
* SQLite to PostgreSQL migration
* Foreign key relationship issues
* Password hash storage limitations
* Environment variable configuration
* Production deployment debugging

---

## Learning Outcomes

This project helped strengthen practical skills in:

* Backend Development
* Flask Application Development
* Database Management
* Authentication Systems
* API Integration
* SQLAlchemy
* PostgreSQL
* Deployment Workflows
* Debugging Production Issues

---

## Future Improvements

### V2

* Saved / Favorite Companies
* Advanced Company Search
* Better UI/UX Design

### V3

* Company News Aggregation
* AI Generated Company Summaries
* Research Insights and Key Takeaways

### V4

* Company Comparison Dashboard
* Trend Analysis
* Interactive Visualizations
* Export Research Reports

---

## Project Status

✅ Active Development

This project is fully functional and deployed. Future versions will focus on expanding research capabilities and incorporating AI-powered insights.
