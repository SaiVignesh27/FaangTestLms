// import React from 'react';
// import { useQuery } from '@tanstack/react-query';
// import { Badge, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
// import { Progress } from '@/components/ui/progress';
// import { FileVideo, FileQuestion, ClipboardList, Clock, Users, Star, Calendar, Gauge } from 'lucide-react';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// import { Link, useParams } from 'wouter';
// import { Button } from '@/components/ui/button';
// import { StudentLayout } from '@/components/layouts/StudentLayout';
// import { Course, Class, Test, Assignment, Result } from '@shared/schema';
// import { useAuth } from '@/hooks/useAuth';

// interface CourseWithProgress extends Omit<Course, 'classes' | 'tests' | 'assignments'> {
//   progress: number;
//   classes: Class[];
//   tests: Test[];
//   assignments: Assignment[];
//   instructor: {
//     name: string;
//     title: string;
//     initials: string;
//   };
//   enrolledStudents?: number;
//   rating?: number;
//   category?: string;
//   skillLevel?: 'beginner' | 'intermediate' | 'advanced';
// }

// const CourseDetails = () => {
//   const { id } = useParams();
//   const [activeTab, setActiveTab] = React.useState('classes');
//   const { user } = useAuth();

//   // Fetch course details
//   const { data: course, isLoading: isLoadingCourse } = useQuery<CourseWithProgress>({
//     queryKey: [`/api/student/courses/${id}`],
//   });

//   // Fetch course classes
//   const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
//     queryKey: [`/api/student/courses/${id}/classes`],
//   });

//   // Fetch course tests
//   const { data: tests, isLoading: isLoadingTests } = useQuery<Test[]>({
//     queryKey: [`/api/student/courses/${id}/tests`],
//   });

//   // Fetch course assignments
//   const { data: assignments, isLoading: isLoadingAssignments } = useQuery<Assignment[]>({
//     queryKey: [`/api/student/courses/${id}/assignments`],
//   });

//   // Fetch test results
//   const { data: testResults, isLoading: isLoadingTestResults } = useQuery<Result[]>({
//     queryKey: [`/api/student/results`, { courseId: id, type: 'test' }],
//     enabled: !!user && !!id,
//   });

//   // Fetch assignment results
//   const { data: assignmentResults, isLoading: isLoadingAssignmentResults } = useQuery<Result[]>({
//     queryKey: [`/api/student/results`, { courseId: id, type: 'assignment' }],
//     enabled: !!user && !!id,
//   });

//   // Fetch class results
//   const { data: classResults, isLoading: isLoadingClassResults } = useQuery<Result[]>({
//     queryKey: [`/api/student/results`, { courseId: id, type: 'class' }],
//     enabled: !!user && !!id,
//   });

//   // Calculate progress
//   const calculateProgress = React.useCallback(() => {
//     if (!classes || !tests || !assignments || !testResults || !assignmentResults || !classResults) return 0;

//     const totalItems = classes.length + tests.length + assignments.length;
//     if (totalItems === 0) return 0;

//     const completedClasses = classResults.length;
//     const completedTests = tests.filter(t => t.status === 'completed').length;
//     const completedAssignments = assignments.filter(a => a.status === 'completed').length;

//     const completedItems = completedClasses + completedTests + completedAssignments;
//     return Math.round((completedItems / totalItems) * 100);
//   }, [classes, tests, assignments, testResults, assignmentResults, classResults]);

//   const progress = calculateProgress();
//   const isLoading = isLoadingCourse || isLoadingClasses || isLoadingTests || isLoadingAssignments || 
//                    isLoadingTestResults || isLoadingAssignmentResults || isLoadingClassResults;

//   const getCategoryColor = (category: string) => {
//     switch (category?.toLowerCase()) {
//       case 'java programming':
//         return 'bg-primary-light bg-opacity-10 text-primary';
//       case 'react':
//         return 'bg-secondary bg-opacity-10 text-secondary';
//       case 'node.js':
//         return 'bg-green-500 bg-opacity-10 text-green-500';
//       case 'python':
//         return 'bg-blue-500 bg-opacity-10 text-blue-500';
//       case 'database':
//         return 'bg-purple-500 bg-opacity-10 text-purple-500';
//       default:
//         return 'bg-gray-500 bg-opacity-10 text-gray-500';
//     }
//   };

