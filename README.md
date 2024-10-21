# Daily Expenses Sharing Application

## Overview

The Daily Expenses Sharing Application is designed to help users manage and split their expenses among friends, family, or groups. The application provides a user-friendly interface for tracking expenses, ensuring transparency in financial contributions, and generating balance sheets.

## Features

- **User Authentication**: Secure registration and login using Firebase Authentication.
- **Expense Management**: Users can add expenses with details about how they are split among participants.
- **Flexible Splitting Methods**:
  - **Equal Split**: Expenses are divided equally among all participants.
  - **Exact Amounts**: Users can specify exact amounts for each participant.
  - **Percentage Split**: Participants can contribute a percentage of the total expense.
- **Downloadable Balance Sheets**: Users can download summaries of their transactions and outstanding balances.
- **RESTful API**: The backend is built on Express.js, providing easy integration for front-end applications.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: Firebase (for user authentication and expense data management)
- **Testing**: Jest, Supertest
- **Environment**: JavaScript (ES6+), JSON

## Getting Started

### Prerequisites

- Node.js (version 18 or later)
- npm (Node package manager)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
