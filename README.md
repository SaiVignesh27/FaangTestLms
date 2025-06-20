# Faang LMS Portal

A modern, full-featured Learning Management System (LMS) for educational institutions and companies. Built with React, TypeScript, Node.js, and MongoDB, it supports both open-source community use and company-specific internal deployments.

---

## 🚀 Features

- **Multi-role Support:** Separate dashboards and flows for Admins and Students
- **Course Management:** Create, update, assign, and track courses, classes, and materials
- **Test & Assignment Engine:** Create, assign, and auto-grade tests and assignments (MCQ, fill-in, code)
- **Code Evaluation:** Integrated code runner for programming assignments (supports Java, C++, Python, JavaScript)
- **Progress Tracking:** Real-time tracking of student progress, scores, and completion
- **Authentication & Authorization:** Secure login with JWT, role-based access
- **Responsive UI:** Mobile-friendly, modern design with Tailwind CSS
- **Extensible Schema:** Easily adapt for company-specific or institutional needs
- **API-first:** RESTful API for integration and automation

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Wouter, React Query
- **Backend:** Node.js, Express, MongoDB, Drizzle ORM
- **Authentication:** JWT, Passport.js
- **Code Evaluation:** Judge0 integration
- **Deployment:** Vercel (ready), Docker-friendly

---

## 📁 Project Structure

```
Faang-LMS/
├── client/           # Frontend React app
│   ├── src/
│   │   ├── components/   # UI, dashboard, editor, layout, etc.
│   │   ├── pages/        # Route-based pages (admin, student, auth)
│   │   ├── hooks/, lib/, contexts/, providers/
│   │   └── ...
│   ├── public/           # Static assets
│   └── index.html, tailwind.config.js
├── server/           # Backend Node.js app
│   ├── index.ts      # Main server entry
│   ├── routes.ts     # API endpoints
│   ├── models.ts, mongodb.ts, judge0.ts, storage.ts
│   └── ...
├── shared/           # Shared types and schema (Zod)
│   ├── schema.ts     # User, Course, Class, Test, Assignment, etc.
│   └── types.ts
├── drizzle.config.ts # ORM/migration config
├── vercel.json       # Vercel deployment config
├── package.json      # Project scripts and dependencies
└── ...
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (local or Atlas)
- npm or yarn

### Important Notes
- **All dependencies are installed in the main/root folder.**
- **You do NOT need to run `npm install` in `client` or `server` directories.**
- **Both frontend and backend are served from a single server on [http://localhost:5000](http://localhost:5000).**

### Step-by-Step Setup & Run Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/faang-lms.git
   cd faang-lms
   ```
2. **Install all dependencies (from the root folder):**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env` file in the `server/` directory:
     ```env
     MONGO_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     PORT=5000
     ADMINNAME=admin_name
     ADMINEMAIL=admin_mail
     ADMINPASSWORD=admin_password
     # ...other variables as needed
     ```
   - (Optional) For Drizzle ORM/Postgres, set `DATABASE_URL` in `.env` as well.
4. **Start the application (from the root folder):**
   ```bash
   npm run dev
   ```
   - This will start both the backend API and the frontend React app on [http://localhost:5000](http://localhost:5000).
   - You will see logs such as:
     ```
     Connected to MongoDB Atlas
     [express] MongoDB connection established
     [express] Server started successfully on http://localhost:5000
     ```

---

## ☁️ Deployment

### Vercel (Recommended)
- The project includes a `vercel.json` for easy deployment.
- Set environment variables in the Vercel dashboard (e.g., `MONGODB_URI`, `JWT_SECRET`).
- Vercel will use the build command and output directory as specified.

### Docker (Alternative)
- You can containerize both client and server for custom deployments.

### Other Platforms
- The app can be deployed to any Node.js-compatible host (Heroku, AWS, DigitalOcean, etc.).

---

## 🏢 Company-Specific/Internal Use
- The LMS is designed to be extensible for company-specific needs:
  - Add custom roles, permissions, or integrations
  - Adapt shared schemas in `shared/schema.ts`
  - Integrate with internal authentication or HR systems
- For internal deployments, ensure environment variables and security settings are properly configured.

---

## 🧩 API Overview
- All API endpoints are prefixed with `/api/`
- Auth, user, course, class, test, assignment, and result management endpoints
- See `server/routes.ts` for details and examples

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add YourFeature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

We welcome contributions for new features, bug fixes, documentation, and more!

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements
- Inspired by modern LMS platforms and open-source education tools
- Built with ❤️ by FaangTechLabs and contributors
