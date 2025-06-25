import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import AdminLayout from '@/components/layout/AdminLayout';
import StatCard from '@/components/dashboard/StatCard';
import { DashboardStats } from '@shared/types';
import { 
  User, 
  School, 
  FileQuestion, 
  ClipboardList,
  CheckCircle,
  UserPlus,
  Edit,
  AlertTriangle,
  Airplay,
  Plus,
  ArrowRight,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';

interface Test {
  _id: string;
  title: string;
  courseId: string;
  questions: any[];
  visibility: 'public' | 'private';
  assignedTo: string[];
  isActive: boolean;
  course?: {
    title: string;
  };
}

interface Assignment {
  _id: string;
  title: string;
  courseId: string;
  questions: any[];
  visibility: 'public' | 'private';
  assignedTo: string[];
  timeWindow: {
    startTime: string;
    endTime: string;
  };
  course?: {
    title: string;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();

  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard/stats'],
  });

  // Fetch recent courses
  const { data: courses, isLoading: isLoadingCourses } = useQuery<any>({
    queryKey: ['/api/admin/courses/recent'],
  });

  // Fetch tests
  const { data: tests, isLoading: isLoadingTests } = useQuery<Test[]>({
    queryKey: ['/api/admin/tests'],
  });

  // Fetch assignments
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery<Assignment[]>({
    queryKey: ['/api/admin/assignments'],
  });

  // Find course name by ID
  const getCourseName = (courseId: string) => {
    const course = courses?.find((c: { _id: string; title: string }) => c._id === courseId);
    return course?.title || 'Unknown cluster';
  };

  // Check if assignment is active
  const isAssignmentActive = (assignment: Assignment) => {
    const now = new Date();
    const startTime = new Date(assignment.timeWindow?.startTime || Date.now());
    const endTime = new Date(assignment.timeWindow?.endTime || Date.now() + 7 * 24 * 60 * 60 * 1000);
    return now >= startTime && now <= endTime;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome Section - Blue Highlight */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Welcome back, {user?.name}! 👋</h2>
              <div className="flex items-center space-x-2 text-white/90">
                <Shield className="h-5 w-5" />
                <p>Administrator Dashboard</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Link href="/admin/courses">
                <Button 
                  asChild
                  className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-300 hover:scale-105 shadow"
                >
                  <a className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Cluster
                  </a>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingStats ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="bg-[var(--bg-secondary)]">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-8 w-[60px]" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
            <Link href='/admin/users'>
              <StatCard
                title="Active Students"
                value={stats?.students || 0}
                icon={User}
                iconColor="text-[var(--primary)]"
                iconBgColor="bg-[var(--primary)] bg-opacity-10"
                valueColor="text-[var(--primary)] font-bold"
              />
            </Link>
            <Link href='/admin/courses'>
              <StatCard
                title="Active Clusters"
                value={stats?.courses || 0}
                icon={Airplay}
                iconColor="text-[var(--green)]"
                iconBgColor="bg-[var(--green)] bg-opacity-10"
                valueColor="text-[var(--green)] font-bold"
              />
            </Link>
            <Link href='/admin/tests'>
              <StatCard
                title="Tests Created"
                value={stats?.tests || 0}
                icon={FileQuestion}
                iconColor="text-[var(--warning)]"
                iconBgColor="bg-[var(--warning)] bg-opacity-10"
                valueColor="text-[var(--warning)] font-bold"
              />
            </Link>
              {/* <StatCard
                title="Pending Assignments"
                value={stats?.assignments || 0}
                icon={ClipboardList}
                iconColor="text-[var(--error)]"
                iconBgColor="bg-[var(--error)] bg-opacity-10"
                valueColor="text-[var(--error)] font-bold"
              /> */}
            </>
          )}
        </div>

        {/* Tests and Assignments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {/* Tests Section */}
          <Card className="bg-[var(--bg-secondary)]">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-[var(--text-primary)]">Recent Tests</CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">Tests created by admins</CardDescription>
              </div>
              <Link href="/admin/tests">
                <Button variant="ghost" size="sm" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4 text-[var(--primary)]" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingTests ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                      <Skeleton className="h-6 w-[80px]" />
                    </div>
                  ))
                ) : tests && tests.length > 0 ? (
                  tests.slice(-5).reverse().map((test) => (
                    <Link
                      key={test._id}
                      href={`/admin/tests/`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--hover-bg)] transition-colors">
                         <div className="flex items-center space-x-3">
                          <FileQuestion className="h-5 w-5 text-[var(--warning)]" />
                           <div className="space-y-1">
                            <h4 className="font-medium text-[var(--text-primary)]">{test.title}</h4>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {getCourseName(test.courseId)} • <span className="text-[var(--primary)] font-medium">{test.questions.length} questions</span>
                            </p>
                          </div>
                         </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={test.visibility === 'public' ? 'default' : 'secondary'}>
                            {test.visibility}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No tests found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignments Section
          <Card className="bg-[var(--bg-secondary)]">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-[var(--text-primary)]">Recent Assignments</CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">Assignments created by admins</CardDescription>
              </div>
              <Link href="/admin/assignments">
                <Button variant="ghost" size="sm" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4 text-[var(--primary)]" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingAssignments ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-[80px]" />
                        <Skeleton className="h-6 w-[80px]" />
                      </div>
                    </div>
                  ))
                ) : assignments && assignments.length > 0 ? (
                  assignments.slice(0, 5).map((assignment) => {
                    const isActive = isAssignmentActive(assignment);
                    return (
                      <Link
                        key={assignment._id}
                        href={`/admin/assignments/`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--hover-bg)] transition-colors">
                           <div className="flex items-center space-x-3">
                            <ClipboardList className="h-5 w-5 text-[var(--primary)]" />
                             <div className="space-y-1">
                              <h4 className="font-medium text-[var(--text-primary)]">{assignment.title}</h4>
                              <p className="text-sm text-[var(--text-secondary)]">
                                {getCourseName(assignment.courseId)}
                              </p>
                              {assignment.timeWindow && (
                                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                                  <AlertTriangle className={cn(
                                    "h-3 w-3",
                                    isActive ? "text-[var(--primary)]" : "text-[var(--error)]"
                                  )} />
                                  Due: {format(new Date(assignment.timeWindow.endTime), 'MMM dd, yyyy HH:mm')}
                                </p>
                              )}
                             </div>
                           </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={assignment.visibility === 'public' ? 'default' : 'secondary'}>
                              {assignment.visibility}
                            </Badge>
                            <Badge variant={isActive ? 'default' : 'destructive'}>
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No assignments found</p>
                )}
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </AdminLayout>
  );
}

