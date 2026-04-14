import React, { useState } from 'react';
import { ShieldPlus, UserCheck, Crown, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [isVerifiedForReset, setIsVerifiedForReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  // Validation State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setIsLoginView(true);
    setIsForgotPasswordView(false);
    setIsVerifiedForReset(false);
    // Reset fields
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setUsername('');
    setFormErrors({});
  };

  const currentRoleName = selectedRole === 'junior_analyst' ? 'Junior SOC Analyst' : 'SOC Manager';

  // Helper validation func
  const validateSignup = () => {
    const errors: Record<string, string> = {};
    const valName = name.trim();
    const valUsername = username.trim();
    const valEmail = email.trim();
    const valPassword = password;

    // 1. Full Name Validation
    const nameRegex = /^[a-zA-Z]+(?:\s+[a-zA-Z]+)+$/;
    if (valName.length < 2 || valName.length > 50) {
      errors.name = 'Length must be 2-50 characters';
    } else if (!nameRegex.test(valName)) {
      errors.name = 'Provide first and surname (alphabets and space between only)';
    }

    // 2. Username Validation
    if (valUsername.length < 3 || valUsername.length > 16) {
      errors.username = 'Length must be 3-16 characters';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(valUsername)) {
      errors.username = 'Must contain both alphabets and numbers';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(valUsername)) {
      errors.username = 'Only alphanumeric, underscores, and periods allowed';
    } else if (/^[_. ]|[_. ]$/.test(valUsername)) {
      errors.username = 'Cannot start or end with a special character';
    } else if (/[_.]{2,}/.test(valUsername)) {
      errors.username = 'Cannot have consecutive special characters';
    }

    // 3. Email Validation
    if (valEmail.length === 0 || valEmail.length > 254) {
      errors.email = 'Email must be exactly 1 to 254 characters';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(valEmail)) {
        errors.email = 'Please enter a properly formatted email';
      }
    }

    // 4. Password Validation
    if (valPassword.length < 6) {
      errors.password = 'Weak password: Minimum 6 characters required';
    } else if (!/[a-zA-Z]/.test(valPassword) || !/\d/.test(valPassword) || !/[^a-zA-Z0-9]/.test(valPassword)) {
      errors.password = 'Weak password: Need alphabets, numbers, and special chars';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateLogin = () => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'Email processing is required';
    if (!password) errors.password = 'Password input required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateVerifyUser = () => {
    const errors: Record<string, string> = {};
    const valUsername = username.trim();
    const valEmail = email.trim();

    if (valUsername.length < 3 || valUsername.length > 16) {
      errors.username = 'Username verification is required (3-16 chars)';
    }

    if (valEmail.length === 0 || valEmail.length > 254) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(valEmail)) {
        errors.email = 'Please enter a properly formatted email';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateResetPassword = () => {
    const errors: Record<string, string> = {};
    const valPassword = password;
    const valConfirmPassword = confirmPassword;

    if (valPassword.length < 6) {
      errors.password = 'Weak password: Minimum 6 characters required';
    } else if (!/[a-zA-Z]/.test(valPassword) || !/\d/.test(valPassword) || !/[^a-zA-Z0-9]/.test(valPassword)) {
      errors.password = 'Weak password: Need alphabets, numbers, and special chars';
    }

    if (valPassword !== valConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (isForgotPasswordView) {
      if (!isVerifiedForReset) {
        // Step 1: Verify User Logic
        if (!validateVerifyUser()) return;
        setIsLoading(true);
        try {
          const response = await fetch(`http://localhost:5000/api/verify-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              username: username.trim(),
              role: selectedRole
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Verification failed');

          toast.success(data.message);
          setIsVerifiedForReset(true);
          setFormErrors({});
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Step 2: Reset Password Logic
        if (!validateResetPassword()) return;
        setIsLoading(true);
        try {
          const response = await fetch(`http://localhost:5000/api/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              username: username.trim(),
              role: selectedRole,
              new_password: password
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Reset failed');

          toast.success(data.message);
          setIsForgotPasswordView(false);
          setIsVerifiedForReset(false);
          setIsLoginView(true);
          setPassword('');
          setConfirmPassword('');
          setFormErrors({});
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsLoading(false);
        }
      }
      return;
    }

    // Standard Sign up/Login flow
    if (!isLoginView) {
      if (!validateSignup()) return;
    } else {
      if (!validateLogin()) return;
    }

    setIsLoading(true);
    const endpoint = isLoginView ? '/api/login' : '/api/signup';

    const payload: any = {
      email: email.trim(),
      password,
      role: selectedRole
    };

    if (!isLoginView) {
      payload.full_name = name.trim();
      payload.username = username.trim();
    }

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      toast.success(isLoginView ? 'Login successful' : 'Account created effectively');

      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.name.substring(0, 2).toUpperCase(),
      });

      navigate('/dashboard');

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-bg relative overflow-hidden">
      <div className="absolute inset-0 scanline" />

      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Logo */}
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 glow-primary mb-6">
            <ShieldPlus className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Sentinel<span className="text-primary text-glow-primary">One</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm">SOC Triage Dashboard v1.0</p>
        </div>

        {/* Content Area */}
        <div className="animate-fade-up relative" style={{ animationDelay: '0.1s' }}>
          {!selectedRole ? (
            /* Role Selection */
            <div className="space-y-4">
              <p className="text-center text-muted-foreground text-sm mb-6">Select your role to continue</p>

              <button
                onClick={() => handleRoleSelect('junior_analyst')}
                className="w-full group relative overflow-hidden rounded-lg border border-border bg-card p-6 text-left transition-all duration-300 hover:border-primary/50 hover:glow-primary"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <UserCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Junior SOC Analyst</h3>
                    <p className="text-sm text-muted-foreground mt-1">Alert triage • Claim • Investigate • Close</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('soc_manager')}
                className="w-full group relative overflow-hidden rounded-lg border border-border bg-card p-6 text-left transition-all duration-300 hover:border-accent/50 hover:glow-accent"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Crown className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">SOC Manager</h3>
                    <p className="text-sm text-muted-foreground mt-1">Full CRUD • Create • Edit • Delete alerts</p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            /* Auth Form */
            <div className="bg-card border border-border rounded-xl p-6 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${selectedRole === 'soc_manager' ? 'from-accent' : 'from-primary'} to-transparent opacity-50`}></div>

              <div className="flex items-center mb-6">
                <button
                  type="button"
                  onClick={() => {
                    if (isForgotPasswordView) {
                      setIsForgotPasswordView(false);
                      setIsVerifiedForReset(false);
                      setFormErrors({});
                    } else {
                      setSelectedRole(null);
                    }
                  }}
                  className="p-2 rounded-md hover:bg-secondary text-muted-foreground mr-2 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {isForgotPasswordView ? 'Reset Password' : (isLoginView ? 'Sign In' : 'Create Account')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isForgotPasswordView && isVerifiedForReset ? 'Identity Confirmed' : `as ${currentRoleName}`}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {(!isLoginView || isForgotPasswordView) && (
                  <>
                    {!isForgotPasswordView && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => { setName(e.target.value); clearError('name'); }}
                          className={`w-full bg-background border ${formErrors.name ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-primary/50'} rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 transition-all text-sm`}
                          placeholder="John Doe"
                        />
                        {formErrors.name && <p className="text-xs text-destructive animate-fade-in">{formErrors.name}</p>}
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">
                        {isForgotPasswordView ? 'Verify Username' : 'Username'}
                      </label>
                      <input
                        type="text"
                        value={username}
                        disabled={isForgotPasswordView && isVerifiedForReset}
                        onChange={(e) => { setUsername(e.target.value); clearError('username'); }}
                        className={`w-full bg-background border ${formErrors.username ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-primary/50'} rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 transition-all text-sm disabled:opacity-50`}
                        placeholder="johndoe123"
                      />
                      {formErrors.username && <p className="text-xs text-destructive animate-fade-in">{formErrors.username}</p>}
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    {isForgotPasswordView ? 'Verify Email' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled={isForgotPasswordView && isVerifiedForReset}
                    onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                    className={`w-full bg-background border ${formErrors.email ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-primary/50'} rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 transition-all text-sm disabled:opacity-50`}
                    placeholder="name@company.com"
                  />
                  {formErrors.email && <p className="text-xs text-destructive animate-fade-in">{formErrors.email}</p>}
                </div>

                {(!isForgotPasswordView || isVerifiedForReset) && (
                  <div className="space-y-1 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">
                        {isForgotPasswordView ? 'New Password' : 'Password'}
                      </label>
                      {isLoginView && !isForgotPasswordView && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPasswordView(true);
                            setIsVerifiedForReset(false);
                            setFormErrors({});
                            setPassword('');
                            setConfirmPassword('');
                            setUsername('');
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                        className={`w-full bg-background border ${formErrors.password ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-primary/50'} rounded-lg px-4 py-2.5 pr-10 text-foreground focus:outline-none focus:ring-2 transition-all text-sm`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.password && <p className="text-xs text-destructive animate-fade-in">{formErrors.password}</p>}
                  </div>
                )}

                {(isForgotPasswordView && isVerifiedForReset) && (
                  <div className="space-y-1 animate-in fade-in zoom-in duration-300">
                    <label className="text-sm font-medium text-foreground">Re-enter Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                        className={`w-full bg-background border ${formErrors.confirmPassword ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-primary/50'} rounded-lg px-4 py-2.5 pr-10 text-foreground focus:outline-none focus:ring-2 transition-all text-sm`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.confirmPassword && <p className="text-xs text-destructive animate-fade-in">{formErrors.confirmPassword}</p>}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full hover:opacity-90 text-primary-foreground font-semibold py-2.5 rounded-lg transition-colors mt-4 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed ${selectedRole === 'soc_manager' ? 'bg-accent text-accent-foreground' : 'bg-primary'}`}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    isForgotPasswordView ? (isVerifiedForReset ? 'Set New Password' : 'Verify Identity') : (isLoginView ? 'Sign In' : 'Create Account')
                  )}
                </button>
              </form>

              {!isForgotPasswordView && (
                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground mr-2">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginView(!isLoginView);
                      setFormErrors({});
                    }}
                    className={`${selectedRole === 'soc_manager' ? 'text-accent hover:text-accent/80' : 'text-primary hover:text-primary/80'} font-medium transition-colors hover:underline`}
                  >
                    {isLoginView ? 'Sign up' : 'Sign in'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- DEMO CREDENTIALS PANEL --- */}
        <div className="mt-12 bg-card/30 border border-border/50 rounded-xl p-4 max-w-sm mx-auto animate-fade-in backdrop-blur-sm">
          <div className="text-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">Easy Login Testing</span>
          </div>
          <p className="text-xs text-muted-foreground text-center mb-4 leading-relaxed">
            Create these exact unified accounts in Sign Up once, then utilize them for rapid debugging.
          </p>
          <div className="space-y-3">
            <div className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-primary/80 uppercase tracking-wide flex items-center gap-1.5"><UserCheck className="w-3 h-3" /> Junior Analyst</span>
              <div className="grid grid-cols-2 gap-2 font-mono bg-background/50 p-2 rounded border border-border/50 text-muted-foreground">
                <span className="truncate" title="analyst@sentinel.com">📧 analyst@sentinel.com</span>
                <span className="truncate" title="Sentinel#2024">🔑 Sentinel#2024</span>
                <span className="truncate" title="demojunior">👤 demojunior1</span>
                <span className="truncate">Name: Demo Analyst</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-accent/80 uppercase tracking-wide flex items-center gap-1.5"><Crown className="w-3 h-3" /> SOC Manager</span>
              <div className="grid grid-cols-2 gap-2 font-mono bg-background/50 p-2 rounded border border-border/50 text-muted-foreground">
                <span className="truncate" title="manager@sentinel.com">📧 manager@sentinel.com</span>
                <span className="truncate" title="Sentinel#2024">🔑 Sentinel#2024</span>
                <span className="truncate" title="demomanager">👤 demomanager1</span>
                <span className="truncate">Name: Demo Manager</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-8 font-mono">
          SECURE ACCESS • ENCRYPTED SESSION • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
