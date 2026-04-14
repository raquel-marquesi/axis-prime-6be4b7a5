import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, UserProfile, PermissionModule, PermissionAction, PermissionScope } from '@/types/auth';
import { usePermissions } from '@/hooks/usePermissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isAdminOrManager: () => boolean;
  isLeaderOrAbove: () => boolean;
  isCoordinatorOrAbove: () => boolean;
  isFinanceiro: () => boolean;
  isAdmin: () => boolean;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
  canAny: (module: PermissionModule, actions: PermissionAction[]) => boolean;
  getScope: (module: PermissionModule, action: PermissionAction) => PermissionScope | null;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  permissionsLoading: boolean;
  // Simulation
  simulatedRole: string | null;
  isSimulating: boolean;
  realRoles: AppRole[];
  startSimulation: (role: string) => void;
  stopSimulation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [realRoles, setRealRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null);

  const isSimulating = simulatedRole !== null;
  const effectiveRoles = isSimulating ? [simulatedRole] : realRoles;

  const { can, canAny, getScope, isLoading: permissionsLoading } = usePermissions(user?.id, effectiveRoles);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (profileError) {
        console.error('Warning: Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData as UserProfile);
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Warning: Error fetching roles:', rolesError);
      } else if (rolesData) {
        setRealRoles(rolesData.map((r) => r.role as AppRole));
      }
    } catch (error) {
      console.error('Critical Error fetching user data:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRealRoles([]);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRealRoles([]);
          setSimulatedRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });

    if (!error && data.user) {
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        full_name: fullName,
        email: email,
      });

      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: 'usuario',
      });
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Role helpers use effectiveRoles so simulation works automatically
  const hasRole = (role: AppRole) => effectiveRoles.includes(role);
  const hasAnyRole = (checkRoles: AppRole[]) => effectiveRoles.some((r) => checkRoles.includes(r));
  const isAdmin = () => effectiveRoles.includes('admin');
  const isAdminOrManager = () => effectiveRoles.some((r) => ['admin', 'gerente', 'socio'].includes(r));
  const isLeaderOrAbove = () => effectiveRoles.some((r) => ['admin', 'gerente', 'lider', 'socio', 'coordenador'].includes(r));
  const isCoordinatorOrAbove = () => effectiveRoles.some((r) => ['admin', 'gerente', 'socio', 'coordenador'].includes(r));
  const isFinanceiro = () => effectiveRoles.some(r => ['financeiro', 'assistente_financeiro'].includes(r));

  // Simulation controls — only real admins can start
  const startSimulation = (role: string) => {
    if (realRoles.includes('admin')) {
      setSimulatedRole(role);
    }
  };

  const stopSimulation = () => {
    setSimulatedRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, roles: effectiveRoles, loading,
        signIn, signUp, signOut, signInWithGoogle,
        hasRole, hasAnyRole, isAdminOrManager, isLeaderOrAbove, isCoordinatorOrAbove, isFinanceiro, isAdmin,
        can, canAny, getScope, permissionsLoading,
        simulatedRole, isSimulating, realRoles, startSimulation, stopSimulation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}