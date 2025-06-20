import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set the page title
document.title = "FaangTechLab LMS Platform";

// Add meta description for SEO
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'FaangTechLab - A comprehensive Learning Management System for coding education with interactive tests, assignments, and real-time code execution.';
document.head.appendChild(metaDescription);

createRoot(document.getElementById("root")!).render(<App />);
