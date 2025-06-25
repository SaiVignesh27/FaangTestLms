import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { LeaderboardEntry } from '@shared/types';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Course, Test, Assignment } from '@shared/schema';
import { Loader2, Search, Trophy, Medal, Star, Download, FileQuestion, ClipboardList } from 'lucide-react';

// Format time spent
const formatTimeSpent = (seconds: number | undefined) => {
  if (!seconds || seconds <= 0) return "N/A";
  
  // Convert to hours, minutes, seconds
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
};

export default function Leaderboard() {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [contentType, setContentType] = useState<'test' | 'assignment'>('test');
  const [selectedItem, setSelectedItem] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Fetch courses
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/admin/courses'],
  });
  
  // Fetch tests
  const { data: tests, isLoading: isLoadingTests } = useQuery<Test[]>({
    queryKey: ['/api/admin/tests'],
  });
  
  // Fetch assignments
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery<Assignment[]>({
    queryKey: ['/api/admin/assignments'],
  });
  
  // Fetch leaderboard entries
  const { data: leaderboardEntries, isLoading: isLoadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/admin/leaderboard', { 
      courseId: selectedCourse,
      contentType,
      itemId: selectedItem
    }],
  });

  // Filter leaderboard by search query
  const filteredEntries = leaderboardEntries?.filter(entry => 
    entry.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Get the title of a test or assignment
  const getItemTitle = (itemId: string) => {
    if (!itemId) return '';
    
    if (contentType === 'test') {
      const test = tests?.find(t => t._id === itemId);
      return test?.title || 'Unknown Test';
    } else {
      const assignment = assignments?.find(a => a._id === itemId);
      return assignment?.title || 'Unknown Assignment';
    }
  };

  // Get course name
  const getCourseName = (courseId: string) => {
    if (!courseId) return '';
    const course = courses?.find(c => c._id === courseId);
    return course?.title || 'Unknown Cluster';
  };

  // Format date
  const formatDate = (date: Date) => {
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  // Handle export to CSV
  const exportToCSV = () => {
    if (!leaderboardEntries || leaderboardEntries.length === 0) return;
    
    // Get current date and time for filename
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HH-mm');
    
    // Define headers with more detailed information
    const headers = [
      'Rank',
      'Student Name',
      'Student ID',
      'Course',
      'Content Type',
      'Item Title',
      'Score (%)',
      'Time Spent',
      'Submission Date',
      'Status'
    ];
    
    // Process and format the data
    const csvData = getFilteredEntries().map((entry, index) => {
      // Determine status based on score
      const status = entry.score >= 70 ? 'Passed' : 
                    entry.score >= 50 ? 'Average' : 'Failed';
      
      return [
        (index + 1).toString(),
        entry.studentName,
        entry.studentId || 'N/A',
        getCourseName(entry.courseId || ''),
        contentType === 'test' ? 'Test' : 'Assignment',
        getItemTitle(contentType === 'test' ? entry.testId || '' : entry.assignmentId || ''),
        entry.score.toString(),
        formatTimeSpent(entry.timeSpent),
        entry.completedAt ? formatDate(new Date(entry.completedAt)) : 'N/A',
        status
      ];
    });
    
    // Add summary statistics
    const totalEntries = csvData.length;
    const averageScore = csvData.reduce((acc, row) => acc + parseInt(row[6]), 0) / totalEntries;
    const passedCount = csvData.filter(row => row[9] === 'Passed').length;
    const failedCount = csvData.filter(row => row[9] === 'Failed').length;
    
    // Create summary rows
    const summaryRows = [
      [''],
      ['Summary Statistics'],
      ['Total Entries', totalEntries.toString()],
      ['Average Score', `${averageScore.toFixed(2)}%`],
      ['Passed', passedCount.toString()],
      ['Failed', failedCount.toString()],
      ['Pass Rate', `${((passedCount / totalEntries) * 100).toFixed(2)}%`],
      [''],
      ['Generated on', format(now, 'MMMM dd, yyyy HH:mm:ss')],
      ['Content Type', contentType === 'test' ? 'Tests' : 'Assignments'],
      ['Course Filter', selectedCourse === 'all' ? 'All Courses' : getCourseName(selectedCourse)],
      ['Item Filter', selectedItem === 'all' ? 'All Items' : getItemTitle(selectedItem)]
    ];
    
    // Combine all data
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(',')),
      ...summaryRows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FaangTechLab-leaderboard-${contentType}-${dateStr}-${timeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success toast
    toast({
      title: 'Export Successful',
      description: `Leaderboard data has been exported to CSV`,
    });
  };
  
  // Get medal icon based on rank
  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Medal className="h-5 w-5 text-yellow-500" fill="currentColor" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" fill="currentColor" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-700" fill="currentColor" />;
      default:
        return null;
    }
  };

  const getFilteredEntries = () => {
    if (!leaderboardEntries) return [];
    let filtered = leaderboardEntries.filter((entry) => {
      const isTestEntry = entry.testId !== undefined && entry.testId !== null;
      const isAssignmentEntry = entry.assignmentId !== undefined && entry.assignmentId !== null;

      if (contentType === 'test') {
        return isTestEntry;
      } else if (contentType === 'assignment') {
        return isAssignmentEntry;
      }
      return false;
    });

    if (selectedItem !== 'all') {
      filtered = filtered.filter((entry) =>
        contentType === 'test' ? entry.testId === selectedItem : entry.assignmentId === selectedItem
      );
    }
    return [...filtered].sort((a, b) => b.score - a.score);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Highlighted Header Section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-600">
                  Leaderboard
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Track student performance across tests
                </p>
              </div>
              <Button 
                onClick={exportToCSV} 
                disabled={!leaderboardEntries || leaderboardEntries.length === 0}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200 mt-4 md:mt-0"
              >
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Student Rankings</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">View and filter student performance</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by student name"
                      className="pl-8 focus-visible:ring-blue-500 transition-colors duration-200"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Select
                    value={selectedCourse}
                    onValueChange={setSelectedCourse}
                  >
                    <SelectTrigger className="w-full sm:w-60 focus-visible:ring-blue-500 transition-colors duration-200">
                      <SelectValue placeholder="Filter by Cluster" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer transition-colors duration-200">All Clusters</SelectItem>
                      {courses?.map((course) => (
                        <SelectItem 
                          key={course._id} 
                          value={course._id as string}
                          className="cursor-pointer transition-colors duration-200"
                        >
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={contentType}
                    onValueChange={(value: 'test' | 'assignment') => {
                      setContentType(value);
                      setSelectedItem('all');
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40 focus-visible:ring-blue-500 transition-colors duration-200">
                      <SelectValue placeholder="Content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        value="test"
                        className="cursor-pointer transition-colors duration-200"
                      >
                        <div className="flex items-center">
                          <FileQuestion className="h-4 w-4 mr-2" />
                          <span>Tests</span>
                        </div>
                      </SelectItem>
                      {/* <SelectItem 
                        value="assignment"
                        className="cursor-pointer transition-colors duration-200"
                      >
                        <div className="flex items-center">
                          <ClipboardList className="h-4 w-4 mr-2" />
                          <span>Assignments</span>
                        </div>
                      </SelectItem> */}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedItem}
                    onValueChange={setSelectedItem}
                  >
                    <SelectTrigger className="w-full sm:w-60 focus-visible:ring-blue-500 transition-colors duration-200">
                      <SelectValue placeholder={`Select ${contentType === 'test' ? 'test' : 'assignment'}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        value="all"
                        className="cursor-pointer transition-colors duration-200"
                      >
                        All {contentType === 'test' ? 'Tests' : 'Assignments'}
                      </SelectItem>
                      {contentType === 'test' 
                        ? tests?.map((test) => (
                            <SelectItem 
                              key={test._id} 
                              value={test._id || ''}
                              className="cursor-pointer transition-colors duration-200"
                            >
                              {test.title}
                            </SelectItem>
                          ))
                        : assignments?.map((assignment) => (
                            <SelectItem 
                              key={assignment._id} 
                              value={assignment._id || ''}
                              className="cursor-pointer transition-colors duration-200"
                            >
                              {assignment.title}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoadingLeaderboard ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : getFilteredEntries().length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[80px] font-semibold">Rank</TableHead>
                        <TableHead className="font-semibold">Student</TableHead>
                        <TableHead className="font-semibold">Cluster</TableHead>
                        <TableHead className="font-semibold">{contentType === 'test' ? 'Test' : 'Assignment'}</TableHead>
                        <TableHead className="text-right font-semibold">Score</TableHead>
                        <TableHead className="text-right font-semibold">Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredEntries().map((entry, index) => (
                        <TableRow 
                          key={`${entry.studentId}-${entry.testId || entry.assignmentId}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              {getMedalIcon(index)}
                              <span className="ml-1">{index + 1}</span>
                            </div>
                          </TableCell>
                          <TableCell>{entry.studentName}</TableCell>
                          <TableCell>{getCourseName(entry.courseId || '')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {contentType === 'test' ? (
                                <FileQuestion className="h-4 w-4 text-blue-500 mr-2" />
                              ) : (
                                <ClipboardList className="h-4 w-4 text-purple-500 mr-2" />
                              )}
                              {getItemTitle(contentType === 'test' ? entry.testId || '' : entry.assignmentId || '')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
                              <span className="font-medium">{entry.score}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-gray-500 dark:text-gray-400">
                            {entry.completedAt ? formatDate(new Date(entry.completedAt)) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Trophy className="h-12 w-12 opacity-20" />
                    <h3 className="text-lg font-medium">No leaderboard data found</h3>
                    <p className="text-sm">Students need to complete {contentType === 'test' ? 'tests' : 'assignments'} to appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}