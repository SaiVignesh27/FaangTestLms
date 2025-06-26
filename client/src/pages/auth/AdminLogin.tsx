import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LoginCredentials } from '@shared/types';
import { loginUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import logo from '../../faangtech .jpg';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function AdminLogin() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => loginUser(credentials, 'admin'),
    onSuccess: () => {
      toast({
        title: 'Login successful',
        description: 'Welcome to the Faang Tech Lab admin portal',
      });
      window.location.assign('/admin/dashboard');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error || error?.message || 'Invalid credentials';

      setShake(true);
      setTimeout(() => setShake(false), 400);

      if (message.toLowerCase().includes('email')) {
        form.setError('email', {
          type: 'manual',
          message: 'Email not found',
        });
      } else if (message.toLowerCase().includes('password')) {
        form.setError('password', {
          type: 'manual',
          message: 'Incorrect password',
        });
      } else {
        form.setError('email', {
          type: 'manual',
          message: 'Invalid email or password',
        });
        form.setError('password', {
          type: 'manual',
          message: 'Invalid email or password',
        });
      }
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-blue-200 flex items-center justify-center p-6 text-gray-800">
      <div className="max-w-6xl w-full flex flex-col md:flex-row items-center gap-10 animate-fadeInUp">

        {/* Logo + Welcome */}
        <div className="flex flex-col items-center text-center space-y-6 md:w-1/2">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg rounded-xl animate-pulse-slow">
            <img src={logo} alt="FAANG Tech Logo" className="w-28 h-28 object-contain rounded-xl" />
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Admin Portal
          </h1>
          <p className="text-gray-700 text-md md:text-lg max-w-md">
            Secure access for administrators to manage everything from a central dashboard.
          </p>
        </div>

        {/* Login Form */}
        <Card className={`w-full md:w-1/2 bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl animate-float transition-transform ${shake ? 'animate-shake' : ''}`}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-800">Admin Login</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="admin@example.com"
                            className="pl-10 bg-white/70 border border-gray-300 rounded-md focus:border-blue-600 transition-colors"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pl-10 pr-10 bg-white/70 border border-gray-300 rounded-md focus:border-blue-600 transition-colors"
                            {...field}
                          />
                          <div
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Login Button */}
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white py-2 rounded-md font-semibold shadow-md transition-transform hover:scale-[1.02]"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="justify-center text-sm text-gray-600">
            <span>Are you a student?</span>
            <Button
              variant="link"
              className="ml-2 text-blue-700 hover:text-blue-900 font-medium"
              onClick={() => window.location.assign('/student/login')}
            >
              Login here
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes pulseSlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulseSlow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
