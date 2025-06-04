import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { LeaderboardEntry } from '@shared/types';
import { Test, Assignment } from '@shared/schema';
import { format } from 'date-fns';

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Trophy, 
  Medal, 
  FileQuestion, 
  ClipboardList, 
  Star, 
  Calendar, 
  Clock,
  TrendingUp,
  Award,
  Crown,
  Sparkles
} from 'lucide-react';

export default function Leaderboard() {
  const [timeFilter, setTimeFilter] = useState('week');
  const [contentType, setContentType] = useState<'test' | 'assignment'>('test');
  const [selectedItem, setSelectedItem] = useState('all');

  const { data: leaderboardData, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/student/leaderboard', {
      timeRange: timeFilter,
      type: contentType,
      itemId: selectedItem,
    }],
    refetchInterval: 30000,
  });

  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ['/api/student/tests'],
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['/api/student/assignments'],
  });

  const formatDate = (date: Date) => format(date, 'MMM dd, yyyy');

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    return names.length >= 2
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0].substring(0, 2).toUpperCase();
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/20 animate-pulse">
          <Crown className="h-6 w-6 text-white" fill="currentColor" />
        </div>
      );
    if (rank === 2)
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg shadow-gray-500/20">
          <Trophy className="h-6 w-6 text-white" fill="currentColor" />
        </div>
      );
    if (rank === 3)
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg shadow-amber-500/20">
          <Medal className="h-6 w-6 text-white" fill="currentColor" />
        </div>
      );
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-lg shadow-primary/20">
        <span className="font-bold text-white text-lg">{rank}</span>
      </div>
    );
  };

  const getFilteredEntries = () => {
    if (!leaderboardData) return [];
    let filtered = leaderboardData.filter((entry) =>
      contentType === 'test' ? Boolean(entry.testId) : Boolean(entry.assignmentId)
    );
    if (selectedItem !== 'all') {
      filtered = filtered.filter((entry) =>
        contentType === 'test' ? entry.testId === selectedItem : entry.assignmentId === selectedItem
      );
    }
    return [...filtered].sort((a, b) => b.score - a.score);
  };

  const filteredEntries = getFilteredEntries();

  const getItemTitle = (entry: LeaderboardEntry) => {
    if (contentType === 'test' && entry.testId) {
      return tests.find((t) => t._id === entry.testId)?.title || 'Unknown Test';
    } else if (contentType === 'assignment' && entry.assignmentId) {
      return assignments.find((a) => a._id === entry.assignmentId)?.title || 'Unknown Assignment';
    }
    return 'Unknown';
  };

  const getSelectedItemTitle = () => {
    if (selectedItem === 'all') return contentType === 'test' ? 'All Tests' : 'All Assignments';
    return contentType === 'test'
      ? tests.find((t) => t._id === selectedItem)?.title || 'Unknown Test'
      : assignments.find((a) => a._id === selectedItem)?.title || 'Unknown Assignment';
  };

  return (
    <StudentLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-8 w-8" />
                <h2 className="text-3xl font-bold">Leaderboard</h2>
              </div>
              <p className="text-blue-100">See how you compare with other students</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Updates every 30s</span>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Live Rankings</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-2 border-primary/10 shadow-lg animate-fadeIn">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Award className="h-6 w-6 text-primary" />
                  Top Students
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  Students ranked by their performance in {getSelectedItemTitle()}
                </CardDescription>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-full md:w-40 bg-background">
                    <SelectValue placeholder="Time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={contentType}
                  onValueChange={(val: 'test' | 'assignment') => {
                    setContentType(val);
                    setSelectedItem('all');
                  }}
                >
                  <SelectTrigger className="w-full md:w-40 bg-background">
                    <SelectValue placeholder="Content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Tests</SelectItem>
                    <SelectItem value="assignment">Assignments</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="w-full md:w-60 bg-background">
                    <SelectValue placeholder={`Select ${contentType === 'test' ? 'test' : 'assignment'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {contentType === 'test' ? 'Tests' : 'Assignments'}</SelectItem>
                    {(contentType === 'test' ? tests : assignments).map((item) => (
                      <SelectItem key={item._id} value={item._id || ''}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : filteredEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>{contentType === 'test' ? 'Test' : 'Assignment'}</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry, index) => (
                      <TableRow
                        key={`${entry.studentId}-${entry.testId || entry.assignmentId}`}
                        className={`transition-all duration-200 ${
                          index < 3
                            ? 'bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <TableCell>{getRankBadge(index + 1)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3 ring-2 ring-offset-2 ring-primary/20">
                              <AvatarFallback
                                className={
                                  index === 0
                                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
                                    : index === 1
                                    ? 'bg-gradient-to-br from-gray-400 to-gray-600 text-white'
                                    : index === 2
                                    ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                                    : 'bg-gradient-to-br from-primary to-primary/80 text-white'
                                }
                              >
                                {getUserInitials(entry.studentName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{entry.studentName}</div>
                              {index < 3 && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Top Performer
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {contentType === 'test' ? (
                              <FileQuestion className="h-4 w-4 text-secondary mr-2" />
                            ) : (
                              <ClipboardList className="h-4 w-4 text-warning mr-2" />
                            )}
                            <span className="font-medium">{getItemTitle(entry)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
                              <span className="font-bold text-lg">{entry.score}%</span>
                            </div>
                            <Progress value={entry.score} className="w-24 h-1 mt-1" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            {entry.completedAt ? formatDate(new Date(entry.completedAt)) : 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 mb-4">
                  <Trophy className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-1">No Leaderboard Data</h3>
                <p className="text-muted-foreground">
                  There are no entries for the selected filters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </StudentLayout>
  );
} 
