import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Users } from 'lucide-react';

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
  };
  rating: number;
  imageUrl: string;
}

export default function CourseCard({
  id,
  title,
  description,
  category,
  categoryColor,
  students,
  instructor,
  rating,
  imageUrl
}: CourseCardProps) {
  return (
    <div className="rounded-lg border border-light-border dark:border-dark-border overflow-hidden shadow-sm">
      <img 
        src={imageUrl} 
        alt={`${title} cluster`} 
        className="w-full h-40 object-cover"
      />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 ${categoryColor} text-xs rounded-md`}>
            {category}
          </span>
          <div className="flex items-center">
            <Users className="text-gray-500 dark:text-gray-400 h-4 w-4" />
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{students} students</span>
          </div>
        </div>
        
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-6 w-6 bg-primary-light text-white">
              <AvatarFallback>{instructor.initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">{instructor.name}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Star className="text-warning h-4 w-4 mr-1" fill="currentColor" />
            <span className="text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