//   const getSkillLevelColor = (skillLevel: string) => {
//     switch (skillLevel?.toLowerCase()) {
//       case 'advanced':
//         return 'bg-green-500 bg-opacity-10 text-green-500';
//       case 'intermediate':
//         return 'bg-blue-500 bg-opacity-10 text-blue-500';
//       case 'beginner':
//         return 'bg-purple-500 bg-opacity-10 text-purple-500';
//       default:
//         return 'bg-gray-500 bg-opacity-10 text-gray-500';
//     }
//   };

//   if (isLoading) {
//     return (
//       <StudentLayout>
//         <div className="flex justify-center items-center min-h-screen">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
//         </div>
//       </StudentLayout>
//     );
//   }

//   if (!course) {
//     return (
//       <StudentLayout>
//         <div className="text-center py-12">
//           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Course not found</h2>
//           <p className="text-gray-600 dark:text-gray-400 mt-2">The course you're looking for doesn't exist or you don't have access to it.</p>
//         </div>
//       </StudentLayout>
//     );
//   }

//   return (
//     <StudentLayout>
//       <div className="space-y-6">
//         {/* Course Header */}
//         <div className="relative h-64 md:h-80 rounded-xl overflow-hidden animate-fadeIn">
//           <img
//             src={course.image}
//             alt={course.title}
//             className="w-full h-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
//             <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-8">
//               <div className="flex flex-wrap gap-2 mb-3">
//                 <Badge className={getCategoryColor(course.category)}>
//                   {course.category}
//                 </Badge>
//                 <Badge className={getSkillLevelColor(course.skillLevel)}>
//                   <Gauge className="h-4 w-4 mr-1" />
//                   {course.skillLevel}
//                 </Badge>
//               </div>
//               <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 animate-gradient">
//                 {course.title}
//               </h1>
//               <p className="text-gray-200 max-w-2xl line-clamp-2">
//                 {course.description}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Course Content */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Main Content */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* Progress Section */}
//             <Card className="animate-fadeIn">
//               <CardHeader>
//                 <CardTitle className="text-xl">Your Progress</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div>
//                     <div className="flex justify-between text-sm mb-1">
//                       <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
//                       <span className="font-medium">{progress}%</span>
//                     </div>
//                     <Progress value={progress} className="h-2" />
//                   </div>

//                   <div className="grid grid-cols-1 gap-3 mt-4">
//                     <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <div className="flex items-center">
//                         <div className="bg-primary/10 p-2 rounded-full mr-3">
//                           <FileVideo className="h-4 w-4 text-primary" />
//                         </div>
//                         <span className="text-gray-700 dark:text-gray-300">Classes</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <Badge variant="outline" className="bg-white dark:bg-gray-800">
//                           {classResults?.length || 0}/{classes?.length || 0} completed
//                         </Badge>
//                       </div>
//                     </div>

//                     <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <div className="flex items-center">
//                         <div className="bg-secondary/10 p-2 rounded-full mr-3">
//                           <FileQuestion className="h-4 w-4 text-secondary" />
//                         </div>
//                         <span className="text-gray-700 dark:text-gray-300">Tests</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <Badge variant="outline" className="bg-white dark:bg-gray-800">
//                           {tests?.filter(t => t.status === 'completed')?.length || 0}/{tests?.length || 0} completed
//                         </Badge>
//                       </div>
//                     </div>

