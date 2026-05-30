import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity, User, LogOut, Moon, Sun, History, Brain, MessageCircle, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const navLink = (to: string, label: string) => (
    <Link to={to}
      className={`text-sm font-medium transition-colors hover:text-foreground ${location.pathname === to ? 'text-foreground' : 'text-muted-foreground'}`}>
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">MediPredict</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {user && (
            <>
              {navLink('/dashboard', 'Dashboard')}
              {navLink('/predict', 'New Prediction')}
              <Link to="/chat"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-foreground ${location.pathname === '/chat' ? 'text-foreground' : 'text-muted-foreground'}`}>
                <MessageCircle className="h-3.5 w-3.5" />MediBot
              </Link>
              {navLink('/history', 'History')}
              {user.role === 'admin' && (
                <Link to="/admin"
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${location.pathname === '/admin' ? 'text-amber-600 dark:text-amber-400' : 'text-amber-600/70 hover:text-amber-600 dark:text-amber-500/70 dark:hover:text-amber-400'}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="pb-1">
                  <p className="text-sm font-semibold">{user.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/dashboard" className="cursor-pointer"><User className="mr-2 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/chat" className="cursor-pointer"><MessageCircle className="mr-2 h-4 w-4" />MediBot Chat</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/history" className="cursor-pointer"><History className="mr-2 h-4 w-4" />History</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/ml-predict" className="cursor-pointer"><Brain className="mr-2 h-4 w-4" />ML Predict</Link></DropdownMenuItem>
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer text-amber-600 dark:text-amber-400">
                        <ShieldCheck className="mr-2 h-4 w-4" />Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-rose-600 dark:text-rose-400">
                  <LogOut className="mr-2 h-4 w-4" />Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild><Link to="/login">Sign In</Link></Button>
              <Button size="sm" asChild><Link to="/register">Get Started</Link></Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
