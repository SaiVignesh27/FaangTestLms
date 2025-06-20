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

## ⚠️ Configuration Notes

### Judge0 Code Execution Service
- By default, Judge0 (the code execution engine) is expected to run locally on port 3000 (`http://localhost:3000`).
- If you want to use a different port or a deployed Judge0 instance, you must update the URL in **two places**:
  - `server/judge0.ts`:
    - Line 33: `'http://localhost:3000/submissions?base64_encoded=true&wait=false'`
    - Line 58: ``http://localhost:3000/submissions/${token}?base64_encoded=true&fields=*``
- Change both occurrences to your desired Judge0 endpoint (e.g., `https://your-judge0-instance.com`).

### Changing Backend URL for Frontend
- The frontend communicates with the backend using `http://localhost:5000` by default.
- To change this (e.g., for deployment), update the following lines in `client/src/lib/queryClient.ts`:
  - Line 31: `fetch(`http://localhost:5000${endpoint}`)`
  - Line 67: `fetch(`http://localhost:5000${queryKey[0]}`)`
- Replace `http://localhost:5000` with your deployed backend URL.

### Changing Frontend URL
- If you need to reference the frontend URL (e.g., for OAuth, CORS, or environment variables), update your deployment environment or config files accordingly.

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

## 👩‍💻 Developer Notes & Best Practices

### Project Structure & Conventions
- **Separation of Concerns:**
  - `client/` contains all frontend code (React, UI, pages, components, hooks, contexts, etc.)
  - `server/` contains backend logic (Express routes, models, database, Judge0 integration)
  - `shared/` contains types and schemas (Zod) used by both frontend and backend for consistency
- **Adding New Features:**
  - **Frontend:**
    - Add new pages in `client/src/pages/`
    - Add reusable UI in `client/src/components/`
    - Use hooks/context for state management in `client/src/hooks/` and `client/src/contexts/`
  - **Backend:**
    - Add new API endpoints in `server/routes.ts`
    - Add/modify database models in `server/models.ts` or `shared/schema.ts`
- **Shared Types:**
  - Use types and schemas from `shared/schema.ts` to ensure type safety and validation across both client and server.

### API & Data Flow
- All API endpoints are under `/api/` and defined in `server/routes.ts`.
- Use `fetch` or React Query in the frontend to call backend APIs (see `client/src/lib/queryClient.ts`).
- For new API endpoints, document expected request/response formats.

### Testing & Debugging
- Use browser dev tools and network inspector for frontend debugging.
- Use console logs and error handling in Express for backend debugging.
- For code execution, ensure Judge0 is running and accessible at the configured URL.

### Linting, Formatting & Code Quality
- Use Prettier and ESLint (if configured) to maintain code style and catch errors early.
- Keep code modular and DRY (Don't Repeat Yourself).
- Use descriptive commit messages and branch names.

### Contributing & Collaboration
- Always create a new branch for your feature or bugfix.
- Open a Pull Request (PR) for review before merging to `main`.
- Write clear PR descriptions and reference related issues if any.
- Review code for security, performance, and maintainability.

### Environment & Deployment
- Use `.env` files for secrets and environment-specific configs (never commit secrets to git).
- Update Judge0 and backend URLs as described in the Configuration Notes section when deploying.
- For production, ensure proper CORS, HTTPS, and security settings.

### Additional Tips
- Read and update this README as the project evolves.
- Add comments and documentation to your code for clarity.
- If you add a major feature, consider updating the Features section above.

---

## 🙏 Acknowledgements
- Inspired by modern LMS platforms and open-source education tools
- Built with ❤️ by Sai Vignesh and FaangTechLab