//                     <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <div className="flex items-center">
//                         <div className="bg-green-500/10 p-2 rounded-full mr-3">
//                           <ClipboardList className="h-4 w-4 text-green-500" />
//                         </div>
//                         <span className="text-gray-700 dark:text-gray-300">Assignments</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <Badge variant="outline" className="bg-white dark:bg-gray-800">
//                           {assignments?.filter(a => a.status === 'completed')?.length || 0}/{assignments?.length || 0} completed
//                         </Badge>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-3 gap-4 mt-4">
//                     <div className="bg-gray-50 dark:bg-dark-border p-4 rounded-lg text-center transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <FileVideo className="h-6 w-6 mx-auto mb-2 text-primary" />
//                       <div className="text-2xl font-bold">{classes?.length || 0}</div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">Total Classes</div>
//                     </div>
//                     <div className="bg-gray-50 dark:bg-dark-border p-4 rounded-lg text-center transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <FileQuestion className="h-6 w-6 mx-auto mb-2 text-secondary" />
//                       <div className="text-2xl font-bold">{tests?.length || 0}</div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">Total Tests</div>
//                     </div>
//                     <div className="bg-gray-50 dark:bg-dark-border p-4 rounded-lg text-center transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <ClipboardList className="h-6 w-6 mx-auto mb-2 text-green-500" />
//                       <div className="text-2xl font-bold">{assignments?.length || 0}</div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">Total Assignments</div>
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//               <CardFooter>
//                 <Button
//                   className="w-full"
//                   onClick={() => setActiveTab("classes")}
//                 >
//                   Continue Learning
//                 </Button>
//               </CardFooter>
//             </Card>

//             {/* Classes Section */}
//             <Card className="animate-fadeIn">
//               <CardHeader>
//                 <CardTitle className="text-xl">Classes</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {course?.classes && course.classes.length > 0 ? (
//                   <div className="space-y-4">
//                     {course.classes.map((classItem, index) => (
//                       <div
//                         key={classItem._id}
//                         className="flex items-start p-4 bg-gray-50 dark:bg-dark-border rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700 animate-fadeIn"
//                         style={{ animationDelay: `${index * 100}ms` }}
//                       >
//                         <div className="flex-shrink-0">
//                           <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
//                             <Calendar className="h-6 w-6 text-white" />
//                           </div>
//                         </div>
//                         <div className="ml-4 flex-1">
//                           <h3 className="font-medium text-gray-900 dark:text-white">
//                             {classItem.title}
//                           </h3>
//                           <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
//                             {classItem.description}
//                           </p>
//                           <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
//                             <Clock className="h-4 w-4 mr-1" />
//                             <span>{classItem.duration} minutes</span>
//                           </div>
//                         </div>
//                         <Button asChild variant="ghost" className="ml-4 transition-all duration-300 hover:scale-105">
//                           <Link href={`/student/classes/${classItem._id}`}>
//                             View Details
//                           </Link>
//                         </Button>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="text-center py-8">
//                     <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
//                     <h3 className="text-lg font-medium mb-1">No Classes Available</h3>
//                     <p className="text-gray-500 dark:text-gray-400">
//                       Classes will be added soon
//                     </p>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Tests Section */}
//             <Card className="animate-fadeIn">
//               <CardHeader>
//                 <CardTitle className="text-xl">Tests</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {course?.tests && course.tests.length > 0 ? (
//                   <div className="space-y-4">
//                     {course.tests.map((test, index) => (
//                       <div
//                         key={test._id}
//                         className="flex items-start p-4 bg-gray-50 dark:bg-dark-border rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700 animate-fadeIn"
//                         style={{ animationDelay: `${index * 100}ms` }}
//                       >
//                         <div className="flex-shrink-0">
//                           <div className="w-12 h-12 rounded-full bg-secondary-light flex items-center justify-center">
//                             <FileQuestion className="h-6 w-6 text-white" />
//                           </div>
//                         </div>
//                         <div className="ml-4 flex-1">
//                           <h3 className="font-medium text-gray-900 dark:text-white">
//                             {test.title}
//                           </h3>
//                           <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
//                             {test.description}
//                           </p>
//                           <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
//                             <Clock className="h-4 w-4 mr-1" />
//                             <span>{test.timeLimit} minutes</span>
//                           </div>
//                         </div>
//                         <Button asChild variant="ghost" className="ml-4 transition-all duration-300 hover:scale-105">
//                           <Link href={`/student/tests/${test._id}`}>
//                             Start Test
//                           </Link>
//                         </Button>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="text-center py-8">
//                     <FileQuestion className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
//                     <h3 className="text-lg font-medium mb-1">No Tests Available</h3>
//                     <p className="text-gray-500 dark:text-gray-400">
//                       Tests will be added soon
//                     </p>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Assignments Section */}
//             <Card className="animate-fadeIn">
//               <CardHeader>
//                 <CardTitle className="text-xl">Assignments</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {course?.assignments && course.assignments.length > 0 ? (
//                   <div className="space-y-4">
//                     {course.assignments.map((assignment, index) => (
//                       <div
//                         key={assignment._id}
//                         className="flex items-start p-4 bg-gray-50 dark:bg-dark-border rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700 animate-fadeIn"
//                         style={{ animationDelay: `${index * 100}ms` }}
//                       >
//                         <div className="flex-shrink-0">
//                           <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
//                             <ClipboardList className="h-6 w-6 text-white" />
//                           </div>
//                         </div>
//                         <div className="ml-4 flex-1">
//                           <h3 className="font-medium text-gray-900 dark:text-white">
//                             {assignment.title}
//                           </h3>
//                           <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
//                             {assignment.description}
//                           </p>
//                           <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
//                             <Clock className="h-4 w-4 mr-1" />
//                             <span>{assignment.timeLimit} minutes</span>
//                           </div>
//                         </div>
//                         <Button asChild variant="ghost" className="ml-4 transition-all duration-300 hover:scale-105">
//                           <Link href={`/student/assignments/${assignment._id}`}>
//                             Start Assignment
//                           </Link>
//                         </Button>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="text-center py-8">
//                     <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
//                     <h3 className="text-lg font-medium mb-1">No Assignments Available</h3>
//                     <p className="text-gray-500 dark:text-gray-400">
//                       Assignments will be added soon
//                     </p>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </div>

