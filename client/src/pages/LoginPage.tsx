import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { forgotPasswordMessageFor, loginMessageFor } from '../lib/errors';

// ─── Shared primitives ────────────────────────────────────────────────────────

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-sm border border-danger-600 bg-danger-50 px-3 py-3 text-small text-danger-600"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="font-medium">{msg}</span>
    </div>
  );
}

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-success-600 bg-success-50 px-3 py-3 text-small text-success-600">
      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="font-medium">{msg}</span>
    </div>
  );
}

function TogglePwdButton({
  show,
  onToggle,
  showLabel,
  hideLabel,
}: {
  show: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? hideLabel : showLabel}
      className="-me-2 inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-muted hover:text-purple-700 focus-visible:focus-ring"
    >
      {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
    </button>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="pt-1 text-center">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-sm text-small text-ink-muted hover:text-purple-700 focus-visible:focus-ring"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {label}
      </button>
    </div>
  );
}

// ─── Card wrapper shared across all steps ────────────────────────────────────

function Card({ children, onSubmit }: { children: ReactNode; onSubmit?: (e: FormEvent) => void }) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-lg border border-line bg-white p-8 shadow-card"
      noValidate
    >
      {children}
    </form>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

type Step = 'login' | 'verify' | 'reset';

export function LoginPage() {
  const { t } = useTranslation();
  const { session, signIn, loading, error } = useAuth();
  const location = useLocation() as { state?: { from?: string } };

  // ── Step
  const [step, setStep] = useState<Step>('login');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Login step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ── Verify step (email + phone)
  const [fpEmail, setFpEmail] = useState('');
  const [fpPhone, setFpPhone] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // ── Reset step (new password)
  const [resetToken, setResetToken] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  if (!loading && session) {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setLoginError(loginMessageFor(err));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setVerifyBusy(true);
    try {
      const { token } = await api.post<{ token: string }>('/auth/forgot-password/verify', {
        email: fpEmail,
        phone: fpPhone,
      });
      setResetToken(token);
      setNewPwd('');
      setConfirmPwd('');
      setResetError(null);
      setStep('reset');
    } catch (err) {
      setVerifyError(forgotPasswordMessageFor(err));
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (newPwd.length < 6) {
      setResetError(t('auth.setPasswordDesc'));
      return;
    }
    if (newPwd !== confirmPwd) {
      setResetError(t('errors.cannotProcess'));
      return;
    }
    setResetBusy(true);
    try {
      await api.post('/auth/forgot-password/reset', { token: resetToken, password: newPwd });
      setSuccessMsg(t('auth.passwordUpdated'));
      setEmail(fpEmail);
      setPassword('');
      setFpEmail('');
      setFpPhone('');
      setNewPwd('');
      setConfirmPwd('');
      setResetToken('');
      setStep('login');
    } catch (err) {
      const msg = forgotPasswordMessageFor(err);
      setResetError(msg);
    } finally {
      setResetBusy(false);
    }
  };

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const goToVerify = () => {
    setFpEmail(email);
    setFpPhone('');
    setVerifyError(null);
    setLoginError(null);
    setSuccessMsg(null);
    setStep('verify');
  };

  const goToLogin = () => {
    setVerifyError(null);
    setResetError(null);
    setStep('login');
  };

  const displayLoginError = loginError ?? (error ? loginMessageFor(new Error(error)) : null);

  // ── Logo ───────────────────────────────────────────────────────────────────

  const logo = (
    <div className="mb-6 text-center">
      <span className="text-h3">
        <span className="text-purple-600">Kids</span>
        <span className="text-ink">&nbsp;ABA</span>
      </span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid min-h-full place-items-center bg-white p-4">
      <div className="w-full max-w-[400px]">
        {logo}

        {/* ── Step 1: Sign in ────────────────────────────────────────────── */}
        {step === 'login' && (
          <Card onSubmit={handleLogin}>
            <header>
              <h1 className="text-h2 text-ink">{t('auth.signIn')}</h1>
              <p className="mt-1 text-small text-ink-muted">{t('auth.welcomeBack')}</p>
            </header>

            {successMsg && <SuccessBanner msg={successMsg} />}
            {displayLoginError && <ErrorBanner msg={displayLoginError} />}

            <Input
              name="email"
              label={t('auth.email')}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
            />

            <div className="space-y-1.5">
              <Input
                name="password"
                label={t('auth.password')}
                type={showPwd ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                iconEnd={
                  <TogglePwdButton
                    show={showPwd}
                    onToggle={() => setShowPwd((v) => !v)}
                    showLabel={t('auth.showPassword')}
                    hideLabel={t('auth.hidePassword')}
                  />
                }
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={goToVerify}
                  className="rounded-sm text-small text-purple-600 hover:underline focus-visible:focus-ring"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loginBusy}>
              {t('auth.signInButton')}
            </Button>
          </Card>
        )}

        {/* ── Step 2: Verify identity ────────────────────────────────────── */}
        {step === 'verify' && (
          <Card onSubmit={handleVerify}>
            <header>
              <h1 className="text-h2 text-ink">{t('auth.forgotTitle')}</h1>
              <p className="mt-1 text-small text-ink-muted">{t('auth.forgotDesc')}</p>
            </header>

            {verifyError && <ErrorBanner msg={verifyError} />}

            <Input
              label={t('auth.email')}
              type="email"
              required
              autoComplete="email"
              value={fpEmail}
              onChange={(e) => setFpEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
            />
            <Input
              label={t('auth.phone')}
              value={fpPhone}
              onChange={(e) => setFpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              required
            />

            <Button type="submit" size="lg" className="w-full" loading={verifyBusy}>
              {t('auth.continueButton')}
            </Button>
            <BackButton label={t('auth.backToSignIn')} onClick={goToLogin} />
          </Card>
        )}

        {/* ── Step 3: Set new password ───────────────────────────────────── */}
        {step === 'reset' && (
          <Card onSubmit={handleReset}>
            <header>
              <h1 className="text-h2 text-ink">{t('auth.setPasswordTitle')}</h1>
              <p className="mt-1 text-small text-ink-muted">{t('auth.setPasswordDesc')}</p>
            </header>

            {resetError && <ErrorBanner msg={resetError} />}

            <Input
              label={t('auth.newPassword')}
              type={showNew ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              iconEnd={
                <TogglePwdButton
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  showLabel={t('auth.showPassword')}
                  hideLabel={t('auth.hidePassword')}
                />
              }
            />
            <Input
              label={t('auth.confirmPassword')}
              type={showConfirm ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              iconEnd={
                <TogglePwdButton
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  showLabel={t('auth.showPassword')}
                  hideLabel={t('auth.hidePassword')}
                />
              }
            />

            <Button type="submit" size="lg" className="w-full" loading={resetBusy}>
              {t('auth.savePassword')}
            </Button>
            <BackButton
              label={t('auth.back')}
              onClick={() => {
                setResetError(null);
                setStep('verify');
              }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
