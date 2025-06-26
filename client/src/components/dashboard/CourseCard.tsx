// import React from 'react';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// import { Star, Users, Clock, BarChart3 } from 'lucide-react';

// interface CourseCardProps {
//   id: string;
//   title: string;
//   description: string;
//   category: string;
//   categoryColor: string;
//   students: number;
//   instructor: {
//     name: string;
//     initials: string;
//     title?: string;
//   };
//   rating: number;
//   skillLevel?: 'beginner' | 'intermediate' | 'advanced';
//   duration?: string;
// }

// export default function CourseCard({
//   id,
//   title,
//   description,
//   category,
//   categoryColor,
//   students,
//   instructor,
//   rating,
//   skillLevel,
//   duration,
// }: CourseCardProps) {
//   return (
//     <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 flex flex-col h-full">
//       <div className="p-6">
//         <div className="flex justify-between items-start mb-4">
//           <span className={`px-3 py-1 text-xs font-semibold rounded-full ${categoryColor}`}>
//             {category}
//           </span>
//         </div>
//         <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{title}</h3>
//         <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-6 h-16 overflow-hidden">{description}</p>
//       </div>
      
//       <div className="flex-grow" />

//       <div className="px-6 space-y-4">
//         <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
//           <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
//           <span>Skill Level: <span className="font-semibold capitalize">{skillLevel || 'N/A'}</span></span>
//         </div>
//         <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
//           <Clock className="w-4 h-4 mr-2 text-blue-500" />
//           <span>Duration: <span className="font-semibold">{duration || 'N/A'}</span></span>
//         </div>
//         <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
//           <Users className="w-4 h-4 mr-2 text-blue-500" />
//           <span><span className="font-semibold">{students}</span> students enrolled</span>
//         </div>
//       </div>
      
//       <div className="border-t border-gray-200 dark:border-gray-700 mt-6 p-6 flex justify-between items-center">
//         <div className="flex items-center">
//           <Avatar className="h-8 w-8 text-white">
//             <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700">{instructor.initials}</AvatarFallback>
//           </Avatar>
//           <div className="ml-3">
//             <p className="text-sm font-semibold text-gray-800 dark:text-white">{instructor.name}</p>
//             <p className="text-xs text-gray-500 dark:text-gray-400">{instructor.title || 'Instructor'}</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Users, Clock, BarChart3 } from "lucide-react";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryColor: string;
  students: number;
  instructor: {
    name: string;
    initials: string;
    title?: string;
  };
  rating: number;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  duration?: string;
}

export default function CourseCard({
  title,
  description,
  category,
  categoryColor,
  students,
  instructor,
  rating,
  skillLevel,
  duration,
}: CourseCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-800 transition-all flex flex-col h-full">
      <div className="p-6 flex flex-col h-full">
        {/* Category Badge */}
        <div className="mb-4">
          <span
            className={`text-xs font-medium rounded-full px-3 py-1 ${categoryColor} text-white bg-opacity-90`}
          >
            {category}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          {description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 mt-auto">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <BarChart3 className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            <span>
              <span className="font-semibold capitalize">
                {skillLevel || "N/A"}
              </span>{" "}
              Level
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Clock className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            <span>
              Duration:{" "}
              <span className="font-semibold">{duration || "N/A"}</span>
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Users className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            <span>
              <span className="font-semibold">{students}</span> Students
            </span>
          </div>
        </div>
      </div>

      {/* Instructor Footer */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between">
        <div className="flex items-center">
          <Avatar className="h-9 w-9 text-white">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800">
              {instructor.initials}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {instructor.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {instructor.title || "Instructor"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