//           {/* Sidebar */}
//           <div className="space-y-6">
//             {/* Instructor Card */}
//             <Card className="animate-fadeIn">
//               <CardHeader>
//                 <CardTitle className="text-xl">Instructor</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="flex items-center space-x-4">
//                   <Avatar className="h-16 w-16">
//                     <AvatarFallback className="bg-primary-light text-white text-xl">
//                       {course?.instructor.initials}
//                     </AvatarFallback>
//                   </Avatar>
//                   <div>
//                     <h3 className="font-medium text-gray-900 dark:text-white">
//                       {course?.instructor.name}
//                     </h3>
//                     <p className="text-sm text-gray-600 dark:text-gray-400">
//                       {course?.instructor.title}
//                     </p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Course Info Card */}
//             <Card className="animate-fadeIn">
//               <CardHeader>
//                 <CardTitle className="text-xl">Course Information</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div className="flex items-center text-gray-600 dark:text-gray-400">
//                     <Clock className="h-5 w-5 mr-2" />
//                     <span>Duration: {course?.duration} hours</span>
//                   </div>
//                   <div className="flex items-center text-gray-600 dark:text-gray-400">
//                     <Users className="h-5 w-5 mr-2" />
//                     <span>{course?.enrolledStudents} students enrolled</span>
//                   </div>
//                   <div className="flex items-center text-gray-600 dark:text-gray-400">
//                     <Star className="h-5 w-5 mr-2" fill="currentColor" />
//                     <span>{course?.rating} rating</span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>

//       <style>{`
//         @keyframes gradient {
//           0% { background-position: 0% 50%; }
//           50% { background-position: 100% 50%; }
//           100% { background-position: 0% 50%; }
//         }
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(10px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes slideUp {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-gradient {
//           background-size: 200% auto;
//           animation: gradient 3s ease infinite;
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.5s ease-out forwards;
//         }
//         .animate-slideUp {
//           animation: slideUp 0.5s ease-out forwards;
//         }
//       `}</style>
//     </StudentLayout>
//   );
// };

// export default CourseDetails; 