# Feature Enhancement Prompt: HLD → LLD Generator + AI Testing Companion

You are a Senior Product Architect, Solution Architect, QA Architect, UX Designer, and Full-Stack Engineer.

I want you to enhance my existing application by adding a new left sidebar menu item called:

## 🏗️ HLD → LLD Maker

Place it in the left navigation panel alongside existing modules.

---

# Feature 1: HLD → LLD Maker

## Purpose

When a user uploads a PRD (Product Requirement Document), BRD, User Stories, SRS, Feature Specification, or any product document, the system should automatically analyze the document and generate a complete architectural understanding of the application.

The generated output should be easy for:

* Product Managers
* Developers
* QA Engineers
* Business Analysts
* Architects
* New Joiners

to understand.

---

# PRD Analysis Engine

After upload:

### Step 1: Intelligent Parsing

Extract:

* Features
* Modules
* User Roles
* Functional Requirements
* Non-Functional Requirements
* Business Rules
* APIs
* Integrations
* Database Entities
* Workflows
* Dependencies
* User Journeys
* Edge Cases

---

### Step 2: Module Breakdown

Generate:

# Module Overview

For each module show:

## Module Name

### Purpose

* Point-wise description

### Contains

* Components
* APIs
* Pages
* Services
* Events
* Database Tables

### Responsibilities

* Responsibility 1
* Responsibility 2
* Responsibility 3

### Dependencies

* Internal Dependencies
* External Dependencies

### Risks

* Technical Risks
* Business Risks

### Testing Areas

* Functional
* Regression
* Security
* Performance

---

# HLD Generation

Generate complete High Level Design.

Include:

## Architecture Overview

* Frontend
* Backend
* Database
* Third Party Systems

## Component Diagram

Visual representation.

## Service Interaction Diagram

Visual representation.

## Deployment Overview

Visual representation.

## Security Architecture

Visual representation.

---

# LLD Generation

Generate detailed Low Level Design.

Include:

## Class Design

## API Contracts

## Database Design

## Sequence Flows

## Data Flow

## Validation Rules

## Error Handling

## Retry Mechanisms

## Logging Strategy

## Monitoring Strategy

---

# Workflow Visualization

For every identified feature generate:

## Process Flow

Display as:

* Flowchart
* Sequence Diagram
* Swimlane Diagram

Example:

User Login
↓
Validate Credentials
↓
Authentication Service
↓
Token Generation
↓
Session Creation
↓
Dashboard Access

---

# Cross Functional Flow Mapping

Very Important.

Generate all cross-module flows.

Example:

Order Module
↔ Inventory Module
↔ Payment Module
↔ Notification Module
↔ Analytics Module

Show:

* Trigger Point
* Source Module
* Destination Module
* API Used
* Event Triggered
* Failure Handling

Generate visual flowcharts for all cross-module interactions.

---

# Interactive Architecture Explorer

Add tabs:

1. Overview
2. Modules
3. Workflows
4. HLD
5. LLD
6. APIs
7. Database
8. Risks
9. Testing Coverage

---

# Export Options

Allow export as:

* PDF
* DOCX
* Markdown
* Mermaid
* PlantUML
* PNG Diagrams

---

# Feature 2: AI Testing Companion

Add another left sidebar menu:

## 🧸 Testing Buddy AI

This should be an intelligent, cute, adorable, highly interactive AI chatbot dedicated to testing and application understanding.

---

# Chatbot Personality Settings

User can customize:

## Avatar

Editable

Options:

* Cute Robot
* Panda
* Cat
* Fox
* Owl
* Custom Avatar Upload

---

## Avatar Name

Editable

Examples:

* Testy
* QA Buddy
* Bug Hunter
* Coco
* Pixel
* Mochi

---

## Gender

Editable

Options:

* Male
* Female
* Neutral
* Custom

---

## Communication Style

Selectable

* Professional
* Friendly
* Mentor
* Funny
* Cute
* Expert QA Architect

