import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Zap, LogOut, Clock, User, Shield, ChevronDown, Settings, BarChart3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  selectedCount: number;
  totalDuration: string;
  onOpenReport?: () => void;
  hasEntries?: boolean;
  onOpenTeamReport?: () => void;
  isTeamLead?: boolean;
}

export default function Header({ theme, onToggleTheme, selectedCount, totalDuration, onOpenReport, hasEntries, onOpenTeamReport, isTeamLead }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User');
  const displayEmail = user?.email || '';

  // Fetch canonical display name from profiles table
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('user_id', user.id).single().then(({ data }) => {
      if (data?.display_name) setDisplayName(data.display_name);
    });
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-muted/60 backdrop-blur-xl border-b border-border/40 px-6 py-2">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        {/* Left — Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-md">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none text-foreground">Syncly</h1>
            <p className="text-[7px] uppercase tracking-[0.25em] text-muted-foreground font-semibold mt-0.5">
              Clockify → Calendar
            </p>
          </div>
        </div>

        {/* Center — Selection stats (visible when entries selected) */}
        {selectedCount > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-primary/5 border border-primary/10 rounded-lg animate-fade-scale">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <div className="flex flex-col items-start">
              <span className="text-[7px] font-bold text-primary uppercase tracking-[0.2em] leading-none">Selected</span>
              <span className="text-xs font-black tabular-nums text-foreground tracking-tight leading-none mt-0.5">
                {selectedCount} items · {totalDuration}
              </span>
            </div>
          </div>
        )}

        {/* Right — Actions + User Avatar */}
        <div className="flex items-center gap-1">
          {isTeamLead && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenTeamReport}
              className="rounded-lg w-8 h-8"
              title="Team Report"
            >
              <Users className="w-3.5 h-3.5" />
            </Button>
          )}
          {hasEntries && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenReport}
              className="rounded-lg w-8 h-8"
              title="Timesheet Report"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="rounded-lg w-8 h-8"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>

          {/* User avatar dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-[10px] text-primary-foreground font-black uppercase shadow-sm">
                {displayName.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-foreground hidden sm:inline max-w-[110px] truncate">
                {displayName}
              </span>
              <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-scale z-[60]">
                {/* User info */}
                <div className="px-3.5 py-2.5 border-b border-border bg-secondary/30">
                  <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{displayEmail}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Profile
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => { navigate('/admin'); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                      Admin Panel
                    </button>
                  )}

                  <button
                    onClick={() => { onToggleTheme(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors sm:hidden"
                  >
                    {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-muted-foreground" /> : <Moon className="w-3.5 h-3.5 text-muted-foreground" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </div>

                <div className="border-t border-border py-1">
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
