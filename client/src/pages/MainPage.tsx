import { Link } from "wouter";
import logo from "../faangtech .jpg";
import { Code2, Target, BookOpen, ArrowRight } from "lucide-react";

export default function MainPage() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-blue-100">
      {/* Header */}
      <header className="py-3 px-4 shadow-sm bg-white">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-2">
            <img src={logo} alt="CodeGym Logo" className="w-8 h-8 rounded-full" />
            <span className="text-lg font-bold text-indigo-600">CodeGym</span>
          </div>
          <div className="flex space-x-3 items-center">
            <Link
              to="/admin/login"
              className="px-3 py-1.5 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
            >
              Admin Login
            </Link>
            <Link
              to="/student/login"
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Student Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Column - 70% */}
        <div className="w-[70%] flex flex-col justify-center px-10 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Master Coding with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
                CodeGym
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Your journey to becoming a coding expert starts here.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Code2 className="w-5 h-5 text-indigo-600" />, label: "Interactive Learning", bg: "bg-indigo-100" },
              { icon: <Target className="w-5 h-5 text-blue-600" />, label: "Track Progress", bg: "bg-blue-100" },
              { icon: <BookOpen className="w-5 h-5 text-purple-600" />, label: "Expert Content", bg: "bg-purple-100" },
              { icon: <ArrowRight className="w-5 h-5 text-green-600" />, label: "Career Ready", bg: "bg-green-100" }
            ].map(({ icon, label, bg }, i) => (
              <div key={i} className="bg-white p-3 rounded-xl shadow-sm flex items-center space-x-2 hover:shadow-md transition-shadow">
                <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
                <span className="text-sm font-medium text-gray-900">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex space-x-3 pt-2">
            <Link
              to="/student/login"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center space-x-1"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admin/login"
              className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm"
            >
              Admin Portal
            </Link>
          </div>
        </div>

        {/* Right Column - 30% */}
        <div className="w-[30%]  flex items-center justify-center">
          <div className="animate-float p-6">
            <img
              src={logo}
              alt="FAANG Tech Lab"
              className="w-72 h-72 object-contain border-4 border-white rounded-3xl shadow-2xl transition-transform hover:scale-105 duration-300"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2 text-center text-gray-500 text-xs bg-white shadow-inner">
        © 2024 CodeGym by FAANG Tech Lab. All rights reserved.
      </footer>

      {/* Custom Animation */}
      <style>
        {`
          @keyframes float {
            0% { transform: translatey(0px); }
            50% { transform: translatey(-10px); }
            100% { transform: translatey(0px); }
          }
          .animate-float {
            animation: float 4s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
}