---

# Emotional Reactions

The chatbot should react intelligently.

Examples:

When tests pass:

🎉 Yay! Everything looks healthy.

When bugs found:

😯 Oops! I spotted something suspicious.

When critical bug found:

🚨 Oh no! This needs immediate attention.

When user succeeds:

✨ Amazing work! You're crushing it.

When user asks questions:

🤔 Let me investigate that for you.

---

# Animated Actions

Bot should support:

* Thinking Animation
* Happy Animation
* Celebration Animation
* Searching Animation
* Warning Animation
* Teaching Animation

---

# Application Knowledge Engine

The chatbot must automatically learn and understand:

* Uploaded PRDs
* Generated HLD
* Generated LLD
* User Stories
* Test Cases
* Requirements
* APIs
* Database Design
* Architecture Diagrams
* Workflows

The bot should become an expert of the uploaded application.

---

# Application Understanding Capabilities

User may ask:

"Explain Login Flow"

Bot should explain.

User may ask:

"How does Payment interact with Orders?"

Bot should explain.

User may ask:

"Show complete user journey"

Bot should explain.

User may ask:

"Which APIs are used in checkout?"

Bot should explain.

User may ask:

"What modules depend on Inventory?"

Bot should explain.

---

# Advanced QA Intelligence

The chatbot must act as:

* QA Engineer
* Senior QA Engineer
* QA Architect
* SDET
* Test Lead

combined into one assistant.

---

# Testing Guidance

For any feature, generate:

## Functional Test Cases

## Regression Test Cases

## Integration Test Cases

## API Test Cases

## UI Test Cases

## Security Test Cases

## Performance Test Cases

## Accessibility Test Cases

## Boundary Cases

## Negative Cases

## Exploratory Testing Ideas

---

# Bug Prevention Engine

For every feature suggest:

Potential Risks

Potential Bugs

Missed Scenarios

Edge Cases

Data Validation Issues

Security Concerns

Performance Concerns

Concurrency Issues

Browser Compatibility Risks

Mobile Risks

---

# AI Suggestions Engine

Always proactively suggest:

"Have you tested this scenario?"

"Consider validating this edge case."

"This API may fail under high load."

"This workflow could create duplicate records."

"This module may require regression coverage."

---

# Intelligent Test Case Generator

Generate:

* Manual Test Cases
* Automation Test Cases
* API Tests
* Playwright Scripts
* Selenium Scripts
* Cypress Scripts
* Postman Collections

---

# Defect Analysis

User uploads bug.

Bot should provide:

* Root Cause Analysis
* Severity
* Priority
* Impacted Modules
* Risk Assessment
* Suggested Fixes
* Retest Scenarios
* Regression Areas

---

# Requirement Gap Analysis

Compare:

PRD
vs
Implementation
vs
Test Cases

Find:

* Missing Requirements
* Missing Tests
* Missing APIs
* Missing Validations
* Missing User Flows

---

# Smart Context Memory

The chatbot should remember:

* Current Project
* Uploaded Documents
* Generated Designs
* Previous Conversations
* Generated Test Cases
* Defects Discussed

and use them for future conversations.

---

# Response Style

Every response should be:

* Clear
* Structured
* Friendly
* Adorable
* Highly knowledgeable

Response format:

😊 Summary

📌 Key Points

🔍 Analysis

🧪 Testing Suggestions

⚠ Risks

💡 Recommendations

🚀 Next Steps

The chatbot should feel like a lovable QA companion while simultaneously functioning as a world-class QA Architect and application expert.

---

# Technical Expectations

Use modern architecture.

Preferred stack:

* React / Next.js Frontend
* Node.js Backend
* Python AI Services
* Vector Database for Knowledge Storage
* RAG Architecture
* Mermaid Diagram Generation
* PlantUML Support
* OpenAI / Claude Integration
* PostgreSQL
* Redis Cache

Design the entire solution production-ready, scalable, enterprise-grade, and modular.
